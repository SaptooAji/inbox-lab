# HANDOFF: WDNusantara Inbox Lab

Last updated: 2026-10-02, after Phase 4 step 2 and the side-by-side layout tweak.
This file is the project's memory. Read it first in every new chat instead of re-reading history.

## 0. For the assistant: how to use this file

- You cannot see the repo. When a change touches existing files, ask the user to paste only those files (use the code map in section 6). Never ask for logs the user does not need to paste.
- Give the smallest change that works. Do not regenerate the README or whole files unless asked.
- Work test-first: write the failing tests, the user runs `npm test` and replies `red, N failed`, then give the code, then `npm run verify`.
- Before writing an adapter for a vendor (Resend, Turnstile, Upstash, Make, Lob, Klaviyo), check the vendor's current docs with a search. Do not rely on memory for request formats or limits.
- Compute contrast ratios (WCAG) for any new color pair before using it.
- Do not invent facts about the user's experience. Never claim Iterable experience. Label every rendering screenshot as a real client render or a simulation.
- The user has limited credit. Keep answers focused, and keep replies to what was asked.

## 1. The project

- **What:** a public portfolio site that proves technical email development skills for a Technical Email Developer role (Iterable or comparable ESP, hand-coded responsive HTML/CSS, dark mode, WCAG accessibility, modular templates, API/webhook integrations, direct mail HTML).
- **Brand:** WDNusantara, a software vendor that builds products for clients. Fictional demo SaaS: **NusaFlow** (client project and invoicing portal). Never use real brands, logos or photos.
- **Owner:** Sapto Aji. Windows, Git Bash (MINGW64), VS Code.
- **Repo:** `SaptooAji/inbox-lab` on GitHub (SSH remote). Local path `~/PortfolioProjects/inbox-lab`. Work happens on branch `preview`; `main` exists. The repo is currently **private** and will be made public later.
- **Constraints the user chose:** zero recurring cost; **no Amazon SES**; **no Kiro**; **npm** (not pnpm); Node 24 (`.nvmrc` is `24`, `engines` is `>=24`).
- **Domains:** `wdnusantara.my.id` (owned, on Vercel). `mail.wdnusantara.my.id` is the **sending-only** subdomain (DNS records only, never attached to a Vercel project). The site should live on a separate name, proposed `inbox.wdnusantara.my.id`. Resend was connected to the domain through its Vercel integration, which adds the DNS records.
- **Related docs:** `README.md` (architecture blueprint) and `PRD_Email_Dev_Portfolio.md` (requirements, v2: zero cost, no SES, no Litmus). Where they differ, README wins on architecture and brand. Section 14 lists where the code has drifted from the README.

## 2. Tech stack (all free)

Next.js 16.3.7 (App Router, Turbopack), React 19, TypeScript strict (plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), Tailwind CSS v4 (`@import "tailwindcss"`, `@theme inline`), zod (v4 style, `z.url()`), Vitest 5.0.2, dependency-cruiser, Prettier, ESLint (`--max-warnings 0`), Husky, lint-staged, commitlint. Email build: `juice`, `html-to-text`, `cheerio`, `tsx`. Hosting target: Vercel Hobby. Sending: Resend (free tier). Bot check: Cloudflare Turnstile. Rate limiting: Upstash Redis (REST). No SDKs for the vendors: plain `fetch` behind ports.

## 3. Working agreement with the user

- Reply format the user uses after each step: `red, N failed` for the red phase, `green, pushed` after `npm run verify` plus push, or only the first failing lines on a failure. Do not ask for `npm run format` output or full coverage tables.
- Commands the user runs (Git Bash): `npm run format`, then `npm run verify && git add -A && git commit -m "<conventional message>" && git push`.
- When a test of mine is wrong, say so plainly and fix the test (this happened several times: sync-throw assertions, a size-budget threshold, a missing `fetch` option).
- Open built emails with `start dist/emails/<name>.html` in Git Bash.

## 4. Status

