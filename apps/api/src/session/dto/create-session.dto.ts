import { IsIn, IsInt, IsOptional, IsUUID } from 'class-validator';

const ALLOWED_DURATIONS = [25, 50, 90];

export class CreateSessionDto {
  @IsOptional()
  @IsUUID()
  taskId?: string;

  @IsInt()
  @IsIn(ALLOWED_DURATIONS)
  durationMinutes!: number;
}
