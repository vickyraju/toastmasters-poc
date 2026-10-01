import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithQuery } from "@/test/render";
import { getServices } from "@/lib/services";
import { AppShell } from "./AppShell";

const nav = vi.hoisted(() => ({
  pathname: "/home",
  replace: vi.fn(),
  push: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ replace: nav.replace, push: nav.push }),
}));

const WAIT = { timeout: 4000 };

async function signInAs(employeeId: string | null) {
  const s = getServices();
  await s.dev.reset();
  if (employeeId) await s.auth.signIn(employeeId);
  else await s.auth.signOut();
}

const sidebarLinks = async () => {
  const [sidebar] = await screen.findAllByRole(
    "navigation",
    { name: "Main" },
    WAIT,
  );
  return within(sidebar)
    .getAllByRole("link")
    .map((a) => a.textContent?.replace(/\d+ open$/, "").trim());
};

beforeEach(() => {
  nav.replace.mockReset();
  nav.pathname = "/home";
});

describe("AppShell (M3 done-when)", () => {
  it("a Member sees only My club items", async () => {
    await signInAs("IL1009");
    renderWithQuery(<AppShell>page</AppShell>);
    expect(await sidebarLinks()).toEqual([
      "Club Hub",
      "Home",
      "Meetings",
      "My tasks",
      "My progress",
    ]);
  });

  it("ExComm sees Manage but not Positions; the President sees Positions", async () => {
    await signInAs("IL1003");
    const { unmount } = renderWithQuery(<AppShell>page</AppShell>);
    const excomm = await sidebarLinks();
    expect(excomm).toContain("Audit log");
    expect(excomm).not.toContain("Positions");
    unmount();
    await signInAs("IL1001");
    renderWithQuery(<AppShell>page</AppShell>);
    expect(await sidebarLinks()).toContain("Positions");
  });

  it("a Member opening /audit sees G-05, not the page, and the attempt is logged", async () => {
    await signInAs("IL1009");
    nav.pathname = "/audit";
    renderWithQuery(<AppShell>secret audit page</AppShell>);
    expect(
      await screen.findByRole(
        "heading",
        { name: "You do not have access to this page" },
        WAIT,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("secret audit page")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Home" })).toHaveAttribute(
      "href",
      "/home",
    );
    await vi.waitFor(async () => {
      await getServices().auth.signIn("IL1003");
      const log = await getServices().audit.list({
        action: "permission.denied",
      });
      expect(log[0]).toMatchObject({ actorId: "mem-1009", entityId: "/audit" });
    }, WAIT);
  });

  it("signed out: redirects to S-01 and remembers the page", async () => {
    await signInAs(null);
    nav.pathname = "/progress";
    renderWithQuery(<AppShell>page</AppShell>);
    await vi.waitFor(
      () => expect(nav.replace).toHaveBeenCalledWith("/login?next=%2Fprogress"),
      WAIT,
    );
  });

  it("shows the unread count on the bell", async () => {
    await signInAs("IL1013"); // Aditya: 3 unread (walkthrough step 1)
    renderWithQuery(<AppShell>page</AppShell>);
    expect(
      await screen.findByRole(
        "link",
        { name: "Notifications, 3 unread" },
        WAIT,
      ),
    ).toBeInTheDocument();
  });
});
