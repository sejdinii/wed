import React, { useState } from 'react';
import { FlatList, Pressable, View, useWindowDimensions } from 'react-native';

import { AppText } from '@/design/components/AppText';
import { BrandedImage } from '@/components/BrandedImage';
import { spacing } from '@/design/tokens';

export interface PhotoCarouselProps {
  photos: string[];
  height: number;
  /** Tap on a photo — receives the photo index (opens the full-screen gallery). */
  onPhotoPress?: (index: number) => void;
}

/** Full-bleed paged gallery with dots and the "1/18" counter (C3 spec). */
export function PhotoCarousel({ photos, height, onPhotoPress }: PhotoCarouselProps) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  return (
    <View style={{ height }}>
      <FlatList
        data={photos}
        keyExtractor={(uri) => uri}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index: photoIndex }) => (
          <Pressable
            onPress={onPhotoPress ? () => onPhotoPress(photoIndex) : undefined}
            disabled={!onPhotoPress}
            accessibilityRole={onPhotoPress ? 'imagebutton' : 'image'}
          >
            <BrandedImage uri={item} style={{ width, height }} transition={250} />
          </Pressable>
        )}
      />
      <View
        style={{
          position: 'absolute',
          bottom: spacing(4),
          alignSelf: 'center',
          flexDirection: 'row',
          gap: spacing(1.5),
        }}
      >
        {photos.slice(0, 8).map((uri, i) => (
          <View
            key={uri}
            style={{
              width: i === index ? 18 : 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: i === index ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
            }}
          />
        ))}
      </View>
      <View
        style={{
          position: 'absolute',
          bottom: spacing(4),
          right: spacing(4),
          backgroundColor: 'rgba(0,0,0,0.45)',
          borderRadius: 999,
          paddingHorizontal: spacing(2.5),
          paddingVertical: spacing(1),
        }}
      >
        <AppText variant="caption" style={{ color: '#FFFFFF' }}>
          {index + 1}/{photos.length}
        </AppText>
      </View>
    </View>
  );
}
