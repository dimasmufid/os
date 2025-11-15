import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateEmailDto {
  @IsEmail()
  to!: string;

  @IsString()
  subject!: string;

  @IsOptional()
  @IsString()
  html?: string;

  @IsOptional()
  @IsString()
  text?: string;
}
