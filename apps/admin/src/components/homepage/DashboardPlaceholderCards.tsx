"use client";

import {
  IconChartBar,
  IconChartDots,
} from "@tabler/icons-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// --- Types ---

type PlaceholderEntry = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

// --- Static data ---

const placeholders: PlaceholderEntry[] = [
  {
    title: "Team Performance",
    description: "Season statistics and trends",
    icon: IconChartBar,
  },
  {
    title: "Player Analytics",
    description: "Individual player performance insights",
    icon: IconChartDots,
  },
];

// --- Component ---

export function DashboardPlaceholderCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {placeholders.map((item) => {
        const Icon = item.icon;
        return (
          <Card
            key={item.title}
            className="pointer-events-none cursor-default border-dashed opacity-60"
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <Icon className="size-8 text-muted-foreground" />
                <Badge variant="secondary">Coming Soon</Badge>
              </div>
              <CardTitle className="text-base">{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
          </Card>
        );
      })}
    </div>
  );
}
