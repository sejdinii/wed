import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { Divider } from '@/design/components/Divider';
import { ListItemRow } from '@/design/components/ListItemRow';
import { Screen } from '@/design/components/Screen';
import { useTheme } from '@/design/theme';
import { radius, spacing } from '@/design/tokens';
import { haptic } from '@/lib/haptics';
import { authApi } from '@/data/authApi';
import { useBookings } from '@/stores/bookings';
import { usePreferences } from '@/stores/preferences';
import { useI18n } from '@/i18n';

/**
 * Profile — grouped account rows plus the venue-partner card (supply
 * acquisition is the #1 marketplace constraint, so it lives prominently).
 */
export default function ProfileScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const latestBooking = useBookings((s) => s.bookings[0]);
  const authUser = usePreferences((s) => s.authUser);
  const setAuthUser = usePreferences((s) => s.setAuthUser);
  const [becomingVendor, setBecomingVendor] = useState(false);
  const [partnerFailed, setPartnerFailed] = useState(false);
  const isVendor = authUser?.role === 'vendor' || authUser?.role === 'both';

  // Identity is the signed-in account, not booking guesswork: name when a
  // booking supplied one, the account email as the always-true second line.
  const displayName = latestBooking?.contactName ?? authUser?.email ?? t('profile.guest');

  const signOut = () => {
    haptic.select();
    usePreferences.getState().clearAuth();
    router.replace('/welcome');
  };

  // Self-serve for MVP: becoming a partner flips the role and opens Business
  // mode; the real onboarding funnel (listing creation) is Wave 3.
  const openBusiness = async () => {
    if (becomingVendor) return;
    if (isVendor) {
      router.push('/today');
      return;
    }
    setBecomingVendor(true);
    setPartnerFailed(false);
    try {
      const user = await authApi.becomeVendor();
      setAuthUser(user);
      router.push('/today');
    } catch {
      haptic.error();
      setPartnerFailed(true);
    } finally {
      setBecomingVendor(false);
    }
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing(4), gap: spacing(4), paddingBottom: spacing(10) }}>
        <AppText variant="display" align="center">
          {t('profile.title')}
        </AppText>

        {/* Identity */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3.5) }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colors.mint,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="person" size={24} color={colors.onMint} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="heading" numberOfLines={1}>
              {displayName}
            </AppText>
            {/* Signed-in truth beats the retired "accounts coming soon" copy. */}
            {authUser && displayName !== authUser.email ? (
              <AppText variant="bodySm" color="secondary" numberOfLines={1}>
                {authUser.email}
              </AppText>
            ) : !authUser ? (
              <AppText variant="bodySm" color="secondary">
                {t('profile.guestHint')}
              </AppText>
            ) : null}
          </View>
        </View>

        {/* Account group */}
        <View>
          <AppText variant="caption" color="tertiary" style={{ marginBottom: spacing(1) }}>
            {t('profile.account').toUpperCase()}
          </AppText>
          {/* PLACEHOLDER — personal info opens with accounts in v0.2. No payment-
              methods row: the MVP has no online payments (kapar is paid at the venue). */}
          <ListItemRow icon="person-outline" title={t('profile.personalInfo')} chevron onPress={() => {}} />
          <Divider inset={12} />
          <ListItemRow
            icon="chatbubble-outline"
            title={t('profile.messages')}
            chevron
            onPress={() => {
              if (latestBooking) router.push(`/messages/${latestBooking.id}`);
              else router.push('/(tabs)/bookings');
            }}
          />
          <Divider inset={12} />
          <ListItemRow icon="settings-outline" title={t('profile.settings')} chevron onPress={() => router.push('/settings')} />
          {authUser ? (
            <>
              <Divider inset={12} />
              <ListItemRow icon="log-out-outline" title={t('profile.signOut')} onPress={signOut} />
            </>
          ) : null}
        </View>

        {/* Partner funnel → Business mode (Wave 2) */}
        <View style={{ backgroundColor: colors.mint, borderRadius: radius.lg, padding: spacing(4), gap: spacing(2) }}>
          <AppText variant="heading" style={{ color: colors.onMint }}>
            {t('profile.partnerTitle')}
          </AppText>
          <AppText variant="bodySm" style={{ color: colors.onMint }}>
            {t('profile.partnerBody')}
          </AppText>
          <Button
            title={isVendor ? t('business.open') : t('profile.partnerCta')}
            onPress={openBusiness}
            loading={becomingVendor}
            variant="dark"
            size="md"
            style={{ marginTop: spacing(1), alignSelf: 'flex-start' }}
          />
          {partnerFailed ? (
            <AppText variant="bodySm" color="danger">
              {t('error.body')}
            </AppText>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
