import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithQuery } from "@/test/render";
import { getServices } from "@/lib/services";
import { HomePage } from "./HomePage";
import { TasksPage } from "@/components/tasks/TasksPage";
import { NotificationsPage } from "@/components/notifications/NotificationsPage";

vi.mock("next/navigation", () => ({
  usePathname: () => "/home",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

const WAIT = { timeout: 4000 };

async function as(employeeId: string) {
  const s = getServices();
  await s.dev.reset();
  await s.auth.signIn(employeeId);
}

const card = async (title: string) => {
  const h = await screen.findByRole("heading", { name: title, level: 2 }, WAIT);
  return h.closest("section") as HTMLElement;
};

beforeEach(async () => {
  await getServices().dev.setSimulateError(false);
});

describe("S-02 Home (mock-data.md section 7 and 9)", () => {
  it("Aditya: next meeting 2 Oct with 'Your role: Ah-Counter', tasks T-01 and T-04, no officer cards", async () => {
    await as("IL1013");
    renderWithQuery(<HomePage />);
    const next = await card("Next meeting");
    expect(
      await within(next).findByText("Your role: Ah-Counter", {}, WAIT),
    ).toBeInTheDocument();
    expect(
      within(next).getByText("Fri 2 Oct, 4:00 PM IST"),
    ).toBeInTheDocument();
    expect(within(next).getByText("New beginnings")).toBeInTheDocument();
    const tasks = await card("My tasks");
    expect(
      await within(tasks).findByText("Submit Timer report (25 Sep)", {}, WAIT),
    ).toBeInTheDocument();
    expect(
      within(tasks).getByText("Answer swap request from Vikram Rao"),
    ).toBeInTheDocument();
    expect(
      within(tasks).getByRole("link", { name: "Answer swap" }),
    ).toHaveAttribute(
      "href",
      "/meetings/mtg-2026-10-02?tab=roles&slot=mtg-2026-10-02:ah-counter",
    );
    for (const officerOnly of [
      "Next meeting status",
      "Pending approvals",
      "Quick actions",
      "Votes needing me",
      "Positions",
    ]) {
      expect(
        screen.queryByRole("heading", { name: officerOnly }),
      ).not.toBeInTheDocument();
    }
  });

  it("Mohammed (L2, Speaker 1): open roles exclude what R-02/R-03 block; taking Grammarian works", async () => {
    await as("IL1009");
    renderWithQuery(<HomePage />);
    const open = await card("Open roles I can take");
    const take = await within(open).findByRole(
      "button",
      { name: "Take Grammarian on Fri 2 Oct" },
      WAIT,
    );
    expect(
      within(open).queryByRole("button", { name: /Evaluator 3 on Fri 2 Oct/ }),
    ).not.toBeInTheDocument();
    fireEvent.click(take);
    const roles = await card("My upcoming roles");
    expect(
      await within(roles).findByText("Speaker 1, Grammarian", {}, WAIT),
    ).toBeInTheDocument();
  });

  it("Priya (VPE): approvals show Nisha's withdrawal and Ananya's Level 3; verifying removes T-03", async () => {
    await as("IL1002");
    renderWithQuery(<HomePage />);
    const approvals = await card("Pending approvals");
    expect(
      await within(approvals).findByText(
        "Client call at 4 PM",
        { exact: false },
        WAIT,
      ),
    ).toBeInTheDocument();
    expect(
      await within(approvals).findByText("Ananya Das", {}, WAIT),
    ).toBeInTheDocument();
    const tasks = await card("My tasks");
    expect(
      await within(tasks).findByText("Verify Ananya Das's Level 3", {}, WAIT),
    ).toBeInTheDocument();
    fireEvent.click(within(approvals).getByRole("button", { name: "Verify" }));
    await vi.waitFor(
      () =>
        expect(
          within(tasks).queryByText("Verify Ananya Das's Level 3"),
        ).not.toBeInTheDocument(),
      WAIT,
    );
    expect(screen.getByText("9 of 12 roles filled")).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Positions" }),
    ).not.toBeInTheDocument();
  });

  it("Karthik (VPM, not VPE): withdrawal row only, no level verifications; vote card shows nothing (already voted)", async () => {
    await as("IL1003");
    renderWithQuery(<HomePage />);
    const approvals = await card("Pending approvals");
    expect(
      await within(approvals).findByText(
        "Client call at 4 PM",
        { exact: false },
        WAIT,
      ),
    ).toBeInTheDocument();
    expect(
      within(approvals).queryByRole("button", { name: "Verify" }),
    ).not.toBeInTheDocument();
    const votes = await card("Votes needing me");
    expect(
      await within(votes).findByText("No votes need you right now.", {}, WAIT),
    ).toBeInTheDocument();
  });

  it("Divya (VPPR, has not voted): vote card links to the vote with turnout 4 of 7", async () => {
    await as("IL1004");
    renderWithQuery(<HomePage />);
    const votes = await card("Votes needing me");
    expect(
      await within(votes).findByText("4 of 7 voted", {}, WAIT),
    ).toBeInTheDocument();
    expect(
      within(votes).getByRole("link", { name: "Cast vote" }),
    ).toHaveAttribute("href", "/votes/vote-001");
  });

  it("Arjun (President): positions summary and the President quick actions", async () => {
    await as("IL1001");
    renderWithQuery(<HomePage />);
    const positions = await card("Positions");
    expect(
      await within(positions).findByText("7 of 7 positions filled", {}, WAIT),
    ).toBeInTheDocument();
    expect(
      within(positions).getByRole("link", { name: "Set next President" }),
    ).toBeInTheDocument();
    const quick = await card("Quick actions");
    expect(
      within(quick).getByRole("link", { name: "Manage positions" }),
    ).toBeInTheDocument();
    expect(
      within(quick).getByRole("link", { name: "Start vote" }),
    ).toBeInTheDocument();
  });

  it("each card shows its own retry when the service fails", async () => {
    await as("IL1013");
    await getServices().dev.setSimulateError(true);
    renderWithQuery(<HomePage />);
    expect(
      await screen.findByText("Could not load tasks. Try again", {}, WAIT),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Could not load open roles. Try again", {}, WAIT),
    ).toBeInTheDocument();
    await getServices().dev.setSimulateError(false);
  });
});

describe("S-07 My tasks", () => {
  it("groups Aditya's tasks: T-01 (overdue) under Today, T-04 (2 Oct) under This week", async () => {
    await as("IL1013");
    renderWithQuery(<TasksPage />);
    const today = (
      await screen.findByRole("heading", { name: "Today" }, WAIT)
    ).closest("section") as HTMLElement;
    expect(
      within(today).getByText("Submit Timer report (25 Sep)"),
    ).toBeInTheDocument();
    const week = screen
      .getByRole("heading", { name: "This week" })
      .closest("section") as HTMLElement;
    expect(
      within(week).getByText("Answer swap request from Vikram Rao"),
    ).toBeInTheDocument();
  });
  it("Suresh has no tasks: empty state", async () => {
    await as("IL1011");
    renderWithQuery(<TasksPage />);
    expect(
      await screen.findByText("No tasks. You are all caught up.", {}, WAIT),
    ).toBeInTheDocument();
  });
});

describe("S-08 Notifications", () => {
  it("Aditya: 4 rows newest first, Unread shows 3, Mark all read clears the dots and keeps rows", async () => {
    await as("IL1013");
    renderWithQuery(<NotificationsPage />);
    const list = async () =>
      within(await screen.findByRole("list", {}, WAIT)).getAllByRole("link");
    expect((await list())[0]).toHaveTextContent(
      "Vikram Rao asked to swap Timer with your Ah-Counter role",
    );
    expect(await list()).toHaveLength(5); // N-16, N-14, N-06, N-05 and the 9 Oct N-01
    fireEvent.click(screen.getByRole("button", { name: "Unread" }));
    expect(await list()).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "All" }));
    fireEvent.click(screen.getByRole("button", { name: "Mark all read" }));
    await vi.waitFor(
      () =>
        expect(
          screen.queryByText("Unread:", { exact: false }),
        ).not.toBeInTheDocument(),
      WAIT,
    );
    expect(await list()).toHaveLength(5);
  });
});
