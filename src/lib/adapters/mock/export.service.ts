import { AppError } from "../../services/errors";
import type {
  ExportKind,
  ExportResult,
  ExportService,
} from "../../services/interfaces";
import { toCsv } from "../../utils/csv";
import { now } from "../../time/clock";
import { formatIST, istDate } from "../../time/ist";
import { assertCan, me, type Ctx } from "./runtime";
import { memberName, tmplOf } from "./helpers";
import type { MockData } from "./state";

const when = (iso: string | null) =>
  iso ? formatIST(iso, "yyyy-MM-dd HH:mm") : "";
const ymd = /^\d{4}-\d{2}-\d{2}$/;

function build(
  d: MockData,
  kind: ExportKind,
  from: string,
  to: string,
): (string | number | null)[][] {
  const within = (iso: string) => istDate(iso) >= from && istDate(iso) <= to;
  if (kind === "meetings") {
    return [
      [
        "Meeting ID",
        "Title",
        "Type",
        "Status",
        "Starts (IST)",
        "Ends (IST)",
        "Venue",
        "Roles filled",
        "Roles total",
        "Theme",
        "Cancelled reason",
        "Completed at (IST)",
      ],
      ...d.meetings
        .filter((m) => within(m.startsAt))
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
        .map((m) => {
          const slots = d.meetingRoles.filter((s) => s.meetingId === m.id);
          return [
            m.id,
            m.title,
            d.meetingTypes.find((t) => t.id === m.meetingTypeId)?.name ?? "",
            m.status,
            when(m.startsAt),
            when(m.endsAt),
            m.venue,
            slots.filter((s) => s.memberId).length,
            slots.length,
            m.theme,
            m.cancelledReason,
            when(m.completedAt),
          ];
        }),
    ];
  }
  if (kind === "roles") {
    const meetings = new Map(
      d.meetings.filter((m) => within(m.startsAt)).map((m) => [m.id, m]),
    );
    return [
      [
        "Meeting date (IST)",
        "Meeting",
        "Status",
        "Role",
        "Member",
        "Employee ID",
        "Assigned at (IST)",
      ],
      ...d.meetingRoles
        .filter((s) => s.memberId && meetings.has(s.meetingId))
        .sort(
          (a, b) =>
            meetings
              .get(a.meetingId)!
              .startsAt.localeCompare(meetings.get(b.meetingId)!.startsAt) ||
            a.sortOrder - b.sortOrder,
        )
        .map((s) => {
          const m = meetings.get(s.meetingId)!;
          const who = d.members.find((x) => x.id === s.memberId);
          void tmplOf;
          return [
            when(m.startsAt),
            m.title,
            m.status,
            s.label,
            who?.name ?? "",
            who?.employeeId ?? "",
            when(s.assignedAt),
          ];
        }),
    ];
  }
  return [
    [
      "Member",
      "Employee ID",
      "Pathway",
      "Kind",
      "Level",
      "Project",
      "Completed on",
      "Status",
      "Verified by",
      "Verified at (IST)",
      "Rejection reason",
    ],
    ...d.completions
      .filter((c) => c.completedOn >= from && c.completedOn <= to)
      .sort((a, b) => a.completedOn.localeCompare(b.completedOn))
      .map((c) => {
        const who = d.members.find((x) => x.id === c.memberId);
        return [
          who?.name ?? "",
          who?.employeeId ?? "",
          c.pathway,
          c.kind,
          c.level,
          c.projectName,
          c.completedOn,
          c.status,
          c.verifiedBy ? memberName(d, c.verifiedBy) : "",
          when(c.verifiedAt),
          c.rejectionReason,
        ];
      }),
  ];
}

export function exportService({ store, call }: Ctx): ExportService {
  return {
    csv: (kind, range) =>
      call((sid): ExportResult => {
        const d = store.getState();
        assertCan(me(d, sid).actor, "export.run");
        if (!ymd.test(range.from) || !ymd.test(range.to))
          throw new AppError("VALIDATION", "Choose a start and an end date.", {
            fields: { range: "Choose a start and an end date." },
          });
        if (range.from > range.to)
          throw new AppError(
            "VALIDATION",
            "The end date must be on or after the start date.",
            {
              fields: {
                range: "The end date must be on or after the start date.",
              },
            },
          );
        const rows = build(d, kind, range.from, range.to);
        return {
          filename: `${kind}-${istDate(now())}.csv`,
          csv: toCsv(rows),
          rows: rows.length - 1,
        };
      }),
  };
}
