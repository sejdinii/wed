import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Runs ONCE per suite invocation, before any test file: clears the
    // residue previous runs left in the shared dev database. Test bookings
    // are identifiable by their device-id marker; without this sweep the
    // per-file date windows (one calendar month each) saturate after enough
    // runs and creates start 409ing on "free" dates — the collision flake
    // that bit three sessions.
    globalSetup: './test/global-setup.ts',
  },
});
