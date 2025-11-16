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
    <Card className="w-full rounded-3xl border border-border bg-card/80 p-6 text-foreground shadow-lg">
      <p className="text-sm font-semibold uppercase tracking-tight text-muted-foreground">
        Inventory
      </p>
      <div className="mt-4 grid gap-3">
        {inventory?.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-2xl border border-border bg-card/60 p-4"
          >
            <div>
              <p className="text-base font-semibold text-foreground">
                {item.item.name}
              </p>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {item.item.slot} • {item.item.rarity}
              </p>
            </div>
            <Button
              variant={item.equipped ? "secondary" : "ghost"}
              className="rounded-2xl border border-border"
              disabled={equipping}
              onClick={() => onEquip(item.id)}
            >
              {item.equipped ? "Unequip" : "Equip"}
            </Button>
          </div>
        ))}
        {!inventory?.items.length && (
          <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Earn cosmetics by completing missions. Drops have a 10% chance!
          </div>
        )}
      </div>
    </Card>
  );
}
