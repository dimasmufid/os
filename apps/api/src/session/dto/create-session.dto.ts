import { IsIn, IsOptional, IsUUID } from 'class-validator'

export class StartSessionDto {
  @IsIn([25, 50, 90])
  durationMinutes!: 25 | 50 | 90

  @IsOptional()
  @IsUUID()
  taskId?: string
}

export class CompleteSessionDto {
  @IsUUID()
  sessionId!: string
}

export class CancelSessionDto {
  @IsUUID()
  sessionId!: string
}
