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

| Concern             | Choice                                               | Cost                                                                       |
| ------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------- |
| Framework           | Next.js (App Router), React, TypeScript (strict)     | Free                                                                       |
| Styling (site only) | Tailwind CSS                                         | Free                                                                       |
| Hosting             | Vercel Hobby (personal, non-commercial use)          | Free                                                                       |
| Sending             | Resend free plan behind an `EmailSender` port        | Free (verify current limits at sign-up; listed at 3,000/month and 100/day) |
| Bot protection      | Cloudflare Turnstile                                 | Free                                                                       |
| Rate limiting       | Upstash Redis free tier                              | Free (verify limits)                                                       |
| Validation          | `zod`                                                | Free                                                                       |
| Logging             | `pino` (structured JSON)                             | Free                                                                       |
| Email build         | Node scripts, `juice` (CSS inlining), `html-to-text` | Free                                                                       |
| Tests               | Vitest, Playwright, `@axe-core/playwright`           | Free                                                                       |
| CI                  | GitHub Actions (free for public repositories)        | Free                                                                       |
| Domain              | `wdnusantara.my.id` (already owned)                  | Already paid                                                               |

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

| Layer                                          | May import                                        | Must not import                                         |
| ---------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------- |
| `domain`                                       | nothing (pure TypeScript)                         | everything else, including `zod`, Node APIs, frameworks |
| `application`                                  | `domain`                                          | `infrastructure`, `presentation`, Next.js, vendor SDKs  |
| `infrastructure`                               | `application`, `domain`, vendor SDKs              | `presentation`                                          |
| `presentation` (`src/app`, `src/presentation`) | `application`, `domain`, and the composition root | vendor SDKs directly, business rules                    |

The rule is **enforced in CI** with `dependency-cruiser` (or `eslint-plugin-boundaries`). A violation fails the build. Run it locally with `pnpm arch:check`.

### 3.2 Layer responsibilities

- **Domain.** Business concepts and invariants that would stay true if we changed every tool. Value objects such as `EmailAddress`, `RecipientName` and `EmailSubject` validate themselves on creation and cannot exist in an invalid state. Entities such as `EmailTemplate` describe what a template is. Domain errors are plain classes.
- **Application.** One class per use case (`SendTestEmail`, `ListTemplates`, `GetTemplate`). Use cases orchestrate domain objects through **ports** (interfaces they own). They contain no framework code and no vendor code.
- **Infrastructure.** Adapters that implement ports: `ResendEmailSender`, `UpstashRateLimiter`, `TurnstileBotVerifier`, `FileSystemTemplateRepository`, `MergeTagRenderer`, `WebhookEventPublisher`. Also includes in-memory and console adapters used in tests and local development.
- **Presentation.** Thin adapters to the outside world. Route handlers parse HTTP, call one use case, and map the result to HTTP. React components render data and hold UI state only.
- **Composition root.** `src/infrastructure/container.ts` is the only place that decides which adapter implements which port. Everything else receives its dependencies through constructors.

### 3.3 Folder structure

