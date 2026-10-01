// Who can open which route (flow.md section 2) and the sidebar items (design.md section 3).
// The nav and the G-05 guard both read this, and every check goes through can().
import { can, type Actor } from "./can";

export type NavGroup = "my" | "manage" | "admin";
export type NavIcon =
  | "house"
  | "calendar"
  | "list-checks"
  | "trending-up"
  | "users-round"
  | "users"
  | "vote"
  | "badge-check"
  | "scroll-text"
  | "download";

export interface NavItem {
  href: string;
  label: string;
  group: NavGroup;
  icon: NavIcon;
}

export const NAV_GROUP_LABELS: Record<NavGroup, string> = {
  my: "My club",
  manage: "Manage",
  admin: "Admin",
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/home", label: "Home", group: "my", icon: "house" },
  { href: "/meetings", label: "Meetings", group: "my", icon: "calendar" },
  { href: "/tasks", label: "My tasks", group: "my", icon: "list-checks" },
  { href: "/progress", label: "My progress", group: "my", icon: "trending-up" },
  {
    href: "/progress/club",
    label: "Club progress",
    group: "manage",
    icon: "users-round",
  },
  { href: "/members", label: "Members", group: "manage", icon: "users" },
  { href: "/votes", label: "Votes", group: "manage", icon: "vote" },
  { href: "/audit", label: "Audit log", group: "manage", icon: "scroll-text" },
  { href: "/export", label: "Export", group: "manage", icon: "download" },
  {
    href: "/positions",
    label: "Positions",
    group: "admin",
    icon: "badge-check",
  },
];

interface RouteRule {
  pattern: RegExp;
  title: string;
  allow: (actor: Actor, match: RegExpMatchArray) => boolean;
}

const everyone = () => true;

// First match wins, so specific paths come before their parents.
const RULES: RouteRule[] = [
  { pattern: /^\/home$/, title: "Home", allow: everyone },
  { pattern: /^\/meetings$/, title: "Meetings", allow: everyone },
  {
    pattern: /^\/meetings\/new$/,
    title: "New meeting",
    allow: (a) => can(a, "meeting.create"),
  },
  {
    pattern: /^\/meetings\/templates$/,
    title: "Templates",
    allow: (a) => can(a, "template.edit"),
  },
  {
    pattern: /^\/meetings\/[^/]+\/edit$/,
    title: "Edit meeting",
    allow: (a) => can(a, "meeting.update"),
  },
  // Draft meetings are checked against the data on the page itself (R-18)
  { pattern: /^\/meetings\/[^/]+$/, title: "Meeting", allow: everyone },
  { pattern: /^\/tasks$/, title: "My tasks", allow: everyone },
  { pattern: /^\/notifications$/, title: "Notifications", allow: everyone },
  { pattern: /^\/progress$/, title: "My progress", allow: everyone },
  {
    pattern: /^\/progress\/club$/,
    title: "Club progress",
    allow: (a) => can(a, "club_progress.view"),
  },
  {
    pattern: /^\/members$/,
    title: "Members",
    allow: (a) => can(a, "member.view_directory"),
  },
  {
    pattern: /^\/members\/([^/]+)$/,
    title: "Member profile",
    allow: (a, m) => m[1] === a.id || can(a, "member.view_directory"),
  },
  {
    pattern: /^\/positions$/,
    title: "Positions",
    allow: (a) => can(a, "position.assign"),
  },
  {
    pattern: /^\/votes$/,
    title: "Votes",
    allow: (a) => can(a, "vote.view_turnout"),
  },
  {
    pattern: /^\/votes\/[^/]+$/,
    title: "Vote",
    allow: (a) => can(a, "vote.view_turnout"),
  },
  {
    pattern: /^\/audit$/,
    title: "Audit log",
    allow: (a) => can(a, "audit.view"),
  },
  {
    pattern: /^\/export$/,
    title: "Export",
    allow: (a) => can(a, "export.run"),
  },
  { pattern: /^\/settings$/, title: "Settings", allow: everyone },
  { pattern: /^\/dev$/, title: "Dev panel", allow: everyone },
];

const clean = (path: string) =>
  path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";

function match(path: string): [RouteRule, RegExpMatchArray] | null {
  const p = clean(path);
  for (const r of RULES) {
    const m = p.match(r.pattern);
    if (m) return [r, m];
  }
  return null;
}

/** Whether `actor` may open `path`. Unknown paths are allowed; Next.js shows its not-found page. */
export function canOpen(actor: Actor, path: string): boolean {
  const hit = match(path);
  return hit ? hit[0].allow(actor, hit[1]) : true;
}

export function titleFor(path: string): string {
  return match(path)?.[0].title ?? "Club Hub";
}

/** Only same-site paths are allowed as a post-login return target (no open redirect). */
export function safeNext(next: string | null | undefined): string {
  return next &&
    next.startsWith("/") &&
    !next.startsWith("//") &&
    !next.startsWith("/\\")
    ? next
    : "/home";
}
