// Zod schemas for form input and report payloads (schema.md section 3.11, rules.md R-13, R-15).
// Anything that depends on the current time takes `now` from the caller (the mock clock).
import { z } from "zod";
import { CARD } from "./constants";

const trimmed = (max: number) => z.string().trim().max(max);

// Report payloads
export const timerPayload = z.object({
  rows: z.array(
    z.object({
      speakerSlotId: z.string(),
      seconds: z.number().int().min(0),
      card: z.enum(CARD),
    }),
  ),
});
export const ahCounterPayload = z.object({
  rows: z.array(
    z.object({
      memberId: z.string(),
      total: z.number().int().min(0),
      breakdown: z.record(z.string(), z.number().int().min(0)).optional(),
    }),
  ),
});
export const grammarianPayload = z.object({
  wordOfDayUsage: z.array(
    z.object({ memberId: z.string(), count: z.number().int().min(0) }),
  ),
  goodLanguage: z.string(),
  improvements: z.string(),
});
export const summaryPayload = z.object({ summary: z.string() });

// Members (R-16): employee id uppercase, email lowercase, free text trimmed
export const memberInput = z.object({
  employeeId: z
    .string()
    .trim()
    .min(1)
    .transform((v) => v.toUpperCase()),
  name: trimmed(80).min(1),
  email: z.string().trim().toLowerCase().email(),
  toastmastersId: z.string().trim().nullish(),
  pathway: z.string().trim().nullish(),
});

const TWELVE_HOURS_MS = 12 * 3_600_000;

// Meetings (R-15). Past meetings are blocked by default; back-fill is an open decision.
export const meetingInput = (now: Date) =>
  z
    .object({
      title: trimmed(120).min(1),
      meetingTypeId: z.string(),
      startsAt: z.string().datetime(),
      endsAt: z.string().datetime(),
      venue: z.string().trim().nullish(),
      meetingLink: z.string().trim().nullish(),
    })
    .superRefine((m, ctx) => {
      const start = Date.parse(m.startsAt);
      const end = Date.parse(m.endsAt);
      if (start < now.getTime())
        ctx.addIssue({
          code: "custom",
          path: ["startsAt"],
          message: "Start must be in the future",
        });
      if (end <= start)
        ctx.addIssue({
          code: "custom",
          path: ["endsAt"],
          message: "End must be after start",
        });
      else if (end - start > TWELVE_HOURS_MS)
        ctx.addIssue({
          code: "custom",
          path: ["endsAt"],
          message: "A meeting cannot span more than 12 hours",
        });
    });

// Votes (R-13)
export const startVoteInput = (now: Date) =>
  z.object({
    title: trimmed(120).min(3),
    description: trimmed(1000),
    options: z.array(trimmed(80).min(1)).min(2).max(6),
    deadlineAt: z
      .string()
      .datetime()
      .refine(
        (d) => Date.parse(d) > now.getTime(),
        "Deadline must be in the future",
      )
      .optional(),
  });

// Speech details (schema.md 3.9). Empty strings mean "not set".
// nullish so parsing is idempotent: the form parses, then the service validates the same values again.
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => v || null);

export const speakerDetailsInput = z.object({
  projectId: z.string().transform((v) => v || null),
  level: z.coerce.number().int().min(1).max(5),
  title: optionalText(120),
  objectives: optionalText(1000),
  evalFormUrl: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^https?:\/\//i.test(v),
      "Use a link that starts with https://",
    )
    .transform((v) => v || null),
});
export type SpeakerDetailsForm = z.input<typeof speakerDetailsInput>;
export type SpeakerDetailsValues = z.output<typeof speakerDetailsInput>;

