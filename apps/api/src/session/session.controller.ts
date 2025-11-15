import { Body, Controller, Get, Headers, Post } from '@nestjs/common'

import {
  CancelSessionDto,
  CompleteSessionDto,
  StartSessionDto,
} from './dto/create-session.dto'
import { SessionService } from './session.service'

@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post('start')
  start(@Headers('x-user-id') userId: string, @Body() payload: StartSessionDto) {
    return this.sessionService.start(userId, payload)
  }

  @Post('complete')
  complete(@Headers('x-user-id') userId: string, @Body() payload: CompleteSessionDto) {
    return this.sessionService.complete(userId, payload.sessionId)
  }

  @Post('cancel')
  cancel(@Headers('x-user-id') userId: string, @Body() payload: CancelSessionDto) {
    return this.sessionService.cancel(userId, payload.sessionId)
  }

  @Get('history')
  history(@Headers('x-user-id') userId: string) {
    return this.sessionService.history(userId)
  }
}
