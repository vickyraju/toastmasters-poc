import type { Actor } from "@/lib/permissions/can";
import { canOpen, NAV_ITEMS, type NavItem } from "@/lib/permissions/routes";

export const allowedNav = (actor: Actor): NavItem[] =>
  NAV_ITEMS.filter((i) => canOpen(actor, i.href));

/** The nav item for the current page: the longest href that matches (so /progress/club is not "My progress"). */
export function activeHref(
  pathname: string,
  items: { href: string }[],
): string | null {
  const hits = items.filter(
    (i) => pathname === i.href || pathname.startsWith(`${i.href}/`),
  );
  return hits.sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
}
