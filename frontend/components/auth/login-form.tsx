"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/field";
import { ApiError, apiRequest } from "@/lib/api";
import { errorMessage, fieldErrors } from "@/lib/form-errors";
import type { AuthResponse } from "@/lib/types";

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
    <Card className="p-6 sm:p-8">
      <p className="text-overline font-semibold uppercase text-terracotta-600">
        Welcome back
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        Sign in to Mockoraa
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Manage your bookings, availability, and profile from one place.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
        {error ? (
          <Alert variant="danger">
            {error instanceof ApiError && error.status === 401
              ? "Email or password is incorrect. Check your details and try again."
              : errorMessage(error)}
          </Alert>
        ) : null}

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

        <Field id="password" label="Password" required error={fields.password}>
          <Input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>

        <div className="-mt-2 flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-primary-700 underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" loading={pending} className="w-full">
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="mt-6 border-t border-border pt-5 text-center text-sm text-muted">
        New to Mockoraa?{" "}
        <Link
          href="/register"
          className="font-semibold text-primary-700 underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </Card>
  );
}
