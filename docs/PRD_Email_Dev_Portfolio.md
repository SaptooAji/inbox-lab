# PRD: Email Developer Portfolio ("Inbox Lab")

**Owner:** Sapto Aji
**Status:** Draft v2 (zero-cost stack, no SES, no Litmus)
**Date:** 30 Sep 2026
**Purpose:** Prove hands-on technical email development skills for a Technical Email Developer role (Iterable or comparable ESP, hand-coded responsive HTML/CSS, dark mode, WCAG accessibility, modular template systems, API/webhook integrations, direct mail HTML).

---

## 1. Problem and goal

My CV shows strong front-end and integration work but no email or marketing-operations experience. A hiring manager for an email role will not take my word for it. They will want to see real emails, real rendering results and real code.

**Goal:** One public Next.js site where a reviewer can, in under two minutes, see three polished emails, preview them on desktop, mobile, light and dark, see proof they render across major inboxes, and send a test to their own inbox. A technical reviewer can then open the repository and find a modular template system, accessible markup, and clean automation.

**What "done" looks like:**

- 3 production-quality email templates built from one shared component library
- Real rendering evidence (real-inbox tests plus free-tier preview tools, each labelled) for each template
- A safe, rate-limited "send me a test" feature
- A short case study per template explaining decisions and trade-offs
- A public GitHub repository with a clear README

## 2. Tooling (researched 30 Sep 2026): zero recurring cost

| Need                | Tool                                          | Cost         | Notes                                                                                                               |
| ------------------- | --------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------- |
| Hosting             | Next.js on Vercel Hobby                       | $0           | Hobby is for personal, non-commercial use, which fits a portfolio                                                   |
| Domain              | Existing .my.id domain                        | Already paid | Send from a subdomain (for example `mail.<yourdomain>.my.id`) so email reputation stays separate from the main site |
| Sending API         | Resend, free plan                             | $0           | 3,000 emails/month and 100/day; verify at sign-up. Amazon SES deliberately not used                                 |
| Bot protection      | Cloudflare Turnstile                          | $0           |                                                                                                                     |
| Rate limiting       | Upstash Redis free tier                       | $0           | Verify limits at sign-up                                                                                            |
| Rendering proof     | Real inbox tests plus free-tier preview tools | $0           | See section 8                                                                                                       |
| Real ESP experience | Klaviyo free plan                             | $0           | 250 profiles, 500 emails/month. The job posting lists Klaviyo as comparable to Iterable                             |
| Automation (P2)     | Make or Zapier free tier                      | $0           | Small monthly caps; verify                                                                                          |
| Direct mail (P1)    | Lob test environment                          | Verify       | May be free; fallback is local PDF export                                                                           |
| Iterable            | Not available                                 | n/a          | No free plan or self-serve trial found. Templates use compatible merge syntax plus porting notes only               |

**Notes**

- **Litmus is out.** The trial was already used at a previous job. Do not open a second account to get another trial, and do not reuse any screenshots, templates or brand assets made for that employer.
- **Domain check (Phase 0, first hour).** Resend verifies a domain through DNS records, so a .my.id domain should work, but this has not been confirmed. If verification fails, or test emails land in spam at Gmail, Outlook.com or iCloud, the fallback is another free sender such as Mailtrap (listed at 4,000/month and 150/day by a third-party comparison; verify).
- **Free tiers change.** Re-check every limit on the vendor's pricing page when you sign up.

## 3. Audience

1. **Hiring manager / recruiter:** skims for 2 minutes. Needs visual proof and plain-language explanation.
2. **Technical reviewer (email lead or marketing ops):** opens the code. Looks for tables-based layout, Outlook fallbacks, dark mode handling, accessibility, modularity and QA discipline.

## 4. Scope

### P0 (must ship)

- Design system and component library for email
- Three templates (see section 6)
- Next.js single-page site with template gallery and live preview
- "Send me a test" form with abuse protection
- Rendering proof gallery (real screenshots)
- README and three short case studies

### P1 (should ship)

