import type { HeroHudSummary, InventoryItem } from '@os/types'
import { Button } from '@os/ui'

interface InventoryPanelProps {
  isOpen: boolean
  inventory: InventoryItem[] | undefined
  profile: HeroHudSummary | undefined
  onClose: () => void
  onEquip: (slot: 'hat' | 'outfit' | 'accessory', inventoryId?: string | null) => void
}

export function InventoryPanel({ isOpen, inventory, profile, onClose, onEquip }: InventoryPanelProps) {
  if (!isOpen) return null

  return (
    <aside className="fixed inset-y-0 right-0 z-40 w-96 bg-slate-950/95 p-6 text-white shadow-xl backdrop-blur">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Inventory</h2>
        <button className="text-xs uppercase text-slate-400" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="grid max-h-full gap-4 overflow-y-auto pr-3">
        {inventory?.map((item) => {
          const slot = item.cosmetic.type
          const equippedId =
            slot === 'hat'
              ? profile?.hero.equippedHatId
              : slot === 'outfit'
                ? profile?.hero.equippedOutfitId
                : profile?.hero.equippedAccessoryId
          const isEquipped = equippedId === item.cosmeticId

          return (
            <div
              key={item.id}
              className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-inner"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold">{item.cosmetic.name}</p>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                    {item.cosmetic.type} · {item.cosmetic.rarity}
                  </p>
                </div>
                <span className="text-[10px] uppercase tracking-[0.3em] text-emerald-300">
                  {isEquipped ? 'Equipped' : 'Unlocked'}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-300">{item.cosmetic.description}</p>
              <div className="mt-3 flex gap-2">
                <Button
                  variant={isEquipped ? 'secondary' : 'default'}
                  size="sm"
                  onClick={() => onEquip(slot, isEquipped ? null : item.id)}
                >
                  {isEquipped ? 'Unequip' : 'Equip'}
                </Button>
              </div>
            </div>
          )
        })}
        {(!inventory || inventory.length === 0) && (
          <p className="text-sm text-slate-400">
            Complete focus sessions to unlock cosmetics. Drops appear automatically here.
          </p>
        )}
      </div>
    </aside>
  )
}
