import { createStore, type StoreApi } from "zustand/vanilla";
import { persist, createJSONStorage } from "zustand/middleware";
import { can, type Actor } from "../../permissions/can";
import { AppError } from "../../services/errors";
import { setClockSource, now } from "../../time/clock";
import type { Member } from "../../domain/types";
import { createSeed } from "./seed";
import type { MockData } from "./state";
import { tick } from "./tick";

export type MockStore = StoreApi<MockData>;

/** Bump the suffix when the seed shape changes (mock-data.md section 1). */
export const STORAGE_KEY = "clubhub.mock.v1";
const DEFAULT_MOCK_NOW = "2026-10-01T18:00:00+05:30";

export function mockStartMs(): number {
  return Date.parse(process.env.NEXT_PUBLIC_MOCK_NOW ?? DEFAULT_MOCK_NOW);
}

/** Store without persistence; tests and server rendering use this. */
export function createMockStore(startMs = mockStartMs()): MockStore {
  return createStore<MockData>()(() => createSeed(startMs));
}

/** Browser store persisted to localStorage; other tabs rehydrate through the `storage` event. */
export function createPersistedMockStore(startMs = mockStartMs()): MockStore {
  const store = createStore<MockData>()(
    persist(() => createSeed(startMs), {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    }),
  );
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY)
      void (
        store as unknown as { persist: { rehydrate: () => void } }
      ).persist.rehydrate();
  });
  return store;
}

/**
 * Atomic update (R-09): fn runs on a copy inside one synchronous step; nothing is written if it throws.
 * An update that changed nothing is not written, so reads that run the time-based jobs do not wake
 * every store subscriber (which would refetch, run the jobs again, and loop).
 */
export function mutate<T>(store: MockStore, fn: (draft: MockData) => T): T {
  const before = store.getState();
  const draft = structuredClone(before);
  const out = fn(draft);
  // ponytail: whole-store JSON compare is fine at demo size; track dirty slices if the seed grows a lot.
  if (JSON.stringify(draft) !== JSON.stringify(before))
    store.setState(draft, true);
  return out;
}

export interface MockOptions {
  /** Fixed delay in ms, or [min, max]. Default 150 to 400 (rules.md Part B rule 10). */
  delayMs?: number | [number, number];
  /** Override the clock (ms since epoch); tests use this to stand still. */
  clock?: () => number;
}

export interface Ctx {
  store: MockStore;
  /** Wraps a service method: delay, "Simulate error", then the synchronous body. */
  call<T>(
    fn: (sessionId: string | null) => T,
    opts?: { bypassError?: boolean },
  ): Promise<T>;
}

export function createCtx(store: MockStore, opts: MockOptions = {}): Ctx {
  const loadedAt = Date.now();
  const startMs = mockStartMs();
  setClockSource(
    opts.clock ??
      (() =>
        startMs + (Date.now() - loadedAt) + store.getState().dev.clockJumpMs),
  );
  const wait = () => {
    const d = opts.delayMs ?? [150, 400];
    const ms = typeof d === "number" ? d : d[0] + Math.random() * (d[1] - d[0]);
    return ms > 0
      ? new Promise<void>((r) => setTimeout(r, ms))
      : Promise.resolve();
  };
  return {
    store,
    // The caller's session is captured when the request is sent, like a cookie on a real request.
    async call<T>(
      fn: (sessionId: string | null) => T,
      o: { bypassError?: boolean } = {},
    ): Promise<T> {
      const sessionId = store.getState().session.memberId;
      await wait();
      if (!o.bypassError && store.getState().dev.simulateError)
        throw new AppError("INTERNAL", "Something went wrong. Try again.");
      return fn(sessionId);
    },
  };
}

/** Runs the time-based rules against the current clock, atomically. */
export function runTick(store: MockStore): void {
  mutate(store, (d) => tick(d, now()));
}

export { tick } from "./tick";
export function actorOf(d: MockData, memberId: string): Actor {
  const m = d.members.find((x) => x.id === memberId)!;
  const position = d.positions.find((p) => p.memberId === m.id)?.code ?? null;
  return { id: m.id, accountType: m.accountType, position };
}

/** The signed-in member, or UNAUTHENTICATED. */
export function me(
  d: MockData,
  sessionId: string | null,
): { member: Member; actor: Actor } {
  const id = sessionId;
  const member = id ? d.members.find((m) => m.id === id) : undefined;
  if (!member || member.status !== "active")
    throw new AppError("UNAUTHENTICATED", "Please sign in.");
  return { member, actor: actorOf(d, member.id) };
}

/** can() wrapper that throws FORBIDDEN (schema.md section 6). */
export function assertCan(
  actor: Actor,
  action: Parameters<typeof can>[1],
  res?: Parameters<typeof can>[2],
): void {
  if (!can(actor, action, res))
    throw new AppError("FORBIDDEN", "You do not have access to this.");
}
