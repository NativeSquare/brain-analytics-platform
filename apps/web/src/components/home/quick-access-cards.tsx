"use client";

import Link from "next/link";
import {
  IconArrowRight,
  IconCalendar,
  IconChartBar,
  IconFolderOpen,
  IconUsers,
} from "@tabler/icons-react";

import {
  Card,
  CardHeader,
} from "@/components/ui/card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ModuleEntry = {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

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
  {
    title: "Dashboards",
    description: "Analytics and performance dashboards",
    href: "/dashboards",
    icon: IconChartBar,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuickAccessCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {modules.map((mod) => {
        const Icon = mod.icon;
        return (
          <Link key={mod.title} href={mod.href} className="group">
            <Card className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                    <Icon className="size-5" aria-hidden="true" />
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <span className="text-sm font-bold">{mod.title}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {mod.description}
                    </span>
                  </div>
                  <IconArrowRight
                    className="ml-auto size-4 text-primary opacity-0 transition-opacity group-hover:opacity-100"
                    aria-hidden="true"
                  />
                </div>
              </CardHeader>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
