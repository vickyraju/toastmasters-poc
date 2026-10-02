import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithQuery } from "@/test/render";
import { getServices } from "@/lib/services";
import { VotesPage } from "./VotesPage";
import { VoteDetail } from "./VoteDetail";

vi.mock("next/navigation", () => ({
  usePathname: () => "/votes/x",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));
const toasts = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), toasts) }));

const WAIT = { timeout: 4000 };

async function as(employeeId: string) {
  const s = getServices();
  await s.dev.reset();
  await s.auth.signIn(employeeId);
}

/** Every number that could be a per-option result: "4 (57%)", a percent, or an option-labelled bar. */
function expectNoResults(root: HTMLElement) {
  expect(root.textContent).not.toMatch(/%/);
  expect(root.textContent).not.toMatch(/\(\d+%\)/);
  expect(
    screen.queryByRole("heading", { name: "Results" }),
  ).not.toBeInTheDocument();
  for (const label of ["Yes", "No", "Abstain"])
    expect(
      screen.queryByRole("progressbar", { name: label, hidden: true }),
    ).not.toBeInTheDocument();
  // the only progress bar is the turnout bar
  expect(
    screen
      .getAllByRole("progressbar", { hidden: true })
      .map((b) => b.getAttribute("aria-label")),
  ).toEqual(["Voted"]);
}

beforeEach(() => {
  toasts.success.mockReset();
  toasts.error.mockReset();
});

