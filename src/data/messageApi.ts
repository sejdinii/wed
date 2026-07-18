import type { ChatMessage as StoreChatMessage } from '@kapar/domain';

import { API_MODE, API_URL } from './api';
import { getDeviceId } from '@/lib/deviceId';
import { useMessages } from '@/stores/messages';
import { usePreferences } from '@/stores/preferences';

/**
 * Repository boundary for the couple<->vendor chat (Wave 5), replacing the
 * scripted venueBot fiction with a real thread. The wire/DTO shape here
 * (`senderRole: 'couple'|'vendor'`) is intentionally its own type — the
 * offline-demo store (`src/stores/messages.ts`, unchanged shape) still uses
 * `from: 'couple'|'venue'`; MockMessageApi is the seam that reconciles them.
 */
export interface ChatMessage {
  id: string;
  senderRole: 'couple' | 'vendor';
  body: string;
  createdAtISO: string;
}

export interface MessageApi {
  list(bookingId: string): Promise<ChatMessage[]>;
  send(bookingId: string, body: string): Promise<ChatMessage>;
}

function shouldFail(): boolean {
  return (globalThis as { __KAPAR_API_FAIL__?: boolean }).__KAPAR_API_FAIL__ === true;
}

/**
 * HTTP implementation — mirrors bookingApi.ts's HttpBookingApi exactly:
 * bearer header when logged in, deviceId query fallback for device-only
 * couples (the server resolves the caller's side from whichever is present).
 */
class HttpMessageApi implements MessageApi {
  constructor(private readonly baseUrl: string) {}

  private async request<T>(path: string, init?: RequestInit): Promise<{ status: number; body: T }> {
    if (shouldFail()) throw new Error('Simulated network failure');
    const token = usePreferences.getState().authToken;
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      ...init,
    });
    const body = res.status === 204 ? (undefined as T) : ((await res.json()) as T);
    return { status: res.status, body };
  }

  async list(bookingId: string): Promise<ChatMessage[]> {
    const deviceId = await getDeviceId();
    const { status, body } = await this.request<ChatMessage[]>(
      `/v1/bookings/${encodeURIComponent(bookingId)}/messages?deviceId=${encodeURIComponent(deviceId)}`,
    );
    if (status !== 200) throw new Error(`list messages failed: ${status}`);
    return body;
  }

  async send(bookingId: string, body: string): Promise<ChatMessage> {
    const deviceId = await getDeviceId();
    const { status, body: resBody } = await this.request<ChatMessage & { error?: string }>(
      `/v1/bookings/${encodeURIComponent(bookingId)}/messages?deviceId=${encodeURIComponent(deviceId)}`,
      { method: 'POST', body: JSON.stringify({ body }) },
    );
    if (status !== 201) throw new Error(resBody?.error ?? `send message failed: ${status}`);
    return resBody;
  }
}

/**
 * Offline demo path — wraps the EXISTING bookingId-keyed thread store
 * (no shape changes). venueBot.ts keeps narrating the scripted venue side
 * into that same store on its compressed timers; this class never runs
 * that fiction itself, and API mode never touches it (see API_MODE gate
 * below and in venueBot.ts).
 */
class MockMessageApi implements MessageApi {
  private toChat(m: StoreChatMessage): ChatMessage {
    return { id: m.id, senderRole: m.from === 'venue' ? 'vendor' : 'couple', body: m.text, createdAtISO: m.atISO };
  }

  async list(bookingId: string): Promise<ChatMessage[]> {
    return useMessages
      .getState()
      .threadFor(bookingId)
      .map((m) => this.toChat(m));
  }

  async send(bookingId: string, body: string): Promise<ChatMessage> {
    const trimmed = body.trim();
    const message: StoreChatMessage = {
      id: `m_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      bookingId,
      from: 'couple',
      text: trimmed,
      atISO: new Date().toISOString(),
    };
    useMessages.getState().send(message);
    return this.toChat(message);
  }
}

export const messageApi: MessageApi = API_MODE ? new HttpMessageApi(API_URL as string) : new MockMessageApi();
