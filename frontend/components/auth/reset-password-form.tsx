"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { apiRequest } from "@/lib/api";
import { errorMessage, fieldErrors } from "@/lib/form-errors";
import {
  cardClass,
  inputClass,
  labelClass,
  primaryButtonClass,
} from "@/lib/ui";

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
      <section className={cardClass}>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Reset link required
        </h1>
        <p className="mt-3 text-sm text-muted">
          This page needs a valid reset token. Request a new password reset link
          to continue.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-block text-sm font-medium text-primary-700 hover:underline"
        >
          Request a reset link
        </Link>
      </section>
    );
  }

  return (
    <section className={cardClass}>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Choose a new password
      </h1>
      <p className="mt-2 text-sm text-muted">
        Resetting your password signs you out of all other sessions.
      </p>

      {complete ? (
        <div
          role="status"
          className="mt-6 rounded-lg border border-success/20 bg-success-soft px-4 py-3 text-sm text-foreground"
        >
          Your password has been updated. Redirecting you to sign in…
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
            <label htmlFor="password" className={labelClass}>
              New password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(fields.password)}
              className={inputClass}
            />
            <p className="mt-1.5 text-sm text-muted">
              Use at least 10 characters.
            </p>
          </div>

          <div>
            <label htmlFor="confirm-password" className={labelClass}>
              Confirm new password
            </label>
            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={pending}
            className={`${primaryButtonClass} w-full`}
          >
            {pending ? "Updating…" : "Update password"}
          </button>
        </form>
      )}
    </section>
  );
}
