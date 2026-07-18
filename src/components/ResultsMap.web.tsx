// Only imported on web — Metro resolves this file exclusively for web builds
// (native picks ResultsMap.tsx), so this CSS import never touches a native
// bundle. react-map-gl's own docs require it alongside maplibre-gl.
import 'maplibre-gl/dist/maplibre-gl.css';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Map, { Marker, type MapRef } from 'react-map-gl/maplibre';

import { AppText } from '@/design/components/AppText';
import { VenueCard } from '@/components/VenueCard';
import { useTheme } from '@/design/theme';
import { radius, spacing } from '@/design/tokens';
import { haptic } from '@/lib/haptics';
import { cheapestPerGuest } from '@/domain/kapar';
import { formatMkd } from '@/lib/money';
import type { Venue } from '@/domain/types';
import { useI18n, type Locale } from '@/i18n';
import type { ResultsMapProps } from './ResultsMap';

// OpenFreeMap — keyless, unlimited, OSM-derived (see BACKLOG.md DESIGN INTEL
// "WEB MAP IMPLEMENTATION FOR EXPO" for the sourced tile-provider comparison
// that picked this over MapTiler's quota-capped free tier).
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
// North Macedonia, whole-country framing (founder pack default).
const MK_LNG = 21.7;
const MK_LAT = 41.6;
const MK_ZOOM = 7.5;
// How long we wait for the map's 'load' event before assuming the tile host
// is unreachable and switching to the neutral-background fallback, rather
// than leaving a frozen grey canvas on screen indefinitely.
const TILE_LOAD_TIMEOUT_MS = 4000;
// Space reserved at the bottom of the map area for the floating List/Map
// pill (see app/results.tsx) so the mini-card never sits underneath it.
const MINICARD_BOTTOM_OFFSET = spacing(22);

type LngLatBounds = [[number, number], [number, number]];

function boundsFor(venues: Venue[]): LngLatBounds | null {
  if (venues.length === 0) return null;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const v of venues) {
    minLat = Math.min(minLat, v.coords.lat);
    maxLat = Math.max(maxLat, v.coords.lat);
    minLng = Math.min(minLng, v.coords.lng);
    maxLng = Math.max(maxLng, v.coords.lng);
  }
  // Padding keeps a single venue (or a tight cluster) from fitting to an
  // absurdly high zoom level.
  const PAD = 0.06;
  return [
    [minLng - PAD, minLat - PAD],
    [maxLng + PAD, maxLat + PAD],
  ];
}

function PinPill({ venue, selected, locale }: { venue: Venue; selected: boolean; locale: Locale }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: selected ? colors.primary : colors.surface,
        borderWidth: 1,
        borderColor: selected ? colors.primary : colors.border,
        borderRadius: radius.pill,
        paddingHorizontal: spacing(2.5),
        paddingVertical: spacing(1),
        transform: [{ scale: selected ? 1.14 : 1 }],
      }}
    >
      <AppText variant="label" style={{ color: selected ? colors.onPrimary : colors.text }}>
        {formatMkd(cheapestPerGuest(venue), locale)}
      </AppText>
    </View>
  );
}

function MiniCard({ venue, onClose }: { venue: Venue; onClose: () => void }) {
  const { colors } = useTheme();
  const { t } = useI18n();
  return (
    <View
      style={{
        position: 'absolute',
        left: spacing(4),
        right: spacing(4),
        bottom: MINICARD_BOTTOM_OFFSET,
        backgroundColor: colors.background,
        borderRadius: radius.lg,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: spacing(1) }}>
        <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel={t('common.close')}>
          <Ionicons name="close-circle" size={22} color={colors.textSecondary} />
        </Pressable>
      </View>
      <VenueCard venue={venue} variant="row" />
    </View>
  );
}

/**
 * Neutral-background degrade: renders the same price-pin markers over a flat
 * colored panel (no real tiles) using a linear lat/lng→percentage projection
 * across the venues' bounding box. Same tap interaction as the real map —
 * used when the tile host can't be reached (see the `tilesBlocked` branch
 * below) so the INTERACTION layer this wave must prove still works even when
 * the network can't.
 */
