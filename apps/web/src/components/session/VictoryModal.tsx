import type { RewardSummary } from '@os/types'

interface VictoryModalProps {
  summary: RewardSummary
  onClose: () => void
}

export const VictoryModal = ({ summary, onClose }: VictoryModalProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-6">
      <div className="w-full max-w-lg rounded-2xl border border-cyan-500/40 bg-slate-900/85 p-8 text-slate-100 shadow-2xl shadow-cyan-500/20">
        <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Session Complete</p>
        <h2 className="mt-2 text-3xl font-semibold text-white">Victory!</h2>
        <p className="mt-2 text-sm text-slate-300">
          {summary.xpAwarded} XP · {summary.goldAwarded} Gold · Level {summary.newLevel}
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Experience</p>
            <p className="mt-1 text-lg font-semibold text-cyan-200">+{summary.xpAwarded}</p>
            <p className="text-xs text-slate-300">
              {summary.currentXp} / {summary.xpForNextLevel} XP toward next level
            </p>
          </div>
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Streak</p>
            <p className="mt-1 text-lg font-semibold text-emerald-200">Day {summary.streakCount}</p>
            {summary.worldUpgrades && summary.worldUpgrades.length > 0 ? (
              <p className="text-xs text-emerald-300">Decor upgraded!</p>
            ) : (
              <p className="text-xs text-slate-300">Keep the momentum going.</p>
            )}
          </div>
        </div>

        {summary.cosmeticReward ? (
          <div className="mt-6 rounded-xl border border-violet-500/40 bg-violet-500/10 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-violet-200">New Cosmetic</p>
            <p className="mt-1 text-lg font-semibold text-white">{summary.cosmeticReward.name}</p>
            <p className="text-xs text-violet-100">{summary.cosmeticReward.rarity}</p>
            <p className="mt-2 text-sm text-violet-100/80">{summary.cosmeticReward.description}</p>
          </div>
        ) : null}

        {summary.worldUpgrades && summary.worldUpgrades.length > 0 ? (
          <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-100">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">World Upgrades</p>
            <ul className="mt-2 space-y-1">
              {summary.worldUpgrades.map((upgrade) => (
                <li key={upgrade.room}>
                  {upgrade.room.toUpperCase()} → Level {upgrade.newLevel}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            className="rounded-full border border-cyan-500/60 bg-cyan-500/20 px-5 py-2 text-sm text-cyan-100 hover:bg-cyan-500/30"
            onClick={onClose}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}
