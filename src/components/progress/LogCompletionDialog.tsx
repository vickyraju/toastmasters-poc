"use client";

import { useState } from "react";
import { CircleAlert } from "lucide-react";
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
import { AgendaUpload } from "@/components/meetings/AgendaUpload";
import { useLogCompletion } from "@/hooks/useProgress";
import { validateLevelLog } from "@/lib/domain/rules/levels";
import type { CurrentUser, UploadFile } from "@/lib/services";
import { istDate } from "@/lib/time/ist";
import { cn } from "@/lib/utils";

const field =
  "h-11 w-full rounded-lg border border-border-input bg-card px-3 text-base";

const MESSAGE = {
  LEVEL_ABOVE_CURRENT: (level: number) =>
    `You are at level ${level}. You cannot log a higher level yet.`,
  FUTURE_DATE: () => "The completion date cannot be in the future.",
} as const;

/** Log a project or a level (J-09). The same level rules as the service run first, so errors show inline. */
export function LogCompletionDialog({
  user,
  nowIso,
  onClose,
}: {
  user: CurrentUser;
  nowIso: string;
  onClose: () => void;
}) {
  const log = useLogCompletion();
  const today = istDate(nowIso);
  const [kind, setKind] = useState<"project" | "level">("level");
  const [pathway, setPathway] = useState(user.pathway ?? "");
  const [level, setLevel] = useState(user.currentLevel);
  const [project, setProject] = useState("");
  const [date, setDate] = useState(today);
  const [proof, setProof] = useState<UploadFile | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const errors: Record<string, string> = {};
  if (!pathway.trim()) errors.pathway = "Choose a pathway.";
  if (kind === "project" && !project.trim())
    errors.project = "Enter the project name.";
  if (!date) errors.date = "Choose the completion date.";
  if (kind === "level") {
    const r = validateLevelLog({
      currentLevel: user.currentLevel,
      level,
      completedOn: date || today,
      today,
      hasPendingForLevel: false,
      proofRequired: false,
      hasProof: !!proof,
    });
    if (!r.ok && r.code === "LEVEL_ABOVE_CURRENT")
      errors.level = MESSAGE.LEVEL_ABOVE_CURRENT(user.currentLevel);
    if (!r.ok && r.code === "FUTURE_DATE") errors.date = MESSAGE.FUTURE_DATE();
  } else if (date > today) errors.date = MESSAGE.FUTURE_DATE();
  const shown = submitted ? errors : {};
  // A function returning an element, not a component: a component defined here would remount on every keystroke.
  const err = (id: string) =>
    shown[id] ? (
      <p role="alert" className="flex items-center gap-1.5 text-sm text-danger">
        <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
        {shown[id]}
      </p>
    ) : null;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Log completion</DialogTitle>
          <DialogDescription>
            {kind === "level"
              ? "A level goes to your VPE to verify before your level changes."
              : "A project counts straight away."}
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(true);
            if (Object.keys(errors).length) return;
            log.mutate(
              {
                input: {
                  kind,
                  pathway: pathway.trim(),
                  level,
                  projectName: kind === "project" ? project.trim() : null,
                  completedOn: date,
                },
                proof: proof ?? undefined,
              },
              { onSuccess: onClose },
            );
          }}
        >
          <div
            role="group"
            aria-label="Type"
            className="inline-flex rounded-lg border border-border-input p-0.5"
          >
            {(["level", "project"] as const).map((k) => (
              <button
                key={k}
                type="button"
                aria-pressed={kind === k}
                onClick={() => setKind(k)}
                className={cn(
                  "min-h-9 rounded-md px-4 text-sm font-medium max-lg:min-h-11",
                  kind === k
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-primary-soft",
                )}
              >
                {k === "level" ? "Level" : "Project"}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lc-pathway">Pathway (required)</Label>
            <Input
              id="lc-pathway"
              value={pathway}
              onChange={(e) => setPathway(e.target.value)}
              className="h-11 text-base"
              aria-invalid={shown.pathway ? true : undefined}
            />
            {err("pathway")}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lc-level">Level</Label>
            <select
              id="lc-level"
              className={field}
              value={level}
              onChange={(e) => setLevel(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5].map((l) => (
                <option key={l} value={l}>
                  Level {l}
                </option>
              ))}
            </select>
            {err("level")}
          </div>
          {kind === "project" ? (
            <div className="space-y-1.5">
              <Label htmlFor="lc-project">Project name (required)</Label>
              <Input
                id="lc-project"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                className="h-11 text-base"
                aria-invalid={shown.project ? true : undefined}
              />
              {err("project")}
            </div>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="lc-date">Completed on (required)</Label>
            <Input
              id="lc-date"
              type="date"
              max={today}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="h-11 text-base"
              aria-invalid={shown.date ? true : undefined}
            />
            {err("date")}
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Proof (optional)</p>
            {proof ? (
              <p className="flex items-center gap-3 text-sm">
                <span className="flex-1 break-all">{proof.name}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setProof(null)}
                >
                  Remove
                </Button>
              </p>
            ) : (
              <AgendaUpload label="Attach proof" onFile={setProof} />
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={log.isPending}>
              Log {kind}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
