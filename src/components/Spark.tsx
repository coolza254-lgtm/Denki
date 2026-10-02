// "Spark", Denki's little lightning-bolt mascot. Gently bobs up and down.
import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { C } from '../theme';

export type Mood = 'happy' | 'wow' | 'sleepy';

export function Spark({ size = 72, mood = 'happy', still }: { size?: number; mood?: Mood; still?: boolean }) {
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (still) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(bob, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [still]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.06] });
  const rotate = bob.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] });

  return (
    <Animated.View style={{ transform: [{ translateY }, { rotate }] }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {/* sparks */}
        <Path d="M80 14l6-8M88 26l9-4M84 40h9" stroke={C.volt} strokeWidth={5} strokeLinecap="round" />
        {/* body */}
        <Path d="M58 6 18 56h26l-8 38 46-56H56z" fill={C.volt} stroke={C.ink} strokeWidth={5} strokeLinejoin="round" />
        {/* face */}
        {mood === 'sleepy' ? (
          <Path d="M36 44q4 3 8 0M52 44q4 3 8 0" stroke={C.ink} strokeWidth={4} strokeLinecap="round" fill="none" />
        ) : (
          <>
            <Circle cx={40} cy={44} r={4.5} fill={C.ink} />
            <Circle cx={56} cy={44} r={4.5} fill={C.ink} />
            <Circle cx={41.5} cy={42.5} r={1.4} fill="#fff" />
            <Circle cx={57.5} cy={42.5} r={1.4} fill="#fff" />
          </>
        )}
        {mood === 'wow'
          ? <Circle cx={48} cy={55} r={4} fill={C.ink} />
          : <Path d="M41 53q7 6 14 0" stroke={C.ink} strokeWidth={4} strokeLinecap="round" fill="none" />}
        <Circle cx={33} cy={52} r={3.5} fill={C.coral} opacity={0.55} />
        <Circle cx={63} cy={52} r={3.5} fill={C.coral} opacity={0.55} />
      </Svg>
    </Animated.View>
  );
}
