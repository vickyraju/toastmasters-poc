import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Page from "@/app/page";

describe("blank shell", () => {
  it("renders the app name as a heading", () => {
    render(<Page />);
    expect(screen.getByRole("heading", { name: "Club Hub" })).toBeInTheDocument();
  });
});
