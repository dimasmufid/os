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
      <DialogContent className="rounded-3xl border border-border bg-card/90 text-foreground">
        <DialogHeader>
          <DialogTitle className="text-2xl text-foreground">
            Mission Complete!
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {data.session.room} room • {data.session.duration_minutes} minutes
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="rounded-2xl border border-border bg-card/60 p-4">
            <p className="text-sm uppercase tracking-wide text-muted-foreground">
              Rewards
            </p>
            <div className="mt-2 flex flex-wrap gap-3 text-lg font-semibold text-foreground">
              <span>+{data.reward.exp_reward} XP</span>
              <span>+{data.reward.gold_reward} Gold</span>
              {data.reward.level_ups > 0 && (
                <span className="text-primary">
                  Level Up x{data.reward.level_ups}
                </span>
              )}
            </div>
          </div>
          {data.reward.dropped_item && (
            <div className="rounded-2xl border border-border bg-card/60 p-4">
              <p className="text-sm uppercase tracking-wide text-muted-foreground">
                Cosmetic Drop
              </p>
              <p className="text-base font-semibold text-foreground">
                {data.reward.dropped_item.name}
              </p>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {data.reward.dropped_item.slot} •{" "}
                {data.reward.dropped_item.rarity}
              </p>
            </div>
          )}
          {data.reward.unlocked_layers.length > 0 && (
            <div className="rounded-2xl border border-border bg-card/60 p-4 text-sm text-muted-foreground">
              New world upgrades unlocked:{" "}
              {data.reward.unlocked_layers.join(", ")}.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
