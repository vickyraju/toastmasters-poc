import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithQuery } from "@/test/render";
import { getServices } from "@/lib/services";
import { AuditPage } from "./AuditPage";
import { ExportPage } from "./ExportPage";
import { SettingsPage } from "./SettingsPage";

vi.mock("next/navigation", () => ({
  usePathname: () => "/x",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(""),
}));
const toasts = vi.hoisted(() => {
  const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
  return { toast };
});
vi.mock("sonner", () => ({ toast: toasts.toast }));
const download = vi.hoisted(() => ({ downloadCsv: vi.fn() }));
vi.mock("./download", () => download);

const WAIT = { timeout: 4000 };

async function as(employeeId: string) {
  const s = getServices();
  await s.dev.reset();
  await s.auth.signIn(employeeId);
}

beforeEach(() => {
  toasts.toast.mockReset();
  toasts.toast.success.mockReset();
  toasts.toast.error.mockReset();
  download.downloadCsv.mockReset();
});

describe("S-16 Audit log", () => {
  it("rows show actor, action chip, target and IST time; level.verify and level.reject are different chips", async () => {
    await as("IL1003");
    renderWithQuery(<AuditPage />);
    const items = await screen.findAllByRole("listitem", {}, WAIT);
    expect(items).toHaveLength(7);
    expect(items[0]).toHaveTextContent("Withdrawal requested");
    expect(items[0]).toHaveTextContent("Nisha Pillai · Evaluator 1, Fri 2 Oct");
    expect(items[0]).toHaveTextContent("1 Oct 2026, 5:00 PM IST");
    const chips = items.map((i) => i.textContent ?? "");
    expect(
      chips.some(
        (t) =>
          t.includes("Level rejected") && t.includes("Ganesh Kumar, Level 2"),
      ),
    ).toBe(true);
    expect(
      chips.some(
        (t) =>
          t.includes("Level verified") && t.includes("Suresh Babu, Level 3"),
      ),
    ).toBe(true);
  });

  it("expanding a row shows a before and after table, not JSON", async () => {
    await as("IL1003");
    renderWithQuery(<AuditPage />);
    const reject = (await screen.findAllByRole("listitem", {}, WAIT)).find(
      (i) => i.textContent?.includes("Level rejected"),
    )!;
    fireEvent.click(
      within(reject).getByRole("button", { name: /Show before and after/ }),
    );
    const table = within(reject).getByRole("table");
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map((r) => r.textContent)).toEqual(
      expect.arrayContaining([
        "statuspendingrejected",
        "rejectionReasonnoneEvaluation form missing",
      ]),
    );
    expect(reject.textContent).not.toContain("{");
    expect(
      within(reject).getByRole("button", { name: /Hide before and after/ }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("filters by actor, action and date, each clearable; an empty result says so", async () => {
    await as("IL1003");
    renderWithQuery(<AuditPage />);
    await screen.findAllByRole("listitem", {}, WAIT);
    await within(screen.getByLabelText("Actor")).findByRole(
      "option",
      { name: "Priya Raman" },
      WAIT,
    );
    fireEvent.change(screen.getByLabelText("Actor"), {
      target: { value: "mem-1002" },
    });
    await vi.waitFor(
      () => expect(screen.getAllByRole("listitem")).toHaveLength(2),
      WAIT,
    );
    fireEvent.change(screen.getByLabelText("Action"), {
      target: { value: "level.verify" },
    });
    await vi.waitFor(
      () => expect(screen.getAllByRole("listitem")).toHaveLength(1),
      WAIT,
    );
    fireEvent.change(screen.getByLabelText("From"), {
      target: { value: "2026-10-01" },
    });
    expect(
      await screen.findByText("No audit entries match these filters", {}, WAIT),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    await vi.waitFor(
      () => expect(screen.getAllByRole("listitem")).toHaveLength(7),
      WAIT,
    );
  });

  it("paginates at 20 rows", async () => {
    await as("IL1003");
    const s = getServices();
    for (let i = 0; i < 24; i++)
      await s.members.add({
        employeeId: `IL9${100 + i}`,
        name: `P ${i}`,
        email: `p${i}@example.com`,
        currentLevel: 1,
      } as never);
    renderWithQuery(<AuditPage />);
    await screen.findByText(/Page 1 of 2 · 31 entries/, {}, WAIT);
    expect(screen.getAllByRole("listitem")).toHaveLength(20);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(
      await screen.findByText(/Page 2 of 2/, {}, WAIT),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(11);
  });

  it("shows the retry card when the service fails", async () => {
    await as("IL1003");
    await getServices().dev.setSimulateError(true);
    renderWithQuery(<AuditPage />);
    expect(
      await screen.findByText(
        "Could not load the audit log. Try again",
        {},
        WAIT,
      ),
    ).toBeInTheDocument();
    await getServices().dev.setSimulateError(false);
  });
});

describe("S-17 Export", () => {
  it("three cards, each with its own range defaulting to the last 90 days", async () => {
    await as("IL1006");
    renderWithQuery(<ExportPage />);
    for (const t of ["Roles", "Meeting history", "Progress"])
      expect(
        await screen.findByRole("heading", { name: t }, WAIT),
      ).toBeInTheDocument();
    expect(screen.getAllByLabelText("From")).toHaveLength(3);
    for (const el of screen.getAllByLabelText("From"))
      expect(el).toHaveValue("2026-07-03");
    for (const el of screen.getAllByLabelText("To"))
      expect(el).toHaveValue("2026-10-01");
  });

  it("Download CSV hands the file to the browser and says which file", async () => {
    await as("IL1006");
    renderWithQuery(<ExportPage />);
    const card = (
      await screen.findByRole("heading", { name: "Roles" }, WAIT)
    ).closest("section") as HTMLElement;
    fireEvent.change(within(card).getByLabelText("From"), {
      target: { value: "2026-10-02" },
    });
    fireEvent.change(within(card).getByLabelText("To"), {
      target: { value: "2026-10-02" },
    });
    fireEvent.click(within(card).getByRole("button", { name: "Download CSV" }));
    await vi.waitFor(
      () => expect(download.downloadCsv).toHaveBeenCalled(),
      WAIT,
    );
    const [name, csv] = download.downloadCsv.mock.calls[0];
    expect(name).toBe("roles-2026-10-01.csv");
    expect(csv.split("\r\n")[0]).toBe(
      "Meeting date (IST),Meeting,Status,Role,Member,Employee ID,Assigned at (IST)",
    );
    expect(toasts.toast.success).toHaveBeenCalledWith(
      "roles-2026-10-01.csv downloaded.",
    );
  });

  it("an empty range downloads nothing and says 'No records in this range'; a backwards range blocks the button", async () => {
    await as("IL1006");
    renderWithQuery(<ExportPage />);
    const card = (
      await screen.findByRole("heading", { name: "Progress" }, WAIT)
    ).closest("section") as HTMLElement;
    fireEvent.change(within(card).getByLabelText("From"), {
      target: { value: "2020-01-01" },
    });
    fireEvent.change(within(card).getByLabelText("To"), {
      target: { value: "2020-01-31" },
    });
    fireEvent.click(within(card).getByRole("button", { name: "Download CSV" }));
    await vi.waitFor(
      () =>
        expect(toasts.toast).toHaveBeenCalledWith("No records in this range"),
      WAIT,
    );
    expect(download.downloadCsv).not.toHaveBeenCalled();
    fireEvent.change(within(card).getByLabelText("To"), {
      target: { value: "2019-12-31" },
    });
    expect(
      within(card).getByRole("button", { name: "Download CSV" }),
    ).toBeDisabled();
    expect(
      within(card).getByText(
        "The end date must be on or after the start date.",
      ),
    ).toBeInTheDocument();
  });

  it("a failing service shows 'Export failed. Try again'", async () => {
    await as("IL1006");
    renderWithQuery(<ExportPage />);
    const card = (
      await screen.findByRole("heading", { name: "Roles" }, WAIT)
    ).closest("section") as HTMLElement;
    await getServices().dev.setSimulateError(true);
    fireEvent.click(within(card).getByRole("button", { name: "Download CSV" }));
    await vi.waitFor(
      () =>
        expect(toasts.toast.error).toHaveBeenCalledWith(
          "Export failed. Try again",
        ),
      WAIT,
    );
    await getServices().dev.setSimulateError(false);
  });
});

describe("S-18 Settings", () => {
  it("profile fields: employee ID and, for a member, the Toastmasters ID are read-only", async () => {
    await as("IL1009");
    renderWithQuery(<SettingsPage />);
    expect(
      await screen.findByLabelText("Name (required)", {}, WAIT),
    ).toHaveValue("Mohammed Faisal");
    expect(screen.getByLabelText("Employee ID")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Toastmasters ID")).toHaveAttribute(
      "readonly",
    );
    expect(
      screen.getByText("Only ExComm can change this."),
    ).toBeInTheDocument();
  });

  it("an ExComm member can edit the Toastmasters ID", async () => {
    await as("IL1003");
    renderWithQuery(<SettingsPage />);
    expect(
      await screen.findByLabelText("Toastmasters ID", {}, WAIT),
    ).not.toHaveAttribute("readonly");
  });

  it("locked rows say 'Always on' with no switch; the other twelve are switches; the five codes are the right ones", async () => {
    await as("IL1009");
    renderWithQuery(<SettingsPage />);
    const list = (
      await screen.findByRole("heading", { name: "Notifications" }, WAIT)
    ).closest("section") as HTMLElement;
    expect(within(list).getAllByText("Always on")).toHaveLength(5);
    expect(within(list).getAllByRole("switch")).toHaveLength(12);
    for (const label of [
      "Meeting rescheduled",
      "Meeting cancelled",
      "Role assigned, changed or removed by ExComm",
      "Reminders for your own roles",
      "Withdrawal request decided",
    ])
      expect(
        within(
          within(list).getByText(label).closest("li") as HTMLElement,
        ).getByText("Always on"),
      ).toBeInTheDocument();
    expect(
      within(
        within(list)
          .getByText("Meeting opened for roles")
          .closest("li") as HTMLElement,
      ).getByRole("switch"),
    ).toBeChecked();
  });

  it("switching a type off and saving persists it and confirms; bad input shows inline errors", async () => {
    await as("IL1009");
    renderWithQuery(<SettingsPage />);
    const name = await screen.findByLabelText("Name (required)", {}, WAIT);
    fireEvent.change(name, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(
      await screen.findByText("Enter a name", {}, WAIT),
    ).toBeInTheDocument();
    fireEvent.change(name, { target: { value: "Mohammed F" } });
    fireEvent.click(
      screen.getByRole("switch", {
        name: "New meeting type, template or role added",
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await vi.waitFor(
      () =>
        expect(toasts.toast.success).toHaveBeenCalledWith("Settings saved."),
      WAIT,
    );
    const s = getServices();
    expect(
      (await s.settings.notificationPrefs()).find((p) => p.code === "N-08")
        ?.enabled,
    ).toBe(false);
    expect((await s.auth.getCurrentUser())?.name).toBe("Mohammed F");
  });
});
