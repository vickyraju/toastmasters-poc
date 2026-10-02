import { AppError } from "../../services/errors";
import type { MeetingRole } from "../../domain/types";
import type { MockData } from "./state";
import { tmplOf } from "./helpers";

/** Create the slots for a new meeting: `roles` or the meeting type's role list (J-07). */
export function buildSlots(
  d: MockData,
  meetingId: string,
  roles: { roleTemplateId: string; count: number }[],
): MeetingRole[] {
  const slots: MeetingRole[] = [];
  let order = 0;
  for (const { roleTemplateId, count } of roles) {
    const tpl = d.roleTemplates.find((t) => t.id === roleTemplateId);
    if (!tpl) throw new AppError("NOT_FOUND", "Role not found in the catalog.");
    for (let i = 1; i <= count; i++) {
      const suffix = count > 1 ? ` ${i}` : "";
      const base = tpl.code === "tmod" ? "tmod" : tpl.code.replace(/_/g, "-");
      slots.push({
        id: `${meetingId}:${base}${count > 1 ? `-${i}` : ""}`,
        meetingId,
        roleTemplateId,
        label: `${tpl.name}${suffix}`,
        sortOrder: order++,
        memberId: null,
        status: "open",
        isMain: tpl.category === "main",
        assignedBy: null,
        assignedAt: null,
        version: 0,
        evaluatesSlotId: null,
      });
    }
  }
  for (const s of slots) {
    if (tmplOf(d, s).isEvaluator) {
      const n = s.id.split("-").pop();
      s.evaluatesSlotId =
        slots.find(
          (x) => x.id.endsWith(`speaker-${n}`) && tmplOf(d, x).isSpeaker,
        )?.id ?? null;
    }
  }
  return slots;
}
