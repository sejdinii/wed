import React, { useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppText } from '@/design/components/AppText';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { useTheme } from '@/design/theme';
import { radius, spacing, typeScale } from '@/design/tokens';
import { haptic } from '@/lib/haptics';
import { authApi, BadCodeError } from '@/data/authApi';
import { API_MODE } from '@/data/api';
import { usePreferences } from '@/stores/preferences';
import { useI18n } from '@/i18n';

const CODE_LENGTH = 6;

/**
 * Code entry — six boxes backed by one hidden input. API mode exchanges the
 * emailed code for a real session (and claims this device's bookings); the
 * offline mock accepts any 6 digits, as before.
 */
export default function VerifyScreen() {
  const { email, devCode } = useLocalSearchParams<{ email: string; devCode?: string }>();
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const setPhoneVerified = usePreferences((s) => s.setPhoneVerified);
  const setAuth = usePreferences((s) => s.setAuth);

  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [failure, setFailure] = useState<'bad_code' | 'network' | null>(null);
  const inputRef = useRef<TextInput>(null);

  const submit = async (digits: string) => {
    if (checking) return;
    setChecking(true);
    setFailure(null);
    try {
      const destination = typeof email === 'string' ? email : '';
      const { token, user } = await authApi.verify(destination, digits);
      setAuth(token, user);
      if (!API_MODE) setPhoneVerified(destination); // keep the mock gate in sync offline
      haptic.success();
      router.replace('/(tabs)');
    } catch (e) {
      haptic.error();
      setCode('');
      setFailure(e instanceof BadCodeError ? 'bad_code' : 'network');
      setChecking(false);
    }
  };

  const onChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length === CODE_LENGTH) void submit(digits);
  };

  return (
    <Screen edges={['top', 'bottom']}>
      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: spacing(4) }}>
        <PressableScale onPress={() => router.back()} hapticFeedback="select" accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </PressableScale>
      </View>

      <View style={{ paddingHorizontal: spacing(5), gap: spacing(4), alignItems: 'center' }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.mint,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="chatbox-ellipses-outline" size={26} color={colors.primary} />
        </View>
        <AppText variant="display" align="center">
          {t('verify.title')}
        </AppText>
        <AppText variant="body" color="secondary" align="center">
          {t('verify.body', { destination: typeof email === 'string' ? email : '' })}
        </AppText>

        {typeof devCode === 'string' && devCode ? (
          // Dev servers return the code so the demo needs no inbox. Never
          // present in production responses.
          <AppText variant="caption" color="tertiary" align="center">
            {t('verify.devCode', { code: devCode })}
          </AppText>
        ) : null}

        {failure ? (
          <AppText variant="bodySm" color="danger" align="center">
            {failure === 'bad_code' ? t('verify.badCode') : t('error.body')}
          </AppText>
        ) : null}

        {/* Code boxes over a hidden input */}
        <Pressable
          onPress={() => inputRef.current?.focus()}
          accessibilityRole="button"
          style={{ flexDirection: 'row', gap: spacing(2.5), marginTop: spacing(2) }}
        >
          {Array.from({ length: CODE_LENGTH }, (_, i) => {
            const filled = i < code.length;
            const active = i === code.length;
            return (
              <View
                key={i}
                style={{
                  width: 46,
                  height: 56,
                  borderRadius: radius.md,
                  borderWidth: 1.5,
                  borderColor: active ? colors.primary : filled ? colors.borderStrong : colors.border,
                  backgroundColor: colors.surface,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppText variant="title">{code.charAt(i)}</AppText>
              </View>
            );
          })}
        </Pressable>
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={onChange}
          keyboardType="number-pad"
          maxLength={CODE_LENGTH}
          autoFocus
          accessibilityLabel={t('verify.title')}
          style={{ position: 'absolute', opacity: 0, height: 1, width: 1, ...typeScale.body }}
        />

        <PressableScale
          onPress={() => {
            haptic.select();
            if (typeof email === 'string') void authApi.requestCode(email).catch(() => {});
          }}
          hapticFeedback={null}
          accessibilityRole="button"
        >
          <AppText variant="bodyStrong" color="brand">
            {t('verify.resend')}
          </AppText>
        </PressableScale>
      </View>
    </Screen>
  );
}