- Direct mail showcase: one postcard (6x4 in) and one letter (8.5x11 in) in print HTML/CSS with merge variables, exported as PDF previews
- One real Klaviyo welcome flow built by me (private account), documented with screenshots and a short screen recording
- Iterable porting notes document

### P2 (nice to have)

- Webhook on successful send to Make or Zapier that logs to a spreadsheet or Slack, documented as an automation example
- Plain-text version viewer next to each template
- Accessibility audit write-up (contrast table, screen-reader notes)

### Non-goals

- User accounts, template editor, or a WYSIWYG builder
- Free-form message body (prevents phishing and spam abuse)
- Bulk sending, subscriptions, or storing a mailing list
- Claiming Iterable or Litmus expertise beyond what is actually done

## 5. Site requirements (single page)

**Sections, in order:**

1. **Hero:** one-line pitch, links to GitHub and CV.
2. **Template gallery:** three cards. Selecting one opens a large preview.
3. **Preview controls:** desktop / mobile width toggle, light / dark toggle, "View HTML", "View plain text".
4. **Try it:** the send form (section 7).
5. **Proof:** rendering screenshots per template and client, with the date and tool noted.
6. **How it is built:** component library diagram, QA checklist, performance numbers.
7. **Direct mail (P1):** postcard and letter previews.
8. **Case studies:** three short write-ups.

**Preview implementation notes**

- Render each email in a sandboxed `iframe` using `srcdoc`.
- The mobile toggle resizes the iframe to 375 px width.
- An iframe cannot be forced into the viewer's dark mode, so the build step outputs a second copy of each email where the dark-mode `@media (prefers-color-scheme: dark)` block is rewritten as unconditional styles. The dark toggle swaps to that copy. Label it "simulated dark mode" and let the real-client dark screenshots carry the proof.

**Site quality:** Lighthouse accessibility 95+, performance 90+, keyboard navigable, visible focus states, `prefers-reduced-motion` respected.

## 6. Email templates

Use a **fictional brand** with original assets. Do not use real brand names, logos or photos.

| #   | Template                 | Lifecycle stream       | What it proves                                                                                                                             |
| --- | ------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| A   | **Welcome / onboarding** | Activation             | Hero, 3-step module, bulletproof button (VML fallback for Outlook), personalization, preheader                                             |
| B   | **Community digest**     | Engagement / community | Modular blocks (featured post, post list with avatars, event card). Mirrors a Circle-style community newsletter. Shows reusable components |
| C   | **Win-back offer**       | Retention              | Dark mode logo and image handling, image-off fallback, strong contrast, responsive layout change                                           |

### Email technical standards (every template)

- **Layout:** table-based, `role="presentation"` on layout tables, 600 px max width, fluid on mobile, single-column stack under 480 px.
- **CSS:** inline CSS for critical styles (via build step), small `<style>` block for media queries and dark mode. No reliance on external CSS.
- **Outlook:** MSO conditional comments, `mso-line-height-rule`, VML bulletproof button, ghost tables for width control.
- **Dark mode:** `<meta name="color-scheme" content="light dark">`, `@media (prefers-color-scheme: dark)`, Outlook.com selectors (`[data-ogsc]`, `[data-ogsb]`), logo and image variants that survive inversion.
- **Accessibility (WCAG 2.2 AA target):** `lang` attribute, document `<title>`, meaningful `alt` text (empty `alt` for decorative images), text contrast 4.5:1 or better, body text 16 px or larger, tap targets 44 px or larger, descriptive link text, logical reading order, no information conveyed by colour alone.
- **Performance:** HTML under 102 KB (Gmail clips larger messages), each image optimised, total image weight documented. Use optimised PNG or JPEG for compatibility; document where WebP is or is not safe to use, because Outlook desktop does not support it.
- **Personalization:** merge tags written as `{{firstName}}` so the same source ports to Iterable and Lob (both use Handlebars-style tags). Include a fallback value pattern.
- **Text version:** every email ships a generated plain-text alternative.
- **Preheader:** hidden preheader text with padding characters.

### Modular system

