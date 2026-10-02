import type { Services } from "../../services/interfaces";
import {
  auditService,
  authService,
  devService,
  notificationsService,
  tasksService,
} from "./core.service";
import { meetingsService } from "./meetings.service";
import { membersService, positionsService } from "./members.service";
import { templatesService } from "./templates.service";
import { progressService } from "./progress.service";
import { reportsService } from "./reports.service";
import { rolesService } from "./roles.service";
import { votesService } from "./votes.service";
import {
  createCtx,
  createMockStore,
  createPersistedMockStore,
  runTick,
  type MockOptions,
  type MockStore,
} from "./runtime";

export type { MockStore } from "./runtime";

/** Mock implementation of every service. Pass `store` to share state (tests); otherwise the browser store persists. */
export function createMockServices(
  opts: MockOptions & { store?: MockStore } = {},
): Services {
  const store =
    opts.store ??
    (typeof window === "undefined"
      ? createMockStore()
      : createPersistedMockStore());
  const ctx = createCtx(store, opts);
  runTick(store); // catch the time-based rules up to the clock
  return {
    auth: authService(ctx),
    meetings: meetingsService(ctx),
    roles: rolesService(ctx),
    tasks: tasksService(ctx),
    notifications: notificationsService(ctx),
    progress: progressService(ctx),
    votes: votesService(ctx),
    members: membersService(ctx),
    positions: positionsService(ctx),
    templates: templatesService(ctx),
    reports: reportsService(ctx),
    audit: auditService(ctx),
    dev: devService(ctx),
  };
}
export { createMockStore };