```
wdnusantara-inbox-lab/
├─ src/
│  ├─ domain/
│  │  ├─ entities/                 email-template.ts
│  │  ├─ value-objects/            email-address.ts  recipient-name.ts  email-subject.ts  template-id.ts
│  │  ├─ errors/                   domain-error.ts  validation-error.ts
│  │  └─ index.ts
│  ├─ application/
│  │  ├─ ports/                    email-sender.ts  template-repository.ts  template-renderer.ts
│  │  │                            rate-limiter.ts  bot-verifier.ts  event-publisher.ts
│  │  │                            clock.ts  logger.ts  identity-hasher.ts
│  │  ├─ use-cases/                send-test-email.ts  list-templates.ts  get-template.ts
│  │  ├─ dto/                      send-test-email.dto.ts
│  │  ├─ errors/                   application-errors.ts
│  │  └─ result.ts                 Result<T, E> helpers
│  ├─ infrastructure/
│  │  ├─ email/                    resend-email-sender.ts  console-email-sender.ts
│  │  ├─ templates/                file-system-template-repository.ts  merge-tag-renderer.ts
│  │  ├─ rate-limit/               upstash-rate-limiter.ts  in-memory-rate-limiter.ts
│  │  ├─ bot/                      turnstile-bot-verifier.ts  noop-bot-verifier.ts
│  │  ├─ events/                   webhook-event-publisher.ts  noop-event-publisher.ts
│  │  ├─ security/                 sha256-identity-hasher.ts
│  │  ├─ logging/                  pino-logger.ts
│  │  ├─ config/                   env.ts                      (zod-validated environment)
│  │  └─ container.ts              (composition root)
│  ├─ presentation/
│  │  ├─ http/                     problem-details.ts  map-error-to-http.ts  request-schemas.ts
│  │  └─ components/               template-gallery/  preview-frame/  send-test-form/  proof-gallery/
│  └─ app/                         layout.tsx  page.tsx  api/v1/test-sends/route.ts
├─ emails/                         (email design system, see section 5)
│  ├─ tokens/                      tokens.json
│  ├─ components/                  header.html  hero.html  button.html  content-block.html  post-list-item.html
│  │                               event-card.html  otp-code.html  footer.html
│  ├─ templates/                   welcome.html  community-digest.html  win-back.html
│  ├─ assets/                      (source images)
│  └─ build/                       pipeline.ts  steps/  lint/  cli.ts
├─ dist/emails/                    (generated, git-ignored)
├─ public/                         email images (served via absolute URLs), proof/ screenshots
├─ tests/
│  ├─ unit/                        domain/  application/  infrastructure/
│  ├─ contract/                    port contract suites
│  ├─ integration/                 route handler tests with fake adapters
│  ├─ email/                       lint + snapshot tests for built templates
│  └─ e2e/                         Playwright specs
├─ docs/
│  ├─ PRD_Email_Dev_Portfolio.md
│  ├─ adr/                         0001-...md
│  ├─ case-studies/                welcome.md  community-digest.md  win-back.md
│  ├─ qa/                          pre-send-checklist.md  client-matrix.md
│  └─ iterable-porting.md
├─ .github/workflows/ci.yml
├─ .dependency-cruiser.cjs
├─ README.md
└─ package.json
```

### 3.4 Request flow (send a test)

```
Browser form
   │  POST /api/v1/test-sends
   ▼
app/api/v1/test-sends/route.ts        (presentation: parse, validate shape, call use case)
   ▼
SendTestEmail.execute(dto)            (application: orchestrate)
   ├─ EmailAddress / RecipientName / EmailSubject.create()   (domain: invariants)
   ├─ BotVerifier.verify(token)                               (port → Turnstile adapter)
   ├─ RateLimiter.consume(...)  ×3                            (port → Upstash adapter)
   ├─ TemplateRepository.findById(id)                         (port → file system adapter)
   ├─ TemplateRenderer.render(template, mergeValues)          (port → merge tag adapter)
   ├─ EmailSender.send(message)                               (port → Resend adapter)
   └─ EventPublisher.publish(event)                           (port → webhook adapter, optional)
   ▼
Result<SendReceipt, SendTestError>   →  mapped to HTTP status + problem details
```

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
// src/application/ports/email-sender.ts
export interface OutgoingEmail {
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly text: string;
}

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

