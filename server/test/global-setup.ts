import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/kapar';

/**
 * Suite-level residue sweep. Test files stamp their bookings with
 * device ids of the form `test-<uuid>` (and auth tests use `test-…@example.com`
 * destinations), so everything they ever created is identifiable. Children
 * (events/messages/notifications) cascade via FK.
 */
export default async function setup(): Promise<void> {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  try {
    await pool.query(`DELETE FROM bookings WHERE device_id LIKE 'test-%'`);
    await pool.query(`DELETE FROM auth_codes WHERE destination LIKE 'test-%@example.com'`);
  } finally {
    await pool.end();
  }
}
