"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { apiRequest } from "@/lib/api";
import { errorMessage } from "@/lib/form-errors";
import {
  cardClass,
  inputClass,
  labelClass,
  primaryButtonClass,
} from "@/lib/ui";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);

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
    <section className={cardClass}>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Reset your password
      </h1>
      <p className="mt-2 text-sm text-muted">
        Enter the email on your account and we will prepare reset instructions.
      </p>

      {submitted ? (
        <div
          role="status"
          className="mt-6 rounded-lg border border-success/20 bg-success-soft px-4 py-3 text-sm text-foreground"
        >
          If an account exists for that email, password reset instructions will
          be sent. Email delivery is not connected yet, so no message is sent in
          this environment.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
          {error ? (
            <div
              role="alert"
              className="rounded-lg border border-error/20 bg-error-soft px-4 py-3 text-sm text-error"
            >
              {errorMessage(error)}
            </div>
          ) : null}

          <div>
            <label htmlFor="email" className={labelClass}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className={`${primaryButtonClass} w-full`}
          >
            {pending ? "Preparing…" : "Send reset instructions"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        <Link
          href="/login"
          className="font-medium text-primary-700 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </section>
  );
}
