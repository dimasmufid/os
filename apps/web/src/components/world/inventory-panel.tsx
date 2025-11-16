"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InventoryResponse } from "@/types/lifeos";

interface InventoryPanelProps {
  inventory?: InventoryResponse;
  onEquip: (itemId: string) => void;
  equipping: boolean;
}

export function InventoryPanel({
  inventory,
  onEquip,
  equipping,
}: InventoryPanelProps) {
  return (
    <Card className="w-full rounded-3xl border border-white/10 bg-slate-900/80 p-6 text-slate-100 shadow-lg shadow-slate-900/40">
      <p className="text-sm font-semibold uppercase tracking-tight text-slate-300">
        Inventory
      </p>
      <div className="mt-4 grid gap-3">
        {inventory?.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-800/60 p-4"
          >
            <div>
              <p className="text-base font-semibold text-slate-50">
                {item.item.name}
              </p>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                {item.item.slot} • {item.item.rarity}
              </p>
            </div>
            <Button
              variant={item.equipped ? "secondary" : "ghost"}
              className="rounded-2xl border border-white/10"
              disabled={equipping}
              onClick={() => onEquip(item.id)}
            >
              {item.equipped ? "Unequip" : "Equip"}
            </Button>
          </div>
        ))}
        {!inventory?.items.length && (
          <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
            Earn cosmetics by completing missions. Drops have a 10% chance!
          </div>
        )}
      </div>
    </Card>
  );
}
