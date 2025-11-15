import { IsEnum, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator'

import type { FocusRoom } from '@os/types'

type AllowedDurations = 25 | 50 | 90

export class CreateTaskDto {
  @IsString()
  @Length(1, 80)
  name!: string

  @IsString()
  @Length(1, 40)
  category!: string

  @IsInt()
  @Min(5)
  @Max(240)
  defaultDuration!: AllowedDurations | number

  @IsEnum(['plaza', 'study', 'build', 'training'], {
    message: 'preferredRoom must be one of plaza, study, build, training',
  })
  preferredRoom!: FocusRoom
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  @Length(1, 80)
  name?: string

  @IsOptional()
  @IsString()
  @Length(1, 40)
  category?: string

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(240)
  defaultDuration?: AllowedDurations | number

  @IsOptional()
  @IsEnum(['plaza', 'study', 'build', 'training'])
  preferredRoom?: FocusRoom
}