| Phase  | Scope                                                                                                                                 | Status                                                                                                                                                             |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0      | Setup, repo, CI, hooks, accounts                                                                                                      | Done, with open items in section 5                                                                                                                                 |
| 1      | Domain and application layers, 100% covered                                                                                           | Done                                                                                                                                                               |
| 2      | Email system: tokens, components, build pipeline, lint, 3 templates                                                                   | Done                                                                                                                                                               |
| 3      | Adapters, config, composition root, HTTP route                                                                                        | Done, real Resend, Upstash and Turnstile calls verified manually                                                                                                   |
| 4      | Site                                                                                                                                  | Steps 1 and 2 done: template explorer, preview route, send form with Turnstile, shared template selection, side-by-side layout from 1280px. **Step 3 not started** |
| 5      | QA and content                                                                                                                        | Not started                                                                                                                                                        |
| 6 (P1) | Direct mail (postcard, letter), Klaviyo flow (private), transactional pack (`password-reset`, `otp-code`), `docs/iterable-porting.md` | Not started                                                                                                                                                        |
| 7 (P2) | Make or Zapier webhook scenario, accessibility write-up                                                                               | Adapter exists, no scenario yet                                                                                                                                    |

**Next step: Phase 4 step 3.**

- Playwright plus `@axe-core/playwright`: keyboard flow of the send form, explorer toggles, mobile and dark layouts, no serious or critical axe violations. Components are excluded from Vitest coverage, so these tests are their safety net.
- Proof gallery section, **data-driven**: a manifest in `public/proof/` lists each screenshot with template, client or device, light or dark, date, and real versus simulated. It must render sensibly with an empty list, because the user deferred collecting screenshots (Gmail web and app look fine to them). Driven by a data file, and hidden while there are no entries.
- "How it is built" section (component library, QA checklist, performance numbers).
- Case studies under `docs/case-studies/`.
- Add the e2e job to CI once it passes locally.

## 5. Open items

**Confirmed on 2026-10-02 (from real Gmail headers):** SPF passes (return path `send.mail.wdnusantara.my.id`); DKIM passes and is aligned (`d=mail.wdnusantara.my.id`, `s=resend`); the sending domain is verified in Resend and `EMAIL_FROM` uses it (`WDNusantara <support@mail.wdnusantara.my.id>`); the email arrived and looks fine in Gmail web and app; CI and Dependabot work (after the billing issue was resolved). DMARC record _dmarc.mail published (p=none), dmarc=pass seen; EMAIL_REPLY_TO set.

1. **Prettier rewrites the email source** (`npm run format` and `format:check` include the HTML). The delivered HTML shows Prettier reflowing MSO conditional comments (`><xml` splits) and VML styles. Add `emails/components/` and `emails/templates/*.html` to `.prettierignore`.
2. **Plain-text polish (optional):** the text version contains non-breaking spaces and one blank spacer line, from `&nbsp;` in `header.html` and `card-end.html`. Use a normal space in the header, and add `data-text-skip` to the `card-end` cell.
3. **Real-client rendering evidence** (Gmail, Outlook.com, iCloud/Apple Mail, Yahoo; light and dark; images off): deferred by the user. Free preview tools (Unspam, MailViewr, MailSlurp render were advertised as free) are untested vendor claims; record real versus simulated.
4. The README patch list in section 14 has not been applied.
5. Move the PRD: `git mv PRD_Email_Dev_Portfolio.md docs/PRD_Email_Dev_Portfolio.md` (`docs/` is a folder at the repo root).
6. `AGENTS.md` and `CLAUDE.md` at the repo root (generated by create-next-app 16) are for AI coding agents in the repo and are unrelated to this file. They have not been reviewed. Delete them with `git rm AGENTS.md CLAUDE.md` if no agent tool is used on the repo.
7. Branch protection on `main` is not set. As far as known, GitHub Free does not enforce it on private repos; revisit when the repo goes public.

## 6. Code map

```
src/
  domain/            result.ts, errors/{domain-error,validation-error}.ts,
                     value-objects/{email-address,recipient-name,email-subject,template-id}.ts,
                     entities/email-template.ts
  application/       errors/application-errors.ts, send-policy.ts, dto/{send-test-email,template}.dto.ts,
                     mappers/template-summary.ts, ports/*.ts,
                     use-cases/{send-test-email,list-templates,get-template}.ts
  infrastructure/    config/{config,public-config}.ts, container.ts, template-services.ts,
                     get-container.ts, get-template-services.ts, get-public-config.ts (lazy wrappers),
                     http/{fetch-like,read-field}.ts, email/{console,resend}-email-sender.ts,
                     bot/{noop,turnstile}-bot-verifier.ts, rate-limit/{in-memory,upstash}-rate-limiter.ts,
                     events/{noop,webhook}-event-publisher.ts, logging/json-logger.ts,
                     security/hmac-identity-hasher.ts, time/system-clock.ts,
                     templates/{file-system-template-repository,merge-tag-renderer}.ts
  presentation/      http/{handle-test-send,handle-preview,map-error-to-http,problem-details,
                     request-schemas,client-ip}.ts, preview/preview-options.ts,
                     forms/send-form-outcome.ts,
                     components/{segmented-control.tsx, template-explorer/{template-explorer,preview-frame}.tsx,
                     send-form/{send-form,text-field,turnstile-widget}.tsx, send-form/turnstile-loader.ts,
                     inbox-lab/inbox-lab.tsx}
  app/               layout.tsx, page.tsx, globals.css, api/v1/test-sends/route.ts,
                     preview/[id]/[variant]/route.ts
emails/              tokens/tokens.json, components/*.html, templates/*.{html,json}, build/** (see section 8)
tests/               unit/ (mirrors src, plus support/), contract/, integration/
docs/                (adr/, case-studies/, qa/ folders exist, mostly empty)
dist/emails/         generated, git-ignored
```

