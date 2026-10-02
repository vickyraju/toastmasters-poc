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
import { Textarea } from "@/components/ui/textarea";
import { usePublishTheme } from "@/hooks/useReports";
import {
  themeInput,
  type ThemeForm,
  type ThemeValues,
} from "@/lib/domain/schemas";
import type { MeetingDetail } from "@/lib/services";

const Err = ({ message }: { message?: string }) =>
  message ? (
    <p role="alert" className="flex items-center gap-1.5 text-sm text-danger">
      <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  ) : null;

/** TMOD or ExComm sets the theme, welcome note and word of the day; publishing notifies every member (N-05). */
export function ThemeEditor({
  meeting: m,
  onClose,
}: {
  meeting: MeetingDetail;
  onClose: () => void;
}) {
  const publish = usePublishTheme();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ThemeForm, unknown, ThemeValues>({
    resolver: zodResolver(themeInput),
    defaultValues: {
      theme: m.theme ?? "",
      welcomeNote: m.welcomeNote ?? "",
      wordOfTheDay: m.wordOfTheDay ?? "",
      wordMeaning: m.wordMeaning ?? "",
    },
  });
  const published = m.themePublishedAt !== null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{published ? "Edit theme" : "Set theme"}</DialogTitle>
          <DialogDescription>
            Publishing tells every member. You can edit it again later.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={handleSubmit((v) =>
            publish.mutate(
              {
                id: m.id,
                input: {
                  theme: v.theme,
                  welcomeNote: v.welcomeNote,
                  wordOfTheDay: v.wordOfTheDay,
                  wordMeaning: v.wordMeaning,
                },
              },
              { onSuccess: onClose },
            ),
          )}
        >
          <div className="space-y-1.5">
            <Label htmlFor="th-theme">Theme</Label>
            <Input
              id="th-theme"
              className="h-11 text-base"
              {...register("theme")}
            />
            <Err message={errors.theme?.message} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="th-note">Welcome note</Label>
            <Textarea
              id="th-note"
              className="text-base"
              {...register("welcomeNote")}
            />
            <Err message={errors.welcomeNote?.message} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="th-word">Word of the day</Label>
              <Input
                id="th-word"
                className="h-11 text-base"
                {...register("wordOfTheDay")}
              />
              <Err message={errors.wordOfTheDay?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="th-meaning">Meaning</Label>
              <Input
                id="th-meaning"
                className="h-11 text-base"
                {...register("wordMeaning")}
              />
              <Err message={errors.wordMeaning?.message} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={publish.isPending || (published && !isDirty)}
            >
              Publish
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
