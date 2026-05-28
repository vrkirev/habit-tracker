import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { CelebrationOverlay } from '../components/CelebrationOverlay';
import { playChime } from '../utils/audio';
import { ONBOARDING_KEY } from '../components/OnboardingModal';
import { friendlyDate } from '../utils/dates';
import { Challenge } from '../types';

const PURPLE = '#6C63FF';
const TEXT = '#1C1C1E';
const SUBTEXT = '#8E8E93';
const GRAY = '#F5F5F7';

const DEV_DAYS = [3, 7, 14];

export const ManageScreen: React.FC = () => {
  const { habits, challenges, simulateDays, forceCompleteChallenge, clearAllData, notificationSettings } = useApp();

  const [simDays, setSimDays] = useState(7);
  const [simDone, setSimDone] = useState(false);
  const [onboardingReset, setOnboardingReset] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [celebration, setCelebration] = useState<{ emoji: string; name: string } | null>(null);
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [notifSent, setNotifSent] = useState(false);
  const [notifDenied, setNotifDenied] = useState(false);

  const activeChallenges = challenges.filter(c => !c.completedAt);

  const handleTestNotification = async () => {
    setNotifDenied(false);
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: asked } = await Notifications.requestPermissionsAsync();
      if (asked !== 'granted') { setNotifDenied(true); return; }
    }

    const firstName = habits[0]?.name ?? 'your habit';
    const activeChallenge = challenges.find(c => !c.completedAt);

    // Rotate through the same templates the app actually sends
    const templates = [
      {
        title: 'Ready to start? 🌅',
        body: `Time to work on ${firstName}. Let's keep your streak going!`,
      },
      {
        title: "Don't forget today's habits 🔔",
        body: `Have you completed ${firstName} today? Check in now!`,
      },
      ...(activeChallenge
        ? [{
            title: '🏆 Challenge reminder',
            body: `You're on a ${activeChallenge.durationDays}-day challenge — keep the momentum going!`,
          }]
        : []),
    ];
    const { title, body } = templates[Math.floor(Date.now() / 1000) % templates.length];

    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 3,
      },
    });

    setNotifSent(true);
    setTimeout(() => setNotifSent(false), 5000);
  };

  const handleForceComplete = async (c: Challenge) => {
    const habit = habits.find(h => h.id === c.habitId);
    forceCompleteChallenge(c.id);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (notificationSettings.rewardSoundEnabled) await playChime();
    if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
    setCelebration({ emoji: habit?.emoji ?? '🏆', name: `${c.durationDays}-Day Challenge Complete!` });
    celebrationTimer.current = setTimeout(() => setCelebration(null), 2500);
  };

  const handleSimulate = () => {
    if (habits.length === 0) return;
    simulateDays(simDays);
    setSimDone(true);
    setTimeout(() => setSimDone(false), 3000);
  };

  const handleResetOnboarding = async () => {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    setOnboardingReset(true);
    setTimeout(() => setOnboardingReset(false), 3000);
  };

  const handleClearAll = async () => {
    await clearAllData();
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    setConfirmClear(false);
    setCleared(true);
    setTimeout(() => setCleared(false), 4000);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Manage</Text>
        <Text style={styles.subtitle}>Dev & data tools</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Test Notification ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Notification</Text>
          <Text style={styles.sectionDesc}>
            Fires a sample notification in 3 seconds. Background the app immediately after tapping to see the native banner exactly as users will.
          </Text>

          <View style={styles.notifPreview}>
            <View style={styles.notifPreviewHeader}>
              <View style={styles.notifAppIcon} />
              <Text style={styles.notifAppName}>Daily Habits</Text>
              <Text style={styles.notifTime}>now</Text>
            </View>
            <Text style={styles.notifTitle}>
              {habits.length > 0
                ? `Ready to start? 🌅`
                : `Don't forget today's habits 🔔`}
            </Text>
            <Text style={styles.notifBody} numberOfLines={2}>
              {habits.length > 0
                ? `Time to work on ${habits[0].name}. Let's keep your streak going!`
                : `Have you completed your habits today? Check in now!`}
            </Text>
          </View>

          <TouchableOpacity style={styles.actionBtn} onPress={handleTestNotification}>
            <Text style={styles.actionBtnText}>Send Test Notification →</Text>
          </TouchableOpacity>

          {notifSent && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>
                ✓ Notification scheduled — background the app now to see the banner!
              </Text>
            </View>
          )}
          {notifDenied && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>
                Notifications permission denied. Enable it in iPhone Settings.
              </Text>
            </View>
          )}
        </View>

        {/* ── Simulate Habits ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Simulate Habits</Text>
          <Text style={styles.sectionDesc}>
            Mark all habits complete for the past N days to test streaks, scores, and heatmap.
          </Text>
          <Text style={styles.fieldLabel}>Days to simulate</Text>
          <View style={styles.pillRow}>
            {DEV_DAYS.map(d => (
              <TouchableOpacity
                key={d}
                style={[styles.pill, simDays === d && styles.pillActive]}
                onPress={() => setSimDays(d)}
              >
                <Text style={[styles.pillText, simDays === d && styles.pillTextActive]}>{d} days</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[styles.actionBtn, habits.length === 0 && styles.actionBtnDisabled]}
            onPress={handleSimulate}
            disabled={habits.length === 0}
          >
            <Text style={styles.actionBtnText}>▶ Run Simulation</Text>
          </TouchableOpacity>
          {habits.length === 0 && (
            <Text style={styles.warningText}>Add at least one habit first.</Text>
          )}
          {simDone && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>✓ Done! Check Stats & Log to see the changes.</Text>
            </View>
          )}
        </View>

        {/* ── Force Complete Challenge ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Force Complete Challenge</Text>
          <Text style={styles.sectionDesc}>
            Instantly mark an active challenge as completed — fills all missing habit completions.
          </Text>
          {activeChallenges.length === 0 ? (
            <Text style={styles.emptyText}>No active challenges.</Text>
          ) : (
            activeChallenges.map(c => {
              const habit = habits.find(h => h.id === c.habitId);
              if (!habit) return null;
              return (
                <View key={c.id} style={styles.challengeRow}>
                  <Text style={styles.challengeEmoji}>{habit.emoji}</Text>
                  <View style={styles.challengeInfo}>
                    <Text style={styles.challengeName}>{habit.name}</Text>
                    <Text style={styles.challengeMeta}>
                      {c.durationDays}-day · started {friendlyDate(c.startDate)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.forceBtn}
                    onPress={() => handleForceComplete(c)}
                  >
                    <Text style={styles.forceBtnText}>Force ✓</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

        {/* ── Reset Onboarding ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reset Onboarding</Text>
          <Text style={styles.sectionDesc}>
            Clears the "seen" flag so the welcome flow appears again on next app launch.
          </Text>
          <TouchableOpacity style={styles.neutralBtn} onPress={handleResetOnboarding}>
            <Text style={styles.neutralBtnText}>↺ Reset Onboarding</Text>
          </TouchableOpacity>
          {onboardingReset && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>✓ Done! Restart the app to see the onboarding.</Text>
            </View>
          )}
        </View>

        {/* ── Danger Zone ── */}
        <View style={[styles.section, styles.dangerSection]}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>Danger Zone</Text>
          <Text style={styles.sectionDesc}>
            Permanently deletes all habits, challenges, settings, and onboarding state.
          </Text>

          {cleared && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>✓ All data cleared.</Text>
            </View>
          )}

          {!confirmClear ? (
            <TouchableOpacity style={styles.dangerBtn} onPress={() => setConfirmClear(true)}>
              <Text style={styles.dangerBtnText}>🗑 Clear All Data</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.confirmBox}>
              <Text style={styles.confirmText}>
                This cannot be undone. Are you sure?
              </Text>
              <View style={styles.confirmRow}>
                <TouchableOpacity
                  style={styles.confirmCancel}
                  onPress={() => setConfirmClear(false)}
                >
                  <Text style={styles.confirmCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmDelete} onPress={handleClearAll}>
                  <Text style={styles.confirmDeleteText}>Yes, Delete Everything</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

      </ScrollView>

      <CelebrationOverlay
        visible={!!celebration}
        emoji={celebration?.emoji ?? '🏆'}
        habitName={celebration?.name ?? ''}
        isBig
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PURPLE },
  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 28 },
  title: { color: '#fff', fontSize: 32, fontWeight: '800', marginBottom: 4 },
  subtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500' },

  scroll: { flex: 1, backgroundColor: GRAY, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  scrollContent: { padding: 20, paddingBottom: 48 },

  section: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: TEXT, marginBottom: 6 },
  sectionDesc: { fontSize: 13, color: SUBTEXT, lineHeight: 19, marginBottom: 16 },

  fieldLabel: { fontSize: 12, fontWeight: '700', color: SUBTEXT, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },

  pillRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  pill: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center' },
  pillActive: { backgroundColor: '#EEF0FF', borderColor: PURPLE },
  pillText: { fontSize: 14, fontWeight: '700', color: SUBTEXT },
  pillTextActive: { color: PURPLE },

  actionBtn: { backgroundColor: PURPLE, borderRadius: 14, padding: 14, alignItems: 'center' },
  actionBtnDisabled: { backgroundColor: '#E5E7EB' },
  actionBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  warningText: { fontSize: 13, color: '#B45309', textAlign: 'center', marginTop: 8 },

  emptyText: { fontSize: 14, color: SUBTEXT, fontStyle: 'italic' },

  challengeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  challengeEmoji: { fontSize: 26, marginRight: 12 },
  challengeInfo: { flex: 1 },
  challengeName: { fontSize: 15, fontWeight: '700', color: TEXT },
  challengeMeta: { fontSize: 12, color: SUBTEXT, marginTop: 2 },
  forceBtn: { backgroundColor: '#DCFCE7', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  forceBtnText: { fontSize: 13, fontWeight: '700', color: '#15803D' },

  neutralBtn: { backgroundColor: '#EEF0FF', borderRadius: 14, padding: 14, alignItems: 'center' },
  neutralBtnText: { fontSize: 15, fontWeight: '700', color: PURPLE },

  dangerSection: { borderWidth: 1.5, borderColor: '#FECACA' },
  dangerTitle: { color: '#DC2626' },
  dangerBtn: { backgroundColor: '#FEE2E2', borderRadius: 14, padding: 14, alignItems: 'center' },
  dangerBtnText: { fontSize: 15, fontWeight: '700', color: '#DC2626' },

  confirmBox: { backgroundColor: '#FFF1F2', borderRadius: 12, padding: 16 },
  confirmText: { fontSize: 14, color: '#9F1239', fontWeight: '600', marginBottom: 14, textAlign: 'center' },
  confirmRow: { flexDirection: 'row', gap: 10 },
  confirmCancel: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center', backgroundColor: '#fff' },
  confirmCancelText: { fontSize: 14, fontWeight: '700', color: SUBTEXT },
  confirmDelete: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: '#DC2626', alignItems: 'center' },
  confirmDeleteText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  successBanner: { marginTop: 12, backgroundColor: '#DCFCE7', borderRadius: 10, padding: 12 },
  successText: { fontSize: 13, color: '#15803D', fontWeight: '600', textAlign: 'center' },

  notifPreview: {
    backgroundColor: '#F5F5F7',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  notifPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  notifAppIcon: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: PURPLE,
  },
  notifAppName: { fontSize: 12, fontWeight: '700', color: SUBTEXT, flex: 1 },
  notifTime: { fontSize: 12, color: SUBTEXT },
  notifTitle: { fontSize: 14, fontWeight: '700', color: TEXT, marginBottom: 3 },
  notifBody: { fontSize: 13, color: SUBTEXT, lineHeight: 18 },

  errorBanner: { marginTop: 12, backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12 },
  errorText: { fontSize: 13, color: '#DC2626', fontWeight: '600', textAlign: 'center' },
});
