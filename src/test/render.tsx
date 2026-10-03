import { render } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { makeQueryClient } from "@/lib/query/client";

/** Render with a fresh query cache and no retries. */
export function renderWithQuery(ui: React.ReactElement) {
  const client = makeQueryClient(false);
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}
