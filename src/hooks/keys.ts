/** TanStack Query keys, one place so mutations can invalidate the right lists. */
export const qk = {
  me: ["me"] as const,
  demoAccounts: ["demo-accounts"] as const,
  tasks: ["tasks"] as const,
  notifications: ["notifications"] as const,
  devStatus: ["dev-status"] as const,
  now: ["now"] as const,
  meetings: ["meetings"] as const,
  openForMe: ["open-for-me"] as const,
  pendingWithdrawals: ["pending-withdrawals"] as const,
  verifyQueue: ["verify-queue"] as const,
  myCompletions: ["my-completions"] as const,
  votes: ["votes"] as const,
  positions: ["positions"] as const,
};
