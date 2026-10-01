/** TanStack Query keys, one place so mutations can invalidate the right lists. */
export const qk = {
  me: ["me"] as const,
  demoAccounts: ["demo-accounts"] as const,
  tasks: ["tasks"] as const,
  notifications: ["notifications"] as const,
  devStatus: ["dev-status"] as const,
};
