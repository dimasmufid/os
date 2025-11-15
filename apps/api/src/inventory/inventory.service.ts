import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { dbSchema, eq } from '@os/db'
import type { Database } from '@os/db'

import { DRIZZLE_CLIENT } from '../database/database.constants'
import { HeroService } from '../hero/hero.service'
import { EquipInventoryDto } from './dto/create-inventory.dto'

const { inventoryItems } = dbSchema

@Injectable()
export class InventoryService {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: Database,
    private readonly heroService: HeroService,
  ) {}

  async list(userId: string) {
    const hero = await this.heroService.getOrCreateHero(userId)

    const inventory = await this.db.query.inventoryItems.findMany({
      where: eq(inventoryItems.heroId, hero.id),
      orderBy: (inventory, { desc }) => [desc(inventory.acquiredAt)],
      with: {
        cosmetic: true,
      },
    })

    return inventory.map((item) => ({
      id: item.id,
      heroId: item.heroId,
      cosmeticId: item.cosmeticId,
      acquiredAt: item.acquiredAt.toISOString(),
      isEquipped: item.isEquipped,
      cosmetic: item.cosmetic
        ? {
            id: item.cosmetic.id,
            slug: item.cosmetic.slug,
            name: item.cosmetic.name,
            description: item.cosmetic.description,
            type: item.cosmetic.type,
            rarity: item.cosmetic.rarity,
            previewUrl: item.cosmetic.previewUrl,
          }
        : null,
    }))
  }

  async equip(userId: string, payload: EquipInventoryDto) {
    const hero = await this.heroService.getOrCreateHero(userId)

    if (payload.inventoryId) {
      const inventory = await this.db.query.inventoryItems.findFirst({
        where: eq(inventoryItems.id, payload.inventoryId),
        with: { cosmetic: true },
      })

      if (!inventory || inventory.heroId !== hero.id) {
        throw new NotFoundException('Inventory item not found')
      }

      if (inventory.cosmetic?.type !== payload.slot) {
        throw new NotFoundException(`Item does not match ${payload.slot} slot`)
      }
    }

    const dto =
      payload.slot === 'hat'
        ? { hatId: payload.inventoryId ?? null }
        : payload.slot === 'outfit'
          ? { outfitId: payload.inventoryId ?? null }
          : { accessoryId: payload.inventoryId ?? null }

    return this.heroService.updateEquipment(userId, dto)
  }
}
