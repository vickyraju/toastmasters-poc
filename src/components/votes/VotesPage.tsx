"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { QueryBlock } from "@/components/shared/QueryBlock";
import { useVotes } from "@/hooks/useHome";
import { useStartVote } from "@/hooks/useVote";
import { useCan } from "@/hooks/useSession";
import {
  DEFAULT_VOTE_OPTIONS,
  voteFormInput,
  type VoteForm,
  type VoteFormValues,
} from "@/lib/domain/schemas";
import { AppError, type VoteSummary } from "@/lib/services";
import { formatIST, istToUtcIso } from "@/lib/time/ist";
import { cn } from "@/lib/utils";

export function VoteStatusBadge({ status }: { status: VoteSummary["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        status === "open" ? "bg-info-bg text-info" : "bg-foreground text-card",
      )}
    >
      {status === "open" ? "Open" : "Closed"}
    </span>
  );
}

/** Deadline while open, closed date after (S-14). Turnout is a count, never a result (R-13). */
const detail = (v: VoteSummary) =>
  v.status === "open"
    ? `${v.deadlineAt ? `Deadline ${formatIST(v.deadlineAt, "EEE d MMM, h:mm a")} IST · ` : ""}${v.turnout.cast} of ${v.turnout.eligible} voted`
    : `Closed ${v.closedAt ? formatIST(v.closedAt, "d MMM yyyy") : ""}`;

/** S-14: every vote, open and closed; the President starts new ones. */
export function VotesPage() {
  const votes = useVotes(true);
  const canStart = useCan("vote.start");
  const [starting, setStarting] = useState(false);
  return (
    <div className="space-y-4">
      {canStart ? (
        <div className="flex justify-end">
          <Button onClick={() => setStarting(true)}>
            <Plus aria-hidden="true" />
            Start vote
          </Button>
        </div>
      ) : null}
      <QueryBlock
        query={votes}
        label="votes"
        rows={3}
        isEmpty={(d) => d.length === 0}
        empty={canStart ? "No votes yet. Start the first one." : "No votes yet"}
      >
        {(rows) => {
          // open first (soonest deadline), then closed (newest first)
          const sorted = [...rows].sort((a, b) =>
            a.status !== b.status
              ? a.status === "open"
                ? -1
                : 1
              : a.status === "open"
                ? (a.deadlineAt ?? "9").localeCompare(b.deadlineAt ?? "9")
                : (b.closedAt ?? "").localeCompare(a.closedAt ?? ""),
          );
          return (
            <ul className="divide-y divide-border rounded-lg border border-border bg-card">
              {sorted.map((v) => (
                <li key={v.id}>
                  <Link
                    href={`/votes/${v.id}`}
                    className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-primary-soft/50"
                  >
                    <span className="min-w-48 flex-1">
                      <span className="block font-medium">{v.title}</span>
                      <span className="block text-sm text-muted-foreground">
                        {detail(v)}
                      </span>
                    </span>
                    {v.status === "open" && v.isEligible && !v.iHaveVoted ? (
                      <span className="text-sm font-medium text-primary">
                        Your vote is needed
                      </span>
                    ) : null}
                    <VoteStatusBadge status={v.status} />
                  </Link>
                </li>
              ))}
            </ul>
          );
        }}
      </QueryBlock>
      {starting ? <StartVoteDialog onClose={() => setStarting(false)} /> : null}
    </div>
  );
}

const Err = ({ message }: { message?: string }) =>
  message ? (
    <p role="alert" className="flex items-center gap-1.5 text-sm text-danger">
      <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  ) : null;

function StartVoteDialog({ onClose }: { onClose: () => void }) {
  const start = useStartVote();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<VoteForm, unknown, VoteFormValues>({
    resolver: zodResolver(voteFormInput),
    defaultValues: {
      title: "",
      description: "",
      options: DEFAULT_VOTE_OPTIONS.map((label) => ({ label })),
      deadlineDate: "",
      deadlineTime: "",
    },
  });
  const options = useFieldArray({ control, name: "options" });
  // The service checks the deadline against the clock; its message belongs under the deadline fields.
  const deadlineError =
    start.error instanceof AppError
      ? start.error.extra.fields?.deadlineAt
      : undefined;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Start vote</DialogTitle>
          <DialogDescription>
            Every ExComm member and the President can vote once. Results stay
            hidden until the vote closes.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={handleSubmit((v) =>
            start.mutate(
              {
                title: v.title,
                description: v.description,
                options: v.options.map((o) => o.label),
                ...(v.deadlineDate
                  ? { deadlineAt: istToUtcIso(v.deadlineDate, v.deadlineTime) }
                  : {}),
              },
              { onSuccess: onClose },
            ),
          )}
        >
          <div className="space-y-1.5">
            <Label htmlFor="sv-title">Title (required)</Label>
            <Input
              id="sv-title"
              className="h-11 text-base"
              {...register("title")}
            />
            <Err
              message={
                errors.title?.message ??
                (start.error instanceof AppError
                  ? start.error.extra.fields?.title
                  : undefined)
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sv-desc">Description</Label>
            <Textarea
              id="sv-desc"
              className="text-base"
              {...register("description")}
            />
            <Err message={errors.description?.message} />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Options (2 to 6)</legend>
            {options.fields.map((f, i) => (
              <div key={f.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`sv-opt-${i}`} className="sr-only">
                    Option {i + 1}
                  </Label>
                  <Input
                    id={`sv-opt-${i}`}
                    className="h-11 text-base"
                    {...register(`options.${i}.label`)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-11 shrink-0"
                    aria-label={`Remove option ${i + 1}`}
                    disabled={options.fields.length <= 2}
                    onClick={() => options.remove(i)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
                <Err message={errors.options?.[i]?.label?.message} />
              </div>
            ))}
            <Err
              message={errors.options?.message ?? errors.options?.root?.message}
            />
            <Button
              type="button"
              variant="outline"
              disabled={options.fields.length >= 6}
              onClick={() => options.append({ label: "" })}
            >
              <Plus aria-hidden="true" />
              Add option
            </Button>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="sv-date">Deadline date (optional)</Label>
              <Input
                id="sv-date"
                type="date"
                className="h-11 text-base"
                {...register("deadlineDate")}
              />
              <Err message={errors.deadlineDate?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sv-time">Deadline time (IST)</Label>
              <Input
                id="sv-time"
                type="time"
                className="h-11 text-base"
                {...register("deadlineTime")}
              />
              <Err message={errors.deadlineTime?.message} />
            </div>
          </div>
          <Err message={deadlineError} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={start.isPending}>
              Start vote
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
