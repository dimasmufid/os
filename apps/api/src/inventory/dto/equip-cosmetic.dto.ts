import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class EquipCosmeticDto {
  @IsUUID()
  cosmeticId!: string;

  @IsOptional()
  @IsBoolean()
  unequip?: boolean;
}
