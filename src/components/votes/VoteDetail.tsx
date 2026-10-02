"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { QueryBlock } from "@/components/shared/QueryBlock";
import { useCan } from "@/hooks/useSession";
import { useCastVote, useCloseVote, useVote } from "@/hooks/useVote";
import { AppError, type VoteDetail as Detail } from "@/lib/services";
import { formatIST } from "@/lib/time/ist";
import { cn } from "@/lib/utils";
import { VoteStatusBadge } from "./VotesPage";

/** Turnout is a count of people, never a split by option (R-13). */
export function TurnoutBar({
  cast,
  eligible,
}: {
  cast: number;
  eligible: number;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">
        {cast} of {eligible} voted
      </p>
      <div
        role="progressbar"
        aria-label="Voted"
        aria-valuemin={0}
        aria-valuemax={eligible}
        aria-valuenow={cast}
        className="h-2 overflow-hidden rounded-full bg-primary-soft"
      >
        <div
          className="h-full bg-primary"
          style={{ width: `${eligible ? (cast / eligible) * 100 : 0}%` }}
        />
      </div>
    </div>
  );
}

/** Shown only after close, only to eligible voters. Counts and percentages; no names, ever. */
function ResultPanel({
  view,
}: {
  view: Extract<Detail["view"], { status: "closed" }>;
}) {
  return (
    <section aria-labelledby="results-h" className="space-y-3">
      <h3 id="results-h" className="text-xl font-semibold">
        Results
      </h3>
      <ul className="space-y-3">
        {view.results.map((r) => (
          <li key={r.optionId} className="space-y-1">
            <p className="flex justify-between gap-3 text-sm font-medium">
              <span>{r.label}</span>
              <span>
                {r.count} ({r.percent}%)
              </span>
            </p>
            <div
              role="progressbar"
              aria-label={r.label}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={r.percent}
              className="h-3 overflow-hidden rounded-full bg-primary-soft"
            >
              <div
                className="h-full bg-primary"
                style={{ width: `${r.percent}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      {view.tie ? (
        <p className="text-sm text-muted-foreground">
          The vote is tied. No decision is made automatically.
        </p>
      ) : null}
    </section>
  );
}

/** S-15: ballot, turnout while open, results after close (J-12, R-13). */
export function VoteDetail({ id }: { id: string }) {
  const pathname = usePathname();
  const vote = useVote(id);
  if (vote.error instanceof AppError && vote.error.code === "FORBIDDEN")
    return <AccessDenied path={pathname} />;
  if (vote.error instanceof AppError && vote.error.code === "NOT_FOUND")
    return (
      <div className="space-y-2 py-16 text-center">
        <h2 className="text-2xl font-semibold">Vote not found</h2>
        <Link
          href="/votes"
          className="text-primary underline-offset-4 hover:underline"
        >
          Back to Votes
        </Link>
      </div>
    );
  return (
    <div className="mx-auto max-w-[560px]">
      <QueryBlock query={vote} label="this vote" rows={5}>
        {(v) => <Loaded vote={v} />}
      </QueryBlock>
    </div>
  );
}

function Loaded({ vote: v }: { vote: Detail }) {
  const cast = useCastVote();
  const close = useCloseVote();
  const canClose = useCan("vote.close");
  const [choice, setChoice] = useState("");
  const [confirm, setConfirm] = useState<"cast" | "close" | null>(null);
  const open = v.status === "open";
  const canVote = open && v.isEligible && !v.iHaveVoted;
  const chosen = v.options.find((o) => o.id === choice);

  return (
    <section className="space-y-5 rounded-lg border border-border bg-card p-6 max-sm:p-4">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-semibold">{v.title}</h2>
          <VoteStatusBadge status={v.status} />
        </div>
        {open ? (
          v.deadlineAt ? (
            <p className="text-sm text-muted-foreground">
              Closes {formatIST(v.deadlineAt, "EEE d MMM, h:mm a")} IST
            </p>
          ) : null
        ) : (
          <p className="text-sm text-muted-foreground">
            Closed {v.closedAt ? formatIST(v.closedAt, "d MMM yyyy") : ""}
          </p>
        )}
        {v.description ? (
          <p className="whitespace-pre-wrap">{v.description}</p>
        ) : null}
      </header>

      {canVote ? (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (choice) setConfirm("cast");
          }}
        >
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium">Your choice</legend>
            {v.options.map((o) => (
              <label
                key={o.id}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-4",
                  choice === o.id
                    ? "border-primary bg-primary-soft"
                    : "border-border-input hover:bg-primary-soft/50",
                )}
              >
                <input
                  type="radio"
                  name="choice"
                  value={o.id}
                  checked={choice === o.id}
                  onChange={() => setChoice(o.id)}
                  className="size-4 accent-[var(--primary)]"
                />
                {o.label}
              </label>
            ))}
          </fieldset>
          <Button type="submit" className="w-full" disabled={!choice}>
            Cast vote
          </Button>
        </form>
      ) : null}

      {open && v.iHaveVoted ? (
        <p
          role="status"
          className="rounded-md bg-primary-soft px-3 py-2 text-sm"
        >
          You voted. Results are hidden until the vote closes.
        </p>
      ) : null}
      {open && !v.isEligible ? (
        <p
          role="status"
          className="rounded-md bg-primary-soft px-3 py-2 text-sm"
        >
          You were not an eligible voter when this vote started, so you cannot
          vote in it.
        </p>
      ) : null}

      {v.view.status === "closed" ? (
        <>
          <ResultPanel view={v.view} />
          <TurnoutBar cast={v.turnout.cast} eligible={v.turnout.eligible} />
        </>
      ) : (
        <>
          <TurnoutBar cast={v.turnout.cast} eligible={v.turnout.eligible} />
          {!open ? (
            <p className="text-sm text-muted-foreground">
              Results are visible to the eligible voters.
            </p>
          ) : null}
        </>
      )}

      {open && canClose ? (
        <Button variant="danger" onClick={() => setConfirm("close")}>
          Close vote
        </Button>
      ) : null}

      {confirm === "cast" && chosen ? (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title="Cast your vote?"
          description={`Votes are final and secret. You are voting “${chosen.label}”.`}
          confirmLabel="Confirm vote"
          busy={cast.isPending}
          onConfirm={() =>
            cast.mutate(
              { voteId: v.id, optionId: chosen.id },
              { onSettled: () => setConfirm(null) },
            )
          }
        />
      ) : null}
      {confirm === "close" ? (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setConfirm(null)}
          title="Close this vote now?"
          description="Results become visible to eligible voters immediately. A closed vote cannot be reopened."
          confirmLabel="Close vote"
          destructive
          busy={close.isPending}
          onConfirm={() =>
            close.mutate(v.id, { onSettled: () => setConfirm(null) })
          }
        />
      ) : null}
    </section>
  );
}
