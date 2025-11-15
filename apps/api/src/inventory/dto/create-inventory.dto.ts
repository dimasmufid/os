import { IsIn, IsOptional, IsUUID } from 'class-validator'

export class EquipInventoryDto {
  @IsIn(['hat', 'outfit', 'accessory'])
  slot!: 'hat' | 'outfit' | 'accessory'

  @IsOptional()
  @IsUUID()
  inventoryId?: string | null
}
