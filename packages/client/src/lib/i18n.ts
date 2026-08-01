import { createI18n } from "vue-i18n";
import { messages } from "./i18n-messages";

type LeafPaths<Value> = {
  [Key in keyof Value & string]: Value[Key] extends string
    ? Key
    : Value[Key] extends Readonly<Record<string, unknown>>
      ? `${Key}.${LeafPaths<Value[Key]>}`
      : never;
}[keyof Value & string];

export type MessageKey = LeafPaths<(typeof messages)["en"]>;

export const i18n = createI18n({
  legacy: false,
  locale: "en",
  fallbackLocale: "en",
  messages,
});

export const translate = (key: MessageKey, named?: Record<string, unknown>): string =>
  i18n.global.t(key, named ?? {});
