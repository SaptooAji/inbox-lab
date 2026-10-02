"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  buildSendBody,
  FORM_FIELDS,
  submitTestSend,
  type FormField,
  type SendFormValues,
  type SendOutcome,
} from "@/presentation/forms/send-form-outcome";
import { TextField } from "./text-field";
import { TurnstileWidget } from "./turnstile-widget";

const EMPTY_VALUES: SendFormValues = {
  email: "",
  firstName: "",
  subject: "",
  consent: false,
  website: "",
};

export interface SendFormProps {
  readonly templateId: string;
  readonly templateName: string;
  readonly defaultSubject: string;
  readonly turnstileSiteKey: string | undefined;
}

export function SendForm({
  templateId,
  templateName,
  defaultSubject,
  turnstileSiteKey,
}: SendFormProps) {
  const [values, setValues] = useState<SendFormValues>(EMPTY_VALUES);
  const [sending, setSending] = useState(false);
  const [outcome, setOutcome] = useState<SendOutcome | null>(null);
  const [token, setToken] = useState("");
  const [challenge, setChallenge] = useState(0);

  const verified = turnstileSiteKey === undefined || token !== "";
  const fieldErrors: Readonly<Partial<Record<FormField, string>>> =
    outcome?.kind === "invalid" ? outcome.fieldErrors : {};

  useEffect(() => {
    if (outcome?.kind !== "invalid") {
      return;
    }
    const first = FORM_FIELDS.find((field) => outcome.fieldErrors[field] !== undefined);
    if (first !== undefined) {
      document.getElementById(`send-${first}`)?.focus();
    }
  }, [outcome]);

  function update<K extends keyof SendFormValues>(key: K, value: SendFormValues[K]): void {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (sending || !verified) {
      return;
    }
    setSending(true);
    setOutcome(null);

    const result = await submitTestSend(buildSendBody(values, templateId, token), (url, init) =>
      fetch(url, init),
    );

    setOutcome(result);
    if (result.kind === "sent") {
      setValues(EMPTY_VALUES);
    }
    // A Turnstile token works once, so every attempt gets a fresh challenge.
    setToken("");
    setChallenge((current) => current + 1);
    setSending(false);
  }

  const consentError = fieldErrors.consent;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className="space-y-5 rounded-lg border border-border bg-surface p-5 sm:p-6"
    >
      <p className="text-sm text-muted">
        Sending: <span className="font-medium text-text">{templateName}</span>. Change the template
        in the section above.
      </p>

      <TextField
        id="send-email"
        label="Your email address"
        name="email"
        type="email"
        value={values.email}
        onChange={(value) => update("email", value)}
        error={fieldErrors.email}
        hint={undefined}
        required
        autoComplete="email"
        maxLength={254}
      />
      <TextField
        id="send-firstName"
        label="First name"
        name="firstName"
        type="text"
        value={values.firstName}
        onChange={(value) => update("firstName", value)}
        error={fieldErrors.firstName}
        hint="Used in the greeting, for example Welcome aboard, Rina."
        required
        autoComplete="given-name"
        maxLength={40}
      />

      <TextField
        id="send-subject"
        label="Subject (optional)"
        name="subject"
        type="text"
        value={values.subject}
        onChange={(value) => update("subject", value)}
        error={fieldErrors.subject}
        hint={`Leave blank to use: ${defaultSubject}`}
        required={false}
        autoComplete={undefined}
        maxLength={80}
      />

      {/* Honeypot: people never see or fill it. The odd name avoids browser autofill. */}
      <div aria-hidden="true" className="absolute -left-2499.75 h-0 w-0 overflow-hidden">
        <label>
          Leave this field empty
          <input
            type="text"
            name="contact_me_by_fax_only"
            tabIndex={-1}
            autoComplete="off"
            value={values.website}
            onChange={(event) => update("website", event.target.value)}
          />
        </label>
      </div>

      <div>
        <label className="flex items-start gap-3 text-sm">
          <input
            id="send-consent"
            name="consent"
            type="checkbox"
            checked={values.consent}
            onChange={(event) => update("consent", event.target.checked)}
            aria-invalid={consentError === undefined ? undefined : true}
            aria-describedby={consentError === undefined ? undefined : "send-consent-error"}
            className="mt-0.5 size-5 shrink-0 accent-primary"
          />
          <span>
            Send me this one-time demo email. I understand I am not subscribing to anything.
          </span>
        </label>
        {consentError === undefined ? null : (
          <p id="send-consent-error" className="mt-1 text-sm font-medium text-error">
            {consentError}
          </p>
        )}
      </div>

      {turnstileSiteKey === undefined ? null : (
        <div>
          <TurnstileWidget key={challenge} siteKey={turnstileSiteKey} onToken={setToken} />
          <p className="mt-1 text-sm text-muted">
            {verified ? "Bot check complete." : "Waiting for the bot check to finish."}
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={sending || !verified}
        className="rounded-md bg-primary px-5 py-2.5 font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {sending ? "Sending..." : "Send me this email"}
      </button>

      <div role="status" className="min-h-6 text-sm font-medium">
        {outcome?.kind === "sent" ? (
          <p>
            Sent. Check your inbox for the {templateName} email. If you do not see it within a
            minute, check your spam folder.
          </p>
        ) : null}
        {outcome !== null && outcome.kind !== "sent" ? (
          <p className="text-error">{outcome.message}</p>
        ) : null}
      </div>

      <p className="text-sm text-muted">
        Your address is used once to send this email and is not stored. One-way hashes of it and of
        your IP address are kept for 24 hours, only to enforce daily limits. Resend delivers the
        email and Cloudflare Turnstile checks that you are human.
      </p>
    </form>
  );
}
