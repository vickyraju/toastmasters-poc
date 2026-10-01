import {
  BadgeCheck,
  Calendar,
  Download,
  House,
  ListChecks,
  ScrollText,
  TrendingUp,
  Users,
  UsersRound,
  Vote,
  type LucideIcon,
} from "lucide-react";
import type { NavIcon } from "@/lib/permissions/routes";

export const NAV_ICONS: Record<NavIcon, LucideIcon> = {
  house: House,
  calendar: Calendar,
  "list-checks": ListChecks,
  "trending-up": TrendingUp,
  "users-round": UsersRound,
  users: Users,
  vote: Vote,
  "badge-check": BadgeCheck,
  "scroll-text": ScrollText,
  download: Download,
};
