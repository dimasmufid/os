import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateHeroDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  heroName?: string;

  @IsOptional()
  @IsUrl()
  portraitUrl?: string | null;
}
