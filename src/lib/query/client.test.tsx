import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { makeQueryClient } from "./client";
import { useAction } from "@/hooks/useAction";

const toasts = vi.hoisted(() => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn() }),
}));
vi.mock("sonner", () => toasts);

function wrap(client = makeQueryClient(false)) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

beforeEach(() => toasts.toast.error.mockReset());

describe("failed writes", () => {
  it("show an error toast without the caller doing anything", async () => {
    const { result } = renderHook(
      () => useAction(() => Promise.reject(new Error("Nope"))),
      { wrapper: wrap() },
    );
    result.current.mutate(undefined);
    await waitFor(() =>
      expect(toasts.toast.error).toHaveBeenCalledWith("Nope"),
    );
  });

  it("stay quiet when the screen explains the failure itself (meta.silent)", async () => {
    const { result } = renderHook(
      () =>
        useAction(() => Promise.reject(new Error("Nope")), undefined, {
          silent: true,
        }),
      { wrapper: wrap() },
    );
    result.current.mutate(undefined);
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(toasts.toast.error).not.toHaveBeenCalled();
  });
});
