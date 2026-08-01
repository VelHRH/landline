import { ButtonVariant } from "./button-variant";

export const variantClasses: Record<ButtonVariant, string> = {
  [ButtonVariant.PRIMARY]:
    "rounded-md px-4 py-2.5 bg-primary text-primary-foreground hover:shadow-glow active:scale-[0.98]",
  [ButtonVariant.SECONDARY]:
    "rounded-md px-4 py-2.5 border border-border bg-secondary text-secondary-foreground hover:bg-accent",
  [ButtonVariant.TERTIARY]:
    "rounded-md px-4 py-2.5 bg-tertiary text-tertiary-foreground hover:brightness-105 active:scale-[0.98]",
  [ButtonVariant.LINK]:
    "text-caption text-muted-foreground underline-offset-4 hover:text-foreground hover:underline rounded-sm",
};
