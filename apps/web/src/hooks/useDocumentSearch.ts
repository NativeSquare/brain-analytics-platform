"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export function useDocumentSearch() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialSearch = searchParams.get("search") ?? "";
  const initialType = searchParams.get("type") ?? "";

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [debouncedSearchTerm, setDebouncedSearchTerm] =
    useState(initialSearch);
  const [fileType, setFileType] = useState(initialType);

  // Debounce search term (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Sync state to URL (debounced search term + fileType)
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (debouncedSearchTerm) {
      params.set("search", debouncedSearchTerm);
    } else {
      params.delete("search");
    }

    if (fileType) {
      params.set("type", fileType);
    } else {
      params.delete("type");
    }

    const newUrl = params.toString()
      ? `/documents?${params.toString()}`
      : "/documents";

    router.replace(newUrl, { scroll: false });
  }, [debouncedSearchTerm, fileType]); // eslint-disable-line react-hooks/exhaustive-deps

  const isSearchActive = useMemo(
    () => debouncedSearchTerm.trim().length >= 2,
    [debouncedSearchTerm],
  );

  const clearSearch = useCallback(() => {
    setSearchTerm("");
    setDebouncedSearchTerm("");
  }, []);

  return {
    searchTerm,
    debouncedSearchTerm,
    fileType,
    setSearchTerm,
    setFileType,
    clearSearch,
    isSearchActive,
  };
}
