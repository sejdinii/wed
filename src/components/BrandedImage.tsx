import React, { useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Image, type ImageContentFit } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { brand } from '@/design/tokens';

export interface BrandedImageProps {
  uri: string | undefined;
  style?: StyleProp<ViewStyle>;
  contentFit?: ImageContentFit;
  transition?: number;
}

/**
 * Image with the C3 failure rule: a failed or missing photo renders the
 * branded violet gradient with the logo mark — never a broken-image icon.
 */
export function BrandedImage({ uri, style, contentFit = 'cover', transition = 200 }: BrandedImageProps) {
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return (
      <LinearGradient
        colors={[brand.violetDeep, brand.violet, brand.violetBright]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[{ alignItems: 'center', justifyContent: 'center' }, style]}
      >
        <View style={{ opacity: 0.55, alignItems: 'center' }}>
          <Ionicons name="location" size={34} color="#FFFFFF" />
          <Ionicons name="heart" size={11} color={brand.violet} style={{ position: 'absolute', top: 8 }} />
        </View>
      </LinearGradient>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style as never}
      contentFit={contentFit}
      transition={transition}
      onError={() => setFailed(true)}
      accessibilityIgnoresInvertColors
    />
  );
}
