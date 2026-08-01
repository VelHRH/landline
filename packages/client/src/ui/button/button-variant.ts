// Button visual variants. A fixed value set, so a string enum (ADR-0004):
// use sites bind :variant="ButtonVariant.SECONDARY" rather than a bare string.
export enum ButtonVariant {
  PRIMARY = "PRIMARY",
  SECONDARY = "SECONDARY",
  TERTIARY = "TERTIARY",
  LINK = "LINK",
}
