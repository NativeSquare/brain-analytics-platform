"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@packages/backend/convex/_generated/api";
import { STAFF_DEPARTMENTS } from "@packages/shared/staff";

export function useStaffDirectory() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();

  const initialSearch = searchParams.get("search") ?? "";
  const initialDepartment = searchParams.get("department") ?? "";

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialSearch);
  const [department, setDepartment] = useState(initialDepartment);

  // Debounce search term (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Sync state to URL
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearchTerm) params.set("search", debouncedSearchTerm);
    if (department) params.set("department", department);
    const qs = params.toString();
    router.replace(qs ? `/staff?${qs}` : "/staff", { scroll: false });
  }, [debouncedSearchTerm, department, router]);

  const staffData = useQuery(
    api.staff.queries.getStaff,
    isAuthenticated
      ? {
          department: department || undefined,
          search: debouncedSearchTerm || undefined,
        }
      : "skip",
  );

  const departments = useMemo(
    () => [...STAFF_DEPARTMENTS].sort(),
    [],
  );

  const handleSetDepartment = useCallback((value: string) => {
    setDepartment(value);
  }, []);

  return {
    filteredStaff: staffData ?? [],
    searchTerm,
    setSearchTerm,
    department,
    setDepartment: handleSetDepartment,
    departments,
    isLoading: staffData === undefined,
  };
}
