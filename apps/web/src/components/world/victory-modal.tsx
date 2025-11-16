"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SessionCompleteResponse } from "@/types/lifeos";

interface VictoryModalProps {
  data?: SessionCompleteResponse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VictoryModal({
  data,
  open,
  onOpenChange,
}: VictoryModalProps) {
  if (!data) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl border border-white/10 bg-slate-900/90 text-slate-100">
        <DialogHeader>
          <DialogTitle className="text-2xl text-slate-50">
            Mission Complete!
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            {data.session.room} room • {data.session.duration_minutes} minutes
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-4">
            <p className="text-sm uppercase tracking-wide text-slate-400">
              Rewards
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-lg font-semibold text-slate-50">
              <span>+{data.reward.exp_reward} XP</span>
              <span>+{data.reward.gold_reward} Gold</span>
              {data.reward.level_ups > 0 && (
                <span className="text-emerald-300">
                  Level Up x{data.reward.level_ups}
                </span>
              )}
            </div>
          </div>
          {data.reward.dropped_item && (
            <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-4">
              <p className="text-sm uppercase tracking-wide text-slate-400">
                Cosmetic Drop
              </p>
              <p className="text-base font-semibold text-slate-50">
                {data.reward.dropped_item.name}
              </p>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                {data.reward.dropped_item.slot} •{" "}
                {data.reward.dropped_item.rarity}
              </p>
            </div>
          )}
          {data.reward.unlocked_layers.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-4 text-sm text-slate-300">
              New world upgrades unlocked:{" "}
              {data.reward.unlocked_layers.join(", ")}.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
