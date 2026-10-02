"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Textarea } from "@/components/ui/textarea";
import {
  useMembers,
  useProjects,
  useRoleTemplates,
  useSaveSpeakerDetails,
} from "@/hooks/useRoles";
import {
  speakerDetailsInput,
  type SpeakerDetailsForm,
  type SpeakerDetailsValues,
} from "@/lib/domain/schemas";
import type { RoleSlotView } from "@/lib/services";
import { formatSeconds } from "@/lib/time/ist";

const field =
  "h-11 w-full rounded-lg border border-border-input bg-card px-3 text-base";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="flex items-center gap-1.5 text-sm text-danger">
      <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

/** ExComm assigns or reassigns a slot to any active member (J-04 step 5). */
export function AssignDialog({
  row,
  open,
  onOpenChange,
  busy,
  onAssign,
}: {
  row: RoleSlotView;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  busy: boolean;
  onAssign: (memberId: string, name: string) => void;
}) {
  const members = useMembers(open);
  const [memberId, setMemberId] = useState("");
  const active = (members.data ?? [])
    .filter((m) => m.status === "active")
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {row.holder
              ? `Reassign ${row.slot.label}`
              : `Assign ${row.slot.label}`}
          </DialogTitle>
          <DialogDescription>
            {row.holder
              ? `${row.holder.name} and the new holder will be notified.`
              : "The member will be notified."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const m = active.find((x) => x.id === memberId);
            if (m) onAssign(m.id, m.name);
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="assign-member">Member (required)</Label>
            <select
              id="assign-member"
              className={field}
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              disabled={members.isPending}
            >
              <option value="">
                {members.isPending ? "Loading members…" : "Choose a member"}
              </option>
              {active
                .filter((m) => m.id !== row.holder?.id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} (Level {m.currentLevel})
                  </option>
                ))}
            </select>
            {members.isError ? (
              <p className="text-sm text-danger">
                Could not load members. Try again
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!memberId || busy}>
              Assign
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Withdraw now (outside the cutoff) or send a request with an optional reason (R-05). */
export function WithdrawDialog({
  row,
  mode,
  open,
  onOpenChange,
  busy,
  onWithdraw,
}: {
  row: RoleSlotView;
  mode: "immediate" | "request";
  open: boolean;
  onOpenChange: (o: boolean) => void;
  busy: boolean;
  onWithdraw: (reason?: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "immediate"
              ? `Withdraw from ${row.slot.label}?`
              : `Ask to withdraw from ${row.slot.label}?`}
          </DialogTitle>
          <DialogDescription>
            {mode === "immediate"
              ? "The role opens for others straight away."
              : "The meeting is less than 24 hours away, so ExComm must approve. You keep the role until they decide."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            onWithdraw(mode === "request" ? reason : undefined);
          }}
        >
          {mode === "request" ? (
            <div className="space-y-1.5">
              <Label htmlFor="withdraw-reason">Reason</Label>
              <Textarea
                id="withdraw-reason"
                value={reason}
                maxLength={500}
                onChange={(e) => setReason(e.target.value)}
                className="text-base"
              />
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Keep the role
            </Button>
            <Button type="submit" disabled={busy}>
              {mode === "immediate" ? "Withdraw" : "Send request"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Pick another member's role in this meeting to swap with (R-06). */
export function SwapDialog({
  row,
  roles,
  open,
  onOpenChange,
  busy,
  onRequest,
}: {
  row: RoleSlotView;
  roles: RoleSlotView[];
  open: boolean;
  onOpenChange: (o: boolean) => void;
  busy: boolean;
  onRequest: (targetSlotId: string) => void;
}) {
  const [target, setTarget] = useState("");
  const options = roles.filter(
    (r) => r.holder && r.holder.id !== row.holder?.id && !r.pendingSwap,
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request a swap for {row.slot.label}</DialogTitle>
          <DialogDescription>
            The other member accepts or declines. Both roles change only if they
            accept.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (target) onRequest(target);
          }}
        >
          <fieldset className="max-h-72 space-y-1 overflow-y-auto">
            <legend className="mb-2 text-sm font-medium">Swap with</legend>
            {options.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No other roles are available to swap with.
              </p>
            ) : null}
            {options.map((r) => (
              <label
                key={r.slot.id}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border px-3 has-checked:border-primary has-checked:bg-primary-soft"
              >
                <input
                  type="radio"
                  name="swap-target"
                  value={r.slot.id}
                  checked={target === r.slot.id}
                  onChange={() => setTarget(r.slot.id)}
                  className="size-4 accent-[var(--primary)]"
                />
                <span className="flex-1">
                  {r.holder!.name}{" "}
                  <span className="text-muted-foreground">
                    ({r.slot.label})
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!target || busy}>
              Request swap
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Add a role for this meeting only (J-07 step 2). */
export function AddRoleDialog({
  open,
  onOpenChange,
  busy,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  busy: boolean;
  onAdd: (roleTemplateId: string, label?: string) => void;
}) {
  const catalog = useRoleTemplates();
  const [tpl, setTpl] = useState("");
  const [label, setLabel] = useState("");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a role</DialogTitle>
          <DialogDescription>
            Adds the role to this meeting only. The meeting type is not changed.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (tpl) onAdd(tpl, label.trim() || undefined);
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="add-role">Role (required)</Label>
            <select
              id="add-role"
              className={field}
              value={tpl}
              onChange={(e) => setTpl(e.target.value)}
            >
              <option value="">
                {catalog.isPending ? "Loading…" : "Choose a role"}
              </option>
              {(catalog.data ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-label">Label shown on the board</Label>
            <Input
              id="add-label"
              value={label}
              maxLength={60}
              onChange={(e) => setLabel(e.target.value)}
              className="h-11 text-base"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to use the role name.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!tpl || busy}>
              Add role
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Speaker sets project, title, objectives and the evaluation form link (J-05). Time limits come from the project. */
export function SpeakerDialog({
  row,
  open,
  onOpenChange,
}: {
  row: RoleSlotView;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const projects = useProjects();
  const save = useSaveSpeakerDetails();
  const sp = row.speaker;
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SpeakerDetailsForm, unknown, SpeakerDetailsValues>({
    resolver: zodResolver(speakerDetailsInput),
    defaultValues: {
      projectId: sp?.projectId ?? "",
      level: sp?.level ?? 1,
      title: sp?.title ?? "",
      objectives: sp?.objectives ?? "",
      evalFormUrl: sp?.evalFormUrl ?? "",
    },
  });
  const projectId = useWatch({ control, name: "projectId" });
  const chosen = (projects.data ?? []).find((p) => p.id === projectId);
  const speechProjects = (projects.data ?? []).filter(
    (p) => p.level > 0 || p.isCustom,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Speech details for {row.slot.label}</DialogTitle>
          <DialogDescription>
            Your evaluator and the Timer use these.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={handleSubmit((v) => {
            save.mutate(
              { slotId: row.slot.id, data: v },
              { onSuccess: () => onOpenChange(false) },
            );
          })}
        >
          <div className="space-y-1.5">
            <Label htmlFor="sp-project">Project</Label>
            <select
              id="sp-project"
              className={field}
              {...register("projectId")}
            >
              <option value="">Choose a project</option>
              {speechProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({formatSeconds(p.minSeconds)} to{" "}
                  {formatSeconds(p.maxSeconds)})
                </option>
              ))}
            </select>
            {chosen ? (
              <p className="text-xs text-muted-foreground">
                Time limit {formatSeconds(chosen.minSeconds)} to{" "}
                {formatSeconds(chosen.maxSeconds)}. Timings are illustrative;
                check with your VPE.
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sp-level">Level of this speech</Label>
            <select id="sp-level" className={field} {...register("level")}>
              {[1, 2, 3, 4, 5].map((l) => (
                <option key={l} value={l}>
                  Level {l}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sp-title">Title</Label>
            <Input
              id="sp-title"
              className="h-11 text-base"
              aria-invalid={errors.title ? true : undefined}
              aria-describedby="sp-title-err"
              {...register("title")}
            />
            <FieldError id="sp-title-err" message={errors.title?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sp-objectives">Objectives</Label>
            <Textarea
              id="sp-objectives"
              className="text-base"
              aria-describedby="sp-obj-err"
              {...register("objectives")}
            />
            <FieldError id="sp-obj-err" message={errors.objectives?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sp-form">Evaluation form link</Label>
            <Input
              id="sp-form"
              type="url"
              inputMode="url"
              placeholder="https://"
              className="h-11 text-base"
              aria-invalid={errors.evalFormUrl ? true : undefined}
              aria-describedby="sp-form-err"
              {...register("evalFormUrl")}
            />
            <FieldError
              id="sp-form-err"
              message={errors.evalFormUrl?.message}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending}>
              Save details
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
