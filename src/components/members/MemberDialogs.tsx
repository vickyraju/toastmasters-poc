"use client";

import { useForm } from "react-hook-form";
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
import {
  useAddMember,
  useRemovalImpact,
  useRemoveMember,
  useSetMemberActive,
  useUpdateMember,
} from "@/hooks/useMembers";
import {
  memberAddInput,
  memberEditInput,
  type MemberAddForm,
  type MemberAddValues,
  type MemberEditForm,
  type MemberEditValues,
} from "@/lib/domain/schemas";
import { POSITION_LABELS } from "@/lib/domain/constants";
import type { Member } from "@/lib/domain/types";
import { formatMeetingTime } from "@/lib/time/ist";
import { AppError } from "@/lib/services";

const Err = ({ message }: { message?: string }) =>
  message ? (
    <p role="alert" className="flex items-center gap-1.5 text-sm text-danger">
      <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  ) : null;

/** The service refuses duplicates; its field messages come back and show under the field. */
const fieldError = (e: unknown, key: string) =>
  e instanceof AppError ? e.extra.fields?.[key] : undefined;

export function AddMemberDialog({ onClose }: { onClose: () => void }) {
  const add = useAddMember();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MemberAddForm, unknown, MemberAddValues>({
    resolver: zodResolver(memberAddInput),
    defaultValues: {
      employeeId: "",
      name: "",
      email: "",
      toastmastersId: "",
      pathway: "",
      currentLevel: 1,
    },
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add member</DialogTitle>
          <DialogDescription>
            They can sign in with their employee ID straight away.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={handleSubmit((v) => add.mutate(v, { onSuccess: onClose }))}
        >
          <div className="space-y-1.5">
            <Label htmlFor="am-id">Employee ID (required)</Label>
            <Input
              id="am-id"
              autoCapitalize="characters"
              className="h-11 text-base"
              {...register("employeeId")}
            />
            <Err
              message={
                errors.employeeId?.message ??
                fieldError(add.error, "employeeId")
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="am-name">Name (required)</Label>
            <Input
              id="am-name"
              className="h-11 text-base"
              {...register("name")}
            />
            <Err message={errors.name?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="am-email">Email (required)</Label>
            <Input
              id="am-email"
              type="email"
              className="h-11 text-base"
              {...register("email")}
            />
            <Err
              message={errors.email?.message ?? fieldError(add.error, "email")}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="am-tm">Toastmasters ID</Label>
              <Input
                id="am-tm"
                className="h-11 text-base"
                {...register("toastmastersId")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="am-level">Starting level</Label>
              <select
                id="am-level"
                className="h-11 w-full rounded-lg border border-border-input bg-card px-3 text-base"
                {...register("currentLevel")}
              >
                {[1, 2, 3, 4, 5].map((l) => (
                  <option key={l} value={l}>
                    Level {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="am-path">Pathway</Label>
            <Input
              id="am-path"
              className="h-11 text-base"
              {...register("pathway")}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={add.isPending}>
              Add member
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** ExComm edits name, email, Toastmasters ID and pathway; a member edits their own except the Toastmasters ID (S-12). */
export function EditMemberDialog({
  member,
  asSelf,
  onClose,
}: {
  member: Member;
  asSelf: boolean;
  onClose: () => void;
}) {
  const update = useUpdateMember();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<MemberEditForm, unknown, MemberEditValues>({
    resolver: zodResolver(memberEditInput),
    defaultValues: {
      name: member.name,
      email: member.email,
      toastmastersId: member.toastmastersId ?? "",
      pathway: member.pathway ?? "",
    },
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {asSelf ? "Edit your details" : `Edit ${member.name}`}
          </DialogTitle>
          <DialogDescription>
            Employee ID {member.employeeId} cannot change. A level changes only
            when your VPE verifies it.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={handleSubmit((v) =>
            update.mutate(
              {
                id: member.id,
                patch: asSelf
                  ? { name: v.name, email: v.email, pathway: v.pathway }
                  : v,
              },
              { onSuccess: onClose },
            ),
          )}
        >
          <div className="space-y-1.5">
            <Label htmlFor="em-name">Name (required)</Label>
            <Input
              id="em-name"
              className="h-11 text-base"
              {...register("name")}
            />
            <Err message={errors.name?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="em-email">Email (required)</Label>
            <Input
              id="em-email"
              type="email"
              className="h-11 text-base"
              {...register("email")}
            />
            <Err
              message={
                errors.email?.message ?? fieldError(update.error, "email")
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="em-tm">Toastmasters ID</Label>
            <Input
              id="em-tm"
              readOnly={asSelf}
              aria-readonly={asSelf}
              className="h-11 text-base read-only:bg-background read-only:text-muted-foreground"
              {...register("toastmastersId")}
            />
            {asSelf ? (
              <p className="text-xs text-muted-foreground">
                Only ExComm can change this.
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="em-path">Pathway</Label>
            <Input
              id="em-path"
              className="h-11 text-base"
              {...register("pathway")}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={update.isPending || !isDirty}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Lists what the action releases before the person confirms (R-16, S-11 "Removing a member who holds future roles"). */
export function StepDownDialog({
  member,
  mode,
  onClose,
}: {
  member: Member;
  mode: "remove" | "deactivate";
  onClose: () => void;
}) {
  const impact = useRemovalImpact(member.id);
  const remove = useRemoveMember();
  const deactivate = useSetMemberActive();
  const busy = remove.isPending || deactivate.isPending;
  const i = impact.data;
  const verb = mode === "remove" ? "Remove" : "Deactivate";
  const done = { onSuccess: onClose };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {verb} {member.name}?
          </DialogTitle>
          <DialogDescription>
            {mode === "remove"
              ? "They can no longer sign in. Their past roles and reports stay in the history."
              : "They can no longer sign in until you reactivate them. Their history stays."}
          </DialogDescription>
        </DialogHeader>
        {impact.isPending ? (
          <p className="text-sm text-muted-foreground">Checking their roles…</p>
        ) : null}
        {impact.isError ? (
          <p role="alert" className="text-sm text-danger">
            Could not check their roles. Try again
          </p>
        ) : null}
        {i?.blocked ? (
          <p
            role="alert"
            className="rounded-md bg-warning-bg px-3 py-2 text-sm text-warning"
          >
            {i.blocked}
          </p>
        ) : null}
        {i && !i.blocked && (i.roles.length > 0 || i.position) ? (
          <div className="space-y-2 rounded-md bg-warning-bg px-3 py-2 text-sm text-warning">
            <p className="font-medium">This will:</p>
            <ul className="list-disc pl-5">
              {i.roles.map((r) => (
                <li key={r.slotId}>
                  Release {r.label} on {formatMeetingTime(r.startsAt)} (
                  {r.meetingTitle}). It opens for others.
                </li>
              ))}
              {i.position ? (
                <li>
                  Leave the {POSITION_LABELS[i.position]} position vacant.
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!i || !!i.blocked || busy}
            className="bg-danger text-primary-foreground hover:bg-danger/90"
            onClick={() =>
              mode === "remove"
                ? remove.mutate({ id: member.id, name: member.name }, done)
                : deactivate.mutate(
                    { id: member.id, name: member.name, active: false },
                    done,
                  )
            }
          >
            {verb}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
