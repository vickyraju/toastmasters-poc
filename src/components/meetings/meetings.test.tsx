import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithQuery } from "@/test/render";
import { getServices } from "@/lib/services";
import { MeetingsPage } from "./MeetingsPage";
import { MeetingDetail } from "./MeetingDetail";
import { safeHttpUrl } from "./safeUrl";

const nav = vi.hoisted(() => ({
  tab: null as string | null,
  replace: vi.fn(),
  pathname: "/meetings/x",
}));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ replace: nav.replace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(nav.tab ? `tab=${nav.tab}` : ""),
}));

const WAIT = { timeout: 4000 };

async function as(employeeId: string) {
  const s = getServices();
  await s.dev.reset();
  await s.auth.signIn(employeeId);
}

function openDetail(id: string, tab: string | null = null) {
  nav.tab = tab;
  nav.pathname = `/meetings/${id}`;
  return renderWithQuery(<MeetingDetail id={id} />);
}

beforeEach(() => {
  nav.replace.mockReset();
  nav.tab = null;
});

describe("S-03 Meetings", () => {
  const listRows = async () => {
    fireEvent.click(await screen.findByRole("button", { name: "List" }, WAIT));
    const table = await screen.findByRole("table", {}, WAIT);
    return within(table).getAllByRole<HTMLTableRowElement>("row").slice(1);
  };

  it("a Member sees the five non-draft meetings and no officer buttons", async () => {
    await as("IL1009");
    renderWithQuery(<MeetingsPage />);
    const rows = await listRows();
    expect(rows.map((r) => r.cells[0].textContent)).toEqual([
      "Fri 11 Sep, 4:00 PM IST",
      "Fri 18 Sep, 4:00 PM IST",
      "Fri 25 Sep, 4:00 PM IST",
      "Fri 2 Oct, 4:00 PM IST",
      "Fri 9 Oct, 4:00 PM IST",
    ]);
    expect(
      screen.queryByRole("link", { name: "New meeting" }),
    ).not.toBeInTheDocument();
    expect(
      within(screen.getByLabelText("Status")).queryByRole("option", {
        name: "Draft",
      }),
    ).not.toBeInTheDocument();
  });

  it("ExComm sees all eight, drafts included, plus New meeting and Templates", async () => {
    await as("IL1003");
    renderWithQuery(<MeetingsPage />);
    const rows = await listRows();
    expect(rows).toHaveLength(8);
    expect(rows.filter((r) => r.textContent?.includes("Draft"))).toHaveLength(
      3,
    );
    expect(rows.at(-1)?.textContent).toContain("Area Speech Contest");
    expect(rows.at(-1)?.textContent).toContain("Sat 31 Oct, 10:00 AM IST");
    // The officer buttons wait for the signed-in user, which can land after the meeting rows.
    expect(
      await screen.findByRole("link", { name: "New meeting" }, WAIT),
    ).toHaveAttribute("href", "/meetings/new");
    expect(screen.getByRole("link", { name: "Templates" })).toHaveAttribute(
      "href",
      "/meetings/templates",
    );
  });

  it("cancelled date is struck through; roles filled shows counts; status filter narrows", async () => {
    await as("IL1003");
    renderWithQuery(<MeetingsPage />);
    const rows = await listRows();
    expect(rows[0].querySelector("s")?.textContent).toBe(
      "Fri 11 Sep, 4:00 PM IST",
    );
    expect(rows[3].textContent).toContain("9 of 12");
    // The Draft option appears once the signed-in user (an officer) has loaded.
    await within(screen.getByLabelText("Status")).findByRole(
      "option",
      { name: "Draft" },
      WAIT,
    );
    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "draft" },
    });
    expect(
      within(screen.getByRole("table")).getAllByRole("row").slice(1),
    ).toHaveLength(3);
  });

  it("calendar opens on October 2026 (mock clock) and moves between months", async () => {
    await as("IL1009");
    renderWithQuery(<MeetingsPage />);
    expect(
      await screen.findByRole("heading", { name: "October 2026" }, WAIT),
    ).toBeInTheDocument();
    const grid = screen.getByRole("table", {
      name: "Meetings in October 2026",
    });
    expect(within(grid).getAllByRole("link")).toHaveLength(2); // 2 Oct and 9 Oct for a Member
    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(
      screen.getByRole("heading", { name: "September 2026" }),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("table", { name: "Meetings in September 2026" }),
      ).getAllByRole("link"),
    ).toHaveLength(3);
  });
});

