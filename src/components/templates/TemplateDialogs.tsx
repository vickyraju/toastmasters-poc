"use client";

import { useForm, useFieldArray, useWatch } from "react-hook-form";
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
import {
  useSaveMeetingType,
  useSaveProject,
  useSaveRecurring,
  useSaveRoleTemplate,
} from "@/hooks/useTemplates";
import {
  meetingTypeInput,
  projectInput,
  recurringInput,
  roleTemplateInput,
  type MeetingTypeForm,
  type MeetingTypeValues,
  type RecurringForm,
  type RecurringValues,
  type RoleTemplateValues,
  type ProjectValues,
} from "@/lib/domain/schemas";
import type { MeetingTypeView, RecurringView } from "@/lib/services";
import type { PathwaysProject, RoleTemplate } from "@/lib/domain/types";
import { useState } from "react";

const field =
  "h-11 w-full rounded-lg border border-border-input bg-card px-3 text-base";
const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function Err({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="flex items-center gap-1.5 text-sm text-danger">
      <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

function Shell({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

const Footer = ({
  onClose,
  busy,
  label,
}: {
  onClose: () => void;
  busy: boolean;
  label: string;
}) => (
  <DialogFooter>
    <Button type="button" variant="outline" onClick={onClose}>
      Cancel
    </Button>
    <Button type="submit" disabled={busy}>
      {label}
    </Button>
  </DialogFooter>
);

export function RecurringDialog({
  row,
  types,
  onClose,
}: {
  row: RecurringView | null;
  types: MeetingTypeView[];
  onClose: () => void;
}) {
  const save = useSaveRecurring();
  const [apply, setApply] = useState(false);
  const [skip, setSkip] = useState("");
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<RecurringForm, unknown, RecurringValues>({
    resolver: zodResolver(recurringInput),
    defaultValues: row
      ? {
          name: row.name,
          meetingTypeId: row.meetingTypeId,
          weekday: row.weekday,
          startTime: row.startTime,
          durationMinutes: row.durationMinutes,
          venue: row.venue ?? "",
          meetingLink: row.meetingLink ?? "",
          weeksAhead: row.weeksAhead,
          skipDates: row.skipDates,
          isActive: row.isActive,
        }
      : {
          name: "",
          meetingTypeId: types[0]?.id ?? "",
          weekday: 5,
          startTime: "16:00",
          durationMinutes: 90,
          venue: "",
          meetingLink: "",
          weeksAhead: 4,
          skipDates: [],
          isActive: true,
        },
  });
  const skipDates = useWatch({ control, name: "skipDates" }) ?? [];
  return (
    <Shell
      title={row ? `Edit ${row.name}` : "Add recurring template"}
      description={
        row
          ? "Changes apply to future meetings only."
          : "Draft meetings are generated from this template. All members are notified."
      }
      onClose={onClose}
    >
      <form
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit((v) =>
          save.mutate(
            { id: row?.id ?? null, input: v, applyToDrafts: apply },
            { onSuccess: onClose },
          ),
        )}
      >
        <div className="space-y-1.5">
          <Label htmlFor="rt-name">Name (required)</Label>
          <Input
            id="rt-name"
            className="h-11 text-base"
            {...register("name")}
          />
          <Err message={errors.name?.message} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="rt-type">Meeting type</Label>
            <select
              id="rt-type"
              className={field}
              {...register("meetingTypeId")}
            >
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rt-day">Weekday</Label>
            <select id="rt-day" className={field} {...register("weekday")}>
              {WEEKDAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rt-time">Start time (IST)</Label>
            <Input
              id="rt-time"
              type="time"
              className="h-11 text-base"
              {...register("startTime")}
            />
            <Err message={errors.startTime?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rt-dur">Duration in minutes</Label>
            <Input
              id="rt-dur"
              type="number"
              className="h-11 text-base"
              {...register("durationMinutes")}
            />
            <Err message={errors.durationMinutes?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rt-weeks">Weeks ahead</Label>
            <Input
              id="rt-weeks"
              type="number"
              className="h-11 text-base"
              {...register("weeksAhead")}
            />
            <Err message={errors.weeksAhead?.message} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rt-venue">Venue</Label>
          <Input
            id="rt-venue"
            className="h-11 text-base"
            {...register("venue")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rt-link">Meeting link</Label>
          <Input
            id="rt-link"
            type="url"
            placeholder="https://"
            className="h-11 text-base"
            {...register("meetingLink")}
          />
          <Err message={errors.meetingLink?.message} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rt-skip">Skip dates (holidays)</Label>
          <div className="flex gap-2">
            <Input
              id="rt-skip"
              type="date"
              value={skip}
              onChange={(e) => setSkip(e.target.value)}
              className="h-11 text-base"
            />
            <Button
              type="button"
              variant="outline"
              disabled={!skip || skipDates.includes(skip)}
              onClick={() => {
                setValue("skipDates", [...skipDates, skip]);
                setSkip("");
              }}
            >
              Add date
            </Button>
          </div>
          {skipDates.length ? (
            <ul className="flex flex-wrap gap-2">
              {skipDates.map((d) => (
                <li
                  key={d}
                  className="flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1 text-sm"
                >
                  {d}
                  <button
                    type="button"
                    aria-label={`Remove ${d}`}
                    className="inline-flex size-6 items-center justify-center rounded-full hover:bg-primary-soft/70"
                    onClick={() =>
                      setValue(
                        "skipDates",
                        skipDates.filter((x) => x !== d),
                      )
                    }
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            className="size-5 accent-[var(--primary)]"
            {...register("isActive")}
          />
          Active (generates meetings)
        </label>
        {row ? (
          <label className="flex min-h-11 items-start gap-3">
            <input
              type="checkbox"
              checked={apply}
              onChange={(e) => setApply(e.target.checked)}
              className="mt-1 size-5 accent-[var(--primary)]"
            />
            <span>
              Also apply to Draft meetings already generated from this template
              (only ones with nobody in a role).
            </span>
          </label>
        ) : null}
        <Footer
          onClose={onClose}
          busy={save.isPending}
          label={row ? "Save template" : "Add template"}
        />
      </form>
    </Shell>
  );
}

export function MeetingTypeDialog({
  row,
  catalog,
  onClose,
}: {
  row: MeetingTypeView | null;
  catalog: RoleTemplate[];
  onClose: () => void;
}) {
  const save = useSaveMeetingType();
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<MeetingTypeForm, unknown, MeetingTypeValues>({
    resolver: zodResolver(meetingTypeInput),
    defaultValues: {
      name: row?.name ?? "",
      defaultDurationMinutes: row?.defaultDurationMinutes ?? 90,
      isActive: row?.isActive ?? true,
      roles: catalog.map((r) => ({
        roleTemplateId: r.id,
        count: row?.roles.find((x) => x.roleTemplateId === r.id)?.count ?? 0,
      })),
      agendaItems:
        row?.agendaItems.map((a) => ({
          title: a.title,
          durationMinutes: a.durationMinutes,
          roleTemplateId: a.roleTemplateId,
        })) ?? [],
    },
  });
  const roles = useFieldArray({ control, name: "roles" });
  const items = useFieldArray({ control, name: "agendaItems" });
  const nameOf = (id: string) => catalog.find((r) => r.id === id)?.name ?? id;
  return (
    <Shell
      title={row ? `Edit ${row.name}` : "Add meeting type"}
      description={
        row
          ? "Changes apply to meetings created from now on."
          : "New meetings of this type start with these roles and this agenda. All members are notified."
      }
      onClose={onClose}
    >
      <form
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit((v) =>
          save.mutate(
            { id: row?.id ?? null, input: v },
            { onSuccess: onClose },
          ),
        )}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="mt-name">Name (required)</Label>
            <Input
              id="mt-name"
              className="h-11 text-base"
              {...register("name")}
            />
            <Err message={errors.name?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mt-dur">Default duration in minutes</Label>
            <Input
              id="mt-dur"
              type="number"
              className="h-11 text-base"
              {...register("defaultDurationMinutes")}
            />
            <Err message={errors.defaultDurationMinutes?.message} />
          </div>
        </div>
        <fieldset className="space-y-1">
          <legend className="mb-1 text-sm font-medium">Roles</legend>
          {roles.fields.map((f, i) => (
            <div key={f.id} className="flex items-center gap-3">
              <Label htmlFor={`mt-role-${i}`} className="flex-1 font-normal">
                {nameOf(f.roleTemplateId)}
              </Label>
              <Input
                id={`mt-role-${i}`}
                type="number"
                min={0}
                className="h-11 w-20 text-base"
                {...register(`roles.${i}.count`)}
              />
            </div>
          ))}
        </fieldset>
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium">Agenda outline</legend>
          {items.fields.map((f, i) => (
            <div key={f.id} className="flex flex-wrap items-end gap-2">
              <div className="min-w-40 flex-1 space-y-1">
                <Label htmlFor={`ag-t-${i}`} className="sr-only">
                  Item {i + 1} title
                </Label>
                <Input
                  id={`ag-t-${i}`}
                  placeholder="Item"
                  className="h-11 text-base"
                  {...register(`agendaItems.${i}.title`)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`ag-d-${i}`} className="sr-only">
                  Item {i + 1} minutes
                </Label>
                <Input
                  id={`ag-d-${i}`}
                  type="number"
                  min={1}
                  className="h-11 w-20 text-base"
                  {...register(`agendaItems.${i}.durationMinutes`)}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-11"
                aria-label={`Remove item ${i + 1}`}
                onClick={() => items.remove(i)}
              >
                <Trash2 aria-hidden="true" />
              </Button>
              <Err
                message={
                  errors.agendaItems?.[i]?.title?.message ??
                  errors.agendaItems?.[i]?.durationMinutes?.message
                }
              />
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              items.append({
                title: "",
                durationMinutes: 5,
                roleTemplateId: null,
              })
            }
          >
            <Plus aria-hidden="true" />
            Add agenda item
          </Button>
        </fieldset>
        <label className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            className="size-5 accent-[var(--primary)]"
            {...register("isActive")}
          />
          Active
        </label>
        <Footer
          onClose={onClose}
          busy={save.isPending}
          label={row ? "Save meeting type" : "Add meeting type"}
        />
      </form>
    </Shell>
  );
}

export function RoleDialog({
  row,
  onClose,
}: {
  row: RoleTemplate | null;
  onClose: () => void;
}) {
  const save = useSaveRoleTemplate();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RoleTemplateValues, unknown, RoleTemplateValues>({
    resolver: zodResolver(roleTemplateInput),
    defaultValues: row
      ? {
          name: row.name,
          category: row.category,
          reportKind: row.reportKind,
          isSpeaker: row.isSpeaker,
          isEvaluator: row.isEvaluator,
          defaultCount: row.defaultCount,
        }
      : {
          name: "",
          category: "main",
          reportKind: null,
          isSpeaker: false,
          isEvaluator: false,
          defaultCount: 1,
        },
  });
  return (
    <Shell
      title={row ? `Edit ${row.name}` : "Add role"}
      description={
        row
          ? "Changes apply to meetings created from now on."
          : "The role joins the catalog. All members are notified."
      }
      onClose={onClose}
    >
      <form
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit((v) =>
          save.mutate(
            { id: row?.id ?? null, input: v },
            { onSuccess: onClose },
          ),
        )}
      >
        <div className="space-y-1.5">
          <Label htmlFor="ro-name">Name (required)</Label>
          <Input
            id="ro-name"
            className="h-11 text-base"
            {...register("name")}
          />
          <Err message={errors.name?.message} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ro-cat">Category</Label>
            <select id="ro-cat" className={field} {...register("category")}>
              <option value="main">
                Main (counts toward one main role per meeting)
              </option>
              <option value="support">Support</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ro-count">Default count</Label>
            <Input
              id="ro-count"
              type="number"
              min={0}
              className="h-11 text-base"
              {...register("defaultCount")}
            />
          </div>
        </div>
        <Footer
          onClose={onClose}
          busy={save.isPending}
          label={row ? "Save role" : "Add role"}
        />
      </form>
    </Shell>
  );
}

export function ProjectDialog({
  row,
  onClose,
}: {
  row: PathwaysProject | null;
  onClose: () => void;
}) {
  const save = useSaveProject();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectValues, unknown, ProjectValues>({
    resolver: zodResolver(projectInput),
    defaultValues: row
      ? {
          pathway: row.pathway,
          level: row.level,
          name: row.name,
          minSeconds: row.minSeconds,
          maxSeconds: row.maxSeconds,
        }
      : {
          pathway: "n/a",
          level: 0,
          name: "",
          minSeconds: 300,
          maxSeconds: 420,
        },
  });
  return (
    <Shell
      title={row ? `Edit ${row.name}` : "Add project timing"}
      description="Timings are in seconds. Verify them with the VPE."
      onClose={onClose}
    >
      <form
        noValidate
        className="space-y-4"
        onSubmit={handleSubmit((v) =>
          save.mutate(
            { id: row?.id ?? null, input: v },
            { onSuccess: onClose },
          ),
        )}
      >
        <div className="space-y-1.5">
          <Label htmlFor="pj-name">Project name (required)</Label>
          <Input
            id="pj-name"
            className="h-11 text-base"
            {...register("name")}
          />
          <Err message={errors.name?.message} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pj-path">Pathway</Label>
            <Input
              id="pj-path"
              className="h-11 text-base"
              {...register("pathway")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pj-level">Level (0 for none)</Label>
            <Input
              id="pj-level"
              type="number"
              min={0}
              max={5}
              className="h-11 text-base"
              {...register("level")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pj-min">Minimum seconds</Label>
            <Input
              id="pj-min"
              type="number"
              min={0}
              className="h-11 text-base"
              {...register("minSeconds")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pj-max">Maximum seconds</Label>
            <Input
              id="pj-max"
              type="number"
              min={1}
              className="h-11 text-base"
              {...register("maxSeconds")}
            />
            <Err message={errors.maxSeconds?.message} />
          </div>
        </div>
        <Footer
          onClose={onClose}
          busy={save.isPending}
          label={row ? "Save timing" : "Add timing"}
        />
      </form>
    </Shell>
  );
}
