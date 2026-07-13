import { API_MODE, API_URL } from './api';
import { getDeviceId } from '@/lib/deviceId';
import { usePreferences, type AuthUser } from '@/stores/preferences';

/** Wrong/expired/reused code. */
export class BadCodeError extends Error {
  constructor() {
    super('bad_code');
    this.name = 'BadCodeError';
  }
}

export interface AuthApi {
  /** Sends a 6-digit code. devCode is present only against dev servers. */
  requestCode(email: string): Promise<{ devCode?: string }>;
  /** Exchanges the code for a session; claims this device's bookings. */
  verify(email: string, code: string): Promise<{ token: string; user: AuthUser }>;
  becomeVendor(): Promise<AuthUser>;
}

function authHeaders(): Record<string, string> {
  const token = usePreferences.getState().authToken;
  return token ? { authorization: `Bearer ${token}` } : {};
}

class HttpAuthApi implements AuthApi {
  constructor(private readonly baseUrl: string) {}

  async requestCode(email: string): Promise<{ devCode?: string }> {
    const res = await fetch(`${this.baseUrl}/v1/auth/request-code`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ channel: 'email', destination: email }),
    });
    if (!res.ok) throw new Error(`request-code failed: ${res.status}`);
    const body = (await res.json()) as { devCode?: string };
    return { ...(body.devCode ? { devCode: body.devCode } : {}) };
  }

  async verify(email: string, code: string): Promise<{ token: string; user: AuthUser }> {
    const deviceId = await getDeviceId();
    const res = await fetch(`${this.baseUrl}/v1/auth/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ destination: email, code, deviceId }),
    });
    if (res.status === 401) throw new BadCodeError();
    if (!res.ok) throw new Error(`verify failed: ${res.status}`);
    return (await res.json()) as { token: string; user: AuthUser };
  }

  async becomeVendor(): Promise<AuthUser> {
    // No body — and no content-type either: fastify 400s an empty
    // application/json body.
    const res = await fetch(`${this.baseUrl}/v1/me/become-vendor`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`become-vendor failed: ${res.status}`);
    return ((await res.json()) as { user: AuthUser }).user;
  }
}

/** Offline demo: any 6 digits pass — same fiction as before, now labelled. */
class MockAuthApi implements AuthApi {
  async requestCode(): Promise<{ devCode?: string }> {
    return {};
  }

  async verify(email: string): Promise<{ token: string; user: AuthUser }> {
    return {
      token: `mock_${Date.now().toString(36)}`,
      user: { id: 'mock-user', email, role: 'couple' },
    };
  }

  async becomeVendor(): Promise<AuthUser> {
    const current = usePreferences.getState().authUser;
    return { id: 'mock-user', email: current?.email ?? 'demo@kapar.mk', role: 'both' };
  }
}

export const authApi: AuthApi = API_MODE ? new HttpAuthApi(API_URL as string) : new MockAuthApi();