```ts
// src/application/use-cases/send-test-email.ts
export class SendTestEmail {
  constructor(
    private readonly botVerifier: BotVerifier,
    private readonly rateLimiter: RateLimiter,
    private readonly templates: TemplateRepository,
    private readonly renderer: TemplateRenderer,
    private readonly sender: EmailSender,
    private readonly events: EventPublisher,
    private readonly hasher: IdentityHasher,
    private readonly policy: SendPolicy, // caps and kill switch, plain data
  ) {}

  async execute(input: SendTestEmailInput): Promise<Result<SendReceipt, SendTestEmailError>> {
    if (!this.policy.sendingEnabled) return err(new SendingDisabledError());

    const request = TestSendRequest.create(input); // builds value objects
    if (!request.ok) return request;

    const human = await this.botVerifier.verify(input.botToken, input.clientIp);
    if (!human) return err(new BotCheckFailedError());

    const limited = await this.enforceLimits(request.value, input.clientIp);
    if (!limited.ok) return limited;

    const template = await this.templates.findById(request.value.templateId);
    if (!template) return err(new TemplateNotFoundError(request.value.templateId));

    const rendered = this.renderer.render(template, {
      firstName: request.value.recipientName.value,
    });
    const sent = await this.sender.send({ to: request.value.email.value, ...rendered });
    if (!sent.ok) return sent;

    await this.events.publish({ type: "test-email.sent", templateId: template.id.value });
    return ok({ receiptId: sent.value.providerMessageId });
  }

  private async enforceLimits(
    /* ... */
  ): Promise<Result<void, RateLimitedError | DailyCapReachedError>> {
    /* ... */
  }
}
```

`Result<T, E>` is a small discriminated union (`{ ok: true; value } | { ok: false; error }`). Expected failures are **values**, not exceptions. Exceptions are reserved for programmer errors and unexpected infrastructure faults.

### 4.4 Composition root

```ts
// src/infrastructure/container.ts
import { env } from "./config/env";

export function createContainer() {
  const logger = new PinoLogger(env.LOG_LEVEL);
  const sender: EmailSender =
    env.EMAIL_DRIVER === "resend"
      ? new ResendEmailSender(env.RESEND_API_KEY, env.EMAIL_FROM, env.EMAIL_REPLY_TO)
      : new ConsoleEmailSender(logger);

  const sendTestEmail = new SendTestEmail(/* adapters chosen here */);
  return { sendTestEmail, listTemplates, getTemplate, logger };
}
```

Switching `EMAIL_DRIVER`, `RATE_LIMIT_DRIVER` or `BOT_DRIVER` between real and local adapters is a config change, never a code change.

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

### 5.3 Templates

| Template                               | Stream        | Story (fictional)                                                                           |
| -------------------------------------- | ------------- | ------------------------------------------------------------------------------------------- |
| `welcome`                              | Activation    | New NusaFlow workspace: create your first project, invite your team, connect billing        |
| `community-digest`                     | Engagement    | "WDNusantara Community" digest: featured post, three recent discussions, one upcoming event |
| `win-back`                             | Retention     | "Your workspace is waiting": shows what changed since the last login                        |
| `password-reset`, `otp-code` (roadmap) | Transactional | Security-focused, minimal, high contrast                                                    |

### 5.4 Build pipeline

The pipeline is a list of steps that each implement one interface, so new steps are added without modifying existing ones (Open/Closed).

```ts
// emails/build/steps/build-step.ts
export interface BuildStep {
  readonly name: string;
  run(context: BuildContext): Promise<BuildContext>;
}
```

| Order | Step              | What it does                                                                                                                                                       |
| ----- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1     | `ComposeStep`     | Resolves component includes into the template. Uses a custom delimiter (for example `<!--@include header-->`) so runtime `{{ }}` merge tags pass through untouched |
| 2     | `TokenStep`       | Replaces design tokens with values                                                                                                                                 |
| 3     | `InlineCssStep`   | Inlines CSS with `juice`, keeps the `<style>` block for media queries and dark mode                                                                                |
| 4     | `DarkPreviewStep` | Creates a second copy where the `@media (prefers-color-scheme: dark)` rules apply unconditionally, used only by the site's "simulated dark mode" toggle            |
| 5     | `PlainTextStep`   | Generates the plain-text alternative with `html-to-text`                                                                                                           |
| 6     | `LintStep`        | Runs the rule list below; errors fail the build                                                                                                                    |
| 7     | `EmitStep`        | Writes `dist/emails/<template>.html`, `.dark.html`, `.txt` and `manifest.json`                                                                                     |

**Lint rules** (each a class implementing `LintRule`, registered in one array):

