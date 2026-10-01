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
