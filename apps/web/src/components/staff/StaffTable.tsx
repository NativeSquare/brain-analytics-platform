"use client";

import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StaffStatusBadge } from "./StaffStatusBadge";
import { StaffDepartmentBadge } from "./StaffDepartmentBadge";
import type { StaffStatus } from "@packages/shared/staff";

export interface StaffSummary {
  _id: string;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  jobTitle: string;
  department: string;
  status: string;
}

interface StaffTableProps {
  staff: StaffSummary[];
  onStaffClick: (staffId: string) => void;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function StaffTable({ staff, onStaffClick }: StaffTableProps) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]"></TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Job Title</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staff.map((member) => (
            <TableRow
              key={member._id}
              className="cursor-pointer"
              onClick={() => onStaffClick(member._id)}
            >
              <TableCell>
                <Avatar className="size-9">
                  {member.photoUrl ? (
                    <AvatarImage
                      src={member.photoUrl}
                      alt={`${member.firstName} ${member.lastName}`}
                    />
                  ) : null}
                  <AvatarFallback className="text-xs">
                    {getInitials(member.firstName, member.lastName)}
                  </AvatarFallback>
                </Avatar>
              </TableCell>
              <TableCell className="font-medium">
                {member.firstName} {member.lastName}
              </TableCell>
              <TableCell>{member.jobTitle}</TableCell>
              <TableCell>
                <StaffDepartmentBadge department={member.department} />
              </TableCell>
              <TableCell>
                <StaffStatusBadge status={member.status as StaffStatus} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
