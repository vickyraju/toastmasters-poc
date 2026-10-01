/** Opaque id for records created at runtime. Seed records use readable fixed ids (mock-data.md section 2). */
export function newId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}
