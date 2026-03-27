"use client";

import Link from "next/link";
import {
  IconCalendar,
  IconFolderOpen,
  IconUsers,
} from "@tabler/icons-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// --- Types ---

type ModuleEntry = {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

// --- Static data ---

const modules: ModuleEntry[] = [
  {
    title: "Calendar",
    description: "View and manage club events",
    href: "/calendar",
    icon: IconCalendar,
  },
  {
    title: "Documents",
    description: "Access club documents and files",
    href: "/documents",
    icon: IconFolderOpen,
  },
  {
    title: "Players",
    description: "Manage player profiles and data",
    href: "/players",
    icon: IconUsers,
  },
];

// --- Component ---

export function QuickAccessCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {modules.map((mod) => {
        const Icon = mod.icon;
        return (
          <Link key={mod.title} href={mod.href}>
            <Card className="h-full transition-colors hover:border-primary/50 focus-within:border-primary/50">
              <CardHeader>
                <Icon className="size-8 text-muted-foreground" aria-hidden="true" />
                <CardTitle className="text-base">{mod.title}</CardTitle>
                <CardDescription>{mod.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
