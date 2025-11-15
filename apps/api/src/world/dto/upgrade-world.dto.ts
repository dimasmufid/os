import { IsIn } from 'class-validator';

const UPGRADABLE_ROOMS = ['study', 'build', 'plaza'] as const;

type UpgradableRoom = (typeof UPGRADABLE_ROOMS)[number];

export class UpgradeWorldDto {
  @IsIn(UPGRADABLE_ROOMS)
  room!: UpgradableRoom;
}
