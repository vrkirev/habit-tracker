import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PURPLE = '#6C63FF';

export const ONBOARDING_KEY = 'hasSeenOnboarding_v1';

const SLIDES = [
  {
    emoji: '🌱',
    title: 'Welcome to Daily Habits',
    body: 'Build habits that stick. Track what matters, stay consistent, and celebrate every win — big or small.',
  },
  {
    emoji: '✅',
    title: 'Track Your Habits',
    body: 'Create daily habits (done once) or volume habits (done multiple times, like 4 glasses of water). Tap to log — simple as that.',
  },
  {
    emoji: '🏆',
    title: 'Take on Challenges',
    body: 'Commit to a 3, 7, or 21-day challenge for any habit. Complete every day and unlock a special celebration reward.',
  },
  {
    emoji: '🎉',
    title: 'Earn Rewards',
    body: 'Every completion triggers a visual burst, haptic feedback, and a chime. Your weekly score and 28-day heatmap keep you accountable.',
  },
];

type Props = {
  visible: boolean;
  onDone: () => void;
};

export const OnboardingModal: React.FC<Props> = ({ visible, onDone }) => {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];

  const handleNext = async () => {
    if (index < SLIDES.length - 1) {
      setIndex(i => i + 1);
    } else {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      onDone();
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    onDone();
  };

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent>
      <View style={styles.root}>
        {/* Skip */}
        {index < SLIDES.length - 1 && (
          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}

        {/* Current slide — no ScrollView, just render by index */}
        <View style={styles.slideContainer}>
          <View style={styles.emojiCircle}>
            <Text style={styles.emoji}>{slide.emoji}</Text>
          </View>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.body}>{slide.body}</Text>
        </View>

        {/* Dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        {/* Button */}
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>
            {index === SLIDES.length - 1 ? "Let's Go!" : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 60,
    paddingTop: 40,
  },
  skipBtn: {
    position: 'absolute',
    top: 56,
    right: 28,
    zIndex: 10,
    padding: 8,
  },
  skipText: { fontSize: 15, fontWeight: '600', color: '#9CA3AF' },

  slideContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  emojiCircle: {
    width: 120,
    height: 120,
    borderRadius: 36,
    backgroundColor: '#EEF0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  emoji: { fontSize: 56 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 34,
  },
  body: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 26,
  },

  dots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  dotActive: {
    backgroundColor: PURPLE,
    width: 24,
  },

  nextBtn: {
    backgroundColor: PURPLE,
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 48,
    width: '100%',
    alignItems: 'center',
  },
  nextBtnText: { fontSize: 17, fontWeight: '800', color: '#fff' },
});
