import { Button } from "@jmurga97/components/button";
import { cn } from "@jmurga97/components/cn";

import type { ButtonProps } from "@jmurga97/components/button";

interface LinkButtonProps extends Omit<ButtonProps, "render" | "nativeButton" | "type"> {
  href: string;
}

/** A Ming button that stays a link, rendered on the server with no client JavaScript. */
export function LinkButton({ href, className, ...props }: LinkButtonProps) {
  return <Button nativeButton={false} render={<a href={href} />} className={cn("link-button", className)} {...props} />;
}