| Rule                   | Fails when                                                                              |
| ---------------------- | --------------------------------------------------------------------------------------- |
| `SizeBudgetRule`       | HTML is larger than 102 KB (Gmail clips larger messages)                                |
| `AltTextRule`          | An `<img>` has no `alt` attribute (decorative images use `alt=""`)                      |
| `LangAttributeRule`    | `<html lang>` is missing                                                                |
| `TitleRule`            | `<title>` is missing                                                                    |
| `PresentationRoleRule` | A layout `<table>` lacks `role="presentation"`                                          |
| `ContrastRule`         | A token pair used for text fails 4.5:1                                                  |
| `PreheaderRule`        | Hidden preheader text is missing                                                        |
| `MergeTagRule`         | A merge tag is not in the documented allowlist                                          |
| `LinkRule`             | A link is empty, uses `#`, or lacks `https`                                             |
| `ImageWeightRule`      | A single image exceeds its budget (default 100 KB) or total image weight exceeds budget |

### 5.5 Email technical standards

- Table-based layout, `role="presentation"`, 600 px max width, fluid on mobile, single column under 480 px.
- Critical CSS inlined. Media queries and dark mode in a small `<style>` block.
- Outlook: MSO conditional comments, ghost tables for widths, VML buttons, `mso-line-height-rule`.
- Dark mode: `<meta name="color-scheme" content="light dark">`, `prefers-color-scheme`, Outlook.com `[data-ogsc]` and `[data-ogsb]` selectors, logo variants that survive colour inversion.
- Accessibility: `lang`, meaningful `alt`, contrast 4.5:1 or better, 16 px body, 44 px tap targets, descriptive link text, logical reading order, no information by colour alone.
- Images: optimised PNG or JPEG (Outlook desktop does not support WebP, so document any WebP use with a fallback). Hosted under `SITE_URL` with absolute HTTPS URLs.
- Merge tags use `{{firstName}}` syntax, compatible with Iterable and Lob. The app substitutes values itself through `MergeTagRenderer`, which **HTML-escapes** every value and only accepts allowlisted tag names.

## 6. The send-test use case

**Input rules** (enforced by domain value objects, with shape checks by `zod` at the HTTP edge):

| Field                | Rules                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------ |
| `email`              | Required, valid, at most 254 characters, normalised to lower case                                |
| `firstName`          | Required, 1 to 40 characters, letters, spaces, hyphens, apostrophes                              |
| `subject`            | Optional, at most 80 characters, control characters and newlines rejected, default from template |
| `templateId`         | One of the known template ids                                                                    |
| `consent`            | Must be true                                                                                     |
| `botToken`           | Required Turnstile token                                                                         |
| `website` (honeypot) | Must be empty                                                                                    |

**Limits** (all keys are salted SHA-256 hashes, never raw addresses or IPs):

| Limit         | Default                                                                                                              |
| ------------- | -------------------------------------------------------------------------------------------------------------------- |
| Per recipient | 1 per 24 hours                                                                                                       |
| Per client IP | 3 per 24 hours                                                                                                       |
| Global        | `GLOBAL_DAILY_CAP`, default 30, kept well under the provider's free daily limit so abuse cannot block your own demos |

When the global cap is reached, the site shows "demo limit reached today" and points to the previews and screenshots.

## 7. API contract

### `POST /api/v1/test-sends`

Request:

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

| Status                    | Meaning                                                | Body                                      |
| ------------------------- | ------------------------------------------------------ | ----------------------------------------- |
| `202 Accepted`            | Email handed to the provider                           | `{ "receiptId": "..." }`                  |
| `400 Bad Request`         | Validation failed                                      | Problem details with `errors[]` per field |
| `403 Forbidden`           | Bot check failed                                       | Problem details                           |
| `404 Not Found`           | Unknown template                                       | Problem details                           |
| `429 Too Many Requests`   | A limit was hit                                        | Problem details plus `Retry-After` header |
| `503 Service Unavailable` | Kill switch on, daily cap reached, or provider failure | Problem details                           |