- Source lives in `/emails`: `components/` (header, hero, button, content block, list item, event card, footer), `templates/` (A, B, C), `tokens.json` (colours, type scale, spacing).
- A Node build script composes components into templates. Use a custom delimiter for build-time includes so that `{{ }}` runtime merge tags pass through untouched.
- The build inlines CSS (for example with `juice`), creates the dark-preview copy, generates plain text, reports file size, and fails the build if a template exceeds 102 KB or an image lacks `alt`.
- Output goes to `/dist/emails`, which the Next.js site reads at build time.

## 7. "Send me a test" feature

**Fields**

| Field            | Rules                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| Recipient email  | Required, valid format, max 254 chars                                                            |
| First name       | Required, 1-40 chars, letters, spaces, hyphens and apostrophes only. HTML-escaped before merging |
| Subject          | Optional, max 80 chars, newlines stripped. Defaults to the template's built-in subject           |
| Template         | Required, radio with preview thumbnails (A, B or C)                                              |
| Consent checkbox | Required: "Send me this one-time demo email. I understand I am not subscribing to anything."     |
| Honeypot field   | Hidden, must stay empty                                                                          |
| Turnstile token  | Required                                                                                         |

**Flow:** form submit calls `POST /api/send`, which validates input, verifies Turnstile, applies rate limits, renders the chosen template with escaped merge values, sends HTML plus text through Resend from a fixed sender, and returns a generic success or error. The button shows loading, success and error states with accessible live-region announcements.

**Abuse controls (required, because this is an email-sending endpoint on the public internet)**

- Fixed sender address and fixed templates; no custom body
- Turnstile plus honeypot
- Limits: 1 send per recipient per 24 h, 3 per IP per 24 h, and a global daily cap well below the provider's free limit
- Reject subjects containing control characters (header injection)
- Kill switch environment variable that disables sending instantly
- No mailing list: store only a salted hash of the address with a 24 h expiry, purely for rate limiting
- Short privacy note under the form
- Domain set up with SPF, DKIM and DMARC before launch

## 8. Rendering and QA plan (no paid tools)

**Layer 1, automated (every build):** HTML under 102 KB, every image has `alt`, contrast check on the design tokens, all links resolve, plain-text version generated.

**Layer 2, real inboxes (required):** send each template to my own Gmail (web and mobile app), Outlook.com, iCloud/Apple Mail and Yahoo accounts. Capture screenshots on real devices in light and dark mode. Test with images off.

