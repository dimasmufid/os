import type { InventoryItem } from '@os/types'

interface InventoryPanelProps {
  items: Array<InventoryItem>
  onEquip: (payload: { cosmeticId: string; unequip?: boolean }) => void
}

const slotLabels: Record<InventoryItem['cosmetic']['type'], string> = {
  hat: 'Hat',
  outfit: 'Outfit',
  accessory: 'Accessory',
}

export const InventoryPanel = ({ items, onEquip }: InventoryPanelProps) => {
  if (items.length === 0) {
    return (
      <div className="w-80 bg-slate-900/80 border border-slate-700 rounded-xl p-4 text-slate-100">
        <h3 className="text-lg font-semibold mb-2">Inventory</h3>
        <p className="text-sm text-slate-400">
          Complete focus sessions to unlock cosmetics. Each victory has a 10% drop chance.
        </p>
      </div>
    )
  }

  return (
    <div className="w-80 bg-slate-900/80 border border-slate-700 rounded-xl p-4 text-slate-100 shadow-lg shadow-slate-950/40">
      <h3 className="text-lg font-semibold mb-4">Inventory</h3>
      <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {items.map((item) => (
          <li
            key={item.id}
            className={`rounded-lg border ${
              item.equipped ? 'border-cyan-500/60 bg-cyan-500/10' : 'border-slate-700 bg-slate-800/60'
            } p-3`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">{item.cosmetic.name}</p>
                <p className="text-xs text-slate-400 capitalize">
                  {slotLabels[item.cosmetic.type]} · {item.cosmetic.rarity}
                </p>
              </div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                {new Date(item.unlockedAt).toLocaleDateString()}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-300">{item.cosmetic.description}</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200 hover:bg-emerald-500/20"
                onClick={() => onEquip({ cosmeticId: item.cosmetic.id })}
              >
                Equip
              </button>
              {item.equipped ? (
                <button
                  type="button"
                  className="flex-1 rounded-md border border-slate-700 bg-slate-800/80 px-3 py-1 text-xs text-slate-200 hover:border-slate-500"
                  onClick={() => onEquip({ cosmeticId: item.cosmetic.id, unequip: true })}
                >
                  Unequip
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
