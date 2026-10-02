import { AppError } from "../../services/errors";
import type { SettingsService } from "../../services/interfaces";
import {
  LOCKED_NOTIF_CODES,
  NOTIF_CODES,
  NOTIF_LABELS,
} from "../../domain/constants";
import type { NotifCode } from "../../domain/types";
import { clubSettingsInput } from "../../domain/schemas";
import { now } from "../../time/clock";
import { assertCan, me, mutate, type Ctx } from "./runtime";
import { log } from "./helpers";

const locked = (c: NotifCode) =>
  (LOCKED_NOTIF_CODES as readonly string[]).includes(c);

export function settingsService({ store, call }: Ctx): SettingsService {
  return {
    getClub: () =>
      call((sid) => {
        const d = store.getState();
        me(d, sid);
        return { ...d.settings };
      }),
    updateClub: (raw) =>
      call((sid) =>
        mutate(store, (d) => {
          const { actor } = me(d, sid);
          assertCan(actor, "settings.club.edit");
          const r = clubSettingsInput.safeParse(raw);
          if (!r.success) {
            const fields = Object.fromEntries(
              r.error.issues.map((i) => [
                String(i.path[0] ?? "form"),
                i.message,
              ]),
            );
            throw new AppError(
              "VALIDATION",
              Object.values(fields)[0] ?? "Check the form.",
              { fields },
            );
          }
          const before: Record<string, unknown> = {};
          const after: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(r.data) as [
            keyof typeof r.data,
            unknown,
          ][]) {
            if (d.settings[k] !== v) {
              before[k] = d.settings[k];
              after[k] = v;
              (d.settings[k] as unknown) = v;
            }
          }
          if (Object.keys(after).length)
            log(
              d,
              now(),
              actor.id,
              "settings.change",
              "club_settings",
              "club",
              before,
              after,
            );
          return { ...d.settings };
        }),
      ),
    notificationPrefs: () =>
      call((sid) => {
        const d = store.getState();
        const { member } = me(d, sid);
        return NOTIF_CODES.map((code) => ({
          code,
          label: NOTIF_LABELS[code],
          locked: locked(code),
          // default is on; only an explicit opt-out row turns a non-locked type off
          enabled:
            locked(code) ||
            !d.notifPrefs.some(
              (p) => p.memberId === member.id && p.code === code && !p.enabled,
            ),
        }));
      }),
    savePrefs: (changes) =>
      call((sid) =>
        mutate(store, (d) => {
          const { member } = me(d, sid);
          for (const [code, enabled] of Object.entries(changes) as [
            NotifCode,
            boolean,
          ][]) {
            if (!(NOTIF_CODES as readonly string[]).includes(code))
              throw new AppError("VALIDATION", "Unknown notification type.");
            if (locked(code) && enabled === false)
              throw new AppError(
                "VALIDATION",
                `${NOTIF_LABELS[code]} cannot be switched off.`,
                {
                  fields: {
                    [code]: "This notification cannot be switched off.",
                  },
                },
              );
            d.notifPrefs = d.notifPrefs.filter(
              (p) => !(p.memberId === member.id && p.code === code),
            );
            if (enabled === false)
              d.notifPrefs.push({ memberId: member.id, code, enabled: false });
          }
        }),
      ),
  };
}
