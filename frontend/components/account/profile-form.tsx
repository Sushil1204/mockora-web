"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { SectionHeader } from "@/components/ui/page-header";
import { apiRequest } from "@/lib/api";
import { errorMessage, fieldErrors } from "@/lib/form-errors";
import type { AuthResponse, PublicUser } from "@/lib/types";

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
    <Card className="p-6 sm:p-8">
      <SectionHeader
        title="Profile"
        description="These details are visible on your account. Your email address cannot be changed here yet."
      />

      <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
        {error ? <Alert variant="danger">{errorMessage(error)}</Alert> : null}
        {saved ? <Alert variant="success">Profile updated.</Alert> : null}

        <Field id="profile-name" label="Full name" required error={fields.name}>
          <Input
            name="name"
            type="text"
            autoComplete="name"
            required
            minLength={2}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </Field>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Field
            id="country-code"
            label="Country code"
            hint="Two-letter country code, for example IN."
            error={fields.countryCode}
          >
            <Input
              name="countryCode"
              type="text"
              maxLength={2}
              placeholder="IN"
              value={countryCode}
              onChange={(event) =>
                setCountryCode(event.target.value.toUpperCase())
              }
            />
          </Field>

          <Field
            id="preferred-language"
            label="Preferred language"
            error={fields.preferredLanguage}
          >
            <Input
              name="preferredLanguage"
              type="text"
              value={preferredLanguage}
              onChange={(event) => setPreferredLanguage(event.target.value)}
            />
          </Field>
        </div>

        <div className="border-t border-border pt-5">
          <Button type="submit" loading={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
