import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./button";

describe("Button variants", () => {
  it("danger keeps red text and only tints the background on hover", () => {
    render(<Button variant="danger">Reject</Button>);
    const cls = screen.getByRole("button", { name: "Reject" }).className;
    expect(cls).toContain("text-danger");
    expect(cls).toContain("hover:text-danger");
    expect(cls).toContain("hover:bg-danger-bg");
    expect(cls).not.toContain("hover:text-foreground");
  });

  it("success is a green outline for approving", () => {
    render(<Button variant="success">Approve</Button>);
    const cls = screen.getByRole("button", { name: "Approve" }).className;
    expect(cls).toContain("border-success");
    expect(cls).toContain("hover:bg-success-bg");
  });

  it("never uses transition-all", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button").className).not.toContain(
      "transition-all",
    );
  });
});
