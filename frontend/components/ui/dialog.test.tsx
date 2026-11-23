import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Dialog } from "./dialog";

describe("Dialog", () => {
  it("renders labelled content and requests closure from the close button", () => {
    const onOpenChange = vi.fn();

    render(
      <Dialog
        open
        onOpenChange={onOpenChange}
        title="More workspace sections"
        description="Choose a destination."
      >
        <p>Dialog body</p>
      </Dialog>,
    );

    expect(
      screen.getByRole("heading", { name: "More workspace sections" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Dialog body")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