**Layer rule (enforced by `npm run arch:check`):** domain imports nothing, not even npm packages or Node built-ins. Application imports domain only. Infrastructure imports application and domain. Presentation imports application and domain, never infrastructure. `src/app` may import infrastructure (route files are the wiring). Layer paths in `.dependency-cruiser.cjs` end with a slash, and type-only imports are tracked. `emails/` is a separate build tool and is not scanned.

**`SendTestEmail` order of work:** kill switch (`SENDING_DISABLED`) → filled honeypot returns a success receipt with no side effects → validate everything (`InvalidRequestError` lists every bad field) → bot check → rate limits in the order IP, recipient, global → template lookup → render and send → publish event (a failing publisher is swallowed and logged as a warning). Each limit window is 24 hours, keyed by HMAC hashes, never raw values. Expected failures are `Result` values; exceptions are for faults.

**Ports:** `BotVerifier`, `Clock`, `EmailSender`, `EventPublisher`, `IdentityHasher`, `Logger`, `RateLimiter`, `TemplateRenderer` (returns `{html, darkHtml, text}`), `TemplateRepository`. Contract suites exist for `TemplateRepository` and `RateLimiter` (run against fakes and real adapters; Upstash runs against `FakeUpstash`).

**Adapter failure policy:** Resend problems return an error `Result` (becomes 503). Turnstile outages, Upstash outages and webhook failures throw (becomes a logged 500, except the webhook, which the use case swallows). A refused Turnstile token returns `false` (403). Messages and logs never contain keys, URLs, addresses or provider text.

## 7. HTTP surface

- `POST /api/v1/test-sends`: JSON only (415 otherwise), body at most 8 KB (413), invalid JSON 400, bad shape 400. Success is `202 {receiptId}`. Errors are RFC 9457 problem details with a stable `code`: `INVALID_REQUEST` 400 (with `errors[{field,message}]`), `BOT_CHECK_FAILED` 403, `TEMPLATE_NOT_FOUND` 404, `RATE_LIMITED` 429 (with `Retry-After`), `DAILY_CAP_REACHED` / `SENDING_DISABLED` / `EMAIL_DELIVERY_FAILED` 503, unexpected faults 500 (`INTERNAL_ERROR`, logged, nothing internal in the body). The mapper switches on `error.code`, never the class name.
- Request body fields: `email`, `firstName`, `subject?`, `templateId`, `consent`, `botToken`, `website` (honeypot, defaults to empty). The form's honeypot input is named `contact_me_by_fax_only` (avoids browser autofill) and maps to `website`.
- Client IP: `x-real-ip`, else first `x-forwarded-for`, else `"unknown"` (one shared bucket). Whether Vercel overwrites these headers is **unverified**; check after the first deploy.
- `GET /preview/[id]/[variant]`, variant is `light`, `dark` (simulated copy) or `text`. Serves the rendered template (sample name Rina) with a strict CSP, `nosniff`, `no-referrer`, and `public, max-age=300, s-maxage=3600`. In Next 15 and 16, route `params` is a Promise.

## 8. The email system (`emails/`)

**Pipeline (`emails/build/create-pipeline.ts`):** Compose → Tokens → PlaceholderGuard → InlineCss (juice) → DarkPreview → PlainText → Lint, then `TemplateEmitter` writes `dist/emails/<id>.html`, `<id>.dark.html`, `<id>.txt` and a `manifest.json`. The build deletes the output folder first and fails on zero templates. Run with `npm run emails:build` (also runs before `npm run dev` and `npm run build`).

