import type { BookingStatus } from '@/domain/types';
import { usePreferences } from '@/stores/preferences';
import { API_MODE, API_URL } from './api';

export interface NotificationBookingSummary {
  venueName: string;
  contactName: string;
  eventDateISO: string;
  status: BookingStatus;
}

/** kind: 'booking_request' | 'booking_<status>' | 'message' — see server/src/db/schema.ts. */
export interface NotificationItem {
  id: string;
  kind: string;
  bookingId: string | null;
  createdAtISO: string;
  readAtISO?: string;
  booking?: NotificationBookingSummary;
}

export interface NotificationsResult {
  unreadCount: number;
  items: NotificationItem[];
}

/** The notification center's repository boundary (Wave 5). */
export interface NotificationApi {
  list(): Promise<NotificationsResult>;
  /** Marks the caller's rows read. Omit `ids` to mark every unread row. */
  markRead(ids?: string[]): Promise<void>;
}

function authHeaders(): Record<string, string> {
  const token = usePreferences.getState().authToken;
  return token ? { authorization: `Bearer ${token}` } : {};
}

function shouldFail(): boolean {
  return (globalThis as { __KAPAR_API_FAIL__?: boolean }).__KAPAR_API_FAIL__ === true;
}

class HttpNotificationApi implements NotificationApi {
  constructor(private readonly baseUrl: string) {}

  private async request<T>(path: string, init?: { method?: string; body?: unknown }): Promise<{ status: number; body: T }> {
    if (shouldFail()) throw new Error('Simulated network failure');
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: init?.method ?? 'GET',
      headers: {
        ...(init?.body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...authHeaders(),
      },
      ...(init?.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
    });
    return { status: res.status, body: (await res.json().catch(() => undefined)) as T };
  }

  async list(): Promise<NotificationsResult> {
    const { status, body } = await this.request<NotificationsResult>('/v1/notifications');
    if (status !== 200) throw new Error(`list notifications failed: ${status}`);
    return body;
  }

  async markRead(ids?: string[]): Promise<void> {
    const { status } = await this.request<unknown>('/v1/notifications/read', {
      method: 'POST',
      body: ids ? { ids } : {},
    });
    if (status !== 200) throw new Error(`markRead failed: ${status}`);
  }
}

/**
 * Offline demo has no server, so no real events ever land — an empty center
 * is the honest state. Unlike vendorApi's single demo booking (a plausible
 * fiction for showcasing the vendor workflow), fabricating notification rows
 * here would invent an unread badge nobody earned. Never do that.
 */
class MockNotificationApi implements NotificationApi {
  async list(): Promise<NotificationsResult> {
    return { unreadCount: 0, items: [] };
  }
  async markRead(): Promise<void> {}
}

export const notificationApi: NotificationApi = API_MODE ? new HttpNotificationApi(API_URL as string) : new MockNotificationApi();

/**
 * Settings-toggle gate (Wave 5) — partitions every kind exactly once:
 * notifConfirm = booking milestones (request/reserved/confirmed/completed),
 * notifRefund = cancellations + expiry, notifMessages = chat. A kind whose
 * toggle is off is hidden from both the list and the unread badge count.
 */
export function isNotificationVisible(
  kind: string,
  prefs: { notifConfirm: boolean; notifMessages: boolean; notifRefund: boolean },
): boolean {
  if (kind === 'message') return prefs.notifMessages;
  if (kind === 'booking_cancelled_by_venue' || kind === 'booking_cancelled_by_couple' || kind === 'booking_expired') {
    return prefs.notifRefund;
  }
  return prefs.notifConfirm;
}
