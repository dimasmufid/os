import type { HeroProfileResponse, WorldState } from '@os/types'

interface TopHUDProps {
  hero: HeroProfileResponse['hero']
  world: WorldState
  streakText?: string
}

export const TopHUD = ({ hero, world, streakText }: TopHUDProps) => {
  const xpProgress = Math.min(1, hero.currentXp / hero.xpForNextLevel)

  return (
    <div className="bg-slate-900/70 backdrop-blur-md border border-slate-700 rounded-xl px-6 py-4 text-slate-100 shadow-lg shadow-slate-950/40">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-sky-500/60 to-purple-500/60 border border-white/20 shadow-inner" />
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Level</p>
            <p className="text-3xl font-semibold text-white">{hero.level}</p>
            <p className="text-sm text-slate-400">{hero.heroName}</p>
          </div>
        </div>

        <div className="flex-1">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-1">Experience</p>
          <div className="h-3 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-sky-400 to-cyan-300"
              style={{ width: `${xpProgress * 100}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-300">
            {hero.currentXp} / {hero.xpForNextLevel} XP
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <StatCard label="Gold" value={`${hero.gold}`} accent="from-amber-400 to-yellow-300" />
          <StatCard
            label="Total Sessions"
            value={`${world.totalSessions}`}
            accent="from-indigo-400 to-sky-300"
          />
          <StatCard label="Streak" value={`${world.streakCount}`} accent="from-rose-400 to-orange-300" />
          <StatCard label="Best Streak" value={`${world.longestStreak}`} accent="from-emerald-400 to-lime-300" />
        </div>
      </div>

      {streakText ? (
        <p className="mt-3 text-sm text-slate-300 italic">{streakText}</p>
      ) : null}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string
  accent: string
}

const StatCard = ({ label, value, accent }: StatCardProps) => {
  return (
    <div className="bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-2 text-center">
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p
        className={`text-lg font-semibold text-white bg-clip-text text-transparent bg-gradient-to-r ${accent}`}
      >
        {value}
      </p>
    </div>
  )
}
