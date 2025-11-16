"use client";

import { Card } from "@/components/ui/card";
import { SessionHistoryResponse } from "@/types/lifeos";

interface HistoryPanelProps {
  history?: SessionHistoryResponse;
  isLoading: boolean;
}

const statusColors: Record<string, string> = {
  success: "text-emerald-300",
  cancelled: "text-rose-300",
  pending: "text-amber-300",
};

export function HistoryPanel({ history, isLoading }: HistoryPanelProps) {
  return (
    <Card className="w-full rounded-3xl border border-white/10 bg-slate-900/80 p-6 text-slate-100 shadow-lg shadow-slate-900/40">
      <p className="text-sm font-semibold uppercase tracking-tight text-slate-300">
        Mission History
      </p>
      <div className="mt-4 flex flex-col gap-3">
        {isLoading && (
          <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-4 text-sm text-slate-400">
            Loading history...
          </div>
        )}
        {!isLoading &&
          history?.sessions.map((session) => (
            <div
              key={session.id}
              className="rounded-2xl border border-white/10 bg-slate-800/60 p-4"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold capitalize text-slate-100">
                  {session.room} room
                </span>
                <span
                  className={`text-xs uppercase tracking-wide ${statusColors[session.status]}`}
                >
                  {session.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Duration: {session.duration_minutes}m •{" "}
                {new Date(session.created_at).toLocaleString()}
              </p>
              {session.reward_exp && (
                <p className="text-xs text-slate-300">
                  Rewards: +{session.reward_exp} XP, +{session.reward_gold ?? 0}{" "}
                  gold
                </p>
              )}
            </div>
          ))}
        {!isLoading && !history?.sessions.length && (
          <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
            Complete missions to build your history log.
          </div>
        )}
      </div>
    </Card>
  );
}
