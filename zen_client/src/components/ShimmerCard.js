import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, ROUNDING } from '../theme';

export default function ShimmerCard() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-280, 280],
  });

  const ShimmerBar = ({ width, height, style }) => (
    <View style={[{ width, height, borderRadius: ROUNDING.sm, backgroundColor: COLORS.surfaceLight, overflow: 'hidden' }, style]}>
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.06)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );

  return (
    <View style={styles.card}>
      <ShimmerBar width={44} height={44} style={{ borderRadius: 22 }} />
      <View style={styles.info}>
        <ShimmerBar width={140} height={14} style={{ marginBottom: 8 }} />
        <ShimmerBar width={200} height={11} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.xs,
  },
  info: {
    marginLeft: SPACING.md,
    flex: 1,
  },
});
