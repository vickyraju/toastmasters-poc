import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest globals are off, so Testing Library cannot register its own cleanup.
afterEach(() => cleanup());

// jsdom has no layout, so scrolling is a no-op.
Element.prototype.scrollIntoView = () => {};

// jsdom has no ResizeObserver; Radix (Switch, Tabs) measures with it.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
