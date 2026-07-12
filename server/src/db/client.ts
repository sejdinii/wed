import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import * as schema from './schema.js';

export const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/kapar';

export const pool = new pg.Pool({ connectionString: DATABASE_URL });

export const db = drizzle(pool, { schema });

export type Db = typeof db;