describe("S-04 Meeting detail", () => {
  it("2 Oct: header, stepper at 'Open for roles', overview with theme and my role", async () => {
    await as("IL1009");
    openDetail("mtg-2026-10-02");
    expect(
      await screen.findByRole(
        "heading",
        { name: "Regular Meeting", level: 2 },
        WAIT,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Fri 2 Oct, 4:00 PM to 5:30 PM IST"),
    ).toBeInTheDocument();
    const step = within(
      screen.getByRole("list", { name: "Meeting status" }),
    ).getAllByRole("listitem");
    expect(step[1]).toHaveAttribute("aria-current", "step");
    expect(step[0]).toHaveTextContent("Draft (done)");
    expect(screen.getByText("New beginnings")).toBeInTheDocument();
    expect(screen.getByText("Embark")).toBeInTheDocument();
    expect(
      await screen.findByText("Your role: Speaker 1", {}, WAIT),
    ).toBeInTheDocument();
    expect(screen.getByText("9 of 12 roles filled")).toBeInTheDocument();
  });

  it("11 Sep: red cancelled banner with the reason replaces the stepper", async () => {
    await as("IL1009");
    openDetail("mtg-2026-09-11");
    const banner = await screen.findByRole("status", {}, WAIT);
    expect(banner).toHaveTextContent(
      "This meeting was cancelled. Reason: Public holiday event",
    );
    expect(
      screen.queryByRole("list", { name: "Meeting status" }),
    ).not.toBeInTheDocument();
  });

  it("18 Sep: stepper shows Completed as current", async () => {
    await as("IL1009");
    openDetail("mtg-2026-09-18");
    const steps = within(
      await screen.findByRole("list", { name: "Meeting status" }, WAIT),
    ).getAllByRole("listitem");
    expect(steps[3]).toHaveAttribute("aria-current", "step");
  });

  it("a Member opening a Draft link sees G-05 (R-18); ExComm sees the draft", async () => {
    await as("IL1009");
    const { unmount } = openDetail("mtg-2026-10-16");
    expect(
      await screen.findByRole(
        "heading",
        { name: "You do not have access to this page" },
        WAIT,
      ),
    ).toBeInTheDocument();
    unmount();
    await as("IL1003");
    openDetail("mtg-2026-10-16");
    const steps = within(
      await screen.findByRole("list", { name: "Meeting status" }, WAIT),
    ).getAllByRole("listitem");
    expect(steps[0]).toHaveAttribute("aria-current", "step");
  });

  it("unknown meeting: not found", async () => {
    await as("IL1009");
    openDetail("mtg-nope");
    expect(
      await screen.findByRole("heading", { name: "Meeting not found" }, WAIT),
    ).toBeInTheDocument();
  });

  it("switching tabs writes ?tab= to the URL", async () => {
    await as("IL1009");
    openDetail("mtg-2026-10-02");
    const tab = await screen.findByRole("tab", { name: "Roles" }, WAIT);
    fireEvent.mouseDown(tab);
    fireEvent.click(tab);
    await vi.waitFor(
      () =>
        expect(nav.replace).toHaveBeenCalledWith(
          "/meetings/mtg-2026-10-02?tab=roles",
          { scroll: false },
        ),
      WAIT,
    );
  });

  it("Agenda tab: 2 Oct file is embedded; outline is timed with role holders", async () => {
    await as("IL1009");
    openDetail("mtg-2026-10-02", "agenda");
    expect(
      await screen.findByTitle("Agenda: agenda-2026-10-02.pdf", {}, WAIT),
    ).toHaveAttribute("src", "/mock/agenda-sample.pdf");
    const rows = within(await screen.findByRole("table", {}, WAIT))
      .getAllByRole<HTMLTableRowElement>("row")
      .slice(1);
    expect(rows.map((r) => r.cells[0].textContent)).toEqual([
      "4:00 PM",
      "4:05 PM",
      "4:08 PM",
      "4:29 PM",
      "4:44 PM",
      "4:59 PM",
      "5:09 PM",
    ]);
    expect(rows[0]).toHaveTextContent("Ananya Das");
  });

  it("Agenda tab: 9 Oct has no file yet", async () => {
    await as("IL1009");
    openDetail("mtg-2026-10-09", "agenda");
    expect(
      await screen.findByText("No agenda uploaded yet", {}, WAIT),
    ).toBeInTheDocument();
  });

  it("Roles tab (read): grouped main/support, evaluators under speakers, open chips, pending notes", async () => {
    await as("IL1009");
    openDetail("mtg-2026-10-02", "roles");
    const main = (
      await screen.findByRole("heading", { name: "Main roles" }, WAIT)
    ).closest("section") as HTMLElement;
    const labels = within(main)
      .getAllByRole("listitem")
      .map((li) => li.querySelector("p")?.textContent);
    expect(labels).toEqual([
      "Toastmaster of the Day",
      "General Evaluator",
      "Table Topics Master",
      "Speaker 1",
      "Evaluator 1",
      "Speaker 2",
      "Evaluator 2",
      "Speaker 3",
      "Evaluator 3",
    ]);
    expect(within(main).getAllByText("Open")).toHaveLength(2);
    expect(
      within(main).getByText(/Withdrawal requested: “Client call at 4 PM”/),
    ).toBeInTheDocument();
    const support = screen
      .getByRole("heading", { name: "Support roles" })
      .closest("section") as HTMLElement;
    expect(
      within(support).getByText(
        "Swap requested with Aditya Kulkarni (Ah-Counter). Waiting for an answer.",
      ),
    ).toBeInTheDocument();
    expect(within(support).getAllByText("Open")).toHaveLength(1);

    fireEvent.click(
      within(main).getByRole("button", {
        name: "Show speech details for Speaker 2",
      }),
    );
    expect(within(main).getByText("4:00 to 6:00")).toBeInTheDocument();
    expect(within(main).getByText("Ice Breaker")).toBeInTheDocument();
  });

  it("Reports tab before the meeting ends", async () => {
    await as("IL1009");
    openDetail("mtg-2026-10-02", "reports");
    expect(
      await screen.findByText("Reports open after the meeting ends.", {}, WAIT),
    ).toBeInTheDocument();
  });
});

describe("safeHttpUrl", () => {
  it("keeps http(s) and drops script or junk URLs", () => {
    expect(safeHttpUrl("https://teams.example.com/meet/club")).toBe(
      "https://teams.example.com/meet/club",
    );
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,x")).toBeNull();
    expect(safeHttpUrl("not a url")).toBeNull();
    expect(safeHttpUrl(null)).toBeNull();
  });
});
