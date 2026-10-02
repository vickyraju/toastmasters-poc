import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithQuery } from "@/test/render";
import { getServices } from "@/lib/services";
import { MyProgressPage } from "./MyProgressPage";
import { ClubProgressPage } from "./ClubProgressPage";

const nav = vi.hoisted(() => ({ search: "", replace: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/progress/club",
  useRouter: () => ({ replace: nav.replace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(nav.search),
}));
const toasts = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), toasts) }));

const WAIT = { timeout: 4000 };

async function as(employeeId: string) {
  const s = getServices();
  await s.dev.reset();
  await s.auth.signIn(employeeId);
}

beforeEach(() => {
  nav.search = "";
  nav.replace.mockReset();
  toasts.success.mockReset();
  toasts.error.mockReset();
});

describe("S-09 My progress", () => {
  it("Ananya: pathway, level 3 of 5, and her pending Level 3 awaiting the VPE", async () => {
    await as("IL1008");
    renderWithQuery(<MyProgressPage />);
    expect(
      await screen.findByRole(
        "heading",
        { name: "Presentation Mastery" },
        WAIT,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Level 3 of 5" }),
    ).toBeInTheDocument();
    const row = (await screen.findByRole(
      "row",
      { name: /Level 3/ },
      WAIT,
    )) as HTMLTableRowElement;
    expect(row).toHaveTextContent("28 Sep 2026");
    expect(row).toHaveTextContent("Pending");
    expect(row).toHaveTextContent("Waiting for your VPE");
  });

  it("a member with nothing logged sees the empty state and a Log completion button", async () => {
    await as("IL1010");
    renderWithQuery(<MyProgressPage />);
    expect(
      await screen.findByText("You haven't logged any progress yet", {}, WAIT),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Log completion" }).length,
    ).toBeGreaterThan(0);
  });

  it("log a Level above your current one: inline message, nothing saved", async () => {
    await as("IL1009"); // Mohammed, level 2
    renderWithQuery(<MyProgressPage />);
    fireEvent.click(
      (
        await screen.findAllByRole("button", { name: "Log completion" }, WAIT)
      )[0],
    );
    const dialog = await screen.findByRole("dialog", {}, WAIT);
    expect(within(dialog).getByLabelText("Pathway (required)")).toHaveValue(
      "Dynamic Leadership",
    );
    fireEvent.change(within(dialog).getByLabelText("Level"), {
      target: { value: "4" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Log level" }));
    expect(
      await within(dialog).findByText(
        "You are at level 2. You cannot log a higher level yet.",
        {},
        WAIT,
      ),
    ).toBeInTheDocument();
    expect(await getServices().progress.listMine()).toEqual([]);
  });

  it("a future date is blocked by the picker's max and by the check", async () => {
    await as("IL1009");
    renderWithQuery(<MyProgressPage />);
    fireEvent.click(
      (
        await screen.findAllByRole("button", { name: "Log completion" }, WAIT)
      )[0],
    );
    const dialog = await screen.findByRole("dialog", {}, WAIT);
    const date = within(dialog).getByLabelText("Completed on (required)");
    expect(date).toHaveAttribute("max", "2026-10-01");
    fireEvent.change(date, { target: { value: "2026-12-01" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Log level" }));
    expect(
      await within(dialog).findByText(
        "The completion date cannot be in the future.",
        {},
        WAIT,
      ),
    ).toBeInTheDocument();
  });

  it("a project counts at once: it appears as Counted on the Projects tab", async () => {
    await as("IL1009");
    renderWithQuery(<MyProgressPage />);
    fireEvent.click(
      (
        await screen.findAllByRole("button", { name: "Log completion" }, WAIT)
      )[0],
    );
    const dialog = await screen.findByRole("dialog", {}, WAIT);
    fireEvent.click(within(dialog).getByRole("button", { name: "Project" }));
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Log project" }),
    );
    expect(
      await within(dialog).findByText("Enter the project name.", {}, WAIT),
    ).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("Project name (required)"), {
      target: { value: "Ice Breaker" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Log project" }),
    );
    await vi.waitFor(
      () => expect(toasts.success).toHaveBeenCalledWith("Project logged."),
      WAIT,
    );
    fireEvent.mouseDown(
      await screen.findByRole("tab", { name: "Projects" }, WAIT),
    );
    fireEvent.click(screen.getByRole("tab", { name: "Projects" }));
    const row = await screen.findByRole("row", { name: /Ice Breaker/ }, WAIT);
    expect(row).toHaveTextContent("Counted");
  });

  it("a level logged with proof goes to the VPE and creates T-03 and N-09 (R-11)", async () => {
    await as("IL1010"); // Lakshmi, level 1
    renderWithQuery(<MyProgressPage />);
    fireEvent.click(
      (
        await screen.findAllByRole("button", { name: "Log completion" }, WAIT)
      )[0],
    );
    const dialog = await screen.findByRole("dialog", {}, WAIT);
    fireEvent.change(within(dialog).getByLabelText("Level"), {
      target: { value: "1" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Log level" }));
    await vi.waitFor(
      () =>
        expect(toasts.success).toHaveBeenCalledWith(
          "Level logged. Your VPE will verify it.",
        ),
      WAIT,
    );
    const s = getServices();
    await s.auth.signIn("IL1002");
    expect(
      (await s.tasks.listMine()).some(
        (t) => t.code === "T-03" && /Lakshmi/.test(t.title),
      ),
    ).toBe(true);
    expect(
      (await s.notifications.listMine()).items.some(
        (n) => n.code === "N-09" && /Lakshmi/.test(n.title),
      ),
    ).toBe(true);
  });
});

describe("S-10 Club progress", () => {
  it("members table: Ganesh is the only Inactive row; the filter isolates him", async () => {
    await as("IL1003");
    renderWithQuery(<ClubProgressPage />);
    const table = await screen.findByRole("table", {}, WAIT);
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(15);
    expect(
      rows
        .filter((r) => r.textContent?.includes("Inactive"))
        .map((r) => (r as HTMLTableRowElement).cells[0].textContent),
    ).toEqual(["Ganesh Kumar"]);
    fireEvent.click(screen.getByRole("button", { name: "Inactive 60+ days" }));
    expect(within(table).getAllByRole("row").slice(1)).toHaveLength(1);
    const ananya = rows.find(
      (r) => (r as HTMLTableRowElement).cells[0].textContent === "Ananya Das",
    ) as HTMLTableRowElement;
    expect(ananya.cells[1].textContent).toBe("Presentation Mastery");
    expect(ananya.cells[2].textContent).toBe("3");
  });

  it("queue: a non-VPE ExComm sees the row read-only with 'Pending VPE review' and no buttons", async () => {
    nav.search = "tab=queue";
    await as("IL1003");
    renderWithQuery(<ClubProgressPage />);
    expect(
      await screen.findByText("Ananya Das · Level 3", {}, WAIT),
    ).toBeInTheDocument();
    expect(screen.getByText("Pending VPE review")).toBeInTheDocument();
    expect(screen.getByText("No proof attached")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Verify" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Reject" }),
    ).not.toBeInTheDocument();
  });

  it("walkthrough step 5: Priya verifies Ananya's Level 3 after a confirm; level becomes 4 and she gets N-10", async () => {
    nav.search = "tab=queue";
    await as("IL1002");
    renderWithQuery(<ClubProgressPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Verify" }, WAIT),
    );
    const dialog = await screen.findByRole("dialog", {}, WAIT);
    expect(dialog).toHaveTextContent("Verify Ananya Das's Level 3 completion?");
    expect(dialog).toHaveTextContent("Their level will advance to 4.");
    fireEvent.click(within(dialog).getByRole("button", { name: "Verify" }));
    expect(
      await screen.findByText("No pending verifications", {}, WAIT),
    ).toBeInTheDocument();
    const s = getServices();
    await s.auth.signIn("IL1008");
    expect((await s.auth.getCurrentUser())?.currentLevel).toBe(4);
    expect(
      (await s.notifications.listMine()).items.some(
        (n) => n.code === "N-10" && /verified/.test(n.title),
      ),
    ).toBe(true);
  });

  it("reject needs a reason; the member sees it and can log the level again", async () => {
    nav.search = "tab=queue";
    await as("IL1002");
    renderWithQuery(<ClubProgressPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Reject" }, WAIT),
    );
    const dialog = await screen.findByRole("dialog", {}, WAIT);
    const confirm = within(dialog).getByRole("button", {
      name: "Reject level",
    });
    expect(confirm).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText("Reason (required)"), {
      target: { value: "Evaluation form missing" },
    });
    fireEvent.click(confirm);
    expect(
      await screen.findByText("No pending verifications", {}, WAIT),
    ).toBeInTheDocument();
    const s = getServices();
    await s.auth.signIn("IL1008");
    expect((await s.progress.listMine())[0]).toMatchObject({
      status: "rejected",
      rejectionReason: "Evaluation form missing",
    });
  });

  it("an empty queue and a service failure each show their own state", async () => {
    nav.search = "tab=queue";
    await as("IL1002");
    await getServices().progress.decide("cmp-001", "verify");
    const { unmount } = renderWithQuery(<ClubProgressPage />);
    expect(
      await screen.findByText("No pending verifications", {}, WAIT),
    ).toBeInTheDocument();
    unmount();
    await getServices().dev.setSimulateError(true);
    renderWithQuery(<ClubProgressPage />);
    expect(
      await screen.findByText(
        "Could not load the verification queue. Try again",
        {},
        WAIT,
      ),
    ).toBeInTheDocument();
    await getServices().dev.setSimulateError(false);
  });
});