**Three placeholder syntaxes, each resolved at a different time:**

- `[[color.primary]]` design token (dotted), build time.
- `[[label]]` component parameter, build time. Values cannot contain double quotes.
- `{{firstName}}` runtime merge tag, never touched by the build. The only allowed tag is in `emails/build/merge-tags.ts`. The runtime `MergeTagRenderer` HTML-escapes values, replaces in one pass, and leaves unknown tags as they are.
- Any leftover `[[...]]` fails the build.
- Include syntax: `<!--@include name key="value"-->`. Components are `emails/components/<name>.html`.

**Conventions:**

- Table-based layout, every layout table has `role="presentation"`, 600 px width (`layout.width` token), single column under 480 px.
- Preheader: an element with `data-preheader data-text-skip`. Dark mode rules inside `@media (prefers-color-scheme: dark)` must use `!important` (inline styles win otherwise). Client hacks that inlining would destroy (`[data-ogsc]`, `[data-ogsb]` for Outlook.com dark mode) go in `<style data-embed>`; this is verified to work with the installed juice.
- Dark mode in the explorer is a **simulated** copy (the media query rewritten to `@media all`). Outlook desktop ignores dark media queries, so its VML button stays teal; document this in the case study.
- Lint rules (errors fail the build): HTML at most 102 KB (warning above 80%), `lang`, `<title>`, `role="presentation"`, preheader present, `alt` on every image, links must be `https:`, `mailto:`, `tel:` or a merge tag (vague link text is a warning), only allowlisted merge tags. Contrast is enforced as a test over the tokens (WCAG AA 4.5:1, light and dark). `ImageWeightRule` is not implemented because there are no images yet.
- Templates: `welcome`, `community-digest`, `win-back`, each `emails/templates/<id>.html` plus `<id>.json` (`name`, `description`, `subject`). **To add a template:** add its id to `TEMPLATE_IDS` in `src/domain/value-objects/template-id.ts`, add the html and json, build. A test requires the built ids to equal `TEMPLATE_IDS` exactly.
- Brand tokens: primary `#0F4C45`, accent `#F2A93B`, surface `#F4EFE6`, dark bg `#0F1614`, dark surface `#18221F` (full set in `emails/tokens/tokens.json`).

## 9. Configuration

Parsed lazily by `parseConfig` (zod). Blank values count as unset. In production (`NODE_ENV=production`) the app refuses `EMAIL_DRIVER=console`, `BOT_DRIVER=noop` and `RATE_LIMIT_DRIVER=memory`. `.env.local` is git-ignored; `.env.example` is committed.

| Variable                         | Default                                      | Notes                                                                       |
| -------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------- |
| `IDENTITY_HASH_SALT`             | required                                     | at least 16 characters                                                      |
| `SITE_URL`                       | `http://localhost:3000`                      |                                                                             |
| `LOG_LEVEL`                      | `info`                                       | debug, info, warn, error                                                    |
| `SENDING_ENABLED`                | `true`                                       | kill switch                                                                 |
| `GLOBAL_DAILY_CAP`               | `30`                                         | keep well under the provider's daily limit                                  |
| `PER_RECIPIENT_DAILY_LIMIT`      | `1`                                          | the user raised it locally while testing                                    |
| `PER_IP_DAILY_LIMIT`             | `3`                                          |                                                                             |
| `EMAIL_DRIVER`                   | `console`                                    | `resend` needs `RESEND_API_KEY`                                             |
| `EMAIL_FROM`                     | `WDNusantara <hello@mail.wdnusantara.my.id>` |                                                                             |
| `EMAIL_REPLY_TO`                 | none                                         | a mailbox you read                                                          |
| `BOT_DRIVER`                     | `noop`                                       | `turnstile` needs `TURNSTILE_SECRET_KEY`                                    |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | none                                         | read through `parsePublicConfig`; no key means no widget and an empty token |
| `RATE_LIMIT_DRIVER`              | `memory`                                     | `upstash` needs `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`     |
| `WEBHOOK_URL`                    | none                                         | enables the webhook publisher (Make or Zapier)                              |

**Local UI testing recipe:** `BOT_DRIVER=turnstile`, Cloudflare's public dummy pair (site key `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`, accepted token `XXXX.DUMMY.TOKEN.XXXX`), `EMAIL_DRIVER=console`, `RATE_LIMIT_DRIVER=memory`. Restart `npm run dev` after any `.env.local` change. A real Turnstile site key only renders on hostnames allowed in the Cloudflare dashboard (add `localhost` and the real domains).