**Layer 3, free-tier preview tools:** sign up for two or three tools that advertise free previews (for example Unspam, MailViewr, MailSlurp's free render). These are vendor claims I have not tested. Some tools only simulate clients by stripping unsupported CSS, so for each tool record whether it uses real client renders or a simulation.

**Labelling rule:** every screenshot on the site states the tool or device, the client, the date, and whether it is a real render or a simulation. Never mock or edit screenshots.

**Known gap:** Outlook desktop (Word rendering engine) is the hardest client to cover for free. Use a free tool that offers real Outlook desktop previews if one does; otherwise say so openly, show the MSO fallback code, and explain the approach in the case study. Experience with Litmus from a previous role can be discussed truthfully in interviews without showing that employer's work.

**Pre-send QA checklist (published on the site):** client matrix, dark mode, images off, links, alt text, contrast, merge-tag fallbacks, plain text, size, preheader, unsubscribe and footer, spam trigger review.

## 9. Direct mail (P1)

- **Postcard 6x4 in**, front and back, with bleed and safe zones, address block area respected.
- **Letter 8.5x11 in** with return address and recipient window zone.
- Print HTML/CSS with merge variables (`{{name}}`, `{{address}}`), web-safe or embedded fonts, 300 dpi imagery.
- Validate in the Lob test environment if free signup is available; otherwise export PDFs with a headless browser during the build on my own machine (not on Vercel).
- Document print-specific pitfalls in a short case study.

## 10. Klaviyo private flow (P1)

Build one real welcome flow in a Klaviyo free account: trigger, delay, email using Template A as custom HTML, dynamic profile properties, basic segmentation. Document with screenshots and a short recording. Keep it private, since the 250-profile free cap makes a public signup unsafe.

## 11. Technical architecture

- **Frontend and API:** Next.js (App Router), TypeScript, Tailwind CSS, deployed on Vercel Hobby.
- **Validation:** `zod` on the server.
- **Sending:** Resend SDK.
- **Rate limiting:** Upstash Redis.
- **Bot protection:** Cloudflare Turnstile.
- **Email build:** Node script, CSS inliner, plain-text generator.
- **Config:** environment variables for API keys, sender, daily cap and kill switch; never committed.
- **Repository layout:** `/app` (site and API), `/emails` (source), `/dist/emails` (build output), `/public/proof` (screenshots), `/docs` (case studies, QA checklist, Iterable porting notes).
- **Images:** hosted from the site's `/public` folder with absolute HTTPS URLs so they load inside email clients.

## 12. Success criteria

| Area          | Criterion                                                                    |
| ------------- | ---------------------------------------------------------------------------- |
| Templates     | All 3 render without broken layout in every client captured                  |
| Dark mode     | Logo and text remain legible in Apple Mail and Outlook.com dark mode         |
| Accessibility | Contrast 4.5:1 or better, alt text present, tap targets 44 px or larger      |
| Performance   | Each email HTML under 102 KB                                                 |
| Modularity    | All three templates built from the shared component library                  |
| Send feature  | Test email arrives in the inbox (not spam) for Gmail, Outlook.com and iCloud |
| Safety        | Rate limits and kill switch verified by test                                 |
| Site          | Lighthouse accessibility 95+                                                 |
| Evidence      | Case study per template with before/after rendering fixes                    |

## 13. Phases (order matters more than dates)

0. **Setup:** domain, DNS (SPF, DKIM, DMARC), Resend, GitHub repo, Vercel, fictional brand and tokens.
1. **Component library and Template A.**
2. **Templates B and C**, including dark mode variants.
3. **Next.js site** with gallery and previews.
4. **Send API** with all abuse controls.
5. **QA pass** (real inboxes, then free preview tools), then fixes.
6. **Case studies, README, proof gallery.**
7. **P1:** direct mail, Klaviyo flow, Iterable porting notes.
8. **P2:** webhook automation, accessibility write-up.

A realistic estimate for one person working part-time is several weeks. Phases 0-6 are the core deliverable.

## 14. Risks and mitigations

| Risk                                                      | Mitigation                                                                                                                                       |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Public form gets abused                                   | Controls in section 7; kill switch; global daily cap set well below Resend's 100/day so abuse cannot block my own testing or interview demos     |
| Daily cap reached                                         | Form shows "demo limit reached today" and points to previews and screenshots                                                                     |
| Emails land in spam (.my.id is an uncommon domain ending) | Dedicated subdomain, SPF/DKIM/DMARC, plain-text part, low volume, test at Gmail, Outlook.com and iCloud before launch; fallback sender if needed |
| Free tier limits change                                   | Re-check at setup; keep the send layer in one small module so the provider can be swapped                                                        |
| Outlook desktop cannot be tested for free                 | Be transparent, show MSO fallback code                                                                                                           |
| Free preview tools only simulate                          | Label real vs simulated on every screenshot                                                                                                      |
| Overclaiming on CV                                        | Claim only what was done. Do not claim Iterable                                                                                                  |

## 15. What I can honestly put on my CV after this

- Built a modular HTML email component library and three responsive, accessible, dark-mode-ready templates
- Tested rendering across major clients using real inboxes and preview tools, and documented fixes
- Built an API-driven email sending service with rate limiting and bot protection
- Built a lifecycle flow in Klaviyo (if P1 is completed)
- Wrote Iterable-compatible templates with documented porting notes (not Iterable experience)
- Existing experience, already on the CV: transactional email templates (welcome, password reset, OTP) tested in Litmus and delivered through an AWS queue and Amazon SES. The portfolio adds the lifecycle and marketing side that experience lacks

## 16. Open decisions

1. Fictional brand name and visual direction
2. Sending subdomain name
3. Make or Zapier for the P2 webhook
4. Site language: English only (recommended, since the target team is US-based)
