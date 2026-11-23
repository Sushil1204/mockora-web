"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/field";
import { apiRequest } from "@/lib/api";
import { errorMessage, fieldErrors } from "@/lib/form-errors";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const fields = fieldErrors(error);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      await apiRequest<void>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } catch (caught) {
      setError(caught);
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="p-6 sm:p-8">
      <p className="text-overline font-semibold uppercase text-terracotta-600">
        Account recovery
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        Reset your password
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Enter the email on your account and we will prepare reset instructions.
      </p>

      {submitted ? (
        <Alert variant="success" className="mt-6" title="Request received">
          If an account exists for that email, password reset instructions will
          be sent. Email delivery is not connected yet, so no message is sent in
          this environment.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
          {error ? <Alert variant="danger">{errorMessage(error)}</Alert> : null}

          <Field id="email" label="Email" required error={fields.email}>
            <Input
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>

          <Button type="submit" loading={pending} className="w-full">
            {pending ? "Preparing…" : "Send reset instructions"}
          </Button>
        </form>
      )}

      <p className="mt-6 border-t border-border pt-5 text-center text-sm text-muted">
        <Link
          href="/login"
          className="font-semibold text-primary-700 underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </Card>
  );
}
