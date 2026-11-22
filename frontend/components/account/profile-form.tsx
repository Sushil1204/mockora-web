"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { apiRequest } from "@/lib/api";
import { errorMessage, fieldErrors } from "@/lib/form-errors";
import type { AuthResponse, PublicUser } from "@/lib/types";
import {
  cardClass,
  inputClass,
  labelClass,
  primaryButtonClass,
} from "@/lib/ui";

export function ProfileForm({ user }: { user: PublicUser }) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [countryCode, setCountryCode] = useState(user.countryCode ?? "");
  const [preferredLanguage, setPreferredLanguage] = useState(
    user.preferredLanguage,
  );
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const fields = fieldErrors(error);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);

    try {
      await apiRequest<AuthResponse>("/me", {
        method: "PATCH",
        body: JSON.stringify({
          name,
          countryCode: countryCode || null,
          preferredLanguage,
        }),
      });
      setSaved(true);
      router.refresh();
    } catch (caught) {
      setError(caught);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={cardClass}>
      <h2 className="text-lg font-semibold text-foreground">Profile</h2>
      <p className="mt-1 text-sm text-muted">
        These details are visible on your account. Your email address cannot be
        changed here yet.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-error/20 bg-error-soft px-4 py-3 text-sm text-error"
          >
            {errorMessage(error)}
          </div>
        ) : null}

        {saved ? (
          <div
            role="status"
            className="rounded-lg border border-success/20 bg-success-soft px-4 py-3 text-sm text-foreground"
          >
            Profile updated.
          </div>
        ) : null}

        <div>
          <label htmlFor="profile-name" className={labelClass}>
            Full name
          </label>
          <input
            id="profile-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            minLength={2}
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(fields.name)}
            className={inputClass}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="country-code" className={labelClass}>
              Country code
            </label>
            <input
              id="country-code"
              name="countryCode"
              type="text"
              maxLength={2}
              placeholder="IN"
              value={countryCode}
              onChange={(event) =>
                setCountryCode(event.target.value.toUpperCase())
              }
              aria-invalid={Boolean(fields.countryCode)}
              className={inputClass}
            />
            {fields.countryCode ? (
              <p className="mt-1.5 text-sm text-error">{fields.countryCode}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="preferred-language" className={labelClass}>
              Preferred language
            </label>
            <input
              id="preferred-language"
              name="preferredLanguage"
              type="text"
              value={preferredLanguage}
              onChange={(event) => setPreferredLanguage(event.target.value)}
              aria-invalid={Boolean(fields.preferredLanguage)}
              className={inputClass}
            />
            {fields.preferredLanguage ? (
              <p className="mt-1.5 text-sm text-error">
                {fields.preferredLanguage}
              </p>
            ) : null}
          </div>
        </div>

        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Saving…" : "Save changes"}
        </button>
      </form>
    </section>
  );
}
