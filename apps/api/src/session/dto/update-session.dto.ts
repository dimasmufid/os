import { IsUUID } from 'class-validator';

export class UpdateSessionDto {
  @IsUUID()
  sessionId!: string;
}
