import { useEffect } from "react";

/** Asks the browser to confirm before the tab closes or reloads while a form has unsaved edits. */
export function useDirtyGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
}
