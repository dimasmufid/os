import type { RewardSummary } from '@os/types'
import { Button } from '@os/ui'

interface VictoryModalProps {
  reward: RewardSummary | null
  onClose: () => void
}

export function VictoryModal({ reward, onClose }: VictoryModalProps) {
  if (!reward) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 text-white backdrop-blur">
      <div className="w-[420px] rounded-3xl border border-emerald-400/30 bg-slate-950/85 p-8 text-center shadow-2xl">
        <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">Mission Complete</p>
        <h2 className="mt-3 text-3xl font-semibold">Rewards Collected</h2>
        <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
          <RewardStat label="XP" value={`+${reward.xpGained}`} />
          <RewardStat label="Gold" value={`+${reward.goldGained}`} />
          <RewardStat label="Streak" value={`${reward.streakCount} days`} />
        </div>
        <div className="mt-6 space-y-3 text-sm text-slate-300">
          <p>Level: {reward.newLevel} {reward.leveledUp ? '🔥' : ''}</p>
          {reward.cosmeticDrop && (
            <p className="rounded-xl border border-white/10 bg-white/5 p-3 text-emerald-200">
              Cosmetic Drop: {reward.cosmeticDrop.name} ({reward.cosmeticDrop.rarity})
            </p>
          )}
          {reward.worldUpgrades.length > 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-left text-emerald-200">
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">World Upgrades</p>
              <ul className="mt-2 space-y-1 text-sm">
                {reward.worldUpgrades.map((upgrade) => (
                  <li key={upgrade.room}>
                    {upgrade.room.toUpperCase()} upgraded to level {upgrade.level}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <Button className="mt-8 w-full" size="lg" onClick={onClose}>
          Continue Exploring
        </Button>
      </div>
    </div>
  )
}

function RewardStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  )
}