function NeutralPinField({
  venues,
  selectedId,
  onSelectVenue,
  locale,
  bounds,
}: {
  venues: Venue[];
  selectedId: string | null;
  onSelectVenue: (id: string | null) => void;
  locale: Locale;
  bounds: LngLatBounds | null;
}) {
  const { colors } = useTheme();
  const box = bounds ?? [
    [MK_LNG - 1.6, MK_LAT - 1.1],
    [MK_LNG + 1.6, MK_LAT + 1.1],
  ];
  const [minLng, minLat] = box[0];
  const [maxLng, maxLat] = box[1];
  const lngSpan = Math.max(maxLng - minLng, 0.0001);
  const latSpan = Math.max(maxLat - minLat, 0.0001);

  return (
    <View style={{ flex: 1, backgroundColor: colors.mint, overflow: 'hidden' }}>
      {venues.map((venue) => {
        const xPct = ((venue.coords.lng - minLng) / lngSpan) * 100;
        const yPct = (1 - (venue.coords.lat - minLat) / latSpan) * 100;
        const selected = venue.id === selectedId;
        return (
          <Pressable
            key={venue.id}
            accessibilityRole="button"
            accessibilityLabel={venue.name}
            onPress={() => {
              haptic.select();
              onSelectVenue(selected ? null : venue.id);
            }}
            style={{
              position: 'absolute',
              left: `${xPct}%` as unknown as number,
              top: `${yPct}%` as unknown as number,
              transform: [{ translateX: -24 }, { translateY: -12 }],
            }}
          >
            <PinPill venue={venue} selected={selected} locale={locale} />
          </Pressable>
        );
      })}
    </View>
  );
}

/** Web results map — the real MapLibre implementation (react-map-gl + maplibre-gl, OpenFreeMap tiles). */
export function ResultsMap({ venues, selectedId, onSelectVenue }: ResultsMapProps) {
  const { locale } = useI18n();
  const mapRef = useRef<MapRef>(null);
  const [mapReady, setMapReady] = useState(false);
  const [tilesBlocked, setTilesBlocked] = useState(false);
  const bounds = useMemo(() => boundsFor(venues), [venues]);
  const selectedVenue = venues.find((v) => v.id === selectedId) ?? null;

  useEffect(() => {
    if (mapReady || tilesBlocked) return undefined;
    const timer = setTimeout(() => setTilesBlocked(true), TILE_LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [mapReady, tilesBlocked]);

  useEffect(() => {
    if (!mapReady || tilesBlocked || !bounds || !mapRef.current) return;
    mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 12, duration: 300 });
  }, [mapReady, tilesBlocked, bounds]);

  return (
    <View style={{ flex: 1 }}>
      {tilesBlocked ? (
        <NeutralPinField venues={venues} selectedId={selectedId} onSelectVenue={onSelectVenue} locale={locale} bounds={bounds} />
      ) : (
        <Map
          ref={mapRef}
          reuseMaps
          initialViewState={{ longitude: MK_LNG, latitude: MK_LAT, zoom: MK_ZOOM }}
          mapStyle={STYLE_URL}
          style={{ width: '100%', height: '100%' }}
          onLoad={() => setMapReady(true)}
          onError={(e) => {
            // Style/tile fetch failures land here without throwing (e.g. this
            // environment's outbound proxy blocks tiles.openfreemap.org —
            // confirmed via curl during this build: CONNECT 403). Degrade to
            // the neutral pin field rather than a frozen canvas.
            // eslint-disable-next-line no-console
            console.warn('[ResultsMap] maplibre style/tile error, using neutral pin field:', e?.error?.message ?? e);
            setTilesBlocked(true);
          }}
        >
          {venues.map((venue) => {
            const selected = venue.id === selectedId;
            return (
              <Marker
                key={venue.id}
                longitude={venue.coords.lng}
                latitude={venue.coords.lat}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent?.stopPropagation?.();
                  haptic.select();
                  onSelectVenue(selected ? null : venue.id);
                }}
              >
                <Pressable accessibilityRole="button" accessibilityLabel={venue.name}>
                  <PinPill venue={venue} selected={selected} locale={locale} />
                </Pressable>
              </Marker>
            );
          })}
        </Map>
      )}
      {selectedVenue ? <MiniCard venue={selectedVenue} onClose={() => onSelectVenue(null)} /> : null}
    </View>
  );
}
