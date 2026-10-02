import { Card } from "@/components/shared/Card";
import type {
  AhCounterPayload,
  GrammarianPayload,
  SummaryPayload,
  TimerPayload,
} from "@/lib/domain/types";
import type { MeetingReportsView, ReportItem } from "@/lib/services";
import { formatSeconds } from "@/lib/time/ist";
import { TimerCardPill } from "./TimerCardPill";

/** One line per phrase: newline or semicolon separated. */
const phrases = (text: string) =>
  text
    .split(/[\n;]/)
    .map((x) => x.trim())
    .filter(Boolean);

const Unsubmitted = () => (
  <p className="text-sm text-muted-foreground">Not submitted.</p>
);

/** Read-only report for a Completed meeting (S-04 Reports, state C). */
export function ConsolidatedReport({ view }: { view: MeetingReportsView }) {
  const by = (kind: string) =>
    view.items.find((i) => i.kind === kind) as ReportItem | undefined;
  const timer = by("timer");
  const ah = by("ah_counter");
  const gram = by("grammarian");
  const topics = by("table_topics");
  const general = by("general_evaluator");
  const submitted = (i?: ReportItem) =>
    i?.status === "submitted" ? i.payload : null;
  const nameOf = (id: string) => view.names[id] ?? "A member";

  const timerRows = (submitted(timer) as TimerPayload | null)?.rows ?? [];
  const ahRows = (submitted(ah) as AhCounterPayload | null)?.rows ?? [];
  const gr = submitted(gram) as GrammarianPayload | null;
  const totals: Record<string, number> = {};
  for (const r of ahRows)
    for (const [w, n] of Object.entries(r.breakdown ?? {}))
      totals[w] = (totals[w] ?? 0) + n;
  const ahTotal = ahRows.reduce((n, r) => n + r.total, 0);
  const byBreakdown = Object.values(totals).reduce((n, v) => n + v, 0);

  return (
    <div className="space-y-4">
      <Card title={`Timer${timer?.holder ? ` (${timer.holder.name})` : ""}`}>
        {timerRows.length ? (
          <table className="w-full text-left text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Speaker
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Time
                </th>
                <th scope="col" className="py-2 font-medium">
                  Card
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {timerRows.map((r) => {
                const line = view.speakers.find(
                  (s) => s.slotId === r.speakerSlotId,
                );
                return (
                  <tr key={r.speakerSlotId}>
                    <td className="py-2 pr-4">
                      {line?.name ?? line?.label ?? "Speaker"}
                      {line?.minSeconds != null && line.maxSeconds != null ? (
                        <span className="block text-xs text-muted-foreground">
                          Allowed {formatSeconds(line.minSeconds)} to{" "}
                          {formatSeconds(line.maxSeconds)}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {formatSeconds(r.seconds)}
                    </td>
                    <td className="py-2">
                      <TimerCardPill card={r.card} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <Unsubmitted />
        )}
      </Card>

      <Card title={`Ah-Counter${ah?.holder ? ` (${ah.holder.name})` : ""}`}>
        {ahRows.length ? (
          <div className="space-y-3">
            <p className="font-medium">{ahTotal} filler words in total</p>
            {byBreakdown > 0 ? (
              <ul className="flex flex-wrap gap-2 text-sm">
                {Object.entries(totals).map(([w, n]) => (
                  <li
                    key={w}
                    className="rounded-full bg-primary-soft px-3 py-1"
                  >
                    {w === "other" ? "other" : `“${w}”`} {n}
                  </li>
                ))}
                {ahTotal > byBreakdown ? (
                  <li className="rounded-full bg-primary-soft px-3 py-1">
                    other {ahTotal - byBreakdown}
                  </li>
                ) : null}
              </ul>
            ) : null}
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-border">
                {ahRows.map((r) => (
                  <tr key={r.memberId}>
                    <td className="py-2 pr-4">{nameOf(r.memberId)}</td>
                    <td className="py-2">{r.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Unsubmitted />
        )}
      </Card>

      <Card title={`Grammarian${gram?.holder ? ` (${gram.holder.name})` : ""}`}>
        {gr ? (
          <div className="space-y-3 text-sm">
            <p>
              {view.wordOfTheDay
                ? `“${view.wordOfTheDay}” was used `
                : "The word of the day was used "}
              <span className="font-medium">
                {gr.wordOfDayUsage.reduce((n, u) => n + u.count, 0)} times by{" "}
                {gr.wordOfDayUsage.filter((u) => u.count > 0).length} people
              </span>
              .
            </p>
            <div>
              <h3 className="font-medium">Good language</h3>
              {phrases(gr.goodLanguage).length ? (
                <ul className="list-disc pl-5">
                  {phrases(gr.goodLanguage).map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">None recorded.</p>
              )}
            </div>
            <div>
              <h3 className="font-medium">Improvements</h3>
              {phrases(gr.improvements).length ? (
                <ul className="list-disc pl-5">
                  {phrases(gr.improvements).map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">None recorded.</p>
              )}
            </div>
          </div>
        ) : (
          <Unsubmitted />
        )}
      </Card>

      {[
        ["Table Topics", topics],
        ["General Evaluator", general],
      ].map(([title, item]) => {
        const it = item as ReportItem | undefined;
        const p = submitted(it) as SummaryPayload | null;
        return (
          <Card
            key={title as string}
            title={`${title as string}${it?.holder ? ` (${it.holder.name})` : ""}`}
          >
            {p ? (
              <p className="text-sm whitespace-pre-wrap">{p.summary}</p>
            ) : (
              <Unsubmitted />
            )}
          </Card>
        );
      })}
    </div>
  );
}
