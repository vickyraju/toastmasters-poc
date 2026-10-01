"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PositionBadge } from "@/components/shared/PositionBadge";
import { useCurrentUser, useDemoAccounts, useSignIn } from "@/hooks/useSession";
import { safeNext } from "@/lib/permissions/routes";

/** S-01: employee ID only, no password (design.md section 9, flow.md J-01). */
export function LoginForm({ next }: { next: string | null }) {
  const router = useRouter();
  const me = useCurrentUser();
  const signIn = useSignIn();
  const [employeeId, setEmployeeId] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const helpId = useId();
  const errorId = useId();
  const target = safeNext(next);

  // Already signed in: S-01 is for signed-out users only.
  useEffect(() => {
    if (me.data) router.replace(target);
  }, [me.data, router, target]);

  const submit = (id: string) =>
    signIn.mutate(id, {
      onSuccess: () => router.replace(target),
      onError: () => inputRef.current?.focus(),
    });

  const error = signIn.error?.message;

  return (
    <div className="w-full max-w-[400px] space-y-4">
      <section className="rounded-lg border border-border bg-card p-6 sm:p-8">
        <div className="mb-6 text-center">
          <div
            aria-hidden="true"
            className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-primary-soft text-lg font-semibold text-primary"
          >
            CH
          </div>
          <h1 className="text-2xl font-semibold">Club Hub</h1>
          {process.env.NEXT_PUBLIC_CLUB_NAME ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {process.env.NEXT_PUBLIC_CLUB_NAME}
            </p>
          ) : null}
        </div>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            submit(employeeId);
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="employee-id">Employee ID</Label>
            <Input
              ref={inputRef}
              id="employee-id"
              name="employeeId"
              autoComplete="username"
              autoCapitalize="characters"
              spellCheck={false}
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${errorId} ${helpId}` : helpId}
              className="h-11 text-base"
            />
            <p id={helpId} className="text-xs text-muted-foreground">
              Use the ID on your company badge
            </p>
            {error ? (
              <p
                id={errorId}
                role="alert"
                className="flex items-center gap-1.5 text-sm text-danger"
              >
                <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
                {error}
              </p>
            ) : null}
          </div>
          <Button type="submit" className="w-full" disabled={signIn.isPending}>
            {signIn.isPending ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : null}
            Sign in
          </Button>
        </form>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Trouble signing in? Contact your club VPE
        </p>
      </section>
      <DemoAccounts
        disabled={signIn.isPending}
        onPick={(id) => {
          setEmployeeId(id);
          submit(id);
        }}
      />
    </div>
  );
}

/** Demo personas (architecture.md section 5); empty list unless demo mode. */
function DemoAccounts({
  onPick,
  disabled,
}: {
  onPick: (id: string) => void;
  disabled: boolean;
}) {
  const { data } = useDemoAccounts();
  if (!data?.length) return null;
  return (
    <section
      aria-labelledby="demo-heading"
      className="rounded-lg border border-border bg-card p-4"
    >
      <h2 id="demo-heading" className="mb-2 text-sm font-semibold">
        Demo accounts
      </h2>
      <ul className="divide-y divide-border">
        {data.map((a) => (
          <li key={a.employeeId}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(a.employeeId)}
              className="flex min-h-11 w-full items-center gap-2 px-1 text-left text-sm hover:bg-primary-soft disabled:opacity-50"
            >
              <span className="w-14 font-mono text-xs text-muted-foreground">
                {a.employeeId}
              </span>
              <span className="flex-1">{a.name}</span>
              {a.position ? <PositionBadge position={a.position} /> : null}
              {a.status !== "active" ? (
                <span className="text-xs text-muted-foreground">
                  {a.status}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
