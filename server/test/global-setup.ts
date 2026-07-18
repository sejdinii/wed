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
    // Venues created by test accounts accumulate too (the catalogue bloated
    // to 600+ before this sweep existed). Children first — not all FKs cascade.
    await pool.query(`CREATE TEMP TABLE doomed AS SELECT v.id FROM venues v JOIN users u ON u.id = v.owner_user_id WHERE u.email LIKE 'test-%@example.com'`);
    await pool.query(`DELETE FROM booking_events WHERE booking_id IN (SELECT id FROM bookings WHERE venue_id IN (SELECT id FROM doomed))`);
    await pool.query(`DELETE FROM notifications WHERE booking_id IN (SELECT id FROM bookings WHERE venue_id IN (SELECT id FROM doomed))`);
    await pool.query(`DELETE FROM messages WHERE booking_id IN (SELECT id FROM bookings WHERE venue_id IN (SELECT id FROM doomed))`);
    await pool.query(`DELETE FROM bookings WHERE venue_id IN (SELECT id FROM doomed)`);
    await pool.query(`DELETE FROM blocked_dates WHERE venue_id IN (SELECT id FROM doomed)`);
    await pool.query(`DELETE FROM halls WHERE venue_id IN (SELECT id FROM doomed)`);
    await pool.query(`DELETE FROM menu_tiers WHERE venue_id IN (SELECT id FROM doomed)`);
    await pool.query(`DELETE FROM venues WHERE id IN (SELECT id FROM doomed)`);
    await pool.query(`DROP TABLE doomed`);
  } finally {
    await pool.end();
  }
}
