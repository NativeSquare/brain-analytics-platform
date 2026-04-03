export type { Dictionary } from "./dictionaries/en";
export { en } from "./dictionaries/en";
export { it } from "./dictionaries/it";

import { en } from "./dictionaries/en";
import { it } from "./dictionaries/it";
import type { Dictionary } from "./dictionaries/en";

export type Locale = "en" | "it";

export function getDictionary(locale: Locale): Dictionary {
  return locale === "it" ? it : en;
}
