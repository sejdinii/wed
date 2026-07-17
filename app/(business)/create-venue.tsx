import React, { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { AppText } from '@/design/components/AppText';
import { Button } from '@/design/components/Button';
import { Chip } from '@/design/components/Chip';
import { PressableScale } from '@/design/components/PressableScale';
import { Screen } from '@/design/components/Screen';
import { Stepper } from '@/design/components/Stepper';
import { useTheme } from '@/design/theme';
import { radius, spacing, typeScale } from '@/design/tokens';
import { haptic } from '@/lib/haptics';
import type { CityKey, VenueType } from '@/domain/types';
import { vendorApi, VenueExistsError } from '@/data/vendorApi';
import { useI18n } from '@/i18n';

const CITIES: CityKey[] = ['skopje', 'tetovo', 'gostivar', 'ohrid', 'bitola', 'struga', 'kumanovo', 'prilep', 'veles', 'stip', 'strumica', 'kavadarci', 'gevgelija'];
const TYPES: VenueType[] = ['garden', 'lake', 'ballroom', 'terrace', 'panoramic', 'restaurant'];

/**
 * Listing funnel (Wave 3) — deliberately ONE short form, not Booking.com's
 * 20-step property wizard: a venue owner on a phone finishes in two minutes,
 * details (photos, halls, menus, translations) are edited later from Today.
 * Creates the venue UNPUBLISHED; publishing is an explicit second act.
 */
export default function CreateVenueScreen() {
  const { colors, mode } = useTheme();
  const { t } = useI18n();
  const router = useRouter();

  const [name, setName] = useState('');
  const [city, setCity] = useState<CityKey>('skopje');
  const [venueType, setVenueType] = useState<VenueType>('garden');
  const [capacityMin, setCapacityMin] = useState(80);
  const [capacityMax, setCapacityMax] = useState(300);
  const [price, setPrice] = useState('1200');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceMkd = Number(price.replace(/\D/g, ''));
  const valid = name.trim().length >= 2 && priceMkd >= 200 && priceMkd <= 10_000 && capacityMax > capacityMin;

  const submit = async () => {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await vendorApi.createVenue({
        name: name.trim(),
        city,
        venueType,
        capacityMin,
        capacityMax,
        pricePerGuestMkd: priceMkd,
        address: address.trim() || undefined,
        phone: phone.trim() || undefined,
        description: description.trim() || undefined,
      });
      haptic.success();
      router.replace('/today');
    } catch (e) {
      haptic.error();
      setError(e instanceof VenueExistsError ? t('vendor.alreadyExists') : t('error.body'));
      setSaving(false);
    }
  };

  const inputStyle = {
    ...typeScale.body,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing(3.5),
    height: 50,
    backgroundColor: mode === 'dark' ? colors.surfaceElevated : colors.surface,
  } as const;

  const field = (label: string, value: string, onChange: (v: string) => void, opts?: { multiline?: boolean; keyboard?: 'number-pad' | 'phone-pad' }) => (
    <View style={{ gap: spacing(1.5) }}>
      <AppText variant="label" color="secondary">
        {label}
      </AppText>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline={opts?.multiline}
        keyboardType={opts?.keyboard}
        placeholderTextColor={colors.textTertiary}
        accessibilityLabel={label}
        style={[inputStyle, opts?.multiline ? { height: 96, paddingTop: spacing(3) } : null]}
      />
    </View>
  );

  return (
    <Screen>
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
          {t('vendor.createTitle')}
        </AppText>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: spacing(4), gap: spacing(4), paddingBottom: spacing(24) }}
      >
        <AppText variant="bodySm" color="secondary">
          {t('vendor.createIntro')}
        </AppText>

        {field(t('vendor.nameLabel'), name, setName)}

        <View style={{ gap: spacing(2) }}>
          <AppText variant="label" color="secondary">
            {t('vendor.cityLabel')}
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
            {CITIES.map((c) => (
              <Chip key={c} label={t(`city.${c}`)} selected={city === c} onPress={() => setCity(c)} />
            ))}
          </View>
        </View>

        <View style={{ gap: spacing(2) }}>
          <AppText variant="label" color="secondary">
            {t('vendor.typeLabel')}
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
            {TYPES.map((tp) => (
              <Chip key={tp} label={t(`venueTypeShort.${tp}`)} selected={venueType === tp} onPress={() => setVenueType(tp)} />
            ))}
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing(4) }}>
          <View style={{ flex: 1, gap: spacing(1.5) }}>
            <AppText variant="label" color="secondary">
              {t('vendor.capMin')}
            </AppText>
            <Stepper value={capacityMin} min={10} max={capacityMax - 10} step={10} onChange={setCapacityMin} accessibilityLabel={t('vendor.capMin')} />
          </View>
          <View style={{ flex: 1, gap: spacing(1.5) }}>
            <AppText variant="label" color="secondary">
              {t('vendor.capMax')}
            </AppText>
            <Stepper value={capacityMax} min={capacityMin + 10} max={1500} step={10} onChange={setCapacityMax} accessibilityLabel={t('vendor.capMax')} />
          </View>
        </View>

        {field(t('vendor.priceLabel'), price, (v) => setPrice(v.replace(/\D/g, '').slice(0, 5)), { keyboard: 'number-pad' })}
        {field(t('vendor.addressLabel'), address, setAddress)}
        {field(t('vendor.phoneLabel'), phone, (v) => setPhone(v.replace(/[^\d+ ]/g, '')), { keyboard: 'phone-pad' })}
        {field(t('vendor.descLabel'), description, setDescription, { multiline: true })}

        <AppText variant="caption" color="tertiary">
          {t('vendor.descHint')}
        </AppText>

        {error ? (
          <AppText variant="bodySm" color="danger">
            {error}
          </AppText>
        ) : null}
      </ScrollView>

      <View style={{ borderTopWidth: 1, borderTopColor: colors.border, padding: spacing(4), backgroundColor: colors.surface }}>
        <Button title={t('vendor.createCta')} onPress={submit} disabled={!valid} loading={saving} fullWidth />
      </View>
    </Screen>
  );
}
