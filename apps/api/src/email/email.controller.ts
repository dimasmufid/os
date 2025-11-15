import { Body, Controller, Post } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

import { CreateEmailDto } from './dto/create-email.dto';
import { EmailService } from './email.service';

@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  @AllowAnonymous()
  send(@Body() payload: CreateEmailDto) {
    return this.emailService.send(payload);
  }
}
