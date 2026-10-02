"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { timerCard, timerThresholds } from "@/lib/domain/rules/timerCard";
import type {
  AhCounterPayload,
  GrammarianPayload,
  SummaryPayload,
  TimerPayload,
} from "@/lib/domain/types";
import type { ReportItem, SpeakerLine } from "@/lib/services";
import { formatSeconds, parseMmSs } from "@/lib/time/ist";
import { useSaveReport, useSubmitReport } from "@/hooks/useReports";
import { TimerCardPill } from "./TimerCardPill";

interface FormProps {
  item: ReportItem;
  speakers: SpeakerLine[];
  names: Record<string, string>;
  graceSeconds: number;
  wordOfTheDay: string | null;
  locked: boolean;
}

/** Draft and Submit, shared by every form. The author may keep editing until the meeting is Completed (A7). */
function Actions({
  item,
  payload,
  locked,
  valid = true,
}: {
  item: ReportItem;
  payload: () => Parameters<
    ReturnType<typeof useSaveReport>["mutate"]
  >[0]["payload"];
  locked: boolean;
  valid?: boolean;
}) {
  const save = useSaveReport();
  const submit = useSubmitReport();
  const busy = save.isPending || submit.isPending;
  if (locked) return null;
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        disabled={busy || !valid}
        onClick={() => save.mutate({ slotId: item.slotId, payload: payload() })}
      >
        {save.isPending ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : null}
        Save draft
      </Button>
      <Button
        type="button"
        disabled={busy || !valid}
        onClick={() =>
          submit.mutate({ slotId: item.slotId, payload: payload() })
        }
      >
        {submit.isPending ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : null}
        {item.status === "submitted" ? "Resubmit" : "Submit report"}
      </Button>
    </div>
  );
}

