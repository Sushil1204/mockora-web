"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/field";
import { apiRequest } from "@/lib/api";
import { errorMessage, fieldErrors } from "@/lib/form-errors";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const fields = fieldErrors(error);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmation) {
      setError(new Error("Passwords do not match."));
      return;
    }

    setPending(true);

    try {
      await apiRequest<void>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setComplete(true);
      setTimeout(() => router.push("/login"), 1500);
    } catch (caught) {
      setError(caught);
    } finally {
      setPending(false);
    }
  }

  if (!token) {
    return (
      <Card className="p-6 sm:p-8">
        <p className="text-overline font-semibold uppercase text-terracotta-600">
          Account recovery
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
          Reset link required
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          This page needs a valid reset token. Request a new password reset link
          to continue.
        </p>
        <Link
          href="/forgot-password"
          className={buttonClasses({ className: "mt-6 w-full" })}
        >
          Request a reset link
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-6 sm:p-8">
      <p className="text-overline font-semibold uppercase text-terracotta-600">
        Account recovery
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        Choose a new password
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Resetting your password signs you out of all other sessions.
      </p>

      {complete ? (
        <Alert variant="success" className="mt-6" title="Password updated">
          Your password has been updated. Redirecting you to sign in…
        </Alert>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
          {error ? <Alert variant="danger">{errorMessage(error)}</Alert> : null}

          <Field
            id="password"
            label="New password"
            required
            hint="Use at least 10 characters."
            error={fields.password}
          >
            <Input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>

          <Field id="confirm-password" label="Confirm new password" required>
            <Input
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
            />
          </Field>

          <Button type="submit" loading={pending} className="w-full">
            {pending ? "Updating…" : "Update password"}
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
