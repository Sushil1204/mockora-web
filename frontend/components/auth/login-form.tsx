"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { apiRequest } from "@/lib/api";
import { errorMessage, fieldErrors } from "@/lib/form-errors";
import type { AuthResponse } from "@/lib/types";
import {
  cardClass,
  inputClass,
  labelClass,
  primaryButtonClass,
} from "@/lib/ui";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [pending, setPending] = useState(false);
  const fields = fieldErrors(error);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      await apiRequest<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.replace("/account");
      router.refresh();
    } catch (caught) {
      setError(caught);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={cardClass}>
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        Welcome back
      </h1>
      <p className="mt-2 text-sm text-muted">
        Sign in to manage your bookings and profile.
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
            aria-invalid={Boolean(fields.email)}
            aria-describedby={fields.email ? "email-error" : undefined}
            className={inputClass}
          />
          {fields.email ? (
            <p id="email-error" className="mt-1.5 text-sm text-error">
              {fields.email}
            </p>
          ) : null}
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <label htmlFor="password" className={`${labelClass} mb-0`}>
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-primary-700 hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            aria-invalid={Boolean(fields.password)}
            aria-describedby={fields.password ? "password-error" : undefined}
            className={inputClass}
          />
          {fields.password ? (
            <p id="password-error" className="mt-1.5 text-sm text-error">
              {fields.password}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={pending}
          className={`${primaryButtonClass} w-full`}
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New to Mockoraa?{" "}
        <Link
          href="/register"
          className="font-medium text-primary-700 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </section>
  );
}
