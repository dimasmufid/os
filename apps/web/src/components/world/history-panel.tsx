"use client";

import { Card } from "@/components/ui/card";
import { SessionHistoryResponse } from "@/types/lifeos";

interface HistoryPanelProps {
  history?: SessionHistoryResponse;
  isLoading: boolean;
}

const statusColors: Record<string, string> = {
  success: "text-primary",
  cancelled: "text-destructive",
  pending: "text-muted-foreground",
};

export function HistoryPanel({ history, isLoading }: HistoryPanelProps) {
  return (
    <Card className="w-full rounded-3xl border border-border bg-card/80 p-6 text-foreground shadow-lg">
      <p className="text-sm font-semibold uppercase tracking-tight text-muted-foreground">
        Mission History
      </p>
      <div className="mt-4 flex flex-col gap-3">
        {isLoading && (
          <div className="rounded-2xl border border-border bg-card/40 p-4 text-sm text-muted-foreground">
            Loading history...
          </div>
        )}
        {!isLoading &&
          history?.sessions.map((session) => (
            <div
              key={session.id}
              className="rounded-2xl border border-border bg-card/60 p-4"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold capitalize text-foreground">
                  {session.room} room
                </span>
                <span
                  className={`text-xs uppercase tracking-wide ${statusColors[session.status]}`}
                >
                  {session.status}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Duration: {session.duration_minutes}m •{" "}
                {new Date(session.created_at).toLocaleString()}
              </p>
              {session.reward_exp && (
                <p className="text-xs text-muted-foreground">
                  Rewards: +{session.reward_exp} XP, +{session.reward_gold ?? 0}{" "}
                  gold
                </p>
              )}
            </div>
          ))}
        {!isLoading && !history?.sessions.length && (
          <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Complete missions to build your history log.
          </div>
        )}
      </div>
    </Card>
  );
}
