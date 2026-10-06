# WDNusantara Inbox Lab

A portfolio project by **WDNusantara** that demonstrates technical email development: responsive, accessible, dark-mode-ready HTML email built from a modular component system, previewed in a Next.js site, with a safe "send me a test" feature.

> **About the brand.** WDNusantara is a software vendor that builds products for clients on request. For this demo the company also has its own SaaS, **NusaFlow**, a client-project and invoicing portal. NusaFlow is **fictional** and exists only to give the emails realistic content. No real customers, data or third-party brand assets are used.

- **Live site:** `https://inbox.wdnusantara.my.id` (proposed; see [Domains and DNS](#9-domains-and-dns))
- **Sending domain:** `mail.wdnusantara.my.id`
- **Requirements:** see `docs/PRD_Email_Dev_Portfolio.md`. Where this README and the PRD differ on brand or architecture, **this README wins**.

---

## Table of contents

1. [Goals](#1-goals)
2. [Tech stack and cost](#2-tech-stack-and-cost)
3. [Architecture](#3-architecture)
4. [SOLID in this codebase](#4-solid-in-this-codebase)
5. [Email design system and build pipeline](#5-email-design-system-and-build-pipeline)
6. [The send-test use case](#6-the-send-test-use-case)
7. [API contract](#7-api-contract)
8. [Security and abuse prevention](#8-security-and-abuse-prevention)
9. [Domains and DNS](#9-domains-and-dns)
10. [Clean code conventions](#10-clean-code-conventions)
11. [Testing strategy](#11-testing-strategy)
12. [Tooling, CI and workflow](#12-tooling-ci-and-workflow)
13. [Getting started](#13-getting-started)
14. [Configuration](#14-configuration)
15. [Roadmap](#15-roadmap)
16. [Architecture decision records](#16-architecture-decision-records)
17. [Definition of done](#17-definition-of-done)

---

## 1. Goals

1. Show hand-coded, cross-client email HTML and CSS that is responsive, accessible (WCAG 2.2 AA target) and dark-mode aware.
2. Show a **modular template system**: components, design tokens and a build pipeline, not copy-pasted HTML.
3. Show **clean, testable software design** around the email feature: the core logic does not depend on Next.js, Resend, Redis or any other vendor.
4. Show **QA discipline**: automated email linting, real-inbox tests, honest rendering evidence.
5. Ship at **zero recurring cost**.

**Non-goals:** user accounts, a template editor, bulk sending, a mailing list, free-form message bodies.

## 2. Tech stack and cost

| Concern              | Choice                                                                                                                            | Cost                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Framework            | Next.js (App Router, Turbopack), React, TypeScript (strict)                                                                       | Free                                                                       |
| Runtime and packages | Node 24 (`.nvmrc`), npm                                                                                                           | Free                                                                       |
| Styling (site only)  | Tailwind CSS v4                                                                                                                   | Free                                                                       |
| Hosting              | Vercel Hobby (personal, non-commercial use)                                                                                       | Free                                                                       |
| Sending              | Resend free plan behind an `EmailSender` port, called with plain `fetch`                                                          | Free (verify current limits at sign-up; listed at 3,000/month and 100/day) |
| Bot protection       | Cloudflare Turnstile, verified server-side with plain `fetch`                                                                     | Free                                                                       |
| Rate limiting        | Upstash Redis free tier, REST API (`/multi-exec`) with plain `fetch`; no `@upstash/ratelimit`                                     | Free (verify limits)                                                       |
| Validation           | `zod`                                                                                                                             | Free                                                                       |
| Logging              | In-house `JsonLogger` (structured JSON); no `pino`                                                                                | Free                                                                       |
| Email build          | Node scripts run with `tsx`: `juice` (CSS inlining), `html-to-text`, `cheerio`                                                    | Free                                                                       |
| Tests                | Vitest; Playwright and `@axe-core/playwright` (end-to-end and accessibility suites run against the dev server with fake adapters) | Free                                                                       |
| CI                   | GitHub Actions (free for public repositories)                                                                                     | Free                                                                       |
| Domain               | `wdnusantara.my.id` (already owned)                                                                                               | Already paid                                                               |

**No vendor SDKs.** Resend, Turnstile, Upstash and the webhook are all called with plain `fetch` behind ports, so the adapters stay small and easy to fake in tests.

Pin exact dependency versions in `package.json` and commit the lockfile. Free-tier limits change, so re-check them when you sign up.

## 3. Architecture

The project follows **Clean Architecture**. Source code dependencies point inward only.

```
        ┌────────────────────────────────────────────┐
        │  presentation  (Next.js pages, route        │
        │  handlers, React components)                │
        │   ┌────────────────────────────────────┐    │
        │   │  infrastructure (adapters: Resend, │    │
        │   │  Upstash, Turnstile, file system)  │    │
        │   │   ┌────────────────────────────┐   │    │
        │   │   │  application (use cases,   │   │    │
        │   │   │  ports, DTOs)              │   │    │
        │   │   │   ┌────────────────────┐   │   │    │
        │   │   │   │  domain (entities, │   │   │    │
        │   │   │   │  value objects,    │   │   │    │
        │   │   │   │  errors)           │   │   │    │
        │   │   │   └────────────────────┘   │   │    │
        │   │   └────────────────────────────┘   │    │
        │   └────────────────────────────────────┘    │
        └────────────────────────────────────────────┘
```

### 3.1 The dependency rule

| Layer                                  | May import                                                             | Must not import                           |
| -------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------- |
| `domain`                               | nothing: no npm packages, no Node built-ins                            | everything else, including `zod`          |
| `application`                          | `domain`                                                               | `infrastructure`, `presentation`, Next.js |
| `infrastructure`                       | `application`, `domain`                                                | `presentation`                            |
| `presentation` (`src/presentation`)    | `application`, `domain`                                                | `infrastructure`, business rules          |
| `src/app` (route files, layout, pages) | all layers; route files are the wiring that calls the composition root | business rules                            |

The rule is **enforced in CI** with `dependency-cruiser`. A violation fails the build. Run it locally with `npm run arch:check`. Layer paths in `.dependency-cruiser.cjs` end with a slash, and type-only imports are tracked too. `emails/` is a separate build tool and is not scanned.

### 3.2 Layer responsibilities

- **Domain.** Business concepts and invariants that would stay true if we changed every tool. Value objects such as `EmailAddress`, `RecipientName` and `EmailSubject` validate themselves on creation and cannot exist in an invalid state. Entities such as `EmailTemplate` describe what a template is. Domain errors are plain classes.
- **Application.** One class per use case (`SendTestEmail`, `ListTemplates`, `GetTemplate`). Use cases orchestrate domain objects through **ports** (interfaces they own). They contain no framework code and no vendor code.
- **Infrastructure.** Adapters that implement ports: `ResendEmailSender`, `UpstashRateLimiter`, `TurnstileBotVerifier`, `FileSystemTemplateRepository`, `MergeTagRenderer`, `WebhookEventPublisher`, `HmacIdentityHasher`, `JsonLogger`, `SystemClock`. Also includes in-memory, console and no-op adapters used in tests and local development. Shared helpers for the `fetch`-based adapters live in `infrastructure/http/`.
- **Presentation.** Thin adapters to the outside world. Request handlers (`handle-test-send`, `handle-preview`) parse HTTP, call one use case, and map the result to HTTP; route files in `src/app` only wire them to the container. React components render data and hold UI state only.
- **Composition root.** `src/infrastructure/container.ts` is the only place that decides which adapter implements which port, and `template-services.ts` wires the template use cases for the site. The lazy wrappers `get-container.ts`, `get-template-services.ts` and `get-public-config.ts` build these on first use; they and `config/` are the only code that reads `process.env`. Everything else receives its dependencies through constructors.

### 3.3 Folder structure

```
inbox-lab/
├─ src/
│  ├─ domain/
│  │  ├─ entities/                 email-template.ts
│  │  ├─ value-objects/            email-address.ts  recipient-name.ts  email-subject.ts  template-id.ts
│  │  ├─ errors/                   domain-error.ts  validation-error.ts
│  │  └─ result.ts                 Result<T, E> and helpers
│  ├─ application/
│  │  ├─ ports/                    email-sender.ts  template-repository.ts  template-renderer.ts
│  │  │                            rate-limiter.ts  bot-verifier.ts  event-publisher.ts
│  │  │                            clock.ts  logger.ts  identity-hasher.ts
│  │  │                            proof-repository.ts  build-metrics-repository.ts
│  │  ├─ use-cases/                send-test-email.ts  list-templates.ts  get-template.ts
│  │  ├─ dto/                      send-test-email.dto.ts  template.dto.ts  proof.dto.ts  build-metrics.dto.ts
│  │  ├─ errors/                   application-errors.ts
│  │  ├─ mappers/                  template-summary.ts
│  │  └─ send-policy.ts
│  ├─ infrastructure/
│  │  ├─ config/                   config.ts  public-config.ts      (zod-parsed environment)
│  │  ├─ email/                    resend-email-sender.ts  console-email-sender.ts
│  │  ├─ templates/                file-system-template-repository.ts  merge-tag-renderer.ts
│  │  ├─ rate-limit/               upstash-rate-limiter.ts  in-memory-rate-limiter.ts
│  │  ├─ bot/                      turnstile-bot-verifier.ts  noop-bot-verifier.ts
│  │  ├─ events/                   webhook-event-publisher.ts  noop-event-publisher.ts
│  │  ├─ http/                     fetch-like.ts  read-field.ts
│  │  ├─ security/                 hmac-identity-hasher.ts
│  │  ├─ logging/                  json-logger.ts
│  │  ├─ time/                     system-clock.ts
│  │  ├─ proof/                    file-system-proof-repository.ts
│  │  ├─ build-metrics/            file-system-build-metrics-repository.ts
│  │  ├─ fs/                       is-not-found.ts
│  │  ├─ container.ts              (composition root)
│  │  ├─ template-services.ts      (template use cases for the site)
│  │  └─ get-container.ts  get-template-services.ts  get-public-config.ts   (lazy wrappers)
│  ├─ presentation/
│  │  ├─ http/                     handle-test-send.ts  handle-preview.ts  map-error-to-http.ts
│  │  │                            problem-details.ts  request-schemas.ts  client-ip.ts
│  │  ├─ preview/                  preview-options.ts
│  │  ├─ proof/                    proof-view.ts
│  │  ├─ build/                    build-metrics-view.ts
│  │  ├─ forms/                    send-form-outcome.ts
│  │  └─ components/
│  │     ├─ segmented-control.tsx
│  │     ├─ template-explorer/     template-explorer.tsx  preview-frame.tsx
│  │     ├─ send-form/             send-form.tsx  text-field.tsx  turnstile-widget.tsx  turnstile-loader.ts
│  │     ├─ inbox-lab/             inbox-lab.tsx
│  │     ├─ proof-gallery/         proof-gallery.tsx
│  │     └─ how-it-is-built/       how-it-is-built.tsx
│  └─ app/
│     ├─ layout.tsx  page.tsx  globals.css
│     ├─ api/v1/test-sends/        route.ts
│     └─ preview/[id]/[variant]/   route.ts
├─ emails/                         (email design system, see section 5)
│  ├─ tokens/                      tokens.json
│  ├─ components/                  one .html partial per component
│  ├─ templates/                   welcome  community-digest  win-back  plan-sale  feature-reviews  topic-digest  (each .html and .json)
│  └─ build/                       create-pipeline.ts  merge-tags.ts  cli.ts  steps/  lint/
├─ dist/emails/                    (generated, git-ignored)
├─ public/                         email images (served via absolute URLs); proof/ holds manifest.json and the screenshots
├─ tests/
│  ├─ unit/                        mirrors src/; support/ holds the hand-written fakes and helpers
│  ├─ contract/                    port contract suites
│  ├─ integration/                 real built templates and the real container, with fake adapters
│  └─ e2e/                         Playwright and axe specs (*.e2e.ts)
├─ docs/
│  ├─ PRD_Email_Dev_Portfolio.md
│  ├─ adr/                         0001-...md
│  ├─ case-studies/                plan-sale.md  feature-reviews.md  (written; the other templates follow once they have real-client proof)
│  ├─ qa/                          pre-send-checklist.md  client-matrix.md
│  └─ iterable-porting.md
├─ .github/workflows/ci.yml
├─ .dependency-cruiser.cjs
├─ .env.example
├─ .nvmrc
├─ vitest.config.mjs
├─ playwright.config.ts
├─ README.md
└─ package.json
```

### 3.4 Request flow (send a test)

```
Browser form
   │  POST /api/v1/test-sends
   ▼
app/api/v1/test-sends/route.ts        (wiring: get the container, call the handler)
   ▼
presentation/http/handle-test-send.ts (content type, body size, JSON, zod shape; maps the result to HTTP)
   ▼
SendTestEmail.execute(input)          (application: orchestrate)
   ├─ kill switch (SENDING_ENABLED)
   ├─ filled honeypot → success receipt, no side effects
   ├─ EmailAddress / RecipientName / EmailSubject / TemplateId.create()   (domain; every bad field reported)
   ├─ BotVerifier.verify(token)                               (port → Turnstile adapter)
   ├─ RateLimiter.consume(...)  IP, then recipient, then global   (port → Upstash adapter)
   ├─ TemplateRepository.findById(id)                         (port → file system adapter)
   ├─ TemplateRenderer.render(template, mergeValues)          (port → merge tag adapter → { html, darkHtml, text })
   ├─ EmailSender.send(message)                               (port → Resend adapter; the use case owns the subject)
   └─ EventPublisher.publish(event)                           (port → webhook adapter; a failure is swallowed and logged)
   ▼
Result<SendReceipt, SendTestError>   →  mapped to HTTP status + problem details
```

### 3.5 The site

- **Template explorer** (`template-explorer`, `preview-frame`): choose a template and switch between device width, light and dark, and the HTML and plain-text views. Each view is an `iframe` pointed at `GET /preview/[id]/[variant]` (section 7.2). The dark view is a **simulated** copy, not a real client render.
- **Send form** (`send-form`): shares the selected template with the explorer through `inbox-lab.tsx`. It renders the Turnstile widget when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set (with no key there is no widget and the token is empty). The honeypot input is named `contact_me_by_fax_only`, which avoids browser autofill, and maps to the `website` field of the API.
- **Layout:** one column on small screens, explorer and form side by side from the `xl` breakpoint (1280 px).
- **Preview region:** the box around the preview iframe scrolls sideways on narrow screens, so it is a labelled, focusable region (`Email preview`) that keyboard users can reach and scroll.
- **Rendering proof** (`proof-gallery`): reads `public/proof/manifest.json` and stays hidden while the list is empty. A missing file counts as empty; a malformed file fails loudly. Every entry states the client, the tool or device, the theme, the date and whether it is a real client render or a simulation (ADR 0008).
- **How it is built** (`how-it-is-built`): the component library, a QA checklist, and a size table measured from `dist/emails` and compared with Gmail's 102 KB clip limit.
- **Wiring:** `src/app/page.tsx` builds the two file-system repositories (proof and build metrics) directly, which route files are allowed to do.
- **Tests:** components are excluded from Vitest coverage; Playwright and axe tests cover them (section 11).

**Adding a proof screenshot.** Put the image in `public/proof/` (a bare `.png`, `.jpg` or `.webp` name; no folders, no SVG) and add an entry to `manifest.json`:

```json
{
  "entries": [
    {
      "id": "gmail-web-welcome-light",
      "templateId": "welcome",
      "client": "Gmail web",
      "tool": "Chrome on Windows",
      "scheme": "light",
      "date": "2026-10-02",
      "source": "real",
      "image": "gmail-web-welcome-light.png",
      "alt": "The welcome email opened in Gmail on the web, light theme",
      "width": 1200,
      "height": 1600,
      "note": "optional"
    }
  ]
}
```

Unknown fields, unknown templates, duplicate ids and bad dates fail the tests and the build.

## 4. SOLID in this codebase

| Principle                 | How it is applied here                                                                                                                                                                                                                 | Where to look                                                         |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **S**ingle Responsibility | Each class has one reason to change. `ResendEmailSender` only talks to Resend. `MergeTagRenderer` only substitutes values. `SendTestEmail` only orchestrates the send flow. Route handlers only translate HTTP.                        | `src/application/use-cases`, `src/infrastructure/*`                   |
| **O**pen/Closed           | New behaviour is added by **adding** code. A new email lint rule is a new class in the rule list. A new build step is a new `BuildStep`. A new sender (for example Brevo) is a new `EmailSender` adapter. No existing class is edited. | `emails/build/lint`, `emails/build/steps`, `src/infrastructure/email` |
| **L**iskov Substitution   | Every adapter honours its port's contract, including error behaviour. The same **contract test suite** runs against the in-memory and real adapters, so any implementation can replace another without the use case noticing.          | `tests/contract`                                                      |
| **I**nterface Segregation | Ports are small and role-specific: `EmailSender` has one method, `RateLimiter` has one, `BotVerifier` has one. No "god" `EmailService`. Use cases depend only on the ports they use.                                                   | `src/application/ports`                                               |
| **D**ependency Inversion  | High-level policy (`application`) owns the interfaces; low-level details (`infrastructure`) implement them. Dependencies are injected through constructors and wired in one composition root.                                          | `src/infrastructure/container.ts`                                     |

### 4.1 Port examples

```ts
// src/application/ports/template-renderer.ts   (signature abbreviated)
export interface RenderedEmail {
  readonly html: string;
  readonly darkHtml: string; // simulated dark copy, used by the site preview
  readonly text: string;
}

export interface TemplateRenderer {
  render(template: EmailTemplate, values: MergeValues): RenderedEmail;
}
```

```ts
// src/application/ports/email-sender.ts   (OutgoingEmail abbreviated)
export interface EmailSender {
  send(email: OutgoingEmail): Promise<Result<{ providerMessageId: string }, EmailDeliveryError>>;
}
```

```ts
// src/application/ports/rate-limiter.ts
export interface RateLimitRule {
  readonly key: string; // already hashed, never a raw email or IP
  readonly limit: number;
  readonly windowSeconds: number;
}

export interface RateLimiter {
  consume(rule: RateLimitRule): Promise<{ allowed: boolean; retryAfterSeconds: number }>;
}
```

```ts
// src/application/ports/template-repository.ts
export interface TemplateRepository {
  list(): Promise<readonly EmailTemplate[]>;
  findById(id: TemplateId): Promise<EmailTemplate | null>;
}
```

### 4.2 Domain example (value object)

```ts
// src/domain/value-objects/email-address.ts
export class EmailAddress {
  private constructor(public readonly value: string) {}

  static create(raw: string): Result<EmailAddress, ValidationError> {
    const value = raw.trim().toLowerCase();
    if (value.length === 0 || value.length > 254 || !EMAIL_PATTERN.test(value)) {
      return err(new ValidationError("email", "Enter a valid email address."));
    }
    return ok(new EmailAddress(value));
  }
}
```

### 4.3 Use case skeleton

Abbreviated. The real use case takes one `deps` object, and the order of work below is the order in the code.

```ts
// src/application/use-cases/send-test-email.ts
export class SendTestEmail {
  constructor(private readonly deps: SendTestEmailDependencies) {}

  async execute(input: SendTestEmailInput): Promise<Result<SendReceipt, SendTestEmailError>> {
    if (!this.deps.policy.sendingEnabled) return err(new SendingDisabledError());

    // A filled honeypot looks like a success and does nothing.
    if (input.website !== "") return ok(silentReceipt());

    // Builds the value objects; one InvalidRequestError lists every bad field.
    const request = TestSendRequest.create(input);
    if (!request.ok) return request;

    const human = await this.deps.botVerifier.verify(input.botToken, input.clientIp);
    if (!human) return err(new BotCheckFailedError());

    // Order: IP, then recipient, then global.
    const limited = await this.enforceLimits(request.value, input.clientIp);
    if (!limited.ok) return limited;

    const template = await this.deps.templates.findById(request.value.templateId);
    if (!template) return err(new TemplateNotFoundError(request.value.templateId));

    // The renderer returns { html, darkHtml, text }; the use case owns the subject.
    const rendered = this.deps.renderer.render(template, {
      firstName: request.value.recipientName.value,
    });
    const sent = await this.deps.sender.send({
      to: request.value.email.value,
      subject: request.value.subject ?? template.subject,
      html: rendered.html,
      text: rendered.text,
    });
    if (!sent.ok) return sent;

    // A failing publisher is swallowed and logged as a warning; it never fails the request.
    await this.publishQuietly({ type: "test-email.sent", templateId: template.id.value });
    return ok({ receiptId: sent.value.providerMessageId });
  }
}
```

`Result<T, E>` is a small discriminated union (`{ ok: true; value } | { ok: false; error }`) that lives in `src/domain/result.ts`. Expected failures are **values**, not exceptions. Exceptions are reserved for faults (programmer errors and infrastructure outages) and are logged once at the HTTP boundary.

### 4.4 Composition root

Abbreviated; config field names are simplified.

```ts
// src/infrastructure/container.ts
export function createContainer(config: Config) {
  const logger = new JsonLogger(config.LOG_LEVEL);
  const sender: EmailSender =
    config.EMAIL_DRIVER === "resend"
      ? new ResendEmailSender(config.RESEND_API_KEY, config.EMAIL_FROM, config.EMAIL_REPLY_TO)
      : new ConsoleEmailSender(logger);

  const sendTestEmail = new SendTestEmail({ sender /* , the other adapters chosen here */ });
  return { sendTestEmail, logger /* , ... */ };
}
```

`get-container.ts` calls `parseConfig(process.env)` and `createContainer` on first use and keeps the result. Switching `EMAIL_DRIVER`, `RATE_LIMIT_DRIVER` or `BOT_DRIVER` between real and local adapters is a config change, never a code change.

## 5. Email design system and build pipeline

Email source is **separate from the website** and has its own mini-architecture.

### 5.1 Design tokens (`emails/tokens/tokens.json`)

Brand: **WDNusantara**. Warm, professional, Indonesian-rooted but not clichéd. Contrast ratios below were computed against WCAG 2.x; every pair passes AA (4.5:1 for normal text).

| Token           | Light     | Dark                                | Contrast (light / dark)                                           |
| --------------- | --------- | ----------------------------------- | ----------------------------------------------------------------- |
| `color.bg`      | `#FFFFFF` | `#0F1614`                           |                                                                   |
| `color.surface` | `#F4EFE6` | `#18221F`                           |                                                                   |
| `color.text`    | `#1B1F1E` | `#ECEFEA`                           | 16.65:1 on bg / 15.81:1                                           |
| `color.muted`   | `#555E5B` | `#A9B4AF`                           | 6.69:1 on bg, 5.84:1 on surface / 8.59:1 on bg, 7.64:1 on surface |
| `color.primary` | `#0F4C45` | `#0F4C45` (buttons keep their fill) | white text on it: 9.81:1                                          |
| `color.accent`  | `#F2A93B` | `#F2A93B`                           | ink `#1B1F1E` text on it: 8.34:1 (dark ink `#10201C`: 8.44:1)     |
| `color.link`    | `#0B6B61` | `#6FD6C8`                           | 6.38:1 on white / 10.59:1 on dark bg                              |

Type: system font stack with web-safe fallbacks (`Arial, Helvetica, sans-serif`), body 16 px, line height 1.5, headings 24 to 32 px. Spacing scale in 4 px steps. Content width 600 px.

### 5.2 Components

Each component is a small HTML partial with documented parameters and a documented Outlook fallback. Templates compose components and never repeat their markup.

| Component        | Purpose                                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| `header`         | Logo (light and dark variants), preheader, view-in-browser link                                           |
| `hero`           | Headline, supporting text, optional image with alt text                                                   |
| `button`         | "Bulletproof" button: HTML/CSS for modern clients, VML fallback for Outlook desktop, 44 px minimum height |
| `content-block`  | Heading plus paragraph, single column                                                                     |
| `post-list-item` | Avatar, title, meta (community digest)                                                                    |
| `event-card`     | Date badge, title, location or link                                                                       |
| `otp-code`       | High-contrast code display for transactional emails (roadmap)                                             |
| `footer`         | Company address, reason for receiving the email, preferences note                                         |

This table is the planned component set; `emails/components/` is the source of truth for what exists today.

### 5.3 Templates

| Template                               | Stream        | Story (fictional)                                                                           |
| -------------------------------------- | ------------- | ------------------------------------------------------------------------------------------- |
| `welcome`                              | Activation    | New NusaFlow workspace: create your first project, invite your team, connect billing        |
| `community-digest`                     | Engagement    | "WDNusantara Community" digest: featured post, three recent discussions, one upcoming event |
| `win-back`                             | Retention     | "Your workspace is waiting": shows what changed since the last login                        |
| `password-reset`, `otp-code` (roadmap) | Transactional | Security-focused, minimal, high contrast                                                    |

### 5.4 Build pipeline

The pipeline is a list of steps that each implement one interface, so new steps are added without modifying existing ones (Open/Closed). It is assembled in `emails/build/create-pipeline.ts`.

```ts
// emails/build/steps/build-step.ts
export interface BuildStep {
  readonly name: string;
  run(context: BuildContext): Promise<BuildContext>;
}
```

| Order | Step               | What it does                                                                                                                                                                          |
| ----- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | `Compose`          | Resolves component includes (`<!--@include name key="value"-->`) into the template. The custom delimiter lets runtime `{{ }}` merge tags pass through untouched                       |
| 2     | `Tokens`           | Replaces `[[token.name]]` design tokens and `[[param]]` component parameters with values                                                                                              |
| 3     | `PlaceholderGuard` | Fails the build if any `[[...]]` placeholder is left over                                                                                                                             |
| 4     | `InlineCss`        | Inlines CSS with `juice`, keeps the `<style>` block for media queries and dark mode, and keeps `<style data-embed>` blocks untouched                                                  |
| 5     | `DarkPreview`      | Creates a second copy where the `@media (prefers-color-scheme: dark)` rules apply unconditionally (rewritten to `@media all`), used only by the site's **simulated** dark mode toggle |
| 6     | `PlainText`        | Generates the plain-text alternative with `html-to-text`                                                                                                                              |
| 7     | `Lint`             | Runs the rule list below; errors fail the build                                                                                                                                       |

After the steps, `TemplateEmitter` writes `dist/emails/<id>.html`, `<id>.dark.html`, `<id>.txt` and a `manifest.json`. The build deletes the output folder first and fails if it finds zero templates.

**Lint rules** (each a class implementing `LintRule`, registered in one array):

| Rule                   | Fails when                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------- |
| `SizeBudgetRule`       | HTML is larger than 102 KB (Gmail clips larger messages); warns above 80% of the budget |
| `AltTextRule`          | An `<img>` has no `alt` attribute (decorative images use `alt=""`)                      |
| `LangAttributeRule`    | `<html lang>` is missing                                                                |
| `TitleRule`            | `<title>` is missing                                                                    |
| `PresentationRoleRule` | A layout `<table>` lacks `role="presentation"`                                          |
| `PreheaderRule`        | The hidden preheader element is missing                                                 |
| `MergeTagRule`         | A merge tag is not in the allowlist (`emails/build/merge-tags.ts`)                      |
| `LinkRule`             | A link is not `https:`, `mailto:`, `tel:` or a merge tag (vague link text only warns)   |

**Not lint rules:**

- **Contrast** is enforced by a test over the design tokens (WCAG AA, 4.5:1, light and dark), not by a lint rule. Any new color pair is checked before it is used.
- **`ImageWeightRule`** (per-image and total image budgets) is deferred until the templates contain images.

### 5.5 Email technical standards

- Table-based layout, `role="presentation"`, 600 px max width, fluid on mobile, single column under 480 px.
- Critical CSS inlined. Media queries and dark mode in a small `<style>` block.
- Outlook: MSO conditional comments, ghost tables for widths, VML buttons, `mso-line-height-rule`.
- Dark mode: `<meta name="color-scheme" content="light dark">`, `prefers-color-scheme`, Outlook.com `[data-ogsc]` and `[data-ogsb]` selectors, logo variants that survive colour inversion.
- Accessibility: `lang`, meaningful `alt`, contrast 4.5:1 or better, 16 px body, 44 px tap targets, descriptive link text, logical reading order, no information by colour alone.
- Images: optimised PNG or JPEG (Outlook desktop does not support WebP, so document any WebP use with a fallback). Hosted under `SITE_URL` with absolute HTTPS URLs.
- Merge tags use `{{firstName}}` syntax, compatible with Iterable and Lob. The app substitutes values itself through `MergeTagRenderer`, which **HTML-escapes** every value and only accepts allowlisted tag names.

### 5.6 Placeholders and conventions

Three placeholder syntaxes exist, and each is resolved at a different time:

| Syntax              | Meaning                                                                           | Resolved                                                                                               |
| ------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `[[color.primary]]` | Design token (dotted name)                                                        | Build time                                                                                             |
| `[[label]]`         | Component parameter. Values cannot contain double quotes                          | Build time                                                                                             |
| `{{firstName}}`     | Runtime merge tag. Never touched by the build; only allowlisted tags are accepted | Send or preview time, by `MergeTagRenderer` (HTML-escaped, single pass, unknown tags left as they are) |

Other conventions:

- **Preheader:** an element with `data-preheader data-text-skip`. The `data-text-skip` attribute keeps it out of the plain-text version.
- **Dark mode rules** inside `@media (prefers-color-scheme: dark)` must use `!important`, because inline styles would win otherwise.
- **`<style data-embed>`** holds client hacks that inlining would destroy, such as the Outlook.com selectors `[data-ogsc]` and `[data-ogsb]`.
- **Outlook desktop** ignores dark-mode media queries, so its VML button keeps the light-mode fill. This is documented in the case studies rather than hidden.
- **Adding a template:** add its id to `TEMPLATE_IDS` in `src/domain/value-objects/template-id.ts`, add `emails/templates/<id>.html` and `<id>.json` (`name`, `description`, `subject`), then run the build. A test requires the built ids to equal `TEMPLATE_IDS` exactly.

## 6. The send-test use case

**Input rules** (enforced by domain value objects, with shape checks by `zod` at the HTTP edge):

| Field                | Rules                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| `email`              | Required, valid, at most 254 characters, normalised to lower case                                |
| `firstName`          | Required, 1 to 40 characters, letters, spaces, hyphens, apostrophes                              |
| `subject`            | Optional, at most 80 characters, control characters and newlines rejected, default from template |
| `templateId`         | One of the known template ids                                                                    |
| `consent`            | Must be true                                                                                     |
| `botToken`           | Turnstile token. Required when `BOT_DRIVER=turnstile`; empty when no widget is rendered          |
| `website` (honeypot) | Defaults to empty. If filled, the request silently succeeds with no side effects                 |

**Order of work:** kill switch, then the honeypot check, then validation of every field, then the bot check, then the rate limits (IP, recipient, global), then template lookup, then render and send, then the event publish. A failing publisher is swallowed and logged as a warning.

**Limits** (each window is 24 hours; keys are HMAC hashes, never raw addresses or IPs):

| Limit         | Default                                                                                                              |
| ------------- | -------------------------------------------------------------------------------------------------------------------- |
| Per recipient | 1 per 24 hours                                                                                                       |
| Per client IP | 3 per 24 hours                                                                                                       |
| Global        | `GLOBAL_DAILY_CAP`, default 30, kept well under the provider's free daily limit so abuse cannot block your own demos |

When the global cap is reached, the site shows "demo limit reached today" and points to the previews and screenshots.

## 7. API contract

### 7.1 `POST /api/v1/test-sends`

JSON only, body at most 8 KB. Request:

```json
{
  "email": "reader@example.com",
  "firstName": "Rina",
  "subject": "Welcome to NusaFlow",
  "templateId": "welcome",
  "consent": true,
  "botToken": "<turnstile token>",
  "website": ""
}
```

`subject` is optional and `website` (the honeypot) defaults to empty.

| Status                       | Meaning                                                                                     | Body                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `202 Accepted`               | Email handed to the provider (also returned for a filled honeypot)                          | `{ "receiptId": "..." }`                                                  |
| `400 Bad Request`            | Invalid JSON, wrong shape, or validation failed (`INVALID_REQUEST`)                         | Problem details with `errors[{ field, message }]` listing every bad field |
| `403 Forbidden`              | Bot check failed (`BOT_CHECK_FAILED`)                                                       | Problem details                                                           |
| `404 Not Found`              | Unknown template (`TEMPLATE_NOT_FOUND`)                                                     | Problem details                                                           |
| `413 Content Too Large`      | Body above 8 KB                                                                             | Problem details                                                           |
| `415 Unsupported Media Type` | Body is not JSON                                                                            | Problem details                                                           |
| `429 Too Many Requests`      | A limit was hit (`RATE_LIMITED`)                                                            | Problem details plus `Retry-After` header                                 |
| `500 Internal Server Error`  | Unexpected fault (`INTERNAL_ERROR`); logged, nothing internal in the body                   | Problem details                                                           |
| `503 Service Unavailable`    | Temporarily unavailable: `SENDING_DISABLED`, `DAILY_CAP_REACHED` or `EMAIL_DELIVERY_FAILED` | Problem details                                                           |

Errors use **RFC 9457 problem details** (`application/problem+json`): `type`, `title`, `status`, `detail` and a stable machine-readable `code`, plus `errors` for validation. The mapping lives in one file, `presentation/http/map-error-to-http.ts`, which switches on `error.code` (never the class name), so use cases never know about HTTP.

The client IP comes from `x-real-ip`, else the first entry of `x-forwarded-for`, else `"unknown"` (one shared bucket). Whether the host overwrites these headers is verified after the first deploy.

### 7.2 `GET /preview/[id]/[variant]`

`variant` is `light`, `dark` (a simulated copy) or `text`. The route serves the built template with the sample name Rina, a strict Content-Security-Policy, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` and `Cache-Control: public, max-age=300, s-maxage=3600`.

## 8. Security and abuse prevention

This site exposes an email-sending endpoint to the public internet, so these controls are **required**, not optional.

- Fixed sender, fixed templates, no free-form body (prevents phishing and spam relay).
- Turnstile verification plus a hidden honeypot field.
- Per-recipient, per-IP and global limits (section 6), keyed by HMAC hashes.
- Subject sanitisation against header injection.
- All merge values HTML-escaped; only allowlisted merge tags.
- Kill switch: `SENDING_ENABLED=false` disables sending immediately without a deploy (change the variable and redeploy or use Vercel's environment update).
- No mailing list or database of addresses. Only HMAC hashes with a 24-hour TTL are stored, purely for rate limiting.
- Secrets only in environment variables, parsed with `zod` on first use (`parseConfig`). In production the app refuses `EMAIL_DRIVER=console`, `BOT_DRIVER=noop` and `RATE_LIMIT_DRIVER=memory`. Never commit `.env*` files except `.env.example`.
- Security headers through `next.config` (CSP, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`). Email previews render inside a sandboxed `iframe`, and the preview route sends its own strict CSP (section 7.2).
- Structured logs never contain raw email addresses, names or tokens.
- Dependabot (weekly) plus `npm audit --omit=dev --audit-level=high` in CI.
- Privacy note under the form: one-time demo email, no subscription, no list, hashed rate-limit keys for 24 hours.

## 9. Domains and DNS

Two different names, two different jobs:

| Name                                 | Job                                                  | On Vercel?                                                     |
| ------------------------------------ | ---------------------------------------------------- | -------------------------------------------------------------- |
| `inbox.wdnusantara.my.id` (proposed) | The portfolio website                                | **Yes**, add it to the Vercel project (Hobby plan)             |
| `mail.wdnusantara.my.id`             | **Sending domain only** (SPF, DKIM, DMARC alignment) | **No. DNS records only.** Do not attach it to a Vercel project |

Why: a sending subdomain needs mail-related DNS records (MX, TXT, DKIM). Attaching the same name to a website adds a competing record and gains nothing. Keeping them separate also isolates email reputation from the website.

### Setup steps

1. **Find where DNS is managed.** If the domain's nameservers point to Vercel, add records in _Vercel dashboard → Domains → DNS Records_. Otherwise add them at the registrar or DNS host that controls the nameservers.
2. **Add the sending domain in Resend** as `mail.wdnusantara.my.id`. Resend shows the exact DNS records to create (SPF, DKIM and a return-path entry). Copy them **exactly as displayed**.
3. **Add a DMARC record** for the sending subdomain, starting in monitoring mode: a `TXT` record at `_dmarc.mail` (that is, `_dmarc.mail.wdnusantara.my.id`) with `v=DMARC1; p=none;`. Adding `rua=mailto:<your address>` gets you aggregate reports. Tighten the policy (`quarantine`, then `reject`) only after reports look clean.
4. **Verify** in Resend, then send test emails to your own Gmail, Outlook.com, iCloud and Yahoo accounts. Check the headers show SPF, DKIM and DMARC as `pass`.
5. **Add `inbox.wdnusantara.my.id`** to the Vercel project and follow Vercel's DNS instructions.
6. **Set `EMAIL_FROM`** to a display name and address on the sending domain, for example `WDNusantara <hello@mail.wdnusantara.my.id>`, and set `EMAIL_REPLY_TO` to a mailbox you actually read.

> `.my.id` is an uncommon domain ending and some filters are stricter with those. If test messages land in spam, fix authentication and content first; if that is not enough, swap the `EmailSender` adapter for another free provider. This is exactly what the port is for.

## 10. Clean code conventions

**General**

- npm only (not pnpm); Node 24 through `.nvmrc`.
- In `.ts` files, write generic functions as declarations, not generic arrow functions (dependency-cruiser misreads the arrow form as JSX).
- Layer paths in the dependency rules end with a slash, and type-only imports are tracked.
- Relative imports within a layer; the `@/` alias across layers.
- Tests use hand-written fakes, not mocking libraries.

**Naming and structure**

- Names say what a thing is or does: `SendTestEmail`, `consumeRateLimit`, `isSendingEnabled`. No `Manager`, `Helper`, `Utils` dumping grounds.
- Files are `kebab-case`; classes and types `PascalCase`; functions and variables `camelCase`; constants `SCREAMING_SNAKE_CASE`.
- Named exports only. The only default exports are those Next.js requires (pages, layouts, route files).
- One concept per file. Aim for files under ~200 lines and functions under ~20 lines. Longer is allowed only with a reason.
- At most three positional parameters; beyond that, pass an options object.

**Type safety**

- TypeScript `strict: true`, plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`.
- No `any`. Use `unknown` and narrow. No non-null assertions (`!`) without a comment explaining why.
- Validate **all** external input (HTTP body, environment, file manifests) with `zod` at the boundary. Inside the core, trust the types.
- Prefer `readonly` and immutability. Domain objects are immutable. Optional props are written `T | undefined` (because of `exactOptionalPropertyTypes`).

**Behaviour**

- Expected failures are returned as `Result` values. Unexpected failures throw, are logged once at the boundary, and become a generic `500` (`INTERNAL_ERROR`). Errors are mapped to HTTP by `code`, never by class name.
- No magic numbers or strings: name them as constants or configuration (`MAX_SUBJECT_LENGTH`).
- Functions do one thing at one level of abstraction. Extract when a comment would be needed to explain a block.
- Comments explain **why**, not what. Delete commented-out code.
- No hidden globals or singletons outside the composition root. `process.env` is read only in `infrastructure/config/` and the lazy `get-*` wrappers.
- Side effects live in infrastructure. Domain and application code is deterministic, and time comes from a `Clock` port so tests are stable.
- A filled honeypot field returns success with no side effects.
- A failing event webhook doesn't fail the request.
- Limit order is IP, then recipient, then global.
- InvalidRequestError carries every invalid field.

**Frontend**

- Server Components by default; add `"use client"` only for interactivity (preview toggles, the form).
- Presentational components receive props and render. Data access happens in server components via use cases, never in leaf components.
- Accessible by construction: semantic elements, labels, focus states, live regions for form status, `prefers-reduced-motion`.

**Git and review**

- Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`), enforced by `commitlint`.
- Trunk-based: short-lived branches, small pull requests, squash merge. Semantic version tags for releases.
- Every pull request uses the checklist in [Definition of done](#17-definition-of-done).

## 11. Testing strategy

| Level         | Tooling                     | What it covers                                                                                                            | Target                                   |
| ------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Unit          | Vitest                      | Value objects, entities, use cases with fakes, adapters with a fake `fetch`, merge tag renderer                           | 90% minimum on every measured area       |
| Contract      | Vitest                      | One shared suite per port, run against the fake and (where possible) the real adapter; Upstash runs against `FakeUpstash` | `TemplateRepository`, `RateLimiter`      |
| Integration   | Vitest                      | The real built templates and the real container with fake adapters: status codes, problem details, `Retry-After`          | All documented statuses                  |
| Email build   | Vitest                      | Each template builds; lint rules pass; the token contrast test; built ids equal `TEMPLATE_IDS`                            | All templates                            |
| Accessibility | Playwright + axe            | The site (desktop and phone, light and dark, including the form error state) and every built email, light and dark        | No serious or critical violations        |
| End to end    | Playwright                  | Choose template, toggle mobile and dark preview, submit the form with console email and no real sends                     | Main user journeys                       |
| Rendering QA  | Manual + free preview tools | Real inbox tests and labelled screenshots                                                                                 | Each template, each client in the matrix |

**Coverage:** Vitest is configured in `vitest.config.mjs` with 90% thresholds for `domain`, `application`, `emails/build`, `infrastructure` and `presentation`. Excluded: ports, DTOs, `send-policy.ts`, `emails/build/cli.ts`, `src/presentation/components/**` and the three lazy `get-*` wrappers. The excluded components are covered by the Playwright and axe tests instead.

**Test doubles:** hand-written fakes in `tests/unit/support/` (fakes, clocks, fake `fetch`, `FakeUpstash`, build output helpers) instead of mocking libraries, so tests read as behaviour.

**Real-inbox matrix** (see `docs/qa/client-matrix.md`): Gmail web and mobile app, Outlook.com, iCloud / Apple Mail, Yahoo, in light and dark mode, plus images-off. Every screenshot on the site states the tool or device, client, date, and whether it is a **real render or a simulation**. Outlook desktop (Word rendering engine) is the hardest client to cover for free; if it cannot be tested, say so openly and show the MSO fallback code.

## 12. Tooling, CI and workflow

**Local quality gates** (Husky):

- `pre-commit`: lint-staged runs Prettier and ESLint on staged files.
- `commit-msg`: `commitlint` (Conventional Commits).
- `pre-push`: `typecheck`, `arch:check` and the tests. A push that breaks any of them is blocked.

`npm run verify` runs the whole local gate: `format:check`, `typecheck` (`tsc --noEmit`), `lint` (`eslint --max-warnings 0`), `arch:check` and `test:coverage`.

**CI** (`.github/workflows/ci.yml`), on every pull request and push to `main`, on the Node version in `.nvmrc`. Job `verify`:

1. Install from the lockfile.
2. `npm run format:check`
3. `npx next typegen`
4. `npm run typecheck`
5. `npm run lint`
6. `npm run arch:check` (dependency rule)
7. `npm test` (unit, contract, integration, email build)
8. `npm run build` (`emails:build`, which fails on any lint error, then `next build`)
9. `npm audit --omit=dev --audit-level=high`

A second job, `e2e`, runs in parallel: it installs Chromium (`npx playwright install --with-deps chromium`), runs `npm run test:e2e` against the dev server with console email, a no-op bot check and in-memory limits, and uploads the Playwright report.

Dependabot is configured weekly. Do not show a CI badge until a run on the current code is green.

**Deployment:** Vercel's Git integration deploys previews per pull request and production from `main`. Environment variables are set in Vercel, never committed.

**Linting:** ESLint with the Next.js config, run with `--max-warnings 0`. Layer boundaries are enforced by `dependency-cruiser`, not by ESLint.

## 13. Getting started

**Prerequisites:** Node 24 (see `.nvmrc`), npm, a GitHub account, a Vercel account, and free accounts for Resend, Cloudflare (Turnstile) and Upstash if you want the real services.

```bash
git clone git@github.com:SaptooAji/inbox-lab.git
cd inbox-lab
npm install
cp .env.example .env.local     # then fill in values (see section 14)
npm run dev                    # runs emails:build first, then Next.js
```

**Scripts:**

| Script                    | Purpose                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| `dev`                     | `emails:build`, then Next.js locally                                                                    |
| `build`                   | `emails:build`, then `next build`                                                                       |
| `emails:build`            | Run the email pipeline once                                                                             |
| `typecheck`               | `tsc --noEmit` (run `npx next typegen` first on a fresh checkout; CI does)                              |
| `lint`                    | `eslint --max-warnings 0`                                                                               |
| `arch:check`              | Dependency rule check with `dependency-cruiser`                                                         |
| `test`                    | Vitest (unit, contract, integration, email build)                                                       |
| `test:watch`              | Vitest in watch mode                                                                                    |
| `test:coverage`           | Vitest with the coverage thresholds                                                                     |
| `format` / `format:check` | Prettier write / check                                                                                  |
| `verify`                  | `format:check`, `typecheck`, `lint`, `arch:check`, `test:coverage`                                      |
| `test:e2e`                | Playwright and axe against a dev server on port 3100 (console email, no-op bot check, in-memory limits) |

**Local development without real services:** set `EMAIL_DRIVER=console`, `RATE_LIMIT_DRIVER=memory`, `BOT_DRIVER=noop`. The app works fully offline and prints the email instead of sending it.

**Local UI testing with the Turnstile widget:** set `BOT_DRIVER=turnstile` and use Cloudflare's public dummy keys (site key `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`; the accepted token is `XXXX.DUMMY.TOKEN.XXXX`), keeping `EMAIL_DRIVER=console` and `RATE_LIMIT_DRIVER=memory`. Restart `npm run dev` after any `.env.local` change. A real site key only renders on hostnames allowed in the Cloudflare dashboard.

## 14. Configuration

Configuration is parsed lazily with `zod` by `parseConfig` in `src/infrastructure/config/config.ts`. Values that the browser may see go through `parsePublicConfig` in `public-config.ts`. **A blank value counts as unset.** In production (`NODE_ENV=production`) the app refuses `EMAIL_DRIVER=console`, `BOT_DRIVER=noop` and `RATE_LIMIT_DRIVER=memory`. Commit `.env.example` with placeholders only; `.env.local` is git-ignored.

| Variable                                              | Default                                      | Purpose                                                                                    |
| ----------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `IDENTITY_HASH_SALT`                                  | required, at least 16 characters             | Key for hashing addresses and IPs (HMAC)                                                   |
| `SITE_URL`                                            | `http://localhost:3000`                      | Absolute URLs for email images and links                                                   |
| `LOG_LEVEL`                                           | `info`                                       | `debug`, `info`, `warn` or `error`                                                         |
| `SENDING_ENABLED`                                     | `true`                                       | Kill switch                                                                                |
| `GLOBAL_DAILY_CAP`                                    | `30`                                         | Global sends per day; keep well under the provider's daily limit                           |
| `PER_RECIPIENT_DAILY_LIMIT`                           | `1`                                          | Sends per recipient per 24 hours                                                           |
| `PER_IP_DAILY_LIMIT`                                  | `3`                                          | Sends per client IP per 24 hours                                                           |
| `EMAIL_DRIVER`                                        | `console`                                    | `resend` or `console`; `resend` needs `RESEND_API_KEY`                                     |
| `RESEND_API_KEY`                                      | none                                         | Resend credential (server only)                                                            |
| `EMAIL_FROM`                                          | `WDNusantara <hello@mail.wdnusantara.my.id>` | Fixed sender on the sending domain                                                         |
| `EMAIL_REPLY_TO`                                      | none                                         | A mailbox you read                                                                         |
| `BOT_DRIVER`                                          | `noop`                                       | `turnstile` or `noop`; `turnstile` needs `TURNSTILE_SECRET_KEY`                            |
| `TURNSTILE_SECRET_KEY`                                | none                                         | Server-side verification                                                                   |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`                      | none                                         | Client widget, read through `parsePublicConfig`; no key means no widget and an empty token |
| `RATE_LIMIT_DRIVER`                                   | `memory`                                     | `upstash` or `memory`; `upstash` needs the two variables below                             |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | none                                         | Upstash credentials                                                                        |
| `WEBHOOK_URL`                                         | none                                         | Enables the webhook publisher (Make or Zapier, P2)                                         |

## 15. Roadmap

Check items off as they ship. Order matters more than dates.

**Phase 0: Setup**

- [x] GitHub repository (public), Vercel project, `inbox.wdnusantara.my.id` attached
- [x] Resend domain `mail.wdnusantara.my.id` verified; SPF, DKIM, DMARC passing
- [x] Turnstile and Upstash accounts created
- [x] Project scaffold, strict TypeScript, ESLint, Prettier, Husky, commitlint
- [x] CI pipeline and architecture check green on an empty project

**Phase 1: Core (domain and application)**

- [x] Value objects, entities, errors, `Result`
- [x] Ports and the three use cases, fully unit-tested with fakes
- [x] Port contract tests

**Phase 2: Email system**

- [x] Tokens, components, build pipeline and lint rules
- [x] Template A `welcome`
- [x] Templates B `community-digest` and C `win-back`, with dark mode
- [x] Marketing templates D `plan-sale`, E `feature-reviews` and F `topic-digest`: announcement bar, nav, plan cards, promo code, rating summary, review cards, article cards, marketing footer
- [ ] Visual assets: original illustrations (hero art, product visuals, icons) hosted on the site, with alt text, dark-mode variants and the image-budget lint rule (`ImageWeightRule`) brought back

**Phase 3: Infrastructure and delivery**

- [x] Adapters: Resend, Upstash, Turnstile, file system, merge tags
- [x] Composition root and env validation
- [x] Route handler, problem details mapping, integration tests

**Phase 4: Site**

- [x] Gallery, preview frame (desktop, mobile, light, simulated dark, HTML and text views)
- [x] Send form with accessible states
- [ ] Proof gallery and pre-send checklist pages (the gallery and the how-it-is-built section are built; the gallery shows once the first real screenshot is added; checklist pages pending)
- [x] Playwright and axe tests

**Phase 5: QA and content**

- [ ] Real-inbox tests and labelled screenshots
- [ ] Free preview tool results, labelled real or simulated
- [ ] Case studies for each template

**Phase 6 (P1):** direct mail postcard and letter; Klaviyo welcome flow (private account); transactional pack (`password-reset`, `otp-code`); `docs/iterable-porting.md`

**Phase 7 (P2):** Make or Zapier webhook through `EventPublisher`; accessibility write-up

## 16. Architecture decision records

Keep short ADRs in `docs/adr/` using this shape: _Context, Decision, Consequences_. Start with:

| ADR  | Decision                                                                                                                               |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 0001 | Clean Architecture with a strict dependency rule inside a single Next.js package, enforced by tooling                                  |
| 0002 | Table-based email HTML with build-time CSS inlining instead of a framework that hides the markup                                       |
| 0003 | A restricted merge-tag renderer (allowlist, HTML-escaped) instead of a full template engine, for safety and Iterable/Lob compatibility |
| 0004 | Resend behind an `EmailSender` port so the provider can be swapped                                                                     |
| 0005 | Stateless design: no database; only hashed rate-limit keys with a TTL                                                                  |
| 0006 | Result values for expected failures, exceptions for unexpected ones                                                                    |
| 0007 | Separate sending subdomain (`mail`) from the website subdomain (`inbox`)                                                               |
| 0008 | Real-versus-simulated labelling for all rendering evidence                                                                             |

## 17. Definition of done

A change is done when:

- [ ] It follows the dependency rule (`npm run arch:check` passes)
- [ ] New logic has tests at the right level; `npm run test` passes (and `npm run test:e2e` for UI changes)
- [ ] `npm run typecheck` and `npm run lint` pass with no new warnings
- [ ] For email changes: `npm run emails:build` passes, size budget respected, alt text and contrast verified, dark mode checked
- [ ] Accessibility checked (keyboard, focus, labels, contrast)
- [ ] No secrets, raw personal data or debug logging committed
- [ ] Docs updated (this README, an ADR if a decision changed, case study if a template changed)
- [ ] Conventional Commit message; pull request reviewed against this list

---

**License:** choose one before publishing (MIT is common for portfolios). Do not reuse any brand assets, templates or screenshots created for a previous employer.
