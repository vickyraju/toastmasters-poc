import { AppError } from "../../services/errors";
import type { SettingsService } from "../../services/interfaces";
import {
  LOCKED_NOTIF_CODES,
  NOTIF_CODES,
  NOTIF_LABELS,
} from "../../domain/constants";
import type { NotifCode } from "../../domain/types";
import { me, mutate, type Ctx } from "./runtime";

const locked = (c: NotifCode) =>
  (LOCKED_NOTIF_CODES as readonly string[]).includes(c);

export function settingsService({ store, call }: Ctx): SettingsService {
  return {
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
