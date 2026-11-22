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

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
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
      await apiRequest<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
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
        Create your account
      </h1>
      <p className="mt-2 text-sm text-muted">
        Start with a candidate account. You can add an expert workspace later.
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
          <label htmlFor="name" className={labelClass}>
            Full name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            minLength={2}
            value={name}
            onChange={(event) => setName(event.target.value)}
            aria-invalid={Boolean(fields.name)}
            aria-describedby={fields.name ? "name-error" : undefined}
            className={inputClass}
          />
          {fields.name ? (
            <p id="name-error" className="mt-1.5 text-sm text-error">
              {fields.name}
            </p>
          ) : null}
        </div>

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
          <label htmlFor="password" className={labelClass}>
            Password
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
            aria-describedby={
              fields.password ? "password-error" : "password-hint"
            }
            className={inputClass}
          />
          {fields.password ? (
            <p id="password-error" className="mt-1.5 text-sm text-error">
              {fields.password}
            </p>
          ) : (
            <p id="password-hint" className="mt-1.5 text-sm text-muted">
              Use at least 10 characters.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={pending}
          className={`${primaryButtonClass} w-full`}
        >
          {pending ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary-700 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </section>
  );
}
