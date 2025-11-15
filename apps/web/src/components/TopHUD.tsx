import type { HeroHudSummary } from '@os/types'
import { cn } from '@os/ui'

const xpThresholdForLevel = (level: number) => Math.max(50, level * 100)

interface TopHUDProps {
  profile: HeroHudSummary
}

export function TopHUD({ profile }: TopHUDProps) {
  const hero = profile.hero
  const xpThreshold = xpThresholdForLevel(hero.level)
  const xpProgress = Math.min(100, Math.round((hero.xp / xpThreshold) * 100))

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-0 z-30 flex justify-center">
      <div className="mt-6 flex w-[720px] flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/80 p-4 text-white shadow-lg backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Adventurer</p>
            <h1 className="text-2xl font-semibold">{hero.nickname}</h1>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <Stat label="Level" value={hero.level} />
            <Stat label="Gold" value={hero.gold} />
            <Stat label="Streak" value={`${hero.streakCount} day${hero.streakCount === 1 ? '' : 's'}`} />
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-slate-200">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-400">
              <span>XP</span>
              <span>
                {hero.xp} / {xpThreshold}
              </span>
            </div>
            <div className="mt-2 h-3 w-full overflow-hidden rounded-full border border-white/10 bg-slate-900">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 transition-all"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <EquippedSlot label="Hat" value={profile.equipped.hat?.name} />
            <EquippedSlot label="Outfit" value={profile.equipped.outfit?.name} />
            <EquippedSlot label="Accessory" value={profile.equipped.accessory?.name} />
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="text-right">
      <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  )
}

function EquippedSlot({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className={cn('rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs')}> 
      <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">{label}</p>
      <p className="font-medium text-slate-100">{value ?? 'None equipped'}</p>
    </div>
  )
}
