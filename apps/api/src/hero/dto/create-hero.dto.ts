import { IsOptional, IsString, Length } from 'class-validator'

export class CreateHeroDto {
  @IsOptional()
  @IsString()
  @Length(1, 32)
  nickname?: string
}
