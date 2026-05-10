import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { COLORS, ROUNDING, TYPOGRAPHY } from '../theme';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&';
const TARGET = 'typing...';

function WaveIndicator() {
  const dots = [useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current, useRef(new Animated.Value(0)).current];

  useEffect(() => {
    const anims = dots.map((dot, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(600),
        ])
      )
    );
    anims.forEach(a => a.start());
    return () => anims.forEach(a => a.stop());
  }, []);

  return (
    <View style={styles.waveContainer}>
      {dots.map((dot, i) => (
        <Animated.View key={i} style={[styles.dot, { transform: [{ translateY: dot }] }]} />
      ))}
    </View>
  );
}

function DecryptedTextIndicator() {
  const [display, setDisplay] = useState('');
  const frameRef = useRef(0);
  const iterRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      iterRef.current += 0.3;
      const resolved = TARGET.split('').map((char, idx) => {
        if (idx < Math.floor(iterRef.current)) return char;
        return CHARS[Math.floor(Math.random() * CHARS.length)];
      }).join('');

      setDisplay(resolved);

      if (iterRef.current >= TARGET.length) {
        iterRef.current = 0;
      }
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return (
    <View style={styles.decryptContainer}>
      <Text style={styles.decryptText}>{display}</Text>
    </View>
  );
}

export default function TypingIndicator({ isMutual = false, username }) {
  return (
    <View style={styles.container}>
      <View style={styles.bubble}>
        {isMutual ? <DecryptedTextIndicator /> : <WaveIndicator />}
      </View>
      {username && <Text style={styles.label}>{username}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  bubble: {
    backgroundColor: COLORS.surface,
    borderRadius: ROUNDING.xl,
    borderBottomLeftRadius: ROUNDING.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 60,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 18,
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.textMuted,
  },
  decryptContainer: {
    height: 18,
    justifyContent: 'center',
  },
  decryptText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.fontSizes.xs,
    marginTop: 3,
    marginLeft: 8,
  },
});
