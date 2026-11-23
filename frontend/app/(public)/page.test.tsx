import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("Home page", () => {
  it("renders a single top-level heading", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /practice the interview before it counts/i,
      }),
    ).toBeInTheDocument();
  });

  it("links new visitors to registration, sign in, and the marketplace", () => {
    render(<Home />);

    expect(
      screen.getByRole("link", { name: /create an account/i }),
    ).toHaveAttribute("href", "/register");
    expect(screen.getByRole("link", { name: /^sign in$/i })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(
      screen.getAllByRole("link", { name: /browse experts/i }).length,
    ).toBeGreaterThan(0);
  });

  it("explains the preparation path and both sides of the marketplace", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: /preparation with a human/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /walk in knowing what to expect/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /interview on your terms/i }),
    ).toBeInTheDocument();
  });
});
