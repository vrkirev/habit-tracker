import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

const PARTICLES = ['✨', '⭐', '🎉', '💫', '🌟', '✨', '⭐', '💫'];

type Props = {
  visible: boolean;
  emoji: string;
  habitName: string;
  isBig?: boolean; // true for "all habits done" or challenge complete
};

export const CelebrationOverlay: React.FC<Props> = ({ visible, emoji, habitName, isBig }) => {
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.3)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const particles = useRef(PARTICLES.map(() => ({
    x: new Animated.Value(0),
    y: new Animated.Value(0),
    opacity: new Animated.Value(0),
    scale: new Animated.Value(0),
  }))).current;

  useEffect(() => {
    if (!visible) {
      backdropOpacity.setValue(0);
      cardScale.setValue(0.3);
      cardOpacity.setValue(0);
      particles.forEach(p => {
        p.x.setValue(0);
        p.y.setValue(0);
        p.opacity.setValue(0);
        p.scale.setValue(0);
      });
      return;
    }

    // Backdrop fade in
    Animated.timing(backdropOpacity, {
      toValue: 0.85,
      duration: 150,
      useNativeDriver: true,
    }).start();

    // Card pop
    Animated.parallel([
      Animated.spring(cardScale, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    // Particles burst outward
    const angles = PARTICLES.map((_, i) => (i / PARTICLES.length) * 2 * Math.PI);
    const distance = isBig ? 160 : 110;

    particles.forEach((p, i) => {
      const angle = angles[i];
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;

      Animated.sequence([
        Animated.delay(i * 30),
        Animated.parallel([
          Animated.spring(p.x, { toValue: dx, tension: 60, friction: 8, useNativeDriver: true }),
          Animated.spring(p.y, { toValue: dy, tension: 60, friction: 8, useNativeDriver: true }),
          Animated.timing(p.opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
          Animated.spring(p.scale, { toValue: isBig ? 1.4 : 1, tension: 80, friction: 6, useNativeDriver: true }),
        ]),
      ]).start();
    });
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-only">
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />

      <View style={styles.center}>
        {/* Particles */}
        {particles.map((p, i) => (
          <Animated.Text
            key={i}
            style={[
              styles.particle,
              {
                transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }],
                opacity: p.opacity,
              },
            ]}
          >
            {PARTICLES[i]}
          </Animated.Text>
        ))}

        {/* Central card */}
        <Animated.View
          style={[
            styles.card,
            isBig && styles.cardBig,
            { transform: [{ scale: cardScale }], opacity: cardOpacity },
          ]}
        >
          <Text style={isBig ? styles.emojiBig : styles.emoji}>{emoji}</Text>
          <Text style={styles.title}>{isBig ? 'All Done!' : 'Complete!'}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{habitName}</Text>
        </Animated.View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1a0040',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    fontSize: 22,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 36,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 20,
    minWidth: 200,
  },
  cardBig: {
    paddingVertical: 36,
    paddingHorizontal: 48,
  },
  emoji: { fontSize: 48, marginBottom: 12 },
  emojiBig: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#1C1C1E', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#6C63FF', fontWeight: '600', maxWidth: 180 },
});
