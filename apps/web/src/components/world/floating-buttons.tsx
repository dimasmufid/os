"use client";

import { BookOpen, Boxes, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";

export type PanelType = "tasks" | "inventory" | "history" | null;

interface FloatingButtonsProps {
  activePanel: PanelType;
  onToggle: (panel: PanelType) => void;
}

const buttons = [
  { key: "tasks" as const, label: "Tasks", icon: BookOpen },
  { key: "inventory" as const, label: "Inventory", icon: Boxes },
  { key: "history" as const, label: "History", icon: Clock },
];

export function FloatingButtons({
  activePanel,
  onToggle,
}: FloatingButtonsProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card/80 p-3 shadow-lg">
      {buttons.map(({ key, label, icon: Icon }) => (
        <Button
          key={key}
          variant={activePanel === key ? "default" : "ghost"}
          className={`flex-1 rounded-xl border border-border ${
            activePanel === key
              ? "bg-gradient-to-r from-primary to-primary text-primary-foreground"
              : "text-foreground"
          }`}
          onClick={() => onToggle(activePanel === key ? null : key)}
        >
          <Icon className="mr-2 h-4 w-4" />
          {label}
        </Button>
      ))}
    </div>
  );
}
