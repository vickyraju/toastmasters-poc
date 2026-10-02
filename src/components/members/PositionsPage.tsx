"use client";

import { useState } from "react";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar } from "@/components/shared/Avatar";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { QueryBlock } from "@/components/shared/QueryBlock";
import { useMembers } from "@/hooks/useRoles";
import {
  useAssignPosition,
  useSetNextPresident,
  useTransferPresidency,
} from "@/hooks/useMembers";
import { usePositions } from "@/hooks/useHome";
import { POSITION_LABELS } from "@/lib/domain/constants";
import type { Position } from "@/lib/domain/types";
import type { MemberRow } from "@/lib/services";

const field =
  "h-11 w-full rounded-lg border border-border-input bg-card px-3 text-base";

type Item = {
  code: Position;
  memberId: string | null;
  memberName: string | null;
};
type Dialog_ =
  | { kind: "pick"; item: Item }
  | { kind: "confirm"; item: Item; member: MemberRow }
  | { kind: "vacate"; item: Item }
  | { kind: "next" }
  | { kind: "transfer" }
  | null;

/** Pick an active member. `skip` hides the current holder and anyone who already holds a seat. */
function MemberPicker({
  title,
  description,
  confirmLabel,
  filter,
  onPick,
  onClose,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  filter: (m: MemberRow) => boolean;
  onPick: (m: MemberRow) => void;
  onClose: () => void;
}) {
  const members = useMembers(true);
  const [id, setId] = useState("");
  const options = (members.data ?? [])
    .filter((m) => m.status === "active" && filter(m))
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const m = options.find((x) => x.id === id);
            if (m) onPick(m);
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="pp-member">Member (required)</Label>
            <select
              id="pp-member"
              className={field}
              value={id}
              onChange={(e) => setId(e.target.value)}
              disabled={members.isPending}
            >
              <option value="">
                {members.isPending ? "Loading members…" : "Choose a member"}
              </option>
              {options.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                  {m.position ? ` (${POSITION_LABELS[m.position]})` : ""}
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
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!id}>
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** S-13: seven position cards, the Next President card, and the strongly worded transfer (R-12, J-11). */
export function PositionsPage() {
  const positions = usePositions(true);
  const assign = useAssignPosition();
  const setNext = useSetNextPresident();
  const transfer = useTransferPresidency();
  const [dialog, setDialog] = useState<Dialog_>(null);
  const close = () => setDialog(null);

  return (
    <QueryBlock query={positions} label="positions" rows={4}>
      {(p) => {
        const seats = new Map(p.items.map((i) => [i.code, i]));
        const held = new Set(p.items.map((i) => i.memberId).filter(Boolean));
        return (
          <div className="space-y-4">
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {p.items.map((item) => {
                const label = POSITION_LABELS[item.code];
                const isPresident = item.code === "president";
                return (
                  <li
                    key={item.code}
                    className="space-y-3 rounded-lg border border-border bg-card p-5"
                  >
                    <h2 className="text-xl font-semibold">{label}</h2>
                    {item.memberName ? (
                      <p className="flex items-center gap-2">
                        <Avatar name={item.memberName} />
                        {item.memberName}
                      </p>
                    ) : (
                      <p className="text-muted-foreground">Vacant</p>
                    )}
                    {isPresident ? (
                      <p className="text-sm text-muted-foreground">
                        Name the next President below. The presidency moves only
                        through Transfer presidency.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setDialog({ kind: "pick", item })}
                        >
                          {item.memberId ? "Change" : "Assign"}
                        </Button>
                        {item.memberId ? (
                          <Button
                            variant="outline"
                            className="border-danger text-danger"
                            onClick={() => setDialog({ kind: "vacate", item })}
                          >
                            Make vacant
                          </Button>
                        ) : null}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            <section className="space-y-3 rounded-lg border border-border bg-card p-5">
              <h2 className="text-xl font-semibold">Next President</h2>
              <p>
                {p.nextPresidentName ?? (
                  <span className="text-muted-foreground">Not set</span>
                )}
              </p>
              <p className="text-sm text-muted-foreground">
                Handing over makes them President and you a regular member.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => setDialog({ kind: "next" })}
                >
                  {p.nextPresidentId
                    ? "Change next President"
                    : "Set next President"}
                </Button>
                {p.nextPresidentId ? (
                  <>
                    <Button
                      variant="outline"
                      disabled={setNext.isPending}
                      onClick={() => setNext.mutate(null)}
                    >
                      Clear
                    </Button>
                    <Button
                      className="bg-danger text-primary-foreground hover:bg-danger/90"
                      onClick={() => setDialog({ kind: "transfer" })}
                    >
                      Transfer presidency now
                    </Button>
                  </>
                ) : null}
              </div>
            </section>

            {dialog?.kind === "pick" ? (
              <MemberPicker
                title={`${dialog.item.memberId ? "Change" : "Assign"} ${POSITION_LABELS[dialog.item.code]}`}
                description="Choose the new holder. A member can hold one position."
                confirmLabel="Continue"
                filter={(m) => m.id !== dialog.item.memberId && !held.has(m.id)}
                onPick={(member) =>
                  setDialog({ kind: "confirm", item: dialog.item, member })
                }
                onClose={close}
              />
            ) : null}
            {dialog?.kind === "confirm" ? (
              <ConfirmDialog
                open
                onOpenChange={(o) => !o && close()}
                title={`${dialog.item.memberId ? "Replace" : "Assign"} ${POSITION_LABELS[dialog.item.code]}?`}
                description={
                  dialog.item.memberName
                    ? `${dialog.item.memberName} will become a plain Member. ${dialog.member.name} is notified and becomes ${POSITION_LABELS[dialog.item.code]}.`
                    : `${dialog.member.name} becomes ${POSITION_LABELS[dialog.item.code]} and is notified.`
                }
                confirmLabel={dialog.item.memberId ? "Replace" : "Assign"}
                busy={assign.isPending}
                onConfirm={() =>
                  assign.mutate(
                    {
                      code: dialog.item.code,
                      memberId: dialog.member.id,
                      label: POSITION_LABELS[dialog.item.code],
                    },
                    { onSuccess: close },
                  )
                }
              />
            ) : null}
            {dialog?.kind === "vacate" ? (
              <ConfirmDialog
                open
                onOpenChange={(o) => !o && close()}
                title={`Make ${POSITION_LABELS[dialog.item.code]} vacant?`}
                description={`${dialog.item.memberName} will become a plain Member and is notified.`}
                confirmLabel="Make vacant"
                destructive
                busy={assign.isPending}
                onConfirm={() =>
                  assign.mutate(
                    {
                      code: dialog.item.code,
                      memberId: null,
                      label: POSITION_LABELS[dialog.item.code],
                    },
                    { onSuccess: close },
                  )
                }
              />
            ) : null}
            {dialog?.kind === "next" ? (
              <MemberPicker
                title="Name the next President"
                description="They become President only when you choose Transfer presidency."
                confirmLabel="Set next President"
                filter={(m) => m.position !== "president"}
                onPick={(m) => setNext.mutate(m.id, { onSuccess: close })}
                onClose={close}
              />
            ) : null}
            {dialog?.kind === "transfer" ? (
              <ConfirmDialog
                open
                onOpenChange={(o) => !o && close()}
                title="Transfer the presidency?"
                description={`${p.nextPresidentName} will become President immediately. You will become a regular member and lose admin access. This cannot be undone from here.`}
                confirmLabel="Transfer now"
                destructive
                busy={transfer.isPending}
                onConfirm={() =>
                  transfer.mutate(undefined, { onSuccess: close })
                }
              >
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-md bg-danger-bg px-3 py-2 text-sm text-danger"
                >
                  <TriangleAlert
                    className="mt-0.5 size-4 shrink-0"
                    aria-hidden="true"
                  />
                  {seats.get("president")?.memberName} stops being President the
                  moment you confirm.
                </p>
              </ConfirmDialog>
            ) : null}
          </div>
        );
      }}
    </QueryBlock>
  );
}
