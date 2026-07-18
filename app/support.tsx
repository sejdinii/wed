import React, { useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AppText } from '@/design/components/AppText';
import { Card } from '@/design/components/Card';
import { ListItemRow } from '@/design/components/ListItemRow';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { useTheme } from '@/design/theme';
import { spacing } from '@/design/tokens';
import { useI18n } from '@/i18n';

const SUPPORT_EMAIL = 'hello@kapar.mk';

/**
 * Support — honest and minimal: what we do (write to us), one channel
 * (email), no SLA theatre, no phone placeholder. Static content: no
 * loading state needed; the only failure mode (mail client won't open) is
 * covered by always showing the raw address, so there's nothing to retry.
 */
export default function SupportScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const [openFailed, setOpenFailed] = useState(false);

  const openMail = () => {
    setOpenFailed(false);
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => setOpenFailed(true));
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing(4),
          paddingVertical: spacing(3),
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <PressableScale onPress={() => router.back()} hapticFeedback="select" accessibilityRole="button" accessibilityLabel={t('common.back')}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </PressableScale>
        <AppText variant="heading" style={{ flex: 1, textAlign: 'center' }}>
          {t('support.title')}
        </AppText>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: spacing(4), gap: spacing(4), paddingBottom: spacing(10) }}>
        <AppText variant="body" color="secondary">
          {t('support.body')}
        </AppText>

        <Card>
          <ListItemRow icon="mail-outline" title={t('support.emailCta')} value={SUPPORT_EMAIL} chevron onPress={openMail} />
        </Card>

        {openFailed ? (
          <AppText variant="bodySm" color="danger">
            {t('support.emailFailed')}
          </AppText>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
