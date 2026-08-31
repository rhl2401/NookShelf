import type { ReactElement } from "react";
import { DialogTrigger } from "@/components/ui/dialog";

/**
 * Renders a fully-formed element (e.g. `<Button><Plus /> New role</Button>`)
 * as a Dialog's trigger. Passing that element straight to `render` composes
 * two Base UI components (DialogTrigger + Button) and both independently set
 * `data-slot`, which causes a server/client hydration mismatch on that
 * attribute. Rendering a plain `<span>` as the actual `render` target avoids
 * the collision — DialogTrigger's props merge onto a host element instead of
 * another component, and the trigger's own markup renders as its children.
 */
export function DialogTriggerButton({ trigger }: { trigger: ReactElement }) {
  return (
    <DialogTrigger nativeButton={false} render={<span className="contents" />}>
      {trigger}
    </DialogTrigger>
  );
}
