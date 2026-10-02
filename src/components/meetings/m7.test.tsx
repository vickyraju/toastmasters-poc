import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderWithQuery } from "@/test/render";
import { getServices } from "@/lib/services";
import { MeetingDetail } from "./MeetingDetail";
import { MeetingForm } from "./MeetingForm";
import { TemplatesPage } from "@/components/templates/TemplatesPage";
import { checkAgendaFile } from "./AgendaUpload";

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn(), search: "" }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/meetings/x",
  useRouter: () => ({ replace: nav.replace, push: nav.push }),
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
  nav.push.mockReset();
  nav.search = "";
  toasts.success.mockReset();
  toasts.error.mockReset();
});

describe("S-05 create the 31 Oct contest, open it, finalize it (M7 done-when)", () => {
  it("fills the form, adds custom roles, opens for roles", async () => {
    await as("IL1003");
    renderWithQuery(<MeetingForm />);
    fireEvent.change(
      await screen.findByLabelText("Title (required)", {}, WAIT),
      { target: { value: "Area Speech Contest 2" } },
    );
    fireEvent.change(screen.getByLabelText("Meeting type (required)"), {
      target: { value: "mt-contest" },
    });
    expect(screen.getByLabelText("Duration in minutes")).toHaveValue(150); // from the type
    fireEvent.change(screen.getByLabelText("Date (required)"), {
      target: { value: "2026-11-14" },
    });
    fireEvent.change(screen.getByLabelText("Start time (required)"), {
      target: { value: "10:00" },
    });
    fireEvent.change(screen.getByLabelText("Venue"), {
      target: { value: "Conference Room B, Inception Labs, Chennai" },
    });
    // the type pre-fills TMOD, Timer, Ah-Counter
    expect(screen.getByLabelText("Toastmaster of the Day")).toHaveValue(1);
    expect(screen.getByLabelText("Speaker")).toHaveValue(0);
    fireEvent.click(screen.getByRole("button", { name: "Add custom role" }));
    fireEvent.change(screen.getByLabelText("Custom role name"), {
      target: { value: "Chief Judge Two" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Open for roles" }));
    await vi.waitFor(() => expect(nav.push).toHaveBeenCalled(), WAIT);

    const s = getServices();
    const made = (await s.meetings.list()).find(
      (m) => m.title === "Area Speech Contest 2",
    )!;
    expect(made).toMatchObject({
      status: "open",
      typeName: "Speech Contest",
      total: 4,
    });
    expect(nav.push).toHaveBeenCalledWith(`/meetings/${made.id}`);
    expect(made.endsAt).toBe("2026-11-14T07:00:00.000Z"); // 10:00 IST + 150 min
    expect(
      (await s.roles.listForMeeting(made.id)).map((r) => r.slot.label),
    ).toContain("Chief Judge Two");
  });

  it("'Open for roles' without a venue or link shows the message and creates nothing", async () => {
    await as("IL1003");
    renderWithQuery(<MeetingForm />);
    fireEvent.change(
      await screen.findByLabelText("Title (required)", {}, WAIT),
      { target: { value: "No place yet" } },
    );
    fireEvent.change(screen.getByLabelText("Date (required)"), {
      target: { value: "2026-11-21" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Open for roles" }));
    expect(
      await screen.findByText(
        "Add a venue or a meeting link before opening for roles",
        {},
        WAIT,
      ),
    ).toBeInTheDocument();
    expect(
      (await getServices().meetings.list()).some(
        (m) => m.title === "No place yet",
      ),
    ).toBe(false);
    // "Save draft" still works without a location
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await vi.waitFor(
      () => expect(toasts.success).toHaveBeenCalledWith("Draft saved."),
      WAIT,
    );
    expect(
      (await getServices().meetings.list()).find(
        (m) => m.title === "No place yet",
      )?.status,
    ).toBe("draft");
  });

  it("empty title and date show field errors", async () => {
    await as("IL1003");
    renderWithQuery(<MeetingForm />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Save draft" }, WAIT),
    );
    expect(
      await screen.findByText("Enter a title", {}, WAIT),
    ).toBeInTheDocument();
    expect(screen.getByText("Choose a date")).toBeInTheDocument();
  });

  it("members are denied the form", async () => {
    await as("IL1009");
    renderWithQuery(<MeetingForm />);
    // the form itself loads (types are readable); the save is what the service forbids
    fireEvent.change(
      await screen.findByLabelText("Title (required)", {}, WAIT),
      { target: { value: "x" } },
    );
    fireEvent.change(screen.getByLabelText("Date (required)"), {
      target: { value: "2026-11-21" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    await vi.waitFor(
      () =>
        expect(toasts.error).toHaveBeenCalledWith(
          "You do not have access to this.",
        ),
      WAIT,
    );
  });
});

describe("S-05 edit", () => {
  it("prefills from the meeting; rescheduling notifies role holders (N-03)", async () => {
    await as("IL1003");
    renderWithQuery(<MeetingForm id="mtg-2026-10-02" />);
    expect(
      await screen.findByLabelText("Title (required)", {}, WAIT),
    ).toHaveValue("Regular Meeting");
    expect(screen.getByLabelText("Date (required)")).toHaveValue("2026-10-02");
    expect(screen.getByLabelText("Start time (required)")).toHaveValue("16:00");
    expect(screen.getByLabelText("Duration in minutes")).toHaveValue(90);
    expect(screen.getByLabelText("Meeting type (required)")).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Start time (required)"), {
      target: { value: "17:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await vi.waitFor(
      () => expect(nav.push).toHaveBeenCalledWith("/meetings/mtg-2026-10-02"),
      WAIT,
    );
    const s = getServices();
    await s.auth.signIn("IL1009");
    expect(
      (await s.notifications.listMine()).items.some((n) => n.code === "N-03"),
    ).toBe(true);
  });
});

describe("S-04 status actions", () => {
  it("Finalize warns about open roles, then moves the stepper; Reopen goes back", async () => {
    await as("IL1003");
    nav.search = "";
    renderWithQuery(<MeetingDetail id="mtg-2026-10-02" />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Finalize" }, WAIT),
    );
    const dialog = await screen.findByRole("dialog", {}, WAIT);
    expect(dialog).toHaveTextContent(
      "Some roles are still open. You can still finalize.",
    );
    fireEvent.click(within(dialog).getByRole("button", { name: "Finalize" }));
    await vi.waitFor(
      () => expect(toasts.success).toHaveBeenCalledWith("Meeting finalized."),
      WAIT,
    );
    const steps = within(
      await screen.findByRole("list", { name: "Meeting status" }, WAIT),
    ).getAllByRole("listitem");
    await vi.waitFor(
      () => expect(steps[2]).toHaveAttribute("aria-current", "step"),
      WAIT,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Reopen" }, WAIT),
    );
    const reopen = await screen.findByRole("dialog", {}, WAIT);
    expect(reopen).toHaveTextContent("Nobody is notified unless roles change.");
  });

  it("Cancel needs a reason; then the cancelled banner replaces the stepper", async () => {
    await as("IL1003");
    renderWithQuery(<MeetingDetail id="mtg-2026-10-16" />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Cancel meeting" }, WAIT),
    );
    const dialog = await screen.findByRole("dialog", {}, WAIT);
    const confirm = within(dialog).getByRole("button", {
      name: "Cancel meeting",
    });
    expect(confirm).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText("Reason (required)"), {
      target: { value: "Venue closed" },
    });
    fireEvent.click(confirm);
    expect(
      await screen.findByText(/Reason: Venue closed/, {}, WAIT),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("list", { name: "Meeting status" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cancel meeting" }),
    ).not.toBeInTheDocument();
  });

  it("members see no action bar; a Draft with no venue says why it cannot open", async () => {
    await as("IL1009");
    const { unmount } = renderWithQuery(<MeetingDetail id="mtg-2026-10-09" />);
    await screen.findByRole(
      "heading",
      { name: "Regular Meeting", level: 2 },
      WAIT,
    );
    expect(
      screen.queryByRole("link", { name: "Edit" }),
    ).not.toBeInTheDocument();
    unmount();
    await as("IL1003");
    await getServices().meetings.update("mtg-2026-10-16", {
      venue: null,
      meetingLink: null,
    });
    renderWithQuery(<MeetingDetail id="mtg-2026-10-16" />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Open for roles" }, WAIT),
    );
    await vi.waitFor(
      () =>
        expect(toasts.error).toHaveBeenCalledWith(
          "Add a venue or a meeting link before opening.",
        ),
      WAIT,
    );
  });
});

describe("agenda upload", () => {
  it("checks type and size like the service (R-14)", () => {
    expect(
      checkAgendaFile({ name: "a.pdf", type: "application/pdf", size: 10 }),
    ).toBeNull();
    expect(
      checkAgendaFile({ name: "a.jpeg", type: "image/jpeg", size: 10 }),
    ).toBeNull();
    expect(
      checkAgendaFile({ name: "a.exe", type: "application/pdf", size: 10 }),
    ).toBe("Upload a PDF, DOCX, PNG or JPG file.");
    expect(
      checkAgendaFile({ name: "a.txt", type: "text/plain", size: 10 }),
    ).toBe("Upload a PDF, DOCX, PNG or JPG file.");
    expect(
      checkAgendaFile({
        name: "a.pdf",
        type: "application/pdf",
        size: 11 * 1024 * 1024,
      }),
    ).toBe("File must be under 10 MB.");
  });

  it("ExComm uploads on the Agenda tab; Members see no upload control", async () => {
    nav.search = "tab=agenda";
    await as("IL1003");
    renderWithQuery(<MeetingDetail id="mtg-2026-10-09" />);
    const input = await screen.findByLabelText("Agenda file", {}, WAIT);
    const file = new File(["x"], "agenda.pdf", { type: "application/pdf" });
    URL.createObjectURL = () => "blob:mock/agenda";
    fireEvent.change(input, { target: { files: [file] } });
    await vi.waitFor(
      () => expect(toasts.success).toHaveBeenCalledWith("Agenda uploaded."),
      WAIT,
    );
    expect(
      await screen.findByTitle("Agenda: agenda.pdf", {}, WAIT),
    ).toHaveAttribute("src", "blob:mock/agenda");
    fireEvent.change(input, {
      target: {
        files: [new File(["x"], "bad.exe", { type: "application/pdf" })],
      },
    });
    expect(await screen.findByRole("alert", {}, WAIT)).toHaveTextContent(
      "Upload a PDF, DOCX, PNG or JPG file.",
    );
  });

  it("a Member sees no upload control", async () => {
    nav.search = "tab=agenda";
    await as("IL1009");
    renderWithQuery(<MeetingDetail id="mtg-2026-10-09" />);
    await screen.findByText("No agenda uploaded yet", {}, WAIT);
    expect(screen.queryByLabelText("Agenda file")).not.toBeInTheDocument();
  });
});

describe("S-06 Templates", () => {
  it("recurring tab shows the seeded Friday template; the other tabs show the seeded catalogs", async () => {
    await as("IL1003");
    renderWithQuery(<TemplatesPage />);
    const row = (await screen.findByRole(
      "row",
      { name: /Friday Regular Meeting/ },
      WAIT,
    )) as HTMLTableRowElement;
    expect(row).toHaveTextContent("Friday 16:00 IST");
    expect(row).toHaveTextContent("90 min");
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Meeting types" }));
    fireEvent.click(screen.getByRole("tab", { name: "Meeting types" }));
    expect(
      await screen.findByRole("row", { name: /Speech Contest/ }, WAIT),
    ).toHaveTextContent("150 min");
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Role catalog" }));
    fireEvent.click(screen.getByRole("tab", { name: "Role catalog" }));
    expect(
      await screen.findByRole("row", { name: /Hark Master/ }, WAIT),
    ).toHaveTextContent("support");
    fireEvent.mouseDown(screen.getByRole("tab", { name: "Project timings" }));
    fireEvent.click(screen.getByRole("tab", { name: "Project timings" }));
    expect(
      await screen.findByText(
        "Verify these timings with the VPE before relying on them.",
        {},
        WAIT,
      ),
    ).toBeInTheDocument();
    const demo = await screen.findByRole(
      "row",
      { name: /Workshop demo/ },
      WAIT,
    );
    expect(demo).toHaveTextContent("Custom");
    expect(demo).toHaveTextContent("8:00");
    expect(demo).toHaveTextContent("10:00");
  });

  it("adds a recurring template: all members notified; a bad time shows an inline error", async () => {
    await as("IL1003");
    renderWithQuery(<TemplatesPage />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Add template" }, WAIT),
    );
    const dialog = await screen.findByRole("dialog", {}, WAIT);
    fireEvent.change(within(dialog).getByLabelText("Name (required)"), {
      target: { value: "Saturday Workshop" },
    });
    fireEvent.change(within(dialog).getByLabelText("Start time (IST)"), {
      target: { value: "" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Add template" }),
    );
    expect(
      await within(dialog).findByText("Use a time like 16:00", {}, WAIT),
    ).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText("Start time (IST)"), {
      target: { value: "10:00" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Add template" }),
    );
    await vi.waitFor(
      () =>
        expect(toasts.success).toHaveBeenCalledWith(
          "Template added. All members notified.",
        ),
      WAIT,
    );
    expect(
      await screen.findByRole("row", { name: /Saturday Workshop/ }, WAIT),
    ).toBeInTheDocument();
  });

  it("editing offers 'apply to Draft meetings' and says changes apply to future meetings", async () => {
    await as("IL1003");
    renderWithQuery(<TemplatesPage />);
    fireEvent.click(
      await screen.findByRole(
        "button",
        { name: "Edit Friday Regular Meeting" },
        WAIT,
      ),
    );
    const dialog = await screen.findByRole("dialog", {}, WAIT);
    expect(dialog).toHaveTextContent("Changes apply to future meetings only.");
    fireEvent.change(within(dialog).getByLabelText("Start time (IST)"), {
      target: { value: "17:00" },
    });
    fireEvent.click(
      within(dialog).getByLabelText(/Also apply to Draft meetings/),
    );
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Save template" }),
    );
    await vi.waitFor(
      () =>
        expect(toasts.success).toHaveBeenCalledWith(
          "Template saved. Changes apply to future meetings.",
        ),
      WAIT,
    );
    const meetings = await getServices().meetings.list();
    expect(meetings.find((m) => m.id === "mtg-2026-10-16")?.startsAt).toBe(
      "2026-10-16T11:30:00.000Z",
    );
  });

  it("Members can read the catalogs but see no add or edit buttons", async () => {
    await as("IL1009");
    renderWithQuery(<TemplatesPage />);
    await screen.findByRole("row", { name: /Friday Regular Meeting/ }, WAIT);
    expect(
      screen.queryByRole("button", { name: "Add template" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^Edit / }),
    ).not.toBeInTheDocument();
  });
});
