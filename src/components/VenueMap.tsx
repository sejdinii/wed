import React from 'react';
import MapView, { Marker } from 'react-native-maps';

export interface VenueMapProps {
  name: string;
  lat: number;
  lng: number;
  height?: number;
}

/**
 * Native venue map (iOS/Android). Web resolves VenueMap.web.tsx instead —
 * react-native-maps is native-only.
 */
export function VenueMap({ name, lat, lng, height = 160 }: VenueMapProps) {
  return (
    <MapView
      style={{ width: '100%', height }}
      initialRegion={{
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }}
      scrollEnabled={false}
      zoomEnabled={false}
      pitchEnabled={false}
      rotateEnabled={false}
    >
      <Marker coordinate={{ latitude: lat, longitude: lng }} title={name} />
    </MapView>
  );
}
