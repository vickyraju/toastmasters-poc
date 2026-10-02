"use client";

import { useState } from "react";
import { CircleAlert, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryBlock } from "@/components/shared/QueryBlock";
import { useNotifPrefs, useSavePrefs } from "@/hooks/useAdmin";
import { useUpdateMember } from "@/hooks/useMembers";
import { useCan, useCurrentUser } from "@/hooks/useSession";
import { ClubSettingsCard } from "./ClubSettingsCard";
import { memberEditInput } from "@/lib/domain/schemas";
import type { NotifCode } from "@/lib/domain/types";
import type { CurrentUser, NotifPrefRow } from "@/lib/services";

/** S-18: own profile and notification preferences, saved together from one sticky bar (FR-40). */
export function SettingsPage() {
  const user = useCurrentUser().data;
  const prefs = useNotifPrefs();
  if (!user || prefs.isPending)
    return (
      <div
        className="max-w-[760px] space-y-4"
        aria-busy="true"
        aria-label="Loading settings"
      >
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    );
  return (
    <div className="max-w-[760px]">
      <QueryBlock query={prefs} label="your settings" rows={4}>
        {(rows) => <Form user={user} rows={rows} />}
      </QueryBlock>
    </div>
  );
}

function Form({ user, rows }: { user: CurrentUser; rows: NotifPrefRow[] }) {
  const officer = useCan("member.update");
  const president = useCan("settings.club.edit");
  const update = useUpdateMember();
  const save = useSavePrefs();
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [pathway, setPathway] = useState(user.pathway ?? "");
  const [tmId, setTmId] = useState(user.toastmastersId ?? "");
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries(rows.map((r) => [r.code, r.enabled])),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const busy = update.isPending || save.isPending;

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    const parsed = memberEditInput.safeParse({
      name,
      email,
      pathway,
      toastmastersId: tmId,
    });
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((i) => [String(i.path[0]), i.message]),
        ),
      );
      return;
    }
    setErrors({});
    try {
      const v = parsed.data;
      await update.mutateAsync({
        id: user.id,
        patch: officer
          ? v
          : { name: v.name, email: v.email, pathway: v.pathway },
      });
      const changes: Partial<Record<NotifCode, boolean>> = {};
      for (const r of rows)
        if (!r.locked && enabled[r.code] !== r.enabled)
          changes[r.code] = enabled[r.code];
      if (Object.keys(changes).length) await save.mutateAsync(changes);
      toast.success("Settings saved.");
    } catch (err) {
      // the mutations already toast their own errors; field-level ones also show inline
      const fields = (err as { extra?: { fields?: Record<string, string> } })
        .extra?.fields;
      if (fields) setErrors(fields);
    }
  }

  const err = (k: string) =>
    errors[k] ? (
      <p role="alert" className="flex items-center gap-1.5 text-sm text-danger">
        <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
        {errors[k]}
      </p>
    ) : null;

  return (
    <>
      {president ? (
        <div className="mb-6">
          <ClubSettingsCard />
        </div>
      ) : null}
      <form onSubmit={onSave} noValidate className="space-y-6 pb-28">
        <section className="space-y-4 rounded-lg border border-border bg-card p-5 max-sm:p-4">
          <h2 className="text-xl font-semibold">Profile</h2>
          <div className="space-y-1.5">
            <Label htmlFor="st-name">Name (required)</Label>
            <Input
              id="st-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 text-base"
              aria-invalid={errors.name ? true : undefined}
            />
            {err("name")}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-email">Email (required)</Label>
            <Input
              id="st-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 text-base"
              aria-invalid={errors.email ? true : undefined}
            />
            {err("email")}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-path">Pathway</Label>
            <Input
              id="st-path"
              value={pathway}
              onChange={(e) => setPathway(e.target.value)}
              className="h-11 text-base"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="st-emp">Employee ID</Label>
              <Input
                id="st-emp"
                value={user.employeeId}
                readOnly
                aria-readonly
                className="h-11 bg-background text-base text-muted-foreground"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="st-tm">Toastmasters ID</Label>
              <Input
                id="st-tm"
                value={tmId}
                readOnly={!officer}
                aria-readonly={!officer}
                onChange={(e) => setTmId(e.target.value)}
                className="h-11 text-base read-only:bg-background read-only:text-muted-foreground"
              />
              {!officer ? (
                <p className="text-xs text-muted-foreground">
                  Only ExComm can change this.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <section
          aria-labelledby="notif-h"
          className="space-y-1 rounded-lg border border-border bg-card p-5 max-sm:p-4"
        >
          <h2 id="notif-h" className="text-xl font-semibold">
            Notifications
          </h2>
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li
                key={r.code}
                className="flex min-h-12 items-center gap-3 py-2"
              >
                <Label
                  htmlFor={`pref-${r.code}`}
                  className="flex-1 font-normal"
                >
                  {r.label}
                </Label>
                {r.locked ? (
                  <span
                    id={`pref-${r.code}`}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground"
                  >
                    <Lock className="size-4" aria-hidden="true" />
                    Always on
                  </span>
                ) : (
                  <Switch
                    id={`pref-${r.code}`}
                    checked={enabled[r.code]}
                    onCheckedChange={(on) =>
                      setEnabled((p) => ({ ...p, [r.code]: on }))
                    }
                  />
                )}
              </li>
            ))}
          </ul>
        </section>

        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card px-4 py-3 max-lg:bottom-14 lg:left-[var(--sidebar-width)]">
          <div className="mx-auto flex max-w-[760px] justify-end">
            <Button type="submit" disabled={busy} className="max-sm:w-full">
              {busy ? (
                <Loader2 className="animate-spin" aria-hidden="true" />
              ) : null}
              Save changes
            </Button>
          </div>
        </div>
      </form>
    </>
  );
}
