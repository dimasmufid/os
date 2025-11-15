import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { and, eq, inArray, dbSchema } from '@os/db'
import type { Database } from '@os/db'
import type { HeroHudSummary } from '@os/types'

import { DRIZZLE_CLIENT } from '../database/database.constants'
import { CreateHeroDto } from './dto/create-hero.dto'
import { UpdateHeroEquipmentDto } from './dto/update-hero.dto'

const { heroProfiles, worldStates, inventoryItems, cosmeticItems, taskTemplates } =
  dbSchema

@Injectable()
export class HeroService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  async getOrCreateHero(userId: string) {
    return this.ensureHero(userId)
  }

  async getProfile(userId: string): Promise<HeroHudSummary> {
    const hero = await this.ensureHero(userId)

    const [world, equipped] = await Promise.all([
      this.getWorldState(hero.id),
      this.getEquippedCosmetics(hero.equippedHatId, hero.equippedOutfitId, hero.equippedAccessoryId),
    ])

    return {
      hero: this.mapHero(hero),
      world: this.mapWorld(world),
      equipped,
    }
  }

  async bootstrapHero(userId: string, payload: CreateHeroDto): Promise<HeroHudSummary> {
    const hero = await this.ensureHero(userId, payload.nickname)

    if (payload.nickname && payload.nickname !== hero.nickname) {
      await this.db
        .update(heroProfiles)
        .set({ nickname: payload.nickname })
        .where(eq(heroProfiles.id, hero.id))
    }

    return this.getProfile(userId)
  }

  async updateEquipment(
    userId: string,
    payload: UpdateHeroEquipmentDto,
  ): Promise<HeroHudSummary> {
    const hero = await this.ensureHero(userId)

    const inventory = await this.db.query.inventoryItems.findMany({
      where: eq(inventoryItems.heroId, hero.id),
      with: { cosmetic: true },
    })

    const inventoryById = new Map(inventory.map((item) => [item.id, item]))

    const heroUpdate: Partial<typeof heroProfiles.$inferInsert> = {}
    const toEquip: Array<{ slot: 'hat' | 'outfit' | 'accessory'; inventoryId: string | null }> = []

    const assignSlot = (
      slot: 'hat' | 'outfit' | 'accessory',
      inventoryId?: string | null,
    ) => {
      if (inventoryId === undefined) {
        return
      }

      if (!inventoryId) {
        if (slot === 'hat') heroUpdate.equippedHatId = null
        if (slot === 'outfit') heroUpdate.equippedOutfitId = null
        if (slot === 'accessory') heroUpdate.equippedAccessoryId = null
        toEquip.push({ slot, inventoryId: null })
        return
      }

      const record = inventoryById.get(inventoryId)
      if (!record) {
        throw new NotFoundException(`Inventory item ${inventoryId} was not found for hero`)
      }

      const expectedType =
        slot === 'hat' ? 'hat' : slot === 'outfit' ? 'outfit' : ('accessory' as const)

      if (record.cosmetic.type !== expectedType) {
        throw new NotFoundException(`Item ${inventoryId} is not a ${slot}`)
      }

      if (slot === 'hat') heroUpdate.equippedHatId = record.cosmeticId
      if (slot === 'outfit') heroUpdate.equippedOutfitId = record.cosmeticId
      if (slot === 'accessory') heroUpdate.equippedAccessoryId = record.cosmeticId

      toEquip.push({ slot, inventoryId })
    }

    assignSlot('hat', payload.hatId)
    assignSlot('outfit', payload.outfitId)
    assignSlot('accessory', payload.accessoryId)

    await this.db.transaction(async (tx) => {
      if (Object.keys(heroUpdate).length > 0) {
        await tx.update(heroProfiles).set(heroUpdate).where(eq(heroProfiles.id, hero.id))
      }

      for (const entry of toEquip) {
        const slotType = entry.slot
        const slotInventoryIds = inventory
          .filter((item) => item.cosmetic.type === slotType)
          .map((item) => item.id)

        if (slotInventoryIds.length > 0) {
          await tx
            .update(inventoryItems)
            .set({ isEquipped: false })
            .where(inArray(inventoryItems.id, slotInventoryIds))
        }

        if (entry.inventoryId) {
          await tx
            .update(inventoryItems)
            .set({ isEquipped: true })
            .where(
              and(
                eq(inventoryItems.heroId, hero.id),
                eq(inventoryItems.id, entry.inventoryId),
              ),
            )
        }
      }
    })

    return this.getProfile(userId)
  }

  private async ensureHero(userId: string, nickname?: string) {
    const existing = await this.db.query.heroProfiles.findFirst({
      where: eq(heroProfiles.userId, userId),
    })

    if (existing) {
      return existing
    }

    await this.seedCosmetics()

    const [created] = await this.db
      .insert(heroProfiles)
      .values({ userId, nickname: nickname ?? 'Adventurer' })
      .returning()

    await this.db.insert(worldStates).values({ heroId: created.id }).onConflictDoNothing()
    await this.seedDefaultTasks(created.id)

    return created
  }

  private async seedDefaultTasks(heroId: string) {
    const existingTasks = await this.db.query.taskTemplates.findMany({
      where: eq(taskTemplates.heroId, heroId),
      limit: 1,
    })

    if (existingTasks.length > 0) {
      return
    }

    await this.db.insert(taskTemplates).values([
      {
        heroId,
        name: 'Deep Work Session',
        category: 'focus',
        defaultDuration: 50,
        preferredRoom: 'study',
      },
      {
        heroId,
        name: 'Build Sprint',
        category: 'build',
        defaultDuration: 90,
        preferredRoom: 'build',
      },
      {
        heroId,
        name: 'Training Loop',
        category: 'training',
        defaultDuration: 25,
        preferredRoom: 'training',
      },
    ])
  }

  private async seedCosmetics() {
    const existing = await this.db.query.cosmeticItems.findMany({ limit: 1 })
    if (existing.length > 0) {
      return
    }

    await this.db.insert(cosmeticItems).values([
      {
        slug: 'hat-classic-cap',
        name: 'Classic Cap',
        type: 'hat',
        rarity: 'common',
        description: 'A cozy cap for focused adventurers.',
      },
      {
        slug: 'hat-arcane-visor',
        name: 'Arcane Visor',
        type: 'hat',
        rarity: 'rare',
        description: 'Glows softly when your streak is alive.',
      },
      {
        slug: 'outfit-studio-robe',
        name: 'Studio Robe',
        type: 'outfit',
        rarity: 'common',
        description: 'Perfect for late-night build sessions.',
      },
      {
        slug: 'outfit-skyweave',
        name: 'Skyweave Suit',
        type: 'outfit',
        rarity: 'epic',
        description: 'Threads of momentum and ambition.',
      },
      {
        slug: 'accessory-focus-band',
        name: 'Focus Band',
        type: 'accessory',
        rarity: 'common',
        description: 'Keeps the hero grounded during missions.',
      },
      {
        slug: 'accessory-radiant-core',
        name: 'Radiant Core',
        type: 'accessory',
        rarity: 'rare',
        description: 'A miniature sun that rewards perseverance.',
      },
    ])
  }

  private async getWorldState(heroId: string) {
    const world = await this.db.query.worldStates.findFirst({
      where: eq(worldStates.heroId, heroId),
    })

    if (world) {
      return world
    }

    const [created] = await this.db
      .insert(worldStates)
      .values({ heroId })
      .returning()

    return created
  }

  private async getEquippedCosmetics(
    hatId?: string | null,
    outfitId?: string | null,
    accessoryId?: string | null,
  ) {
    const ids = [hatId, outfitId, accessoryId].filter(Boolean) as string[]
    if (ids.length === 0) {
      return { hat: null, outfit: null, accessory: null }
    }

    const cosmetics = await this.db.query.cosmeticItems.findMany({
      where: inArray(cosmeticItems.id, ids),
    })

    const lookup = new Map(cosmetics.map((item) => [item.id, item]))
    const mapCosmetic = (id?: string | null) => {
      if (!id) return null
      const record = lookup.get(id)
      if (!record) return null
      return {
        id: record.id,
        slug: record.slug,
        name: record.name,
        description: record.description,
        type: record.type,
        rarity: record.rarity,
        previewUrl: record.previewUrl,
      }
    }

    return {
      hat: mapCosmetic(hatId),
      outfit: mapCosmetic(outfitId),
      accessory: mapCosmetic(accessoryId),
    }
  }

  private mapHero(hero: typeof heroProfiles.$inferSelect) {
    return {
      id: hero.id,
      userId: hero.userId,
      nickname: hero.nickname,
      level: hero.level,
      xp: hero.xp,
      gold: hero.gold,
      streakCount: hero.streakCount,
      longestStreak: hero.longestStreak,
      lastSessionCompletedAt: hero.lastSessionCompletedAt?.toISOString() ?? null,
      equippedHatId: hero.equippedHatId,
      equippedOutfitId: hero.equippedOutfitId,
      equippedAccessoryId: hero.equippedAccessoryId,
    }
  }

  private mapWorld(world: typeof worldStates.$inferSelect) {
    return {
      heroId: world.heroId,
      studyRoomLevel: world.studyRoomLevel,
      buildRoomLevel: world.buildRoomLevel,
      trainingRoomLevel: world.trainingRoomLevel,
      plazaLevel: world.plazaLevel,
      totalSuccessfulSessions: world.totalSuccessfulSessions,
      lastUpgradeAt: world.lastUpgradeAt?.toISOString() ?? null,
    }
  }
}
