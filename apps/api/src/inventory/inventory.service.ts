import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  type Database,
  cosmeticItems,
  heroProfiles,
  inventoryItems,
} from '@os/db';
import type {
  HeroProfileResponse,
  InventoryItem as InventoryItemType,
} from '@os/types';
import { and, eq } from 'drizzle-orm';

import { DATABASE_TOKEN } from '../database/database.constants';
import { HeroService } from '../hero/hero.service';
import { EquipCosmeticDto } from './dto/equip-cosmetic.dto';
import { UpdateHeroEquipmentDto } from '../hero/dto/update-hero-equipment.dto';

@Injectable()
export class InventoryService {
  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: Database,
    private readonly heroService: HeroService,
  ) {}

  async list(userId: string): Promise<InventoryItemType[]> {
    await this.heroService.ensureHeroProfile(userId);

    const rows = await this.db
      .select({
        id: inventoryItems.id,
        unlockedAt: inventoryItems.unlockedAt,
        cosmetic: {
          id: cosmeticItems.id,
          slug: cosmeticItems.slug,
          name: cosmeticItems.name,
          description: cosmeticItems.description,
          type: cosmeticItems.type,
          rarity: cosmeticItems.rarity,
          spriteKey: cosmeticItems.spriteKey,
          previewUrl: cosmeticItems.previewUrl,
        },
        hatId: heroProfiles.equippedHatId,
        outfitId: heroProfiles.equippedOutfitId,
        accessoryId: heroProfiles.equippedAccessoryId,
      })
      .from(inventoryItems)
      .innerJoin(
        cosmeticItems,
        eq(inventoryItems.cosmeticItemId, cosmeticItems.id),
      )
      .leftJoin(heroProfiles, eq(heroProfiles.userId, inventoryItems.userId))
      .where(eq(inventoryItems.userId, userId));

    return rows.map((row) => this.mapInventory(row));
  }

  async equip(
    userId: string,
    dto: EquipCosmeticDto,
  ): Promise<{ hero: HeroProfileResponse; inventory: InventoryItemType[] }> {
    const item = await this.db
      .select({
        cosmeticId: cosmeticItems.id,
        type: cosmeticItems.type,
      })
      .from(inventoryItems)
      .innerJoin(
        cosmeticItems,
        eq(inventoryItems.cosmeticItemId, cosmeticItems.id),
      )
      .where(
        and(
          eq(inventoryItems.userId, userId),
          eq(inventoryItems.cosmeticItemId, dto.cosmeticId),
        ),
      )
      .limit(1);

    if (item.length === 0) {
      throw new NotFoundException('Cosmetic item not found in inventory');
    }

    const record = item[0];

    const updatePayload: UpdateHeroEquipmentDto = {};

    const value = dto.unequip ? null : record.cosmeticId;

    if (record.type === 'hat') {
      updatePayload.hatId = value;
    } else if (record.type === 'outfit') {
      updatePayload.outfitId = value;
    } else {
      updatePayload.accessoryId = value;
    }

    const hero = await this.heroService.updateEquipment(userId, updatePayload);
    const inventory = await this.list(userId);

    return { hero, inventory };
  }

  private mapInventory(row: {
    id: string;
    unlockedAt: Date | null;
    cosmetic: typeof cosmeticItems.$inferSelect;
    hatId: string | null;
    outfitId: string | null;
    accessoryId: string | null;
  }): InventoryItemType {
    const equippedSlot = this.resolveEquippedSlot(row);

    return {
      id: row.id,
      cosmetic: {
        id: row.cosmetic.id,
        slug: row.cosmetic.slug,
        name: row.cosmetic.name,
        description: row.cosmetic.description,
        type: row.cosmetic.type,
        rarity: row.cosmetic.rarity,
        spriteKey: row.cosmetic.spriteKey,
        previewUrl: row.cosmetic.previewUrl,
      },
      unlockedAt: (row.unlockedAt ?? new Date()).toISOString(),
      equipped: Boolean(equippedSlot),
      equippedSlot,
    };
  }

  private resolveEquippedSlot(row: {
    cosmetic: typeof cosmeticItems.$inferSelect;
    hatId: string | null;
    outfitId: string | null;
    accessoryId: string | null;
  }) {
    if (row.cosmetic.type === 'hat' && row.hatId === row.cosmetic.id) {
      return 'hat';
    }

    if (row.cosmetic.type === 'outfit' && row.outfitId === row.cosmetic.id) {
      return 'outfit';
    }

    if (
      row.cosmetic.type === 'accessory' &&
      row.accessoryId === row.cosmetic.id
    ) {
      return 'accessory';
    }

    return null;
  }
}
