"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { StaffMember } from "@/lib/mock-data/staff-types";
import staffData from "@/lib/mock-data/staff.json";

const allStaff: StaffMember[] = staffData as StaffMember[];

export function useStaffDirectory() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialSearch = searchParams.get("search") ?? "";
  const initialDepartment = searchParams.get("department") ?? "";
  const initialRole = searchParams.get("role") ?? "";

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [debouncedSearchTerm, setDebouncedSearchTerm] =
    useState(initialSearch);
  const [department, setDepartment] = useState(initialDepartment);
  const [role, setRole] = useState(initialRole);

  // Debounce search term (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Sync state to URL
  useEffect(() => {
    const params = new URLSearchParams();

    if (debouncedSearchTerm) {
      params.set("search", debouncedSearchTerm);
    }
    if (department) {
      params.set("department", department);
    }
    if (role) {
      params.set("role", role);
    }

    const qs = params.toString();
    router.replace(qs ? `/staff?${qs}` : "/staff", { scroll: false });
  }, [debouncedSearchTerm, department, role]); // eslint-disable-line react-hooks/exhaustive-deps

  // Derive unique departments and roles from mock data
  const departments = useMemo(() => {
    const uniqueDepts = [...new Set(allStaff.map((s) => s.department))];
    return uniqueDepts.sort();
  }, []);

  const roles = useMemo(() => {
    const uniqueRoles = [...new Set(allStaff.map((s) => s.role))];
    return uniqueRoles.sort();
  }, []);

  // Filter staff based on search, department, and role
  const filteredStaff = useMemo(() => {
    let result = allStaff;

    if (debouncedSearchTerm) {
      const term = debouncedSearchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.firstName.toLowerCase().includes(term) ||
          s.lastName.toLowerCase().includes(term) ||
          `${s.firstName} ${s.lastName}`.toLowerCase().includes(term),
      );
    }

    if (department) {
      result = result.filter((s) => s.department === department);
    }

    if (role) {
      result = result.filter((s) => s.role === role);
    }

    return result;
  }, [debouncedSearchTerm, department, role]);

  const handleSetDepartment = useCallback((value: string) => {
    setDepartment(value);
  }, []);

  const handleSetRole = useCallback((value: string) => {
    setRole(value);
  }, []);

  return {
    filteredStaff,
    searchTerm,
    setSearchTerm,
    department,
    setDepartment: handleSetDepartment,
    role,
    setRole: handleSetRole,
    departments,
    roles,
    totalCount: allStaff.length,
    isLoading: false,
  };
}
