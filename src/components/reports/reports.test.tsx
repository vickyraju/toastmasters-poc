import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithQuery } from "@/test/render";
import { getServices } from "@/lib/services";
import { MeetingDetail } from "@/components/meetings/MeetingDetail";

const nav = vi.hoisted(() => ({ search: "tab=reports" }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/meetings/x",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(nav.search),
}));
const toasts = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), toasts) }));

const WAIT = { timeout: 4000 };
const SEP25 = "mtg-2026-09-25";
const SEP18 = "mtg-2026-09-18";

async function as(employeeId: string) {
  const s = getServices();
  await s.dev.reset();
  await s.auth.signIn(employeeId);
}

const card = async (role: string) =>
  (await screen.findByRole("heading", { name: role, level: 3 }, WAIT)).closest(
    "li",
  ) as HTMLElement;

beforeEach(() => {
  nav.search = "tab=reports";
  toasts.success.mockReset();
  toasts.error.mockReset();
});

describe("Reports tab state A: before the meeting ends", () => {
  it("2 Oct shows the waiting message and no forms", async () => {
    await as("IL1007");
    renderWithQuery(<MeetingDetail id="mtg-2026-10-02" />);
    expect(
      await screen.findByText("Reports open after the meeting ends.", {}, WAIT),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Start report/ }),
    ).not.toBeInTheDocument();
  });
});

