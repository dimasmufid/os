import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  type Database,
  cosmeticItems,
  heroProfiles,
  inventoryItems,
  worldStates,
} from '@os/db';
import type { HeroProfileResponse } from '@os/types';
import { and, eq, inArray } from 'drizzle-orm';

import { DATABASE_TOKEN } from '../database/database.constants';
import { UpdateHeroDto } from './dto/update-hero.dto';
import { UpdateHeroEquipmentDto } from './dto/update-hero-equipment.dto';

@Injectable()
export class HeroService {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database) {}

  async getProfile(userId: string): Promise<HeroProfileResponse> {
    const hero = await this.ensureHeroProfile(userId);
    const world = await this.ensureWorldState(userId);

    const equippedIds = [
      hero.equippedHatId,
      hero.equippedOutfitId,
      hero.equippedAccessoryId,
    ].filter((value): value is string => Boolean(value));

    const equippedCosmetics = equippedIds.length
      ? await this.db
          .select()
          .from(cosmeticItems)
          .where(inArray(cosmeticItems.id, equippedIds))
      : [];

    const cosmeticMap = new Map(
      equippedCosmetics.map((item) => [item.id, item]),
    );

    return {
      hero,
      world,
      equippedCosmetics: {
        hat: hero.equippedHatId
          ? (cosmeticMap.get(hero.equippedHatId) ?? null)
          : null,
        outfit: hero.equippedOutfitId
          ? (cosmeticMap.get(hero.equippedOutfitId) ?? null)
          : null,
        accessory: hero.equippedAccessoryId
          ? (cosmeticMap.get(hero.equippedAccessoryId) ?? null)
          : null,
      },
    };
  }

  async updateHero(userId: string, dto: UpdateHeroDto) {
    await this.ensureHeroProfile(userId);

    const updates: Partial<typeof heroProfiles.$inferInsert> = {};

    if (dto.heroName !== undefined) {
      updates.heroName = dto.heroName.trim();
    }

    if (dto.portraitUrl !== undefined) {
      updates.portraitUrl = dto.portraitUrl ?? null;
    }

    if (Object.keys(updates).length > 0) {
      await this.db
        .update(heroProfiles)
        .set(updates)
        .where(eq(heroProfiles.userId, userId));
    }

    return this.getProfile(userId);
  }

  async updateEquipment(userId: string, dto: UpdateHeroEquipmentDto) {
    await this.ensureHeroProfile(userId);

    const updates: Partial<typeof heroProfiles.$inferInsert> = {};

    if (dto.hatId !== undefined) {
      updates.equippedHatId = await this.resolveEquippableItem(
        userId,
        dto.hatId,
        'hat',
      );
    }

    if (dto.outfitId !== undefined) {
      updates.equippedOutfitId = await this.resolveEquippableItem(
        userId,
        dto.outfitId,
        'outfit',
      );
    }

    if (dto.accessoryId !== undefined) {
      updates.equippedAccessoryId = await this.resolveEquippableItem(
        userId,
        dto.accessoryId,
        'accessory',
      );
    }

    if (Object.keys(updates).length === 0) {
      return this.getProfile(userId);
    }

    await this.db
      .update(heroProfiles)
      .set(updates)
      .where(eq(heroProfiles.userId, userId));

    return this.getProfile(userId);
  }

  async ensureHeroProfile(userId: string) {
    const existing = await this.db.query.heroProfiles.findFirst({
      where: eq(heroProfiles.userId, userId),
    });

    if (existing) {
      return existing;
    }

    await this.db
      .insert(heroProfiles)
      .values({
        userId,
        heroName: 'LifeOS Hero',
      })
      .onConflictDoNothing();

    const created = await this.db.query.heroProfiles.findFirst({
      where: eq(heroProfiles.userId, userId),
    });

    if (!created) {
      throw new NotFoundException('Failed to initialize hero profile');
    }

    return created;
  }

  async ensureWorldState(userId: string) {
    const existing = await this.db.query.worldStates.findFirst({
      where: eq(worldStates.userId, userId),
    });

    if (existing) {
      return existing;
    }

    await this.db
      .insert(worldStates)
      .values({
        userId,
      })
      .onConflictDoNothing();

    const created = await this.db.query.worldStates.findFirst({
      where: eq(worldStates.userId, userId),
    });

    if (!created) {
      throw new NotFoundException('Failed to initialize world state');
    }

    return created;
  }

  private async resolveEquippableItem(
    userId: string,
    cosmeticId: string | null,
    expectedType: 'hat' | 'outfit' | 'accessory',
  ) {
    if (cosmeticId === null) {
      return null;
    }

    const record = await this.db
      .select({
        id: cosmeticItems.id,
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
          eq(inventoryItems.cosmeticItemId, cosmeticId),
        ),
      )
      .limit(1);

    if (record.length === 0) {
      throw new BadRequestException(
        `Cosmetic ${cosmeticId} is not unlocked by this hero`,
      );
    }

    const item = record[0];

    if (item.type !== expectedType) {
      throw new BadRequestException(
        `Cosmetic type mismatch: expected ${expectedType}`,
      );
    }

    return cosmeticId;
  }
}