describe("S-14 Votes list", () => {
  it("shows the open vote with its deadline and 4 of 7 turnout, and the closed one with its closed date; no results", async () => {
    await as("IL1002");
    renderWithQuery(<VotesPage />);
    const open = (await screen.findByRole(
      "link",
      { name: /Approve club anniversary budget/ },
      WAIT,
    )) as HTMLElement;
    expect(open).toHaveTextContent(
      "Deadline Sun 4 Oct, 6:00 PM IST · 4 of 7 voted",
    );
    expect(open).toHaveTextContent("Open");
    const closed = screen.getByRole("link", {
      name: /Move meetings to 5 PM\?/,
    });
    expect(closed).toHaveTextContent("Closed 12 Sep 2026");
    expect(closed).not.toHaveTextContent("Deadline");
    expect(screen.getByRole("list").textContent).not.toMatch(/%/);
    expect(open).toHaveAttribute("href", "/votes/vote-001");
  });

  it("only the President sees Start vote; a voter who has not voted is told their vote is needed", async () => {
    await as("IL1004"); // Divya has not voted
    const { unmount } = renderWithQuery(<VotesPage />);
    expect(
      await screen.findByText("Your vote is needed", {}, WAIT),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Start vote" }),
    ).not.toBeInTheDocument();
    unmount();
    await as("IL1001");
    renderWithQuery(<VotesPage />);
    expect(
      await screen.findByRole("button", { name: "Start vote" }, WAIT),
    ).toBeInTheDocument();
    expect(screen.queryByText("Your vote is needed")).not.toBeInTheDocument(); // Arjun already voted
  });

  it("Start vote: defaults Yes/No/Abstain, validates, a past deadline is refused under the field, then the vote opens", async () => {
    await as("IL1001");
    renderWithQuery(<VotesPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Start vote" }, WAIT),
    );
    const dialog = await screen.findByRole("dialog", {}, WAIT);
    expect(
      [0, 1, 2].map(
        (i) =>
          (within(dialog).getByLabelText(`Option ${i + 1}`) as HTMLInputElement)
            .value,
      ),
    ).toEqual(["Yes", "No", "Abstain"]);
    fireEvent.click(within(dialog).getByRole("button", { name: "Start vote" }));
    expect(
      await within(dialog).findByText("Use at least 3 characters", {}, WAIT),
    ).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("Title (required)"), {
      target: { value: "Pizza on Friday?" },
    });
    fireEvent.change(
      within(dialog).getByLabelText("Deadline date (optional)"),
      { target: { value: "2026-09-01" } },
    );
    fireEvent.change(within(dialog).getByLabelText("Deadline time (IST)"), {
      target: { value: "10:00" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Start vote" }));
    expect(
      await within(dialog).findByText(
        "Deadline must be in the future",
        {},
        WAIT,
      ),
    ).toBeInTheDocument();
    fireEvent.change(
      within(dialog).getByLabelText("Deadline date (optional)"),
      { target: { value: "2026-10-05" } },
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Start vote" }));
    await vi.waitFor(
      () =>
        expect(toasts.success).toHaveBeenCalledWith(
          "Vote started. Eligible voters are notified.",
        ),
      WAIT,
    );
    expect(
      await screen.findByRole("link", { name: /Pizza on Friday\?/ }, WAIT),
    ).toHaveTextContent("Deadline Mon 5 Oct, 10:00 AM IST");
  });

  it("options: at least two stay, and a duplicate label is refused", async () => {
    await as("IL1001");
    renderWithQuery(<VotesPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Start vote" }, WAIT),
    );
    const dialog = await screen.findByRole("dialog", {}, WAIT);
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Remove option 3" }),
    );
    expect(
      within(dialog).getByRole("button", { name: "Remove option 1" }),
    ).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText("Title (required)"), {
      target: { value: "Same twice" },
    });
    fireEvent.change(within(dialog).getByLabelText("Option 2"), {
      target: { value: " yes " },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Start vote" }));
    expect(
      await within(dialog).findByText(
        "Each option must be different",
        {},
        WAIT,
      ),
    ).toBeInTheDocument();
  });
});

describe("S-15 Vote detail: results stay hidden while open (M11 done-when)", () => {
  it("Divya (not voted): ballot with the three options and 4 of 7 turnout, and not one result number", async () => {
    await as("IL1004");
    const { container } = renderWithQuery(<VoteDetail id="vote-001" />);
    expect(
      await screen.findByRole(
        "heading",
        { name: "Approve club anniversary budget" },
        WAIT,
      ),
    ).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("radio")
        .map((r) => (r.closest("label") as HTMLElement).textContent),
    ).toEqual(["Yes", "No", "Abstain"]);
    expect(screen.getByText("4 of 7 voted")).toBeInTheDocument();
    expectNoResults(container);
  });

  it("the same holds for the President, who can also close it", async () => {
    await as("IL1001");
    const { container } = renderWithQuery(<VoteDetail id="vote-001" />);
    await screen.findByText(
      "You voted. Results are hidden until the vote closes.",
      {},
      WAIT,
    );
    expectNoResults(container);
    // the officer controls load a moment after the page
    expect(
      await screen.findByRole("button", { name: "Close vote" }, WAIT),
    ).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument(); // already voted: a note, not a silent disabled form
  });

  it("walkthrough 6: Divya casts after a confirm that says votes are final and secret; turnout 5 of 7; still no results", async () => {
    await as("IL1004");
    const { container } = renderWithQuery(<VoteDetail id="vote-001" />);
    const cast = await screen.findByRole("button", { name: "Cast vote" }, WAIT);
    expect(cast).toBeDisabled();
    fireEvent.click(screen.getByLabelText("Yes"));
    fireEvent.click(cast);
    const dialog = await screen.findByRole("dialog", {}, WAIT);
    expect(dialog).toHaveTextContent("Votes are final and secret.");
    expect(dialog).toHaveTextContent("Cast your vote?");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Confirm vote" }),
    );
    await vi.waitFor(
      () => expect(toasts.success).toHaveBeenCalledWith("Your vote is in."),
      WAIT,
    );
    expect(
      await screen.findByText("5 of 7 voted", {}, WAIT),
    ).toBeInTheDocument();
    expect(
      screen.getByText("You voted. Results are hidden until the vote closes."),
    ).toBeInTheDocument();
    expectNoResults(container);
  });

  it("the stored ballots carry no member id, and nothing links Divya to her choice", async () => {
    await as("IL1004");
    renderWithQuery(<VoteDetail id="vote-001" />);
    fireEvent.click(await screen.findByLabelText("No", {}, WAIT));
    fireEvent.click(screen.getByRole("button", { name: "Cast vote" }));
    fireEvent.click(
      within(await screen.findByRole("dialog", {}, WAIT)).getByRole("button", {
        name: "Confirm vote",
      }),
    );
    await vi.waitFor(() => expect(toasts.success).toHaveBeenCalled(), WAIT);
    // jsdom persists the mock store like a browser, so inspect exactly what was stored
    const state = JSON.parse(localStorage.getItem("clubhub.mock.v1")!).state;
    for (const b of state.voteBallots)
      expect(Object.keys(b).sort()).toEqual(["id", "optionId", "voteId"]);
    expect(JSON.stringify(state.voteBallots)).not.toMatch(/mem-\d+/);
    expect(
      state.voteParticipation.some(
        (p: { memberId: string; voteId: string }) =>
          p.memberId === "mem-1004" && p.voteId === "vote-001",
      ),
    ).toBe(true);
    // who and when, never what
    expect(Object.keys(state.voteParticipation[0]).sort()).toEqual([
      "castAt",
      "memberId",
      "voteId",
    ]);
    const s = getServices();
    await s.auth.signIn("IL1003");
    const audit = await s.audit.list({ action: "vote.cast" });
    expect(audit[0]).toMatchObject({
      actorId: "mem-1004",
      before: null,
      after: null,
    });
    expect(JSON.stringify(audit)).not.toMatch(/vote-001:no/);
  });

  it("walkthrough 7: the President closes it after a confirm; results appear with counts and percentages, no names", async () => {
    await as("IL1001");
    renderWithQuery(<VoteDetail id="vote-001" />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Close vote" }, WAIT),
    );
    const dialog = await screen.findByRole("dialog", {}, WAIT);
    expect(dialog).toHaveTextContent("Close this vote now? ".trim());
    expect(dialog).toHaveTextContent(
      "Results become visible to eligible voters immediately.",
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Close vote" }));
    const results = (
      await screen.findByRole("heading", { name: "Results" }, WAIT)
    ).closest("section") as HTMLElement;
    // vote-001: Yes 2, No 1, Abstain 1 of the 4 ballots cast
    expect(within(results).getByText("2 (50%)")).toBeInTheDocument();
    expect(within(results).getAllByText("1 (25%)")).toHaveLength(2);
    expect(
      screen.queryByRole("button", { name: "Close vote" }),
    ).not.toBeInTheDocument();
    for (const name of ["Arjun", "Priya", "Karthik", "Sneha", "Divya"])
      expect(document.body.textContent).not.toContain(name);
  });

  it("closed vote-000: Yes 4 (57%), No 2 (29%), Abstain 1 (14%) as bars; no radios, no voter names", async () => {
    await as("IL1002");
    renderWithQuery(<VoteDetail id="vote-000" />);
    const results = (
      await screen.findByRole("heading", { name: "Results" }, WAIT)
    ).closest("section") as HTMLElement;
    for (const t of ["4 (57%)", "2 (29%)", "1 (14%)"])
      expect(within(results).getByText(t)).toBeInTheDocument();
    expect(within(results).getAllByRole("progressbar")).toHaveLength(3);
    expect(screen.getByText("Closed 12 Sep 2026")).toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Close vote" }),
    ).not.toBeInTheDocument();
  });

  it("an officer appointed after the vote sees turnout only; Members get G-05; unknown vote is not found", async () => {
    await as("IL1001");
    const s = getServices();
    await s.votes.close("vote-001");
    await s.positions.assign("treasurer", null);
    await s.positions.assign("treasurer", "mem-1009");
    await s.auth.signOut();
    await s.auth.signIn("IL1009");
    const { container, unmount } = renderWithQuery(
      <VoteDetail id="vote-001" />,
    );
    expect(
      await screen.findByText(
        "Results are visible to the eligible voters.",
        {},
        WAIT,
      ),
    ).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/%/);
    unmount();
    await s.auth.signOut();
    await s.auth.signIn("IL1013");
    const denied = renderWithQuery(<VoteDetail id="vote-001" />);
    expect(
      await screen.findByRole(
        "heading",
        { name: "You do not have access to this page" },
        WAIT,
      ),
    ).toBeInTheDocument();
    denied.unmount();
    await s.auth.signOut();
    await s.auth.signIn("IL1002");
    renderWithQuery(<VoteDetail id="vote-nope" />);
    expect(
      await screen.findByRole("heading", { name: "Vote not found" }, WAIT),
    ).toBeInTheDocument();
  });

  it("a service failure shows the retry card", async () => {
    await as("IL1002");
    await getServices().dev.setSimulateError(true);
    renderWithQuery(<VoteDetail id="vote-001" />);
    expect(
      await screen.findByText("Could not load this vote. Try again", {}, WAIT),
    ).toBeInTheDocument();
    await getServices().dev.setSimulateError(false);
  });
});