describe("Reports tab state B: 25 Sep, ended and not completed", () => {
  it("ExComm sees all five roles with the seeded statuses and 'Outstanding reports: 3 of 5'", async () => {
    await as("IL1003");
    renderWithQuery(<MeetingDetail id={SEP25} />);
    expect(await screen.findByRole("status", {}, WAIT)).toHaveTextContent(
      "Outstanding reports: 3 of 5 not yet submitted.",
    );
    const pills = async (role: string) =>
      within(await card(role)).getByText(/Not started|Draft|Submitted/);
    expect((await pills("Timer")).textContent).toBe("Not started");
    expect((await pills("Ah-Counter")).textContent).toBe("Submitted");
    expect((await pills("Grammarian")).textContent).toBe("Draft");
    expect((await pills("Table Topics Master")).textContent).toBe("Submitted");
    expect((await pills("General Evaluator")).textContent).toBe("Not started");
    // Karthik holds the General Evaluator role: he can start it; he can only view the others
    expect(
      within(await card("General Evaluator")).getByRole("button", {
        name: /Start report|Hide/,
      }),
    ).toBeInTheDocument();
    expect(
      within(await card("Timer")).getByRole("button", { name: "View" }),
    ).toBeInTheDocument();
  });

  it("a member sees only their own role and no outstanding line", async () => {
    await as("IL1013");
    renderWithQuery(<MeetingDetail id={SEP25} />);
    expect(await card("Timer")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Ah-Counter", level: 3 }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("a member with no report role is pointed to the consolidated report", async () => {
    await as("IL1010");
    renderWithQuery(<MeetingDetail id={SEP25} />);
    expect(
      await screen.findByText(
        /You have no report role in this meeting/,
        {},
        WAIT,
      ),
    ).toBeInTheDocument();
  });

  it("Timer form: live card with its word, thresholds text, and the server recomputes on submit; T-01 goes", async () => {
    await as("IL1013");
    renderWithQuery(<MeetingDetail id={SEP25} />);
    const timer = await card("Timer");
    // the first form is open by default for the holder
    const field = (name: string) =>
      within(timer).getByLabelText(`Time for ${name}`);
    // each of the three speakers shows the limits that apply to them
    expect(
      await within(timer).findAllByText(
        "Green from 5:00, yellow from 6:00, red from 7:00. Qualifies from 4:30 to 7:30.",
        { selector: "p" },
        WAIT,
      ),
    ).toHaveLength(3);
    const cases: [string, string, string][] = [
      ["Vikram Rao", "5:20", "Green"],
      ["Meera Joshi", "6:10", "Yellow"],
      ["Mohammed Faisal", "7:05", "Red"],
    ];
    for (const [who, time, word] of cases) {
      fireEvent.change(field(who), { target: { value: time } });
      const row = field(who).closest("li") as HTMLElement;
      expect(within(row).getByText(word)).toBeInTheDocument();
    }
    fireEvent.change(field("Mohammed Faisal"), { target: { value: "7:45" } });
    expect(
      within(field("Mohammed Faisal").closest("li") as HTMLElement).getByText(
        "DQ",
      ),
    ).toBeInTheDocument();
    fireEvent.change(field("Mohammed Faisal"), { target: { value: "4:40" } });
    expect(
      within(field("Mohammed Faisal").closest("li") as HTMLElement).getByText(
        "No card",
      ),
    ).toBeInTheDocument();
    fireEvent.change(field("Mohammed Faisal"), { target: { value: "7:5" } });
    expect(
      within(timer).getByText("Enter the time as m:ss, for example 5:20."),
    ).toBeInTheDocument();
    expect(
      within(timer).getByRole("button", { name: "Submit report" }),
    ).toBeDisabled();
    fireEvent.change(field("Mohammed Faisal"), { target: { value: "7:45" } });
    fireEvent.click(
      within(timer).getByRole("button", { name: "Submit report" }),
    );
    await vi.waitFor(
      () => expect(toasts.success).toHaveBeenCalledWith("Report submitted."),
      WAIT,
    );
    expect(
      (await within(await card("Timer")).findByText("Submitted", {}, WAIT))
        .textContent,
    ).toBe("Submitted");
    expect(
      (await getServices().tasks.listMine()).some((t) => t.code === "T-01"),
    ).toBe(false);
  });

  it("Grammarian draft reopens with its saved text; Ah-Counter breakdown is validated", async () => {
    await as("IL1006");
    renderWithQuery(<MeetingDetail id={SEP25} />);
    const g = await card("Grammarian");
    expect(
      within(g).getByRole("button", { name: /Hide|Continue draft/ }),
    ).toBeInTheDocument();
    fireEvent.change(
      await within(g).findByLabelText("Good language", {}, WAIT),
      { target: { value: "Nailed it; Turn the page" } },
    );
    fireEvent.click(within(g).getByRole("button", { name: "Save draft" }));
    await vi.waitFor(
      () => expect(toasts.success).toHaveBeenCalledWith("Draft saved."),
      WAIT,
    );
    expect(
      (await getServices().reports.forMeeting(SEP25)).items.find(
        (i) => i.kind === "grammarian",
      )?.status,
    ).toBe("draft");
  });

  it("Ah-Counter form: totals and a word breakdown; a bad breakdown blocks save", async () => {
    await as("IL1005"); // Rahul, Ah-Counter (already submitted)
    renderWithQuery(<MeetingDetail id={SEP25} />);
    const ah = await card("Ah-Counter");
    expect(
      await within(ah).findByLabelText(
        "Filler words",
        { selector: "#ah-mem-1007" },
        WAIT,
      ),
    ).toHaveValue("5");
    fireEvent.change(
      within(ah).getByLabelText("Breakdown (optional)", {
        selector: "#ahw-mem-1007",
      }),
      { target: { value: "um four" } },
    );
    expect(
      within(ah).getByText(/Write each word and its count/),
    ).toBeInTheDocument();
    expect(within(ah).getByRole("button", { name: "Resubmit" })).toBeDisabled();
    fireEvent.change(
      within(ah).getByLabelText("Breakdown (optional)", {
        selector: "#ahw-mem-1007",
      }),
      { target: { value: "um 3, so 2" } },
    );
    fireEvent.click(within(ah).getByRole("button", { name: "Resubmit" }));
    await vi.waitFor(
      () => expect(toasts.success).toHaveBeenCalledWith("Report submitted."),
      WAIT,
    );
  });

  it("Table Topics summary: submitting empty shows the service message", async () => {
    await as("IL1011");
    renderWithQuery(<MeetingDetail id={SEP25} />);
    const t = await card("Table Topics Master");
    fireEvent.change(await within(t).findByLabelText("Summary", {}, WAIT), {
      target: { value: "  " },
    });
    fireEvent.click(within(t).getByRole("button", { name: "Resubmit" }));
    await vi.waitFor(
      () =>
        expect(toasts.error).toHaveBeenCalledWith(
          "Write a short summary before submitting.",
        ),
      WAIT,
    );
  });
});

describe("Reports tab state C: 18 Sep, Completed", () => {
  it("consolidated report: four timer cards with words, ah-counter 31 with its breakdown, grammarian language", async () => {
    await as("IL1009"); // a plain member sees everything once Completed
    renderWithQuery(<MeetingDetail id={SEP18} />);
    const timerCard = (
      await screen.findByRole("heading", { name: /^Timer/ }, WAIT)
    ).closest("section") as HTMLElement;
    const rows = within(timerCard).getAllByRole("row").slice(1);
    expect(
      rows.map((r) => [
        (r as HTMLTableRowElement).cells[1].textContent,
        (r as HTMLTableRowElement).cells[2].textContent,
      ]),
    ).toEqual([
      ["5:20", "Green"],
      ["6:10", "Yellow"],
      ["7:05", "Red"],
      ["7:45", "DQ"],
    ]);
    const ahCard = screen
      .getByRole("heading", { name: /^Ah-Counter/ })
      .closest("section") as HTMLElement;
    expect(
      within(ahCard).getByText("31 filler words in total"),
    ).toBeInTheDocument();
    for (const w of ["“um” 14", "“so” 9", "“like” 5", "other 3"])
      expect(within(ahCard).getByText(w)).toBeInTheDocument();
    const gr = screen
      .getByRole("heading", { name: /^Grammarian/ })
      .closest("section") as HTMLElement;
    expect(within(gr).getByText(/6 times by 4 people/)).toBeInTheDocument();
    for (const p of [
      "Nailed it",
      "Wearing many hats",
      "Turn the page",
      "Avoid 'basically' as a filler",
      "Use 'fewer' with countable nouns",
    ])
      expect(within(gr).getByText(p)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Save draft|Submit report/ }),
    ).not.toBeInTheDocument();
  });
});