Errors use **RFC 9457 problem details** (`application/problem+json`): `type`, `title`, `status`, `detail`, plus `errors` for validation. The mapping lives in one file, `presentation/http/map-error-to-http.ts`, so use cases never know about HTTP.

## 8. Security and abuse prevention

This site exposes an email-sending endpoint to the public internet, so these controls are **required**, not optional.

- Fixed sender, fixed templates, no free-form body (prevents phishing and spam relay).
- Turnstile verification plus a hidden honeypot field.
- Per-recipient, per-IP and global limits (section 6).
- Subject sanitisation against header injection.
- All merge values HTML-escaped; only allowlisted merge tags.
- Kill switch: `SENDING_ENABLED=false` disables sending immediately without a deploy (change the variable and redeploy or use Vercel's environment update).
- No mailing list or database of addresses. Only salted hashes with a 24-hour TTL are stored, purely for rate limiting.
- Secrets only in environment variables. Validate them at startup with `zod`; fail fast if missing. Never commit `.env*` files except `.env.example`.
- Security headers through `next.config` (CSP, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`). Email previews render inside a sandboxed `iframe`.
- Structured logs never contain raw email addresses, names or tokens.
- Dependabot or Renovate plus `pnpm audit` in CI.
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
3. **Add a DMARC record** for the domain, starting in monitoring mode, for example a `TXT` record at `_dmarc.wdnusantara.my.id` with `v=DMARC1; p=none; rua=mailto:<your address>`. Tighten the policy (`quarantine`, then `reject`) only after reports look clean.
4. **Verify** in Resend, then send test emails to your own Gmail, Outlook.com, iCloud and Yahoo accounts. Check the headers show SPF, DKIM and DMARC as `pass`.
5. **Add `inbox.wdnusantara.my.id`** to the Vercel project and follow Vercel's DNS instructions.
6. **Set `EMAIL_FROM`** to a display name and address on the sending domain, for example `WDNusantara <hello@mail.wdnusantara.my.id>`, and set `EMAIL_REPLY_TO` to a mailbox you actually read.

> `.my.id` is an uncommon domain ending and some filters are stricter with those. If test messages land in spam, fix authentication and content first; if that is not enough, swap the `EmailSender` adapter for another free provider. This is exactly what the port is for.

## 10. Clean code conventions

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
- Prefer `readonly` and immutability. Domain objects are immutable.

**Behaviour**

- Expected failures are returned as `Result` values. Unexpected failures throw, are logged once at the boundary, and become a generic `503`.
- No magic numbers or strings: name them as constants or configuration (`MAX_SUBJECT_LENGTH`).
- Functions do one thing at one level of abstraction. Extract when a comment would be needed to explain a block.
- Comments explain **why**, not what. Delete commented-out code.
- No hidden globals or singletons outside the composition root. No reading `process.env` outside `infrastructure/config/env.ts`.
- Side effects live in infrastructure. Domain and application code is deterministic, and time comes from a `Clock` port so tests are stable.

**Frontend**

- Server Components by default; add `"use client"` only for interactivity (preview toggles, the form).
- Presentational components receive props and render. Data access happens in server components via use cases, never in leaf components.
- Accessible by construction: semantic elements, labels, focus states, live regions for form status, `prefers-reduced-motion`.

**Git and review**

- Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`), enforced by `commitlint`.
- Trunk-based: short-lived branches, small pull requests, squash merge. Semantic version tags for releases.
- Every pull request uses the checklist in [Definition of done](#17-definition-of-done).

## 11. Testing strategy

| Level         | Tooling                     | What it covers                                                                                     | Target                                   |
| ------------- | --------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Unit          | Vitest                      | Value objects, entities, use cases with in-memory fakes, merge tag renderer                        | 90%+ lines on `domain` and `application` |
| Contract      | Vitest                      | One shared suite per port, run against the in-memory adapter and (where possible) the real adapter | Every port                               |
| Integration   | Vitest                      | Route handler with fake adapters: status codes, problem details, `Retry-After`                     | All documented statuses                  |
| Email build   | Vitest                      | Each template builds; lint rules pass; size and merge tags snapshot-tested                         | All templates                            |
| Accessibility | Playwright + axe            | Site pages and keyboard flows                                                                      | No serious or critical violations        |
| End to end    | Playwright                  | Choose template, toggle mobile and dark preview, submit the form with a fake sender                | Main user journeys                       |
| Rendering QA  | Manual + free preview tools | Real inbox tests and labelled screenshots                                                          | Each template, each client in the matrix |

**Test doubles:** hand-written in-memory fakes (`InMemoryRateLimiter`, `FakeEmailSender`, `FixedClock`) instead of mocking libraries, so tests read as behaviour.

**Real-inbox matrix** (see `docs/qa/client-matrix.md`): Gmail web and mobile app, Outlook.com, iCloud / Apple Mail, Yahoo, in light and dark mode, plus images-off. Every screenshot on the site states the tool or device, client, date, and whether it is a **real render or a simulation**. Outlook desktop (Word rendering engine) is the hardest client to cover for free; if it cannot be tested, say so openly and show the MSO fallback code.

## 12. Tooling, CI and workflow

**Local quality gates** (Husky + lint-staged): Prettier and ESLint on staged files, `tsc --noEmit` on push, `commitlint` on commit messages.

**CI** (`.github/workflows/ci.yml`), on every pull request and push to `main`:

1. Install with a frozen lockfile.
2. `pnpm typecheck`
3. `pnpm lint`
4. `pnpm arch:check` (dependency rule)
5. `pnpm test` (unit, contract, integration)
6. `pnpm emails:build` (fails on any lint error or size budget breach)
7. `pnpm build`
8. `pnpm test:e2e` (Playwright, with fake adapters)
9. `pnpm audit --prod`

**Deployment:** Vercel's Git integration deploys previews per pull request and production from `main`. Environment variables are set in Vercel, never committed.

**ESLint essentials:** `@typescript-eslint` strict type-checked config, `eslint-plugin-boundaries` or `dependency-cruiser` for layers, `jsx-a11y`, `import/no-cycle`, `no-restricted-imports` (vendor SDKs only inside `infrastructure`).

## 13. Getting started

**Prerequisites:** Node.js (current LTS), pnpm, a GitHub account, a Vercel account, free accounts for Resend, Cloudflare (Turnstile) and Upstash.

```bash
# 1. Create the project
pnpm dlx create-next-app@latest wdnusantara-inbox-lab \
  --ts --eslint --app --src-dir --tailwind --import-alias "@/*"
cd wdnusantara-inbox-lab

# 2. Runtime dependencies
pnpm add zod resend @upstash/redis pino juice html-to-text

# 3. Development dependencies
pnpm add -D vitest @vitest/coverage-v8 @playwright/test @axe-core/playwright \
  dependency-cruiser prettier husky lint-staged @commitlint/cli \
  @commitlint/config-conventional tsx @types/html-to-text

# 4. Environment
cp .env.example .env.local     # then fill in values (see section 14)

# 5. Build the emails, then run the site
pnpm emails:build
pnpm dev
```

**Scripts** (add to `package.json`):

| Script         | Purpose                                          |
| -------------- | ------------------------------------------------ |
| `dev`          | Start Next.js locally                            |
| `build`        | `emails:build` then `next build`                 |
| `emails:build` | Run the email pipeline once                      |
| `emails:watch` | Rebuild emails on change                         |
| `emails:lint`  | Run only the email lint rules                    |
| `typecheck`    | `tsc --noEmit`                                   |
| `lint`         | ESLint                                           |
| `arch:check`   | `depcruise src --config .dependency-cruiser.cjs` |
| `test`         | Vitest (unit, contract, integration, email)      |
| `test:e2e`     | Playwright                                       |
| `format`       | Prettier                                         |

**Local development without real services:** set `EMAIL_DRIVER=console`, `RATE_LIMIT_DRIVER=memory`, `BOT_DRIVER=noop`. The app works fully offline and prints the email instead of sending it.

## 14. Configuration

All configuration is read and validated in `src/infrastructure/config/env.ts`. Commit `.env.example` with placeholders only.

| Variable                                              | Example                                      | Purpose                                  |
| ----------------------------------------------------- | -------------------------------------------- | ---------------------------------------- |
| `SITE_URL`                                            | `https://inbox.wdnusantara.my.id`            | Absolute URLs for email images and links |
| `EMAIL_DRIVER`                                        | `resend` or `console`                        | Chooses the `EmailSender` adapter        |
| `RESEND_API_KEY`                                      | `re_...`                                     | Resend credential (server only)          |
| `EMAIL_FROM`                                          | `WDNusantara <hello@mail.wdnusantara.my.id>` | Fixed sender                             |
| `EMAIL_REPLY_TO`                                      | `you@...`                                    | A mailbox you read                       |
| `BOT_DRIVER`                                          | `turnstile` or `noop`                        | Chooses the `BotVerifier` adapter        |
| `TURNSTILE_SECRET_KEY`                                |                                              | Server-side verification                 |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`                      |                                              | Client widget                            |
| `RATE_LIMIT_DRIVER`                                   | `upstash` or `memory`                        | Chooses the `RateLimiter` adapter        |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` |                                              | Upstash credentials                      |
| `IDENTITY_HASH_SALT`                                  | long random string                           | Salt for hashing addresses and IPs       |
| `SENDING_ENABLED`                                     | `true`                                       | Kill switch                              |
| `GLOBAL_DAILY_CAP`                                    | `30`                                         | Global sends per day                     |
| `WEBHOOK_URL`                                         |                                              | Optional Make or Zapier endpoint (P2)    |
| `LOG_LEVEL`                                           | `info`                                       | Logging verbosity                        |

## 15. Roadmap

Check items off as they ship. Order matters more than dates.

**Phase 0: Setup**

- [ ] GitHub repository (public), Vercel project, `inbox.wdnusantara.my.id` attached
- [ ] Resend domain `mail.wdnusantara.my.id` verified; SPF, DKIM, DMARC passing
- [ ] Turnstile and Upstash accounts created
- [ ] Project scaffold, strict TypeScript, ESLint, Prettier, Husky, commitlint
- [ ] CI pipeline and architecture check green on an empty project

**Phase 1: Core (domain and application)**

- [ ] Value objects, entities, errors, `Result`
- [ ] Ports and the three use cases, fully unit-tested with fakes
- [ ] Port contract tests

**Phase 2: Email system**

- [ ] Tokens, components, build pipeline and lint rules
- [ ] Template A `welcome`
- [ ] Templates B `community-digest` and C `win-back`, with dark mode

**Phase 3: Infrastructure and delivery**

- [ ] Adapters: Resend, Upstash, Turnstile, file system, merge tags
- [ ] Composition root and env validation
- [ ] Route handler, problem details mapping, integration tests

**Phase 4: Site**

- [ ] Gallery, preview frame (desktop, mobile, light, simulated dark, HTML and text views)
- [ ] Send form with accessible states
- [ ] Proof gallery and pre-send checklist pages
- [ ] Playwright and axe tests

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

- [ ] It follows the dependency rule (`pnpm arch:check` passes)
- [ ] New logic has tests at the right level; `pnpm test` passes
- [ ] `pnpm typecheck` and `pnpm lint` pass with no new warnings
- [ ] For email changes: `pnpm emails:build` passes, size budget respected, alt text and contrast verified, dark mode checked
- [ ] Accessibility checked (keyboard, focus, labels, contrast)
- [ ] No secrets, raw personal data or debug logging committed
- [ ] Docs updated (this README, an ADR if a decision changed, case study if a template changed)
- [ ] Conventional Commit message; pull request reviewed against this list

---

**License:** choose one before publishing (MIT is common for portfolios). Do not reuse any brand assets, templates or screenshots created for a previous employer.