/** Timer: one row per speaker, mm:ss in, live card out (R-04). */
export function TimerForm(p: FormProps) {
  const saved = (p.item.payload as TimerPayload | null)?.rows ?? [];
  const [text, setText] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      p.speakers.map((s) => [
        s.slotId,
        saved.find((r) => r.speakerSlotId === s.slotId)
          ? formatSeconds(
              saved.find((r) => r.speakerSlotId === s.slotId)!.seconds,
            )
          : "",
      ]),
    ),
  );
  const rows = p.speakers.map((s) => ({
    s,
    seconds: parseMmSs(text[s.slotId] ?? ""),
    raw: text[s.slotId] ?? "",
  }));
  const bad = rows.some((r) => r.raw.trim() !== "" && r.seconds === null);

  return (
    <div className="space-y-4">
      {p.speakers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          This meeting has no speakers to time.
        </p>
      ) : null}
      <ul className="divide-y divide-border">
        {rows.map(({ s, seconds, raw }) => {
          const limits = s.minSeconds != null && s.maxSeconds != null;
          const id = `timer-${s.slotId}`;
          const th = limits
            ? timerThresholds(s.minSeconds!, s.maxSeconds!, p.graceSeconds)
            : null;
          return (
            <li key={s.slotId} className="space-y-2 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-40 flex-1">
                  <p className="font-medium">{s.name ?? s.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.label}
                    {limits
                      ? ` · allowed ${formatSeconds(s.minSeconds!)} to ${formatSeconds(s.maxSeconds!)}`
                      : ""}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={id} className="sr-only">
                    Time for {s.name ?? s.label}
                  </Label>
                  <Input
                    id={id}
                    value={raw}
                    placeholder="m:ss"
                    inputMode="numeric"
                    disabled={p.locked}
                    aria-invalid={
                      raw.trim() !== "" && seconds === null ? true : undefined
                    }
                    onChange={(e) =>
                      setText((t) => ({ ...t, [s.slotId]: e.target.value }))
                    }
                    className="h-11 w-24 text-base"
                  />
                </div>
                <div className="w-32" aria-live="polite">
                  {seconds !== null ? (
                    <TimerCardPill
                      card={
                        limits
                          ? timerCard(
                              seconds,
                              s.minSeconds!,
                              s.maxSeconds!,
                              p.graceSeconds,
                            )
                          : "none"
                      }
                    />
                  ) : null}
                </div>
              </div>
              {th ? (
                <p className="text-xs text-muted-foreground">
                  Green from {formatSeconds(th.green)}, yellow from{" "}
                  {formatSeconds(th.yellow)}, red from {formatSeconds(th.red)}.
                  Qualifies from {formatSeconds(th.qualifiesFrom)} to{" "}
                  {formatSeconds(th.qualifiesTo)}.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Set project timings to score this speech. You can still enter
                  the time.
                </p>
              )}
              {raw.trim() !== "" && seconds === null ? (
                <p className="text-sm text-danger">
                  Enter the time as m:ss, for example 5:20.
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
      <Actions
        item={p.item}
        locked={p.locked}
        valid={!bad}
        payload={() => ({
          rows: rows
            .filter((r) => r.seconds !== null)
            .map((r) => ({ speakerSlotId: r.s.slotId, seconds: r.seconds! })),
        })}
      />
    </div>
  );
}

/** Ah-Counter: a total per speaker, with an optional breakdown by word. */
export function AhCounterForm(p: FormProps) {
  const saved = (p.item.payload as AhCounterPayload | null)?.rows ?? [];
  const speakers = p.speakers.filter((s) => s.memberId);
  const [totals, setTotals] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      speakers.map((s) => [
        s.memberId!,
        String(saved.find((r) => r.memberId === s.memberId)?.total ?? ""),
      ]),
    ),
  );
  const [words, setWords] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      speakers.map((s) => [
        s.memberId!,
        Object.entries(
          saved.find((r) => r.memberId === s.memberId)?.breakdown ?? {},
        )
          .map(([w, n]) => `${w} ${n}`)
          .join(", "),
      ]),
    ),
  );
  const num = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v) : null);
  /** "um 4, so 2" -> { um: 4, so: 2 }; anything that is not "word count" is rejected. */
  const parseWords = (v: string): Record<string, number> | null => {
    const out: Record<string, number> = {};
    for (const part of v
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)) {
      const m = part.match(/^(.+?)\s+(\d+)$/);
      if (!m) return null;
      out[m[1].trim()] = Number(m[2]);
    }
    return out;
  };
  const bad =
    speakers.some(
      (s) =>
        (totals[s.memberId!] ?? "").trim() !== "" &&
        num(totals[s.memberId!]) === null,
    ) || speakers.some((s) => parseWords(words[s.memberId!] ?? "") === null);

  return (
    <div className="space-y-4">
      {speakers.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          This meeting has no speakers to count.
        </p>
      ) : null}
      <ul className="divide-y divide-border">
        {speakers.map((s) => {
          const id = s.memberId!;
          return (
            <li key={s.slotId} className="space-y-2 py-3">
              <div className="flex flex-wrap items-end gap-3">
                <p className="min-w-40 flex-1 font-medium">{s.name}</p>
                <div className="space-y-1">
                  <Label htmlFor={`ah-${id}`}>Filler words</Label>
                  <Input
                    id={`ah-${id}`}
                    value={totals[id] ?? ""}
                    inputMode="numeric"
                    disabled={p.locked}
                    onChange={(e) =>
                      setTotals((t) => ({ ...t, [id]: e.target.value }))
                    }
                    className="h-11 w-24 text-base"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor={`ahw-${id}`}>Breakdown (optional)</Label>
                <Input
                  id={`ahw-${id}`}
                  value={words[id] ?? ""}
                  placeholder="um 4, so 2, like 1"
                  disabled={p.locked}
                  aria-invalid={
                    parseWords(words[id] ?? "") === null ? true : undefined
                  }
                  onChange={(e) =>
                    setWords((t) => ({ ...t, [id]: e.target.value }))
                  }
                  className="h-11 text-base"
                />
                {parseWords(words[id] ?? "") === null ? (
                  <p className="text-sm text-danger">
                    Write each word and its count, like &ldquo;um 4, so
                    2&rdquo;.
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      <Actions
        item={p.item}
        locked={p.locked}
        valid={!bad}
        payload={() => ({
          rows: speakers
            .filter((s) => num(totals[s.memberId!] ?? "") !== null)
            .map((s) => {
              const breakdown = parseWords(words[s.memberId!] ?? "") ?? {};
              return {
                memberId: s.memberId!,
                total: num(totals[s.memberId!])!,
                ...(Object.keys(breakdown).length ? { breakdown } : {}),
              };
            }),
        })}
      />
    </div>
  );
}

/** Grammarian: word-of-the-day use, good language, improvements. */
export function GrammarianForm(p: FormProps) {
  const saved = p.item.payload as GrammarianPayload | null;
  const speakers = p.speakers.filter((s) => s.memberId);
  const [usage, setUsage] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      speakers.map((s) => [
        s.memberId!,
        String(
          saved?.wordOfDayUsage.find((u) => u.memberId === s.memberId)?.count ??
            "",
        ),
      ]),
    ),
  );
  const [good, setGood] = useState(saved?.goodLanguage ?? "");
  const [improve, setImprove] = useState(saved?.improvements ?? "");
  const num = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v) : null);
  const bad = speakers.some(
    (s) =>
      (usage[s.memberId!] ?? "").trim() !== "" &&
      num(usage[s.memberId!]) === null,
  );

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">
          {p.wordOfTheDay
            ? `Times each speaker used “${p.wordOfTheDay}”`
            : "Word of the day use"}
        </legend>
        {speakers.map((s) => (
          <div key={s.slotId} className="flex items-center gap-3">
            <Label htmlFor={`gw-${s.memberId}`} className="flex-1 font-normal">
              {s.name}
            </Label>
            <Input
              id={`gw-${s.memberId}`}
              value={usage[s.memberId!] ?? ""}
              inputMode="numeric"
              disabled={p.locked}
              onChange={(e) =>
                setUsage((u) => ({ ...u, [s.memberId!]: e.target.value }))
              }
              className="h-11 w-20 text-base"
            />
          </div>
        ))}
      </fieldset>
      <div className="space-y-1.5">
        <Label htmlFor="g-good">Good language</Label>
        <Textarea
          id="g-good"
          value={good}
          disabled={p.locked}
          onChange={(e) => setGood(e.target.value)}
          className="text-base"
        />
        <p className="text-xs text-muted-foreground">
          One phrase per line or separated by semicolons.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="g-improve">Improvements</Label>
        <Textarea
          id="g-improve"
          value={improve}
          disabled={p.locked}
          onChange={(e) => setImprove(e.target.value)}
          className="text-base"
        />
      </div>
      <Actions
        item={p.item}
        locked={p.locked}
        valid={!bad}
        payload={() => ({
          wordOfDayUsage: speakers
            .filter((s) => num(usage[s.memberId!] ?? "") !== null)
            .map((s) => ({
              memberId: s.memberId!,
              count: num(usage[s.memberId!])!,
            })),
          goodLanguage: good,
          improvements: improve,
        })}
      />
    </div>
  );
}

/** Table Topics Master and General Evaluator: a short summary. */
export function SummaryForm(p: FormProps) {
  const [text, setText] = useState(
    (p.item.payload as SummaryPayload | null)?.summary ?? "",
  );
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor={`sum-${p.item.slotId}`}>Summary</Label>
        <Textarea
          id={`sum-${p.item.slotId}`}
          value={text}
          maxLength={2000}
          disabled={p.locked}
          onChange={(e) => setText(e.target.value)}
          className="min-h-28 text-base"
        />
      </div>
      <Actions
        item={p.item}
        locked={p.locked}
        payload={() => ({ summary: text })}
      />
    </div>
  );
}