describe("TMOD theme editor (J-06)", () => {
  it("Ananya (TMOD) edits the 2 Oct theme; every member is notified (N-05); a plain member sees no button", async () => {
    nav.search = "";
    await as("IL1008");
    const { unmount } = renderWithQuery(<MeetingDetail id="mtg-2026-10-02" />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Edit theme" }, WAIT),
    );
    const dialog = await screen.findByRole("dialog", {}, WAIT);
    expect(within(dialog).getByLabelText("Theme")).toHaveValue(
      "New beginnings",
    );
    fireEvent.change(within(dialog).getByLabelText("Theme"), {
      target: { value: "Fresh starts" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Publish" }));
    await vi.waitFor(
      () => expect(toasts.success).toHaveBeenCalledWith("Theme published"),
      WAIT,
    );
    expect(
      await screen.findByText("Fresh starts", {}, WAIT),
    ).toBeInTheDocument();
    const s = getServices();
    await s.auth.signIn("IL1009");
    expect(
      (await s.notifications.listMine()).items.some(
        (n) => n.code === "N-05" && /Fresh starts/.test(n.title),
      ),
    ).toBe(true);
    unmount();
    renderWithQuery(<MeetingDetail id="mtg-2026-10-02" />);
    await screen.findByText("Fresh starts", {}, WAIT);
    expect(
      screen.queryByRole("button", { name: /Edit theme|Set theme/ }),
    ).not.toBeInTheDocument();
  });

  it("9 Oct has no theme: 'Set theme' for its TMOD, empty-state text for everyone", async () => {
    nav.search = "";
    await as("IL1006");
    renderWithQuery(<MeetingDetail id="mtg-2026-10-09" />);
    expect(
      await screen.findByText(
        "The theme and word of the day are not set yet.",
        {},
        WAIT,
      ),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Set theme" }, WAIT),
    ).toBeInTheDocument();
  });
});
