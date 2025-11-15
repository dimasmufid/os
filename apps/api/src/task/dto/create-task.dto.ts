import { IsEnum, IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

import type { RoomKey } from '@os/types';

const ROOM_KEYS: RoomKey[] = ['plaza', 'study', 'build', 'training'];

type RoomKeyEnum = (typeof ROOM_KEYS)[number];

export class CreateTaskDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsString()
  @MaxLength(40)
  category!: string;

  @IsEnum(ROOM_KEYS)
  room!: RoomKeyEnum;

  @IsInt()
  @Min(5)
  @Max(240)
  defaultDurationMinutes!: number;
}