// Templates (S-06) and the meeting form (S-05)
export const recurringInput = z.object({
  name: trimmed(80).min(1, "Enter a name"),
  meetingTypeId: z.string().min(1, "Choose a meeting type"),
  weekday: z.coerce.number().int().min(0).max(6),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a time like 16:00"),
  durationMinutes: z.coerce
    .number()
    .int()
    .min(15, "At least 15 minutes")
    .max(720, "At most 12 hours"),
  venue: optionalText(200),
  meetingLink: z
    .string()
    .trim()
    .nullish()
    .refine(
      (v) => !v || /^https?:\/\//i.test(v),
      "Use a link that starts with https://",
    )
    .transform((v) => v || null),
  weeksAhead: z.coerce
    .number()
    .int()
    .min(1, "At least 1 week")
    .max(12, "At most 12 weeks"),
  skipDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  isActive: z.boolean(),
});
export type RecurringForm = z.input<typeof recurringInput>;
export type RecurringValues = z.output<typeof recurringInput>;

export const meetingTypeInput = z.object({
  name: trimmed(80).min(1, "Enter a name"),
  defaultDurationMinutes: z.coerce
    .number()
    .int()
    .min(15, "At least 15 minutes")
    .max(720, "At most 12 hours"),
  isActive: z.boolean(),
  roles: z.array(
    z.object({
      roleTemplateId: z.string(),
      count: z.coerce.number().int().min(0).max(20),
    }),
  ),
  agendaItems: z.array(
    z.object({
      title: trimmed(120).min(1, "Enter an item name"),
      durationMinutes: z.coerce
        .number()
        .int()
        .min(1, "At least 1 minute")
        .max(240),
      roleTemplateId: z.string().nullable(),
    }),
  ),
});
export type MeetingTypeForm = z.input<typeof meetingTypeInput>;
export type MeetingTypeValues = z.output<typeof meetingTypeInput>;

export const roleTemplateInput = z.object({
  name: trimmed(80).min(1, "Enter a name"),
  category: z.enum(["main", "support", "report"]),
  reportKind: z
    .enum([
      "timer",
      "ah_counter",
      "grammarian",
      "table_topics",
      "general_evaluator",
    ])
    .nullable(),
  isSpeaker: z.boolean(),
  isEvaluator: z.boolean(),
  defaultCount: z.coerce.number().int().min(0).max(20),
});
export type RoleTemplateValues = z.output<typeof roleTemplateInput>;

export const projectInput = z
  .object({
    pathway: trimmed(80).min(1, "Enter a pathway or n/a"),
    level: z.coerce.number().int().min(0).max(5),
    name: trimmed(120).min(1, "Enter a project name"),
    minSeconds: z.coerce.number().int().min(0),
    maxSeconds: z.coerce.number().int().min(1),
  })
  .refine((p) => p.maxSeconds > p.minSeconds, {
    path: ["maxSeconds"],
    message: "Maximum must be longer than the minimum",
  });
export type ProjectValues = z.output<typeof projectInput>;

// S-05 meeting form: date and time are IST wall-clock values; the page turns them into UTC instants.
export const meetingFormInput = z.object({
  title: trimmed(120).min(1, "Enter a title"),
  meetingTypeId: z.string().min(1, "Choose a meeting type"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Choose a start time"),
  durationMinutes: z.coerce
    .number()
    .int()
    .min(15, "At least 15 minutes")
    .max(720, "A meeting cannot span more than 12 hours"),
  venue: z.string().trim().max(200),
  meetingLink: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || /^https?:\/\//i.test(v),
      "Use a link that starts with https://",
    ),
  roles: z.array(
    z.object({
      roleTemplateId: z.string(),
      count: z.coerce.number().int().min(0).max(20),
    }),
  ),
  customRoles: z.array(
    z.object({
      name: z.string().trim().min(1, "Name the role").max(60),
      category: z.enum(["main", "support"]),
      count: z.coerce.number().int().min(1, "At least 1").max(20),
    }),
  ),
});
export type MeetingFormForm = z.input<typeof meetingFormInput>;
export type MeetingFormValues = z.output<typeof meetingFormInput>;

/** Message shown when "Open for roles" is clicked with neither a venue nor a link (R-07, flow.md J-07). */
export const NEEDS_LOCATION =
  "Add a venue or a meeting link before opening for roles";
export const hasLocation = (v: { venue: string; meetingLink: string }) =>
  v.venue.trim() !== "" || v.meetingLink.trim() !== "";
