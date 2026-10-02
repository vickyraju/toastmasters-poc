"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { useSetMeetingStatus } from "@/hooks/useHome";
import { useMeeting } from "@/hooks/useMeeting";
import { useCreateMeeting, useUpdateMeeting } from "@/hooks/useMeetingActions";
import { useRoleTemplates } from "@/hooks/useRoles";
import { useMeetingTypes } from "@/hooks/useTemplates";
import {
  hasLocation,
  meetingFormInput,
  NEEDS_LOCATION,
  type MeetingFormForm,
  type MeetingFormValues,
} from "@/lib/domain/schemas";
import type { UploadFile } from "@/lib/services";
import { formatIST, istToUtcIso } from "@/lib/time/ist";
import { usePathname } from "next/navigation";
import { AgendaUpload } from "./AgendaUpload";

const field =
  "h-11 w-full rounded-lg border border-border-input bg-card px-3 text-base";

function Err({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="flex items-center gap-1.5 text-sm text-danger">
      <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

/** S-05 create or edit (design.md section 7). Roles are chosen here on create and changed on the Roles tab after. */
export function MeetingForm({ id }: { id?: string }) {
  const pathname = usePathname();
  const editing = id !== undefined;
  const meeting = useMeeting(id ?? "", editing);
  const types = useMeetingTypes();
  const catalog = useRoleTemplates();

  // Wait for the data the defaults come from, so the form mounts once with real values.
  if (
    editing &&
    meeting.isError &&
    meeting.error.message === "You do not have access to this."
  )
    return <AccessDenied path={pathname} />;
  const ready = types.data && catalog.data && (!editing || meeting.data);
  const failed =
    types.isError || catalog.isError || (editing && meeting.isError);
  if (failed)
    return (
      <div
        role="alert"
        className="flex max-w-[760px] flex-wrap items-center gap-3 rounded-lg border border-danger/30 bg-danger-bg p-3 text-sm text-danger"
      >
        <span className="flex-1">Could not load the form. Try again</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void types.refetch();
            void catalog.refetch();
            if (editing) void meeting.refetch();
          }}
        >
          Retry
        </Button>
      </div>
    );
  if (!ready)
    return (
      <div
        className="max-w-[760px] space-y-4"
        aria-busy="true"
        aria-label="Loading form"
      >
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  return (
    <Loaded
      id={id}
      types={types.data!}
      catalog={catalog.data!}
      existing={meeting.data}
    />
  );
}

type Types = NonNullable<ReturnType<typeof useMeetingTypes>["data"]>;
type Catalog = NonNullable<ReturnType<typeof useRoleTemplates>["data"]>;
type Existing = NonNullable<ReturnType<typeof useMeeting>["data"]>;

function Loaded({
  id,
  types,
  catalog,
  existing,
}: {
  id?: string;
  types: Types;
  catalog: Catalog;
  existing?: Existing;
}) {
  const router = useRouter();
  const create = useCreateMeeting();
  const update = useUpdateMeeting();
  const setStatus = useSetMeetingStatus();
  const [agenda, setAgenda] = useState<UploadFile | null>(null);
  // A ref, not state: the button click and the form submit happen in one event, before a re-render.
  const intent = useRef<"draft" | "open">("draft");
  const [locationError, setLocationError] = useState(false);
  const activeTypes = types.filter(
    (t) => t.isActive || t.id === existing?.meetingTypeId,
  );
  const editing = existing !== undefined;

  const defaults = useMemo<MeetingFormForm>(() => {
    const type = activeTypes[0];
    const rolesFor = (typeId: string) =>
      catalog.map((r) => ({
        roleTemplateId: r.id,
        count:
          types
            .find((t) => t.id === typeId)
            ?.roles.find((x) => x.roleTemplateId === r.id)?.count ?? 0,
      }));
    if (existing)
      return {
        title: existing.title,
        meetingTypeId: existing.meetingTypeId,
        date: formatIST(existing.startsAt, "yyyy-MM-dd"),
        startTime: formatIST(existing.startsAt, "HH:mm"),
        durationMinutes: Math.round(
          (Date.parse(existing.endsAt) - Date.parse(existing.startsAt)) /
            60_000,
        ),
        venue: existing.venue ?? "",
        meetingLink: existing.meetingLink ?? "",
        roles: [],
        customRoles: [],
      };
    return {
      title: "",
      meetingTypeId: type?.id ?? "",
      date: "",
      startTime: "16:00",
      durationMinutes: type?.defaultDurationMinutes ?? 90,
      venue: "",
      meetingLink: "",
      roles: rolesFor(type?.id ?? ""),
      customRoles: [],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- defaults are read once, at mount
  }, []);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isDirty },
  } = useForm<MeetingFormForm, unknown, MeetingFormValues>({
    resolver: zodResolver(meetingFormInput),
    defaultValues: defaults,
  });
  const roles = useFieldArray({ control, name: "roles" });
  const custom = useFieldArray({ control, name: "customRoles" });
  const typeId = useWatch({ control, name: "meetingTypeId" });
  const venue = useWatch({ control, name: "venue" });
  const link = useWatch({ control, name: "meetingLink" });

  /** Choosing a type pre-fills its role counts and duration, but only on create. */
  function onType(next: string) {
    if (editing) return;
    const t = types.find((x) => x.id === next);
    if (!t) return;
    setValue("durationMinutes", t.defaultDurationMinutes);
    roles.replace(
      catalog.map((r) => ({
        roleTemplateId: r.id,
        count: t.roles.find((x) => x.roleTemplateId === r.id)?.count ?? 0,
      })),
    );
  }
  void typeId;

  const save = (v: MeetingFormValues, wants: "draft" | "open") => {
    if (wants === "open" && !hasLocation(v)) {
      setLocationError(true);
      return;
    }
    const startsAt = istToUtcIso(v.date, v.startTime);
    const endsAt = new Date(
      Date.parse(startsAt) + v.durationMinutes * 60_000,
    ).toISOString();
    if (editing) {
      update.mutate(
        {
          id: id!,
          patch: {
            title: v.title,
            startsAt,
            endsAt,
            venue: v.venue || null,
            meetingLink: v.meetingLink || null,
          },
        },
        { onSuccess: () => router.push(`/meetings/${id}`) },
      );
      return;
    }
    create.mutate(
      {
        input: {
          title: v.title,
          meetingTypeId: v.meetingTypeId,
          startsAt,
          endsAt,
          venue: v.venue || null,
          meetingLink: v.meetingLink || null,
          roles: v.roles.filter((r) => r.count > 0),
          customRoles: v.customRoles,
        },
        agenda: agenda ?? undefined,
      },
      {
        onSuccess: (m) => {
          if (wants === "open") {
            setStatus.mutate(
              { id: (m as { id: string }).id, status: "open" },
              {
                onSuccess: () =>
                  router.push(`/meetings/${(m as { id: string }).id}`),
              },
            );
          } else {
            toast.success("Draft saved.");
            router.push(`/meetings/${(m as { id: string }).id}`);
          }
        },
      },
    );
  };
  // The ref is read here, in the event handler, never during render.
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    void handleSubmit((v) => save(v, intent.current))(e);
  };

  const busy = create.isPending || update.isPending || setStatus.isPending;
  const roleName = (rid: string) =>
    catalog.find((r) => r.id === rid)?.name ?? rid;

  return (
    <form
      onSubmit={submit}
      noValidate
      className="max-w-[760px] space-y-6 pb-28"
    >
      <Section title="Basics">
        <div className="space-y-1.5">
          <Label htmlFor="mf-title">Title (required)</Label>
          <Input
            id="mf-title"
            className="h-11 text-base"
            aria-invalid={errors.title ? true : undefined}
            aria-describedby="mf-title-err"
            {...register("title")}
          />
          <Err id="mf-title-err" message={errors.title?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mf-type">Meeting type (required)</Label>
          <select
            id="mf-type"
            className={field}
            disabled={editing}
            {...register("meetingTypeId", {
              onChange: (e) => onType(e.target.value),
            })}
          >
            {activeTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {editing ? (
            <p className="text-xs text-muted-foreground">
              The type cannot change after the meeting is created.
            </p>
          ) : null}
        </div>
      </Section>

      <Section title="Date and time (IST)">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="mf-date">Date (required)</Label>
            <Input
              id="mf-date"
              type="date"
              className="h-11 text-base"
              aria-invalid={errors.date ? true : undefined}
              aria-describedby="mf-date-err"
              {...register("date")}
            />
            <Err id="mf-date-err" message={errors.date?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mf-time">Start time (required)</Label>
            <Input
              id="mf-time"
              type="time"
              className="h-11 text-base"
              aria-invalid={errors.startTime ? true : undefined}
              aria-describedby="mf-time-err"
              {...register("startTime")}
            />
            <Err id="mf-time-err" message={errors.startTime?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mf-duration">Duration in minutes</Label>
            <Input
              id="mf-duration"
              type="number"
              inputMode="numeric"
              className="h-11 text-base"
              aria-invalid={errors.durationMinutes ? true : undefined}
              aria-describedby="mf-duration-err"
              {...register("durationMinutes")}
            />
            <Err
              id="mf-duration-err"
              message={errors.durationMinutes?.message}
            />
          </div>
        </div>
      </Section>

      <Section title="Location">
        <div className="space-y-1.5">
          <Label htmlFor="mf-venue">Venue</Label>
          <Input
            id="mf-venue"
            className="h-11 text-base"
            {...register("venue")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mf-link">Meeting link</Label>
          <Input
            id="mf-link"
            type="url"
            inputMode="url"
            placeholder="https://example.com/meeting…"
            className="h-11 text-base"
            aria-invalid={errors.meetingLink ? true : undefined}
            aria-describedby="mf-link-err mf-loc-help"
            {...register("meetingLink")}
          />
          <Err id="mf-link-err" message={errors.meetingLink?.message} />
        </div>
        <p id="mf-loc-help" className="text-sm text-muted-foreground">
          At least one of venue or link is required before this meeting can
          leave Draft.
        </p>
        {locationError &&
        !hasLocation({ venue: venue ?? "", meetingLink: link ?? "" }) ? (
          <Err id="mf-loc-err" message={NEEDS_LOCATION} />
        ) : null}
      </Section>

      {editing ? (
        <Section title="Roles for this meeting">
          <p className="text-sm text-muted-foreground">
            Add, assign or delete roles on the{" "}
            <Link
              href={`/meetings/${id}?tab=roles`}
              className="text-primary underline-offset-4 hover:underline"
            >
              Roles tab
            </Link>
            .
          </p>
        </Section>
      ) : (
        <>
          <Section title="Roles for this meeting">
            <p className="text-sm text-muted-foreground">
              Changes here affect only this meeting, not the template.
            </p>
            <ul className="divide-y divide-border">
              {roles.fields.map((f, i) => (
                <li key={f.id} className="flex items-center gap-3 py-2">
                  <Label htmlFor={`role-${i}`} className="flex-1 font-normal">
                    {roleName(f.roleTemplateId)}
                  </Label>
                  <Input
                    id={`role-${i}`}
                    type="number"
                    min={0}
                    max={20}
                    inputMode="numeric"
                    className="h-11 w-20 text-base"
                    {...register(`roles.${i}.count`)}
                  />
                </li>
              ))}
            </ul>
            {custom.fields.map((f, i) => (
              <div
                key={f.id}
                className="space-y-2 rounded-lg border border-border p-3"
              >
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-40 flex-1 space-y-1.5">
                    <Label htmlFor={`cr-name-${i}`}>Custom role name</Label>
                    <Input
                      id={`cr-name-${i}`}
                      className="h-11 text-base"
                      aria-invalid={
                        errors.customRoles?.[i]?.name ? true : undefined
                      }
                      {...register(`customRoles.${i}.name`)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`cr-cat-${i}`}>Kind</Label>
                    <select
                      id={`cr-cat-${i}`}
                      className={field}
                      {...register(`customRoles.${i}.category`)}
                    >
                      <option value="main">Main role</option>
                      <option value="support">Support role</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`cr-count-${i}`}>Count</Label>
                    <Input
                      id={`cr-count-${i}`}
                      type="number"
                      min={1}
                      max={20}
                      className="h-11 w-20 text-base"
                      {...register(`customRoles.${i}.count`)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-11"
                    aria-label="Remove custom role"
                    onClick={() => custom.remove(i)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
                <Err
                  id={`cr-err-${i}`}
                  message={
                    errors.customRoles?.[i]?.name?.message ??
                    errors.customRoles?.[i]?.count?.message
                  }
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                custom.append({ name: "", category: "main", count: 1 })
              }
            >
              <Plus aria-hidden="true" />
              Add custom role
            </Button>
          </Section>
          <Section title="Agenda file">
            {agenda ? (
              <p className="flex items-center gap-3 text-sm">
                <span className="flex-1 break-all">{agenda.name}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAgenda(null)}
                >
                  Remove
                </Button>
              </p>
            ) : (
              <AgendaUpload onFile={setAgenda} />
            )}
          </Section>
        </>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card px-4 py-3 max-lg:bottom-14 lg:left-[var(--sidebar-width)]">
        <div className="mx-auto flex max-w-[760px] flex-wrap justify-end gap-2 max-sm:flex-col-reverse">
          <Button asChild variant="outline">
            <Link href={editing ? `/meetings/${id}` : "/meetings"}>Cancel</Link>
          </Button>
          <Button
            type="submit"
            variant={editing ? "default" : "outline"}
            disabled={busy || (editing && !isDirty && !agenda)}
            onClick={() => (intent.current = "draft")}
          >
            {editing ? "Save changes" : "Save draft"}
          </Button>
          {!editing ? (
            <Button
              type="submit"
              disabled={busy}
              onClick={() => (intent.current = "open")}
            >
              Open for roles
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-5 max-sm:p-4">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}
