import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ForgotPasswordForm } from "./forgot-password-form";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";
import { ResetPasswordForm } from "./reset-password-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}));

describe("authentication forms", () => {
  it("renders accessible login fields and recovery links", () => {
    render(<LoginForm />);

    expect(
      screen.getByRole("heading", { name: "Sign in to Mockoraa" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toHaveAttribute(
      "autocomplete",
      "email",
    );
    expect(screen.getByLabelText(/password/i)).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
    expect(
      screen.getByRole("link", { name: "Forgot password?" }),
    ).toHaveAttribute("href", "/forgot-password");
    expect(
      screen.getByRole("link", { name: "Create an account" }),
    ).toHaveAttribute("href", "/register");
  });

  it("renders registration password guidance and sign-in link", () => {
    render(<RegisterForm />);

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toHaveAccessibleDescription(
      "Use at least 10 characters.",
    );
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("renders the forgot-password form", () => {
    render(<ForgotPasswordForm />);

    expect(
      screen.getByRole("heading", { name: "Reset your password" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Send reset instructions" }),
    ).toBeInTheDocument();
  });

  it("requires a token before showing the reset form", () => {
    render(<ResetPasswordForm token="" />);

    expect(
      screen.getByRole("heading", { name: "Reset link required" }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("New password")).not.toBeInTheDocument();
  });
});
