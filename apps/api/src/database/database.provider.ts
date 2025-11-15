import { FactoryProvider } from '@nestjs/common';
import { createDb, type Database } from '@os/db';

import { DATABASE_TOKEN } from './database.constants';

export const databaseProvider: FactoryProvider<Database> = {
  provide: DATABASE_TOKEN,
  useFactory: () => createDb(),
};
