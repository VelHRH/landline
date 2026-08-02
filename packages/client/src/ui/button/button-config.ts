import { ButtonSize } from "./button-size";
import { ButtonVariant } from "./button-variant";

export const buttonBaseClasses =
  "inline-flex min-w-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium select-none motion-safe:transition-[color,background-color,border-color,box-shadow,transform,opacity] motion-safe:duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none";

export const sizeClasses: Record<ButtonSize, string> = {
  [ButtonSize.DEFAULT]: "min-h-10 rounded-sm px-3.5 py-2",
  [ButtonSize.COMPACT]: "min-h-10 rounded-sm px-2.5 py-1.5 text-caption",
};

export const variantClasses: Record<ButtonVariant, string> = {
  [ButtonVariant.PRIMARY]:
    "bg-primary text-primary-foreground shadow-sm hover:shadow-glow active:scale-[0.97] active:shadow-sm",
  [ButtonVariant.SECONDARY]:
    "border border-border bg-secondary text-secondary-foreground shadow-sm hover:border-primary/50 hover:bg-accent active:scale-[0.97] active:bg-muted",
  [ButtonVariant.TERTIARY]:
    "border border-tertiary/40 bg-transparent text-tertiary hover:bg-tertiary hover:text-tertiary-foreground active:scale-[0.97]",
  [ButtonVariant.LINK]:
    "bg-transparent text-caption text-muted-foreground underline-offset-4 hover:text-foreground hover:underline active:opacity-70",
};
