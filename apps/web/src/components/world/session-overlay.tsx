"use client";

import { Button } from "@/components/ui/button";
import { SessionStartResponse } from "@/types/lifeos";

interface SessionOverlayProps {
  session: SessionStartResponse & { duration_minutes: number };
  remainingSeconds: number;
  onCancel: () => void;
  onComplete: () => void;
  isCancelling: boolean;
  isCompleting: boolean;
}

const encouragements = [
  "Deep breaths. Your world grows with every minute.",
  "Focus fuels the plaza. Stay in flow.",
  "You're building the LifeOS you deserve.",
];

export function SessionOverlay({
  session,
  remainingSeconds,
  onCancel,
  onComplete,
  isCancelling,
  isCompleting,
}: SessionOverlayProps) {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const ready = remainingSeconds <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-lg">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900/90 p-10 text-center text-slate-100 shadow-2xl shadow-slate-900/70">
        <p className="text-sm uppercase tracking-widest text-slate-400">
          Session Running
        </p>
        <h2 className="mt-2 text-5xl font-semibold text-slate-50">
          {String(minutes).padStart(2, "0")}:
          {String(seconds).padStart(2, "0")}
        </h2>
        <p className="mt-3 text-base text-slate-200">
          {encouragements[session.session_id.length % encouragements.length]}
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <Button
            onClick={onCancel}
            disabled={isCancelling || isCompleting}
            variant="ghost"
            className="rounded-2xl border border-white/10 bg-slate-800/60 text-slate-100"
          >
            {isCancelling ? "Cancelling..." : "Cancel Session"}
          </Button>
          <Button
            onClick={onComplete}
            disabled={!ready || isCompleting}
            className="rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 px-6 text-lg font-semibold"
          >
            {ready
              ? isCompleting
                ? "Claiming..."
                : "Complete Mission"
              : "Mission in progress"}
          </Button>
        </div>
      </div>
    </div>
  );
}
