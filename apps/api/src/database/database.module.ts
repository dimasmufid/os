import { Global, Module } from '@nestjs/common'
import { createDb } from '@os/db'

import { DRIZZLE_CLIENT } from './database.constants'

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_CLIENT,
      useFactory: () => createDb({ maxConnections: 5 }),
    },
  ],
  exports: [DRIZZLE_CLIENT],
})
export class DatabaseModule {}
