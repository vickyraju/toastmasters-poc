"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormActions } from "@/components/shared/FormActions";
import { QueryBlock } from "@/components/shared/QueryBlock";
import { useDirtyGuard } from "@/hooks/useDirtyGuard";
import { useClubSettings, useUpdateClub } from "@/hooks/useAdmin";
import {
  clubSettingsInput,
  type ClubSettingsForm,
  type ClubSettingsValues,
} from "@/lib/domain/schemas";
import { AppError } from "@/lib/services";
import type { ClubSettings } from "@/lib/domain/types";

const Err = ({ message }: { message?: string }) =>
  message ? (
    <p role="alert" className="flex items-center gap-1.5 text-sm text-danger">
      <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  ) : null;

/** Club-wide settings, President only (schema.md section 6 `settings.club.edit`). Saved on their own. */
export function ClubSettingsCard() {
  const club = useClubSettings();
  return (
    <section
      aria-labelledby="club-h"
      className="space-y-4 rounded-lg border border-border bg-card p-5 max-sm:p-4"
    >
      <div>
        <h2 id="club-h" className="text-xl font-semibold">
          Club settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Only the President can change these. They apply to the whole club
          straight away.
        </p>
      </div>
      <QueryBlock query={club} label="club settings" rows={4}>
        {(c) => <ClubForm club={c} />}
      </QueryBlock>
    </section>
  );
}

function ClubForm({ club }: { club: ClubSettings }) {
  const update = useUpdateClub();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ClubSettingsForm, unknown, ClubSettingsValues>({
    resolver: zodResolver(clubSettingsInput),
    defaultValues: {
      clubName: club.clubName,
      withdrawalCutoffHours: club.withdrawalCutoffHours,
      proofRequired: club.proofRequired,
      consecutiveRepeatLimit: club.consecutiveRepeatLimit ?? "",
      timerGraceSeconds: club.timerGraceSeconds,
      inactiveAfterDays: club.inactiveAfterDays,
      generateWeeksAhead: club.generateWeeksAhead,
    },
  });
  useDirtyGuard(isDirty);
  const server = (k: string) =>
    update.error instanceof AppError
      ? update.error.extra.fields?.[k]
      : undefined;
  const field = (
    id: string,
    label: string,
    hint: string | null,
    key: keyof ClubSettingsForm,
    type = "text",
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        inputMode={type === "number" ? "numeric" : undefined}
        className="h-11 text-base"
        aria-invalid={errors[key] ? true : undefined}
        {...register(key)}
      />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <Err message={errors[key]?.message ?? server(key)} />
    </div>
  );
  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit((v) =>
        update.mutate(v, {
          onSuccess: (saved) =>
            reset({
              ...saved,
              consecutiveRepeatLimit: saved.consecutiveRepeatLimit ?? "",
            }),
        }),
      )}
    >
      {field("cs-name", "Club name (required)", null, "clubName")}
      <div className="grid gap-4 sm:grid-cols-2">
        {field(
          "cs-cutoff",
          "Withdrawal cutoff (hours)",
          "A member can withdraw straight away until this many hours before a meeting. Later, ExComm decides.",
          "withdrawalCutoffHours",
          "number",
        )}
        {field(
          "cs-grace",
          "Timer grace (seconds)",
          "How far outside the time limit a speech still qualifies.",
          "timerGraceSeconds",
          "number",
        )}
        {field(
          "cs-inactive",
          "Inactive after (days)",
          "Members with no activity for this long show as Inactive on Club progress.",
          "inactiveAfterDays",
          "number",
        )}
        {field(
          "cs-weeks",
          "Generate meetings (weeks ahead)",
          "How far ahead recurring templates create Draft meetings.",
          "generateWeeksAhead",
          "number",
        )}
        {field(
          "cs-repeat",
          "Consecutive repeat limit",
          "Most meetings in a row someone can take the same role. Leave empty for no limit.",
          "consecutiveRepeatLimit",
          "number",
        )}
      </div>
      <label className="flex min-h-11 items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 size-5 accent-[var(--primary)]"
          {...register("proofRequired")}
        />
        <span>
          Require proof when logging a level completion
          <span className="block text-xs text-muted-foreground">
            Members must attach a file before a level goes to the VPE.
          </span>
        </span>
      </label>
      <FormActions
        dirty={isDirty}
        saving={update.isPending}
        saveLabel="Save Club Settings"
        onDiscard={() => reset()}
      />
    </form>
  );
}
