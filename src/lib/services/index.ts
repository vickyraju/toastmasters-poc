import { createMockServices } from "../adapters/mock";
import type { Services } from "./interfaces";

export * from "./interfaces";
export { AppError } from "./errors";

let instance: Services | null = null;

/** The one place the adapter is chosen (NEXT_PUBLIC_DATA_MODE). Components call this through hooks. */
export function getServices(): Services {
  if (instance) return instance;
  if ((process.env.NEXT_PUBLIC_DATA_MODE ?? "mock") !== "mock") {
    throw new Error("NEXT_PUBLIC_DATA_MODE=api has no adapter yet (Phase 2).");
  }
  instance = createMockServices();
  return instance;
}
