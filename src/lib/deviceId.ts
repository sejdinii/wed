import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Stable anonymous device identity — scopes server-side bookings to this
 * install until real accounts land (Wave 2 claims device bookings into the
 * user's account). Not a secret, not PII.
 */
const KEY = 'kapar.deviceId.v1';

let cached: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  const existing = await AsyncStorage.getItem(KEY);
  if (existing) {
    cached = existing;
    return existing;
  }
  const fresh = `dev_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(KEY, fresh);
  cached = fresh;
  return fresh;
}
