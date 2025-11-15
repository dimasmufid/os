import { IsOptional, IsUUID } from 'class-validator'

export class UpdateHeroEquipmentDto {
  @IsOptional()
  @IsUUID()
  hatId?: string | null

  @IsOptional()
  @IsUUID()
  outfitId?: string | null

  @IsOptional()
  @IsUUID()
  accessoryId?: string | null
}
