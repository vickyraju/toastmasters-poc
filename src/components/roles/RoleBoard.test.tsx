import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithQuery } from "@/test/render";
import { getServices } from "@/lib/services";
import { MeetingDetail } from "@/components/meetings/MeetingDetail";

const nav = vi.hoisted(() => ({ search: "tab=roles" }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/meetings/mtg-2026-10-02",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(nav.search),
}));
const toasts = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), toasts) }));

const WAIT = { timeout: 4000 };
const M2 = "mtg-2026-10-02";

async function as(employeeId: string) {
  const s = getServices();
  await s.dev.reset();
  await s.auth.signIn(employeeId);
}

/** The board row for a slot label (labels are unique on 2 Oct). */
async function row(label: string) {
  const name = await screen.findByText(
    label,
    { selector: "p.font-medium" },
    WAIT,
  );
  return name.closest("li") as HTMLElement;
}

beforeEach(() => {
  nav.search = "tab=roles";
  toasts.success.mockReset();
  toasts.error.mockReset();
});

describe("RoleBoard claim and withdraw", () => {
  it("Lakshmi takes Grammarian; the row shows her and the button goes", async () => {
    await as("IL1010");
    renderWithQuery(<MeetingDetail id={M2} />);
    const g = await row("Grammarian");
    fireEvent.click(
      await within(g).findByRole("button", { name: "Take this role" }, WAIT),
    );
    expect(
      await within(await row("Grammarian")).findByText("(you)", {}, WAIT),
    ).toBeInTheDocument();
    expect(toasts.success).toHaveBeenCalledWith("You took Grammarian.");
  });

  it("someone else takes it first: 'Someone just took this role.' and the board refreshes", async () => {
    await as("IL1010");
    renderWithQuery(<MeetingDetail id={M2} />);
    const take = await within(await row("Grammarian")).findByRole(
      "button",
      { name: "Take this role" },
      WAIT,
    );
    // Ananya claims in another session between render and click.
    const s = getServices();
    await s.auth.signIn("IL1008");
    await s.roles.claim(`${M2}:grammarian`);
    await s.auth.signIn("IL1010");
    fireEvent.click(take);
    await vi.waitFor(
      () =>
        expect(toasts.error).toHaveBeenCalledWith(
          "Someone just took this role.",
        ),
      WAIT,
    );
    expect(
      await within(await row("Grammarian")).findByText("Ananya Das", {}, WAIT),
    ).toBeInTheDocument();
  });

  it("Divya (ExComm) withdraws from Table Topics Master at once", async () => {
    await as("IL1004");
    renderWithQuery(<MeetingDetail id={M2} />);
    fireEvent.click(
      await within(await row("Table Topics Master")).findByRole(
        "button",
        { name: "Withdraw" },
        WAIT,
      ),
    );
    const dialog = await screen.findByRole("dialog", {}, WAIT);
    expect(dialog).toHaveTextContent(
      "The role opens for others straight away.",
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Withdraw" }));
    expect(
      await within(await row("Table Topics Master")).findByText(
        "Open",
        {},
        WAIT,
      ),
    ).toBeInTheDocument();
  });

  it("Suresh inside 24 h sends a request with a reason and keeps the role", async () => {
    await as("IL1011");
    renderWithQuery(<MeetingDetail id={M2} />);
    fireEvent.click(
      await within(await row("General Evaluator")).findByRole(
        "button",
        { name: "Withdraw" },
        WAIT,
      ),
    );
    const dialog = await screen.findByRole("dialog", {}, WAIT);
    expect(dialog).toHaveTextContent("ExComm must approve");
    fireEvent.change(within(dialog).getByLabelText("Reason"), {
      target: { value: "Travel" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Send request" }),
    );
    const ge = await row("General Evaluator");
    expect(
      await within(ge).findByText(
        "You asked to withdraw. ExComm will decide.",
        {},
        WAIT,
      ),
    ).toBeInTheDocument();
    expect(
      await within(ge).findByText(/asked to withdraw: “Travel”/, {}, WAIT),
    ).toBeInTheDocument();
    expect(within(ge).getByText("Suresh Babu")).toBeInTheDocument();
  });
});

describe("mock-data.md walkthrough steps 1 to 5", () => {
  it("1. Aditya accepts Vikram's swap: roles change, T-04 goes, Vikram gets N-16", async () => {
    await as("IL1013");
    renderWithQuery(<MeetingDetail id={M2} />);
    const ah = await row("Ah-Counter");
    expect(
      await within(ah).findByText(
        "Vikram Rao wants to swap Timer for your Ah-Counter role.",
        {},
        WAIT,
      ),
    ).toBeInTheDocument();
    fireEvent.click(
      await within(ah).findByRole("button", { name: "Accept" }, WAIT),
    );
    expect(
      await within(await row("Timer")).findByText("(you)", {}, WAIT),
    ).toBeInTheDocument();
    const s = getServices();
    expect((await s.tasks.listMine()).map((t) => t.code)).toEqual(["T-01"]);
    await s.auth.signIn("IL1007");
    expect(
      (await s.notifications.listMine()).items.some(
        (n) => n.code === "N-16" && /accepted/.test(n.title),
      ),
    ).toBe(true);
  });

  it("2. Meera fills in her speech title and project; T-06 goes", async () => {
    await as("IL1012");
    renderWithQuery(<MeetingDetail id={M2} />);
    fireEvent.click(
      await within(await row("Speaker 3")).findByRole(
        "button",
        { name: "Edit speech details" },
        WAIT,
      ),
    );
    const dialog = await screen.findByRole("dialog", {}, WAIT);
    await within(dialog).findByRole("option", { name: /Level 2 speech/ }, WAIT);
    fireEvent.change(within(dialog).getByLabelText("Project"), {
      target: { value: "prj-l2" },
    });
    fireEvent.change(within(dialog).getByLabelText("Title"), {
      target: { value: "Plan B" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Save details" }),
    );
    await vi.waitFor(
      () =>
        expect(toasts.success).toHaveBeenCalledWith("Speech details saved."),
      WAIT,
    );
    expect(await getServices().tasks.listMine()).toEqual([]);
  });

  it("3. Lakshmi cannot take Evaluator 2 for her own speech, and sees why", async () => {
    await as("IL1010");
    renderWithQuery(<MeetingDetail id={M2} />);
    const e2 = await row("Evaluator 2");
    const take = await within(e2).findByRole(
      "button",
      { name: "Take this role" },
      WAIT,
    );
    await vi.waitFor(() => expect(take).toBeDisabled(), WAIT);
    expect(take).toHaveAccessibleDescription(
      "You cannot evaluate your own speech.",
    );
  });

  it("4. Mohammed is blocked from Evaluator 3 on level", async () => {
    await as("IL1009");
    renderWithQuery(<MeetingDetail id={M2} />);
    const e3 = await row("Evaluator 3");
    const take = await within(e3).findByRole(
      "button",
      { name: "Take this role" },
      WAIT,
    );
    await vi.waitFor(() => expect(take).toBeDisabled(), WAIT);
    expect(take).toHaveAccessibleDescription(
      "You need to be at level 3 or higher to evaluate this speech.",
    );
  });

  it("5. Priya approves Nisha's withdrawal from the board; the slot opens", async () => {
    await as("IL1002");
    renderWithQuery(<MeetingDetail id={M2} />);
    const e1 = await row("Evaluator 1");
    fireEvent.click(
      await within(e1).findByRole("button", { name: "Approve" }, WAIT),
    );
    expect(
      await within(await row("Evaluator 1")).findByText("Open", {}, WAIT),
    ).toBeInTheDocument();
    await getServices().auth.signIn("IL1014");
    expect(
      (await getServices().notifications.listMine()).items.some(
        (n) => n.code === "N-17",
      ),
    ).toBe(true);
  });
});

describe("ExComm board tools", () => {
  it("assigns a member to Grammarian and adds a Hark Master role", async () => {
    await as("IL1003");
    renderWithQuery(<MeetingDetail id={M2} />);
    fireEvent.click(
      await within(await row("Grammarian")).findByRole(
        "button",
        { name: "Assign" },
        WAIT,
      ),
    );
    let dialog = await screen.findByRole("dialog", {}, WAIT);
    await within(dialog).findByRole("option", { name: /Rahul Verma/ }, WAIT);
    fireEvent.change(within(dialog).getByLabelText("Member (required)"), {
      target: { value: "mem-1005" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Assign" }));
    expect(
      await within(await row("Grammarian")).findByText("Rahul Verma", {}, WAIT),
    ).toBeInTheDocument();

    fireEvent.click(
      await screen.findByRole("button", { name: "Add role" }, WAIT),
    );
    dialog = await screen.findByRole("dialog", {}, WAIT);
    await within(dialog).findByRole("option", { name: "Hark Master" }, WAIT);
    fireEvent.change(within(dialog).getByLabelText("Role (required)"), {
      target: { value: "rt-hark_master" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add role" }));
    expect(await row("Hark Master")).toBeInTheDocument();
  });

  it("members see no ExComm tools; completed meetings show no actions", async () => {
    await as("IL1009");
    const { unmount } = renderWithQuery(<MeetingDetail id={M2} />);
    await row("Grammarian");
    expect(
      screen.queryByRole("button", { name: "Assign" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Add role" }),
    ).not.toBeInTheDocument();
    unmount();
    renderWithQuery(<MeetingDetail id="mtg-2026-09-18" />);
    await row("Timer");
    expect(
      screen.queryByRole("button", {
        name: /Take this role|Withdraw|Request swap/,
      }),
    ).not.toBeInTheDocument();
  });

  it("?slot= expands the linked speaker row and highlights it", async () => {
    nav.search = `tab=roles&slot=${M2}:speaker-3`;
    await as("IL1012");
    renderWithQuery(<MeetingDetail id={M2} />);
    const sp3 = await row("Speaker 3");
    expect(
      within(sp3).getByRole("button", {
        name: "Hide speech details for Speaker 3",
      }),
    ).toBeInTheDocument();
    expect(within(sp3).getByText("5:00 to 7:00")).toBeInTheDocument();
    expect(sp3.className).toContain("bg-primary-soft");
  });
});
