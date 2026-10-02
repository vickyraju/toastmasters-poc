import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithQuery } from "@/test/render";
import { getServices } from "@/lib/services";
import { MembersPage } from "./MembersPage";
import { ProfilePage } from "./ProfilePage";
import { PositionsPage } from "./PositionsPage";

vi.mock("next/navigation", () => ({
  usePathname: () => "/members/x",
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

const row = async (name: string) =>
  (await screen.findByRole(
    "row",
    { name: new RegExp(name) },
    WAIT,
  )) as HTMLTableRowElement;
const openMenu = async (name: string) => {
  // The phone list is also in the DOM in jsdom (no CSS), so open the menu from the table row.
  const trigger = within(await row(name)).getByRole("button", {
    name: `Actions for ${name}`,
  });
  fireEvent.pointerDown(trigger, { button: 0, pointerType: "mouse" });
  return screen.findByRole("menu", {}, WAIT);
};

beforeEach(() => {
  toasts.success.mockReset();
  toasts.error.mockReset();
});

describe("S-11 Members", () => {
  it("lists the 15 active members by default; Removed shows IL1099 without a menu; search narrows", async () => {
    await as("IL1003");
    renderWithQuery(<MembersPage />);
    await row("Arjun Mehta");
    expect(
      within(screen.getByRole("table")).getAllByRole("row").slice(1),
    ).toHaveLength(14); // 15 minus inactive Ganesh
    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "removed" },
    });
    const old = await row("Old Member");
    expect(old).toHaveTextContent("removed");
    expect(
      within(old).queryByRole("button", { name: /Actions for/ }),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "il1009" },
    });
    expect(
      within(screen.getByRole("table")).getAllByRole("row").slice(1),
    ).toHaveLength(1);
    fireEvent.change(screen.getByLabelText("Search"), {
      target: { value: "nobody here" },
    });
    expect(
      await screen.findByText("No members match your search", {}, WAIT),
    ).toBeInTheDocument();
  });

  it("Priya's row shows the VPE badge; Ganesh is Inactive with Reactivate", async () => {
    await as("IL1003");
    renderWithQuery(<MembersPage />);
    expect(await row("Priya Raman")).toHaveTextContent("VPE");
    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "inactive" },
    });
    expect(await row("Ganesh Kumar")).toHaveTextContent("inactive");
    await openMenu("Ganesh Kumar");
    fireEvent.click(screen.getByRole("menuitem", { name: "Reactivate" }));
    await vi.waitFor(
      () =>
        expect(toasts.success).toHaveBeenCalledWith(
          "Ganesh Kumar reactivated.",
        ),
      WAIT,
    );
  });

  it("Add member: validation, duplicate ID shown under the field, then success", async () => {
    await as("IL1003");
    renderWithQuery(<MembersPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Add member" }, WAIT),
    );
    const dialog = await screen.findByRole("dialog", {}, WAIT);
    fireEvent.click(within(dialog).getByRole("button", { name: "Add member" }));
    expect(
      await within(dialog).findByText("Enter the employee ID", {}, WAIT),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Enter a name")).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("Employee ID (required)"), {
      target: { value: "il1009" },
    });
    fireEvent.change(within(dialog).getByLabelText("Name (required)"), {
      target: { value: "Someone" },
    });
    fireEvent.change(within(dialog).getByLabelText("Email (required)"), {
      target: { value: "someone@example.com" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add member" }));
    expect(
      await within(dialog).findByText(
        "A member with this employee ID already exists.",
        {},
        WAIT,
      ),
    ).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("Employee ID (required)"), {
      target: { value: "il3001" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Add member" }));
    await vi.waitFor(
      () => expect(toasts.success).toHaveBeenCalledWith("Someone added."),
      WAIT,
    );
    expect(await row("Someone")).toHaveTextContent("IL3001");
  });

  it("removing Vikram first lists his 2 Oct Timer and his SAA position; confirming releases them", async () => {
    await as("IL1003");
    renderWithQuery(<MembersPage />);
    await row("Vikram Rao");
    await openMenu("Vikram Rao");
    fireEvent.click(screen.getByRole("menuitem", { name: "Remove" }));
    const dialog = await screen.findByRole("dialog", {}, WAIT);
    expect(
      await within(dialog).findByText(
        /Release Timer on Fri 2 Oct, 4:00 PM IST/,
        {},
        WAIT,
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText("Leave the SAA position vacant."),
    ).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove" }));
    await vi.waitFor(
      () =>
        expect(toasts.success).toHaveBeenCalledWith(
          "Vikram Rao removed. 1 role released.",
        ),
      WAIT,
    );
    const roles = await getServices().roles.listForMeeting("mtg-2026-10-02");
    expect(roles.find((r) => r.slot.label === "Timer")?.holder).toBeNull();
    // Karthik is not the President, so read the seat through the member list
    expect(
      (await getServices().members.list()).find(
        (m) => m.employeeId === "IL1007",
      )?.position,
    ).toBeNull();
  });

  it("you cannot remove yourself or the President; the menu says why and the actions are disabled", async () => {
    await as("IL1003");
    renderWithQuery(<MembersPage />);
    await row("Karthik Subramanian");
    let menu = await openMenu("Karthik Subramanian");
    // the signed-in user loads a moment after the table, so wait for the hint
    expect(
      await within(menu).findByText("You cannot remove yourself.", {}, WAIT),
    ).toBeInTheDocument();
    expect(
      within(menu).getByRole("menuitem", { name: "Remove" }),
    ).toHaveAttribute("aria-disabled", "true");
    fireEvent.keyDown(menu, { key: "Escape" });
    menu = await openMenu("Arjun Mehta");
    expect(
      await within(menu).findByText("Transfer the presidency first.", {}, WAIT),
    ).toBeInTheDocument();
  });

  it("Edit changes the visible fields; a duplicate email shows under the field", async () => {
    await as("IL1003");
    renderWithQuery(<MembersPage />);
    await row("Mohammed Faisal");
    await openMenu("Mohammed Faisal");
    fireEvent.click(screen.getByRole("menuitem", { name: "Edit" }));
    const dialog = await screen.findByRole("dialog", {}, WAIT);
    expect(within(dialog).getByLabelText("Name (required)")).toHaveValue(
      "Mohammed Faisal",
    );
    fireEvent.change(within(dialog).getByLabelText("Email (required)"), {
      target: { value: "lakshmi.narayanan@example.com" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    expect(
      await within(dialog).findByText(
        "A member with this email already exists.",
        {},
        WAIT,
      ),
    ).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("Email (required)"), {
      target: { value: "mo@example.com" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await vi.waitFor(
      () => expect(toasts.success).toHaveBeenCalledWith("Member saved."),
      WAIT,
    );
  });
});

describe("S-12 Member profile", () => {
  it("Suresh's profile: header, roles history and progress", async () => {
    await as("IL1003");
    renderWithQuery(<ProfilePage id="mem-1011" />);
    expect(
      await screen.findByRole(
        "heading",
        { name: "Suresh Babu", level: 2 },
        WAIT,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("suresh.babu@example.com")).toBeInTheDocument();
    expect(screen.getByText("4 of 5")).toBeInTheDocument();
    const roles = (
      await screen.findByRole("heading", { name: "Roles history" })
    ).closest("section") as HTMLElement;
    expect(within(roles).getAllByRole("listitem")).toHaveLength(3);
    // General Evaluator on 18 Sep and 2 Oct
    expect(
      within(roles).getAllByText("General Evaluator", {
        selector: "span.font-medium",
      }),
    ).toHaveLength(2);
    const progress = screen
      .getByRole("heading", { name: "Progress" })
      .closest("section") as HTMLElement;
    expect(within(progress).getByText("Level 3")).toBeInTheDocument();
  });

  it("self-view: edit own pathway, Toastmasters ID is read-only; ExComm sees it editable", async () => {
    await as("IL1009");
    const { unmount } = renderWithQuery(<ProfilePage id="mem-1009" />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit" }, WAIT));
    let dialog = await screen.findByRole("dialog", {}, WAIT);
    expect(within(dialog).getByLabelText("Toastmasters ID")).toHaveAttribute(
      "readonly",
    );
    fireEvent.change(within(dialog).getByLabelText("Pathway"), {
      target: { value: "Visionary Communication" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await vi.waitFor(
      () => expect(toasts.success).toHaveBeenCalledWith("Member saved."),
      WAIT,
    );
    unmount();
    await as("IL1003");
    renderWithQuery(<ProfilePage id="mem-1009" />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit" }, WAIT));
    dialog = await screen.findByRole("dialog", {}, WAIT);
    expect(
      within(dialog).getByLabelText("Toastmasters ID"),
    ).not.toHaveAttribute("readonly");
  });

  it("a member opening someone else's profile gets G-05; a brand-new member shows 'No roles yet'", async () => {
    await as("IL1009");
    const { unmount } = renderWithQuery(<ProfilePage id="mem-1010" />);
    expect(
      await screen.findByRole(
        "heading",
        { name: "You do not have access to this page" },
        WAIT,
      ),
    ).toBeInTheDocument();
    unmount();
    await as("IL1003");
    await getServices().members.add({
      employeeId: "IL4001",
      name: "Fresh Face",
      email: "fresh@example.com",
      currentLevel: 1,
    } as never);
    const id = (await getServices().members.list()).find(
      (m) => m.employeeId === "IL4001",
    )!.id;
    renderWithQuery(<ProfilePage id={id} />);
    expect(
      await screen.findByText("No roles yet", {}, WAIT),
    ).toBeInTheDocument();
    expect(screen.getByText("0 projects done")).toBeInTheDocument();
  });
});

describe("S-13 Positions", () => {
  const card = async (name: string) =>
    (await screen.findByRole("heading", { name, level: 2 }, WAIT)).closest(
      "li",
    ) as HTMLElement;

  it("seven seats with their holders; the Next President card says Not set", async () => {
    await as("IL1001");
    renderWithQuery(<PositionsPage />);
    for (const [seat, who] of [
      ["President", "Arjun Mehta"],
      ["VPE", "Priya Raman"],
      ["VPM", "Karthik Subramanian"],
      ["VPPR", "Divya Krishnan"],
      ["Secretary", "Rahul Verma"],
      ["Treasurer", "Sneha Iyer"],
      ["SAA", "Vikram Rao"],
    ])
      expect(await card(seat)).toHaveTextContent(who);
    expect(screen.getByText("Not set")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Transfer presidency now" }),
    ).not.toBeInTheDocument();
  });

  it("replace the VPM: pick, then a confirm that names both people; the seat changes", async () => {
    await as("IL1001");
    renderWithQuery(<PositionsPage />);
    fireEvent.click(
      within(await card("VPM")).getByRole("button", { name: "Change" }),
    );
    let dialog = await screen.findByRole("dialog", {}, WAIT);
    await within(dialog)
      .findByRole("option", { name: "Mohammed Faisal" }, WAIT)
      .catch(() => null);
    await within(dialog)
      .findByRole("option", { name: "Mohammed Faisal" }, WAIT)
      .catch(() => undefined);
    const options = within(dialog)
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(options).toContain("Mohammed Faisal");
    expect(options).not.toContain("Karthik Subramanian"); // the current holder
    expect(options.some((o) => o?.includes("Priya Raman"))).toBe(false); // already holds a seat
    fireEvent.change(within(dialog).getByLabelText("Member (required)"), {
      target: { value: "mem-1009" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Continue" }));
    dialog = await screen.findByRole("dialog", {}, WAIT);
    await vi.waitFor(
      () =>
        expect(dialog).toHaveTextContent(
          "Karthik Subramanian will become a plain Member.",
        ),
      WAIT,
    );
    expect(dialog).toHaveTextContent(
      "Mohammed Faisal is notified and becomes VPM.",
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Replace" }));
    await vi.waitFor(
      () => expect(toasts.success).toHaveBeenCalledWith("VPM assigned."),
      WAIT,
    );
    expect(await card("VPM")).toHaveTextContent("Mohammed Faisal");
  });

  it("Make vacant shows Vacant with an Assign button", async () => {
    await as("IL1001");
    renderWithQuery(<PositionsPage />);
    fireEvent.click(
      within(await card("Treasurer")).getByRole("button", {
        name: "Make vacant",
      }),
    );
    const dialog = await screen.findByRole("dialog", {}, WAIT);
    expect(dialog).toHaveTextContent("Sneha Iyer will become a plain Member");
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Make vacant" }),
    );
    const t = await card("Treasurer");
    await vi.waitFor(() => expect(t).toHaveTextContent("Vacant"), WAIT);
    expect(
      within(t).getByRole("button", { name: "Assign" }),
    ).toBeInTheDocument();
  });

  it("name the next President, then the transfer confirm is strongly worded; after it there is still exactly one President", async () => {
    await as("IL1001");
    renderWithQuery(<PositionsPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Set next President" }, WAIT),
    );
    let dialog = await screen.findByRole("dialog", {}, WAIT);
    await within(dialog).findByRole(
      "option",
      { name: /Mohammed Faisal/ },
      WAIT,
    );
    fireEvent.change(within(dialog).getByLabelText("Member (required)"), {
      target: { value: "mem-1009" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Set next President" }),
    );
    fireEvent.click(
      await screen.findByRole(
        "button",
        { name: "Transfer presidency now" },
        WAIT,
      ),
    );
    dialog = await screen.findByRole("dialog", {}, WAIT);
    expect(dialog).toHaveTextContent(
      "Mohammed Faisal will become President immediately. You will become a regular member and lose admin access. This cannot be undone from here.",
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Transfer now" }),
    );
    await vi.waitFor(
      () =>
        expect(toasts.success).toHaveBeenCalledWith("Presidency transferred."),
      WAIT,
    );
    const s = getServices();
    await s.auth.signIn("IL1009");
    const list = await s.members.list();
    expect(
      list
        .filter((m) => m.accountType === "president" && m.status === "active")
        .map((m) => m.employeeId),
    ).toEqual(["IL1009"]);
    expect(list.find((m) => m.employeeId === "IL1001")).toMatchObject({
      accountType: "member",
      position: null,
    });
  });
});

describe("S-11 Import CSV", () => {
  const csv = (text: string) =>
    new File([text], "members.csv", { type: "text/csv" });
  const openImport = async () => {
    renderWithQuery(<MembersPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Import CSV" }, WAIT),
    );
    return screen.findByRole("dialog", {}, WAIT);
  };

  it("previews what will be added and why rows are skipped, then adds only the valid ones", async () => {
    await as("IL1003");
    const dialog = await openImport();
    fireEvent.change(within(dialog).getByLabelText("CSV file"), {
      target: {
        files: [
          csv(
            'Employee ID,Name,Email,Level\nIL6001,Ada Lovelace,ada@example.com,2\nIL1009,Dup Person,dup@example.com,\nIL6002,Bad Mail,nope,1\nIL6003,"Comma, Name",comma@example.com,',
          ),
        ],
      },
    });
    expect(
      await within(dialog).findByText(
        "2 will be added, 2 will be skipped.",
        {},
        WAIT,
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Line 3").closest("li")).toHaveTextContent(
      "A member with this employee ID already exists.",
    );
    expect(within(dialog).getByText("Line 4").closest("li")).toHaveTextContent(
      /email/i,
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Add 2 members" }),
    );
    await vi.waitFor(
      () =>
        expect(toasts.success).toHaveBeenCalledWith(
          "2 members added. 2 skipped.",
        ),
      WAIT,
    );
    const list = await getServices().members.list();
    expect(list.find((m) => m.employeeId === "IL6001")).toMatchObject({
      name: "Ada Lovelace",
      currentLevel: 2,
    });
    expect(list.find((m) => m.employeeId === "IL6003")?.name).toBe(
      "Comma, Name",
    );
    expect(list.some((m) => m.employeeId === "IL6002")).toBe(false);
  });

  it("a file with a missing column or no members explains itself and offers no Add button", async () => {
    await as("IL1003");
    const dialog = await openImport();
    fireEvent.change(within(dialog).getByLabelText("CSV file"), {
      target: { files: [csv("employee_id,name\nIL1,A")] },
    });
    expect(
      await within(dialog).findByRole("alert", {}, WAIT),
    ).toHaveTextContent("Missing column: email");
    expect(
      within(dialog).getByRole("button", { name: "Add members" }),
    ).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText("CSV file"), {
      target: { files: [csv("employee_id,name,email\n")] },
    });
    expect(
      await within(dialog).findByText(
        "The file has a header but no members.",
        {},
        WAIT,
      ),
    ).toBeInTheDocument();
  });

  it("a file where every row is bad adds nothing", async () => {
    await as("IL1003");
    const dialog = await openImport();
    fireEvent.change(within(dialog).getByLabelText("CSV file"), {
      target: {
        files: [csv("employee_id,name,email\nIL1009,Dup,dup@example.com")],
      },
    });
    expect(
      await within(dialog).findByText(
        "0 will be added, 1 will be skipped.",
        {},
        WAIT,
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Add members" }),
    ).toBeDisabled();
  });
});
