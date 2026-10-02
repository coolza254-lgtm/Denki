import { Image, View } from 'react-native';
import { T } from './ui';

const MARK = require('../../assets/logo-mark.png');

/** Logo mark + "Denki" wordmark for the home header. */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Image source={MARK} style={{ width: size * 1.33, height: size }} resizeMode="contain" />
      <T v="title" style={{ fontSize: size * 0.7, lineHeight: size }}>Denki</T>
    </View>
  );
}
