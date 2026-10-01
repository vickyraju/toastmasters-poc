import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithQuery } from "@/test/render";
import { getServices } from "@/lib/services";
import { LoginForm } from "./LoginForm";

const nav = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace, push: vi.fn() }),
}));

const WAIT = { timeout: 4000 };

beforeEach(async () => {
  nav.replace.mockReset();
  await getServices().auth.signOut();
});

describe("LoginForm (S-01)", () => {
  it("an empty field asks for the ID", async () => {
    renderWithQuery(<LoginForm next={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert", {}, WAIT)).toHaveTextContent(
      "Enter your employee ID.",
    );
  });

  it.each(["IL0000", "IL1015", "IL1099"])(
    "%s gets the same generic refusal and stays on S-01",
    async (id) => {
      renderWithQuery(<LoginForm next={null} />);
      fireEvent.change(screen.getByLabelText("Employee ID"), {
        target: { value: id },
      });
      fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
      expect(await screen.findByRole("alert", {}, WAIT)).toHaveTextContent(
        "We could not find that employee ID.",
      );
      expect(screen.getByLabelText("Employee ID")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
      expect(nav.replace).not.toHaveBeenCalled();
    },
  );

  it("signs in and returns to the remembered page, never off-site", async () => {
    renderWithQuery(<LoginForm next="/meetings/mtg-2026-10-02?tab=roles" />);
    fireEvent.change(screen.getByLabelText("Employee ID"), {
      target: { value: "il1013" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await vi.waitFor(
      () =>
        expect(nav.replace).toHaveBeenCalledWith(
          "/meetings/mtg-2026-10-02?tab=roles",
        ),
      WAIT,
    );
  });

  it("an off-site next falls back to /home", async () => {
    renderWithQuery(<LoginForm next="//evil.example" />);
    fireEvent.change(screen.getByLabelText("Employee ID"), {
      target: { value: "IL1013" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await vi.waitFor(
      () => expect(nav.replace).toHaveBeenCalledWith("/home"),
      WAIT,
    );
  });
});