## 10. Services and accounts

- **Resend:** free tier (around 3,000 emails a month and 100 a day when checked; re-verify). The domain `mail.wdnusantara.my.id` is verified and real emails are delivered. Resend relays through Amazon SES infrastructure (visible in the headers); our code never touches SES. A real email was sent and received. A bounce happened once because a test address was mistyped; use your own address with a `+tag` (`yourname+tag@gmail.com`), or `delivered@resend.dev`, never someone else's. The headers show Resend delivers through Amazon SES's network (`amazonses.com` DKIM, SES hostnames); the user has no SES account involved, so do not describe the portfolio as using no SES infrastructure at all.
- **Upstash:** real limiter verified (202 then 429, keys under `ratelimit:`).
- **Turnstile:** dummy keys verified end to end; the browser widget with real keys works per the user's last checks.
- **Not available for free:** Iterable (no free plan or self-serve trial found; the templates use compatible `{{ }}` merge tags and will get porting notes only). Litmus (trial already used at a previous employer; do not open a second account for another trial, and do not reuse that employer's work).
- **Planned:** Klaviyo free plan (250 profiles, 500 emails a month) for a private lifecycle flow; Make or Zapier free tier for the webhook scenario; Lob test environment for direct mail validation if free (verify).

## 11. Testing and quality gates

- Scripts: `dev`, `build` (`emails:build` then `next build`), `emails:build`, `typecheck` (runs `next typegen` first), `lint` (`eslint --max-warnings 0`), `arch:check`, `test`, `test:watch`, `test:coverage`, `format`, `format:check`, **`verify`** (format:check, typecheck, lint, arch:check, test:coverage).
- Hooks: `pre-commit` runs lint-staged; `commit-msg` runs commitlint (Conventional Commits); `pre-push` runs typecheck, arch:check and tests. A push that breaks any of them is blocked; that has caught real mistakes several times.
- Coverage thresholds are 90% (domain, application, `emails/build`, infrastructure, presentation), currently near 100%. Excluded: ports, DTOs, `send-policy.ts`, `emails/build/cli.ts`, `src/presentation/components/**`, and the three lazy `get-*` wrappers.
- Test style: hand-written fakes instead of mocking libraries (`tests/unit/support/`: `fakes`, `unwrap`, `clocks`, `build-output`, `fake-fetch`, `rejection`, `fake-upstash`). Test folders mirror `src/`. Integration tests build the real templates and run the real container with fakes.
- CI (`.github/workflows/ci.yml`): format check, typecheck, lint, arch check, test, build, `npm audit --omit=dev --audit-level=high`; Node comes from `.nvmrc`. Dependabot is configured weekly. CI and Dependabot were confirmed working on 2026-10-02.

## 12. Coding conventions

- Named exports only, except the default exports Next.js requires. Files are kebab-case.
- Relative imports within a layer, the `@/` alias across layers.
- In `.ts` files write generic functions as **function declarations**, not generic arrow functions (dependency-cruiser misreads the arrow form as JSX).
- Expected failures are `Result` values; exceptions are for faults. Map errors by `code`.
- No `any`, no non-null assertions. Validate all external input with zod at the edge; the domain value objects own the specific rules and messages.
- Optional props are written `T | undefined` (because of `exactOptionalPropertyTypes`). Options objects when a function needs more than three parameters.
- `process.env` is read only in `config/` and the lazy `get-*` wrappers. Logs never contain addresses, names, IPs or tokens.
- Accessibility by construction: labels, `aria-describedby`/`aria-invalid`, live regions, visible focus, `prefers-reduced-motion`, 44 px tap targets in emails.
- Site tokens and contrast: pairs verified at 4.5:1 or better for text, and at least 3:1 for control borders and focus rings.

## 13. Known limitations and decisions

- The sending subdomain (`mail`) and the site subdomain (`inbox`) are deliberately separate.
- `.my.id` is an uncommon domain ending, so inbox placement needs checking (open item 1). If it lands in spam after fixing authentication, swap the `EmailSender` adapter (for example Mailtrap's free tier); that is what the port is for.
- Free rendering evidence will be weaker than a paid Litmus run. Outlook desktop (Word engine) is the hardest client to cover free; say so openly and show the MSO fallback code.
- The Vercel deploy is **not done**. Before the first deploy:
  1. `next.config.ts` needs `outputFileTracingIncludes` so serverless functions can read `dist/emails` at runtime (the send route and the preview route both read it).
  2. Set all environment variables in Vercel for Production and Preview, using the real drivers and the default limits (1 per recipient, 3 per IP).
  3. Add the real site hostname to the Turnstile widget's allowed hostnames.
  4. Attach `inbox.wdnusantara.my.id` to the Vercel project (not `mail.`).
  5. Verify the client IP headers, add the DMARC record (start at `p=none`), merge `preview` into `main`.

## 14. README patch list (round 2, not yet applied)

1. Folder tree: `result.ts` lives in `domain/`; add `application/mappers/`, `dto/template.dto.ts`, `send-policy.ts`; `infrastructure/{http,time}`, `template-services.ts`, the `get-*` wrappers, `config/public-config.ts`; `presentation/{preview,forms}` and the component folders; the preview route; the `tests/{contract,integration,unit/support}` layout.
2. `SendTestEmail` takes one `deps` object. The renderer returns `{html, darkHtml, text}`; the use case owns the subject.
3. Behaviors: honeypot silently succeeds; a failing event publisher is swallowed; limit order is IP, recipient, global; `InvalidRequestError` carries every field.
4. API: unexpected faults are 500 (503 means temporarily unavailable); 415 for non-JSON; 413 above 8 KB; problem details carry `code`.
5. Adapters: plain `fetch` for Resend, Turnstile, Upstash (`/multi-exec`) and the webhook, no SDKs, no `@upstash/ratelimit`, no `pino` (`JsonLogger` instead); the hasher is `HmacIdentityHasher`.
6. Email: `ContrastRule` became a token contrast test; `ImageWeightRule` is deferred; document the three placeholder syntaxes, the preheader convention, `data-embed` styles, the emitter and manifest.
7. Tooling: npm, Node 24 via `.nvmrc`, `typecheck` runs `next typegen`, `lint` is `eslint --max-warnings 0`, `verify` script, `vitest.config.mjs`.
8. Conventions: function-declaration generics in `.ts`, trailing slash in layer paths, type-only imports tracked, hand-written fakes.
9. Config: public config, blank equals unset, the production guard, `PER_RECIPIENT_DAILY_LIMIT` and `PER_IP_DAILY_LIMIT` in the variable table.
10. Site: preview route with CSP, Turnstile widget, honeypot field name, side-by-side layout from `xl`.
11. Do not show a CI badge until a run on the current code is green.

## 15. Honest claims for the CV once the portfolio is finished

- Built a modular HTML email component library and three responsive, accessible, dark-mode-ready templates.
- Tested rendering across major clients using real inboxes and preview tools, and documented fixes.
- Built an API-driven email sending service with rate limiting and bot protection.
- Built a lifecycle flow in Klaviyo (only if that P1 item is completed).
- Wrote Iterable-compatible templates with porting notes (this is not Iterable experience).
- Already on the CV: transactional email templates (welcome, password reset, OTP) tested in Litmus and delivered through an AWS queue and Amazon SES at a previous job. The portfolio adds the lifecycle and marketing side that experience lacks.

## 16. Application context

- Target job: Technical Email Developer (Iterable or similar, direct mail HTML, Make or Zapier, accessibility, US team).
- Files made earlier in the first chat: an ATS-friendly CV (`Sapto_Aji_CV_ATS.docx`) and a cover letter (`Sapto_Aji_Cover_Letter.docx`). They may not exist in a new chat; keep the downloaded copies.
- Assumptions in those files, **confirmed as accurate by the user on 2026-10-02:** the email work is attributed to the most recent role (Healthcare Platform, Dragatron); templates are described as "worked on"; the cover letter says the user will adjust hours to overlap with the US team until 2:00 PM Eastern Time (about 1:00 AM in Jakarta). The AWS queue service is still not named; if it is SQS, say so and add it (a useful ATS keyword).
- The Cloud Practitioner item is the Dicoding course made with AWS (AWS x Dicoding Academy), which states that its exam matches the AWS one. It is still a Dicoding credential, not an AWS-issued certification, so word it as a course (for example "Cloud Practitioner Essentials, AWS x Dicoding Academy") and never as "AWS Certified Cloud Practitioner".
- Update the CV and cover letter after the portfolio is live: add the portfolio URL, and add the Litmus and SES work only as far as the user confirms.
