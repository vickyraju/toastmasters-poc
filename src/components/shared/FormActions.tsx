import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Save is on only when something changed; Discard puts the saved values back. */
export function FormActions({
  dirty,
  saving,
  onDiscard,
  saveLabel = "Save Changes",
}: {
  dirty: boolean;
  saving: boolean;
  onDiscard: () => void;
  saveLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <p
        role="status"
        className="mr-auto text-sm text-muted-foreground max-sm:w-full"
      >
        {dirty ? "You have unsaved changes." : ""}
      </p>
      <Button
        type="button"
        variant="outline"
        disabled={!dirty || saving}
        onClick={onDiscard}
      >
        Discard
      </Button>
      <Button type="submit" disabled={!dirty || saving}>
        {saving ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : null}
        {saving ? "Saving…" : saveLabel}
      </Button>
    </div>
  );
}
