"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/field";
import { apiRequest } from "@/lib/api";
import { errorMessage, fieldErrors } from "@/lib/form-errors";
import type { AuthResponse } from "@/lib/types";

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
    <Card className="p-6 sm:p-8">
      <p className="text-overline font-semibold uppercase text-terracotta-600">
        Join Mockoraa
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        Create your account
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Start with a candidate account. You can apply for an expert workspace
        later.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
        {error ? <Alert variant="danger">{errorMessage(error)}</Alert> : null}

        <Field id="name" label="Full name" required error={fields.name}>
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

        <Field
          id="password"
          label="Password"
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

        <Button type="submit" loading={pending} className="w-full">
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 border-t border-border pt-5 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-primary-700 underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </Card>
  );
}
