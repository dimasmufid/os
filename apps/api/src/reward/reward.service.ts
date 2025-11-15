import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { dbSchema, eq } from '@os/db'
import type { Database } from '@os/db'
import type { RewardSummary, WorldUpgrade } from '@os/types'

import { DRIZZLE_CLIENT } from '../database/database.constants'

const {
  heroProfiles,
  worldStates,
  focusSessions,
  inventoryItems,
  cosmeticItems,
} = dbSchema

const COSMETIC_DROP_CHANCE = 0.1

@Injectable()
export class RewardService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  calculateBaseRewards(durationMinutes: number) {
    const xp = durationMinutes * 2
    const gold = durationMinutes

    return { xp, gold }
  }

  private xpThresholdForLevel(level: number) {
    return Math.max(50, level * 100)
  }

  private resolveStreak(lastCompletedAt: Date | null, now: Date, currentStreak: number) {
    if (!lastCompletedAt) {
      return { streak: 1, longestCandidate: 1 }
    }

    const previousDay = new Date(lastCompletedAt)
    previousDay.setHours(0, 0, 0, 0)
    const today = new Date(now)
    today.setHours(0, 0, 0, 0)

    const diffDays = Math.round((today.getTime() - previousDay.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return { streak: currentStreak, longestCandidate: currentStreak }
    }

    if (diffDays === 1) {
      const next = currentStreak + 1
      return { streak: next, longestCandidate: next }
    }

    return { streak: 1, longestCandidate: 1 }
  }

  private applyLeveling(level: number, xp: number, xpGain: number) {
    let currentLevel = level
    let currentXp = xp + xpGain
    let leveledUp = false

    while (currentXp >= this.xpThresholdForLevel(currentLevel)) {
      currentXp -= this.xpThresholdForLevel(currentLevel)
      currentLevel += 1
      leveledUp = true
    }

    return { level: currentLevel, xp: currentXp, leveledUp }
  }

  async applySessionRewards(heroId: string, sessionId: string, durationMinutes: number) {
    const hero = await this.db.query.heroProfiles.findFirst({
      where: eq(heroProfiles.id, heroId),
    })

    if (!hero) {
      throw new NotFoundException('Hero profile missing')
    }

    const now = new Date()
    const { xp, gold } = this.calculateBaseRewards(durationMinutes)
    const streakInfo = this.resolveStreak(hero.lastSessionCompletedAt ?? null, now, hero.streakCount)
    const leveling = this.applyLeveling(hero.level, hero.xp, xp)

    const newGoldTotal = hero.gold + gold

    await this.db
      .update(heroProfiles)
      .set({
        level: leveling.level,
        xp: leveling.xp,
        gold: newGoldTotal,
        streakCount: streakInfo.streak,
        longestStreak: Math.max(hero.longestStreak, streakInfo.longestCandidate),
        lastSessionCompletedAt: now,
      })
      .where(eq(heroProfiles.id, heroId))

    const worldResult = await this.applyWorldProgress(heroId, now)
    const cosmeticDrop = await this.rollCosmeticDrop(heroId, now)

    await this.db
      .update(focusSessions)
      .set({
        status: 'completed',
        rewardXp: xp,
        rewardGold: gold,
        droppedCosmeticId: cosmeticDrop?.cosmetic?.id ?? null,
        completedAt: now,
      })
      .where(eq(focusSessions.id, sessionId))

    const summary: RewardSummary = {
      sessionId,
      xpGained: xp,
      goldGained: gold,
      newLevel: leveling.level,
      leveledUp: leveling.leveledUp,
      streakCount: streakInfo.streak,
      longestStreak: Math.max(hero.longestStreak, streakInfo.longestCandidate),
      cosmeticDrop: cosmeticDrop?.cosmetic ?? null,
      worldUpgrades: worldResult.upgrades,
    }

    return summary
  }

  private async applyWorldProgress(heroId: string, now: Date) {
    const world = await this.db.query.worldStates.findFirst({
      where: eq(worldStates.heroId, heroId),
    })

    if (!world) {
      throw new NotFoundException('World state missing')
    }

    const totalSuccessfulSessions = world.totalSuccessfulSessions + 1
    const upgrades: WorldUpgrade[] = []
    const updatePayload: Partial<typeof worldStates.$inferInsert> = {
      totalSuccessfulSessions,
    }

    if (totalSuccessfulSessions >= 5 && world.studyRoomLevel < 2) {
      updatePayload.studyRoomLevel = 2
      upgrades.push({ room: 'study', level: 2 })
    }

    if (totalSuccessfulSessions >= 15 && world.buildRoomLevel < 2) {
      updatePayload.buildRoomLevel = 2
      upgrades.push({ room: 'build', level: 2 })
    }

    if (totalSuccessfulSessions >= 30 && world.plazaLevel < 2) {
      updatePayload.plazaLevel = 2
      upgrades.push({ room: 'plaza', level: 2 })
    }

    if (upgrades.length > 0) {
      updatePayload.lastUpgradeAt = now
    }

    await this.db
      .update(worldStates)
      .set(updatePayload)
      .where(eq(worldStates.heroId, heroId))

    return { upgrades }
  }

  private async rollCosmeticDrop(heroId: string, now: Date) {
    if (Math.random() > COSMETIC_DROP_CHANCE) {
      return null
    }

    const cosmetics = await this.db.query.cosmeticItems.findMany()
    if (cosmetics.length === 0) {
      return null
    }

    const chosen = cosmetics[Math.floor(Math.random() * cosmetics.length)]

    const [inventory] = await this.db
      .insert(inventoryItems)
      .values({
        heroId,
        cosmeticId: chosen.id,
        acquiredAt: now,
        isEquipped: false,
      })
      .returning({ id: inventoryItems.id })

    return {
      inventoryId: inventory.id,
      cosmetic: {
        id: chosen.id,
        slug: chosen.slug,
        name: chosen.name,
        description: chosen.description,
        type: chosen.type,
        rarity: chosen.rarity,
        previewUrl: chosen.previewUrl,
      },
    }
  }

  async revertSession(sessionId: string) {
    const session = await this.db.query.focusSessions.findFirst({
      where: eq(focusSessions.id, sessionId),
    })

    if (!session) return

    await this.db
      .update(focusSessions)
      .set({ status: 'cancelled', completedAt: new Date() })
      .where(eq(focusSessions.id, sessionId))
  }
}
