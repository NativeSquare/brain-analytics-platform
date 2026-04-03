"use client";

import { useQuery } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { getDictionary, type Dictionary, type Locale } from "@/lib/i18n";

export function useTranslation(): { t: Dictionary; locale: Locale } {
  const user = useQuery(api.users.queries.currentUserProfile);
  const locale: Locale =
    user?.preferredLanguage === "it" || user?.preferredLanguage === "en"
      ? user.preferredLanguage
      : "en";
  return { t: getDictionary(locale), locale };
}
