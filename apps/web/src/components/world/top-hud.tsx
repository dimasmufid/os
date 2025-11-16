"use client";

import { Coins, Flame, Star } from "lucide-react";

import { Card } from "@/components/ui/card";
import { HeroProfile, WorldState } from "@/types/lifeos";

interface TopHUDProps {
  hero?: HeroProfile;
  world?: WorldState;
}

export function TopHUD({ hero, world }: TopHUDProps) {
  const xpProgress =
    hero && hero.exp_to_next > 0
      ? Math.min(100, Math.round((hero.exp / hero.exp_to_next) * 100))
      : 0;

  return (
    <Card className="flex w-full flex-col gap-4 rounded-3xl border border-border bg-card/70 p-6 shadow-lg">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card text-2xl font-semibold text-primary">
          {hero?.level ?? 1}
        </div>
        <div className="flex flex-1 flex-col gap-2">
          <div className="flex items-center justify-between text-sm font-medium text-primary">
            <span>Level {hero?.level ?? 1}</span>
            <span>
              {hero?.exp ?? 0} / {hero?.exp_to_next ?? 100} XP
            </span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-primary via-primary to-primary transition-all"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
        </div>
      </div>
      <div className="grid gap-3 text-sm text-primary md:grid-cols-3">
        <StatBubble
          label="Gold"
          value={`${hero?.gold ?? 0}g`}
          description="Earned from missions"
          icon={<Coins className="h-4 w-4 text-primary" />}
        />
        <StatBubble
          label="Focus Streak"
          value={`${world?.day_streak ?? 0} days`}
          description={
            world?.day_streak && world.day_streak > 0
              ? "Keep the streak alive!"
              : "Start a streak today"
          }
          icon={<Flame className="h-4 w-4 text-primary" />}
        />
        <StatBubble
          label="Total Successes"
          value={world?.total_sessions_success ?? 0}
          description={`${world?.longest_streak ?? 0} day best`}
          icon={<Star className="h-4 w-4 text-primary" />}
        />
      </div>
    </Card>
  );
}

interface StatBubbleProps {
  label: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
}

function StatBubble({ label, value, description, icon }: StatBubbleProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card/80 p-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card/60 text-base font-semibold text-foreground">
        {icon ?? value}
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="text-base font-semibold text-foreground">{value}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}
