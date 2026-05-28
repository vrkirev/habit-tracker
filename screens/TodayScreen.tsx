import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useApp } from '../context/AppContext';
import { CelebrationOverlay } from '../components/CelebrationOverlay';
import { playChime } from '../utils/audio';
import { todayStr, dateLabel } from '../utils/dates';
import { HabitType } from '../types';

const EMOJI_OPTIONS = ['⭐', '💪', '🏃', '🍎', '📚', '✏️', '🎯', '🌱', '🧠', '❤️', '🎵', '☕', '💧', '🥗', '😴', '🚶'];

const SUGGESTIONS: { name: string; emoji: string; type: HabitType; targetCount: number; meta: string }[] = [
  { name: 'Morning Walk',     emoji: '🚶', type: 'daily',  targetCount: 1, meta: 'Daily habit' },
  { name: 'Meditate',         emoji: '🧘', type: 'daily',  targetCount: 1, meta: 'Daily habit' },
  { name: 'Read',             emoji: '📚', type: 'daily',  targetCount: 1, meta: 'Daily habit' },
  { name: 'Exercise',         emoji: '💪', type: 'daily',  targetCount: 1, meta: 'Daily habit' },
  { name: 'Journal',          emoji: '✏️', type: 'daily',  targetCount: 1, meta: 'Daily habit' },
  { name: 'Cold Shower',      emoji: '🚿', type: 'daily',  targetCount: 1, meta: 'Daily habit' },
  { name: 'No Sugar',         emoji: '🥗', type: 'daily',  targetCount: 1, meta: 'Daily habit' },
  { name: 'Sleep by 10pm',    emoji: '😴', type: 'daily',  targetCount: 1, meta: 'Daily habit' },
  { name: 'Take Vitamins',    emoji: '💊', type: 'daily',  targetCount: 1, meta: 'Daily habit' },
  { name: 'No Phone in Bed',  emoji: '📵', type: 'daily',  targetCount: 1, meta: 'Daily habit' },
  { name: 'Drink Water',      emoji: '💧', type: 'volume', targetCount: 8, meta: '8× per day' },
  { name: 'Stretch',          emoji: '🤸', type: 'volume', targetCount: 3, meta: '3× per day' },
];
const PURPLE = '#6C63FF';
const GREEN = '#22C55E';
const GRAY = '#F5F5F7';
const TEXT = '#1C1C1E';
const SUBTEXT = '#8E8E93';

export const TodayScreen: React.FC = () => {
  const { habits, addHabit, deleteHabit, logHabit, checkChallengeCompletions, challenges, addChallenge, notificationSettings } = useApp();
  const soundEnabled = notificationSettings.rewardSoundEnabled;

  const [celebration, setCelebration] = useState<{ emoji: string; name: string; big: boolean } | null>(null);
  const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addStep, setAddStep] = useState<'suggest' | 'custom'>('suggest');
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState('⭐');
  const [newType, setNewType] = useState<HabitType>('daily');
  const [newTarget, setNewTarget] = useState('3');

  const closeAddModal = useCallback(() => {
    setAddModalVisible(false);
    setAddStep('suggest');
    setNewName('');
    setNewEmoji('⭐');
    setNewType('daily');
    setNewTarget('3');
  }, []);

  const [challengePrompt, setChallengePrompt] = useState<{ habitId: string; habitName: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const today = todayStr();
  const completedToday = habits.filter(h => (h.completions[today] ?? 0) >= h.targetCount).length;
  const progress = habits.length > 0 ? completedToday / habits.length : 0;
  const allDone = habits.length > 0 && completedToday === habits.length;

  const showCelebration = useCallback((emoji: string, name: string, big = false) => {
    if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
    setCelebration({ emoji, name, big });
    celebrationTimer.current = setTimeout(() => setCelebration(null), big ? 2200 : 1600);
  }, []);

  const handleLog = useCallback(
    async (id: string) => {
      const habit = habits.find(h => h.id === id);
      if (!habit) return;

      const { wasCompleted, isNowComplete } = logHabit(id);

      if (isNowComplete) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (soundEnabled) await playChime();

        // Check if this finishes all habits
        const nowDone = habits.filter(h => {
          if (h.id === id) return true;
          return (h.completions[today] ?? 0) >= h.targetCount;
        }).length;
        const big = nowDone === habits.length;

        showCelebration(habit.emoji, habit.name, big);

        // Check challenge completions — fire after habit celebration settles
        setTimeout(async () => {
          const completed = checkChallengeCompletions();
          if (completed) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (soundEnabled) await playChime();
            showCelebration('🏆', `${completed.durationDays}-Day Challenge Complete!`, true);
          }
        }, 1800);
      } else if (!wasCompleted) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [habits, logHabit, today, showCelebration, checkChallengeCompletions]
  );

  const handleAdd = useCallback(() => {
    if (!newName.trim()) return;
    const target = newType === 'daily' ? 1 : Math.max(1, parseInt(newTarget, 10) || 3);
    const habit = addHabit(newName.trim(), newEmoji, newType, target);
    setNewName('');
    setNewEmoji('⭐');
    setNewType('daily');
    setNewTarget('3');
    setAddModalVisible(false);

    // Suggest 3-day challenge for first habit
    if (habits.length === 0) {
      setTimeout(() => setChallengePrompt({ habitId: habit.id, habitName: habit.name }), 600);
    }
  }, [newName, newEmoji, newType, newTarget, addHabit, habits.length]);

  const handleDelete = useCallback((id: string, name: string) => {
    setDeleteConfirm({ id, name });
  }, []);

  const progressLabel = allDone
    ? 'All done! Great work!'
    : `${completedToday} of ${habits.length} completed`;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.dateLabel}>{dateLabel()}</Text>
        <Text style={styles.title}>Daily Habits</Text>
        <Text style={styles.progressLabel}>{progressLabel}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      </View>

      {/* Habit List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {habits.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={styles.emptyTitle}>No habits yet</Text>
            <Text style={styles.emptySubtitle}>Add your first habit to get started</Text>
          </View>
        )}

        {habits.map(habit => {
          const count = habit.completions[today] ?? 0;
          const done = count >= habit.targetCount;
          const activeChallenge = challenges.find(
            c => c.habitId === habit.id && !c.completedAt
          );

          return (
            <TouchableOpacity
              key={habit.id}
              style={[styles.card, done && styles.cardDone]}
              onPress={() => handleLog(habit.id)}
              onLongPress={() => handleDelete(habit.id, habit.name)}
              activeOpacity={0.75}
            >
              <View style={styles.cardLeft}>
                <View style={[styles.emojiCircle, done && styles.emojiCircleDone]}>
                  <Text style={styles.cardEmoji}>{habit.emoji}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <View style={styles.cardNameRow}>
                    <Text style={[styles.cardName, done && styles.cardNameDone]}>{habit.name}</Text>
                    {activeChallenge && (
                      <View style={styles.challengeBadge}>
                        <Text style={styles.challengeBadgeText}>🏆 {activeChallenge.durationDays}d</Text>
                      </View>
                    )}
                  </View>
                  {habit.streak > 0 ? (
                    <Text style={styles.streakText}>🔥 {habit.streak} day streak</Text>
                  ) : (
                    <Text style={styles.streakEmpty}>Start your streak today</Text>
                  )}
                </View>
              </View>

              {/* Right: volume counter or checkbox */}
              {habit.type === 'volume' ? (
                <View style={styles.volumeRow}>
                  <Text style={[styles.volumeCount, done && styles.volumeCountDone]}>
                    {count}/{habit.targetCount}
                  </Text>
                  <View style={[styles.plusBtn, done && styles.plusBtnDone]}>
                    <Text style={[styles.plusBtnText, done && styles.plusBtnTextDone]}>+</Text>
                  </View>
                </View>
              ) : (
                <View style={[styles.check, done && styles.checkDone]}>
                  {done && <Text style={styles.checkmark}>✓</Text>}
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={styles.addBtn} onPress={() => setAddModalVisible(true)}>
          <Text style={styles.addBtnText}>+ Add Habit</Text>
        </TouchableOpacity>
        {habits.length > 0 && (
          <Text style={styles.hint}>Long-press a habit to delete it</Text>
        )}
      </ScrollView>

      {/* Add Habit Modal */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeAddModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closeAddModal}>
            <TouchableOpacity style={styles.sheet} activeOpacity={1}>
              <View style={styles.sheetHandle} />

              {addStep === 'suggest' ? (
                /* ── Step 1: Suggestions ── */
                <>
                  <Text style={styles.sheetTitle}>Add a Habit</Text>
                  <Text style={styles.sheetSubtitle}>Pick a popular habit or create your own</Text>
                  <ScrollView
                    style={styles.suggestScroll}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                  >
                    {SUGGESTIONS.filter(s => !habits.some(h => h.name === s.name)).map(s => (
                      <TouchableOpacity
                        key={s.name}
                        style={styles.suggestionRow}
                        onPress={async () => {
                          addHabit(s.name, s.emoji, s.type, s.targetCount);
                          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                          closeAddModal();
                        }}
                      >
                        <Text style={styles.suggestionEmoji}>{s.emoji}</Text>
                        <View style={styles.suggestionInfo}>
                          <Text style={styles.suggestionName}>{s.name}</Text>
                          <Text style={styles.suggestionMeta}>{s.meta}</Text>
                        </View>
                        <Text style={styles.suggestionChevron}>›</Text>
                      </TouchableOpacity>
                    ))}

                    <TouchableOpacity
                      style={[styles.suggestionRow, styles.suggestionOther]}
                      onPress={() => setAddStep('custom')}
                    >
                      <Text style={styles.suggestionEmoji}>✏️</Text>
                      <View style={styles.suggestionInfo}>
                        <Text style={styles.suggestionName}>Other (custom)</Text>
                        <Text style={styles.suggestionMeta}>Create your own habit</Text>
                      </View>
                      <Text style={styles.suggestionChevron}>›</Text>
                    </TouchableOpacity>
                  </ScrollView>

                  <TouchableOpacity style={styles.cancelBtnFull} onPress={closeAddModal}>
                    <Text style={styles.cancelBtnFullText}>Cancel</Text>
                  </TouchableOpacity>
                </>
              ) : (
                /* ── Step 2: Custom form ── */
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  bounces={false}
                >
                  <TouchableOpacity style={styles.backBtn} onPress={() => setAddStep('suggest')}>
                    <Text style={styles.backBtnText}>‹ Back</Text>
                  </TouchableOpacity>
                  <Text style={styles.sheetTitle}>Custom Habit</Text>

                  <Text style={styles.fieldLabel}>Choose emoji</Text>
                  <View style={styles.emojiGrid}>
                    {EMOJI_OPTIONS.map(e => (
                      <TouchableOpacity
                        key={e}
                        style={[styles.emojiBtn, newEmoji === e && styles.emojiBtnSel]}
                        onPress={() => setNewEmoji(e)}
                      >
                        <Text style={styles.emojiItem}>{e}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.fieldLabel}>Habit name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Exercise 20 min"
                    placeholderTextColor="#aaa"
                    value={newName}
                    onChangeText={setNewName}
                    returnKeyType="done"
                    autoFocus
                  />

                  <Text style={styles.fieldLabel}>Habit type</Text>
                  <View style={styles.typeRow}>
                    {(['daily', 'volume'] as HabitType[]).map(t => (
                      <TouchableOpacity
                        key={t}
                        style={[styles.typeBtn, newType === t && styles.typeBtnSel]}
                        onPress={() => setNewType(t)}
                      >
                        <Text style={[styles.typeBtnText, newType === t && styles.typeBtnTextSel]}>
                          {t === 'daily' ? 'Daily (once)' : 'Volume (multiple)'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {newType === 'volume' && (
                    <>
                      <Text style={styles.fieldLabel}>Daily target</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. 4"
                        placeholderTextColor="#aaa"
                        value={newTarget}
                        onChangeText={setNewTarget}
                        keyboardType="number-pad"
                      />
                    </>
                  )}

                  <View style={styles.sheetButtons}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={closeAddModal}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.saveBtn, !newName.trim() && styles.saveBtnDisabled]}
                      onPress={handleAdd}
                      disabled={!newName.trim()}
                    >
                      <Text style={[styles.saveBtnText, !newName.trim() && styles.saveBtnTextDisabled]}>
                        Save
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        visible={!!deleteConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteConfirm(null)}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <Text style={styles.alertEmoji}>🗑️</Text>
            <Text style={styles.alertTitle}>Delete Habit?</Text>
            <Text style={styles.alertBody}>Remove "{deleteConfirm?.name}"? This can't be undone.</Text>
            <View style={styles.alertButtons}>
              <TouchableOpacity style={styles.alertSecondary} onPress={() => setDeleteConfirm(null)}>
                <Text style={styles.alertSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.alertPrimary, styles.alertPrimaryDestructive]}
                onPress={() => { deleteHabit(deleteConfirm!.id); setDeleteConfirm(null); }}
              >
                <Text style={styles.alertPrimaryText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Challenge prompt after first habit */}
      <Modal
        visible={!!challengePrompt}
        transparent
        animationType="fade"
        onRequestClose={() => setChallengePrompt(null)}
      >
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <Text style={styles.alertEmoji}>🏆</Text>
            <Text style={styles.alertTitle}>Start a 3-Day Challenge?</Text>
            <Text style={styles.alertBody}>
              Commit to "{challengePrompt?.habitName}" for 3 days straight and earn a reward!
            </Text>
            <View style={styles.alertButtons}>
              <TouchableOpacity
                style={styles.alertSecondary}
                onPress={() => setChallengePrompt(null)}
              >
                <Text style={styles.alertSecondaryText}>Maybe Later</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.alertPrimary}
                onPress={() => {
                  if (challengePrompt) addChallenge(challengePrompt.habitId, 3);
                  setChallengePrompt(null);
                }}
              >
                <Text style={styles.alertPrimaryText}>Let's Go!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Celebration Overlay */}
      <CelebrationOverlay
        visible={!!celebration}
        emoji={celebration?.emoji ?? '✨'}
        habitName={celebration?.name ?? ''}
        isBig={celebration?.big}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PURPLE },

  header: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 28 },
  dateLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500', marginBottom: 4 },
  title: { color: '#fff', fontSize: 32, fontWeight: '800', marginBottom: 16 },
  progressLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  progressTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 4 },

  scroll: { flex: 1, backgroundColor: GRAY, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  scrollContent: { padding: 20, paddingBottom: 48 },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: TEXT, marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: SUBTEXT, textAlign: 'center' },

  card: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardDone: { backgroundColor: '#F0FDF4' },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  emojiCircle: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#EEF0FF', alignItems: 'center', justifyContent: 'center' },
  emojiCircleDone: { backgroundColor: '#DCFCE7' },
  cardEmoji: { fontSize: 24 },
  cardInfo: { flex: 1 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardName: { fontSize: 16, fontWeight: '700', color: TEXT },
  cardNameDone: { color: '#16A34A' },
  challengeBadge: { backgroundColor: '#FFF7ED', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  challengeBadgeText: { fontSize: 11, fontWeight: '700', color: '#EA580C' },
  streakText: { fontSize: 12, color: '#F97316', fontWeight: '600', marginTop: 2 },
  streakEmpty: { fontSize: 12, color: SUBTEXT, marginTop: 2 },

  check: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: '#D1D5DB', alignItems: 'center', justifyContent: 'center' },
  checkDone: { backgroundColor: GREEN, borderColor: GREEN },
  checkmark: { color: '#fff', fontSize: 16, fontWeight: '800' },

  volumeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  volumeCount: { fontSize: 15, fontWeight: '700', color: SUBTEXT },
  volumeCountDone: { color: '#16A34A' },
  plusBtn: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#EEF0FF', alignItems: 'center', justifyContent: 'center' },
  plusBtnDone: { backgroundColor: '#DCFCE7' },
  plusBtnText: { fontSize: 20, fontWeight: '700', color: PURPLE, lineHeight: 24 },
  plusBtnTextDone: { color: GREEN },

  addBtn: { borderWidth: 2, borderColor: PURPLE, borderStyle: 'dashed', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 4, marginBottom: 8 },
  addBtnText: { color: PURPLE, fontSize: 16, fontWeight: '700' },
  hint: { textAlign: 'center', color: SUBTEXT, fontSize: 12, marginTop: 4 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: TEXT, marginBottom: 20 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: SUBTEXT, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  emojiBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: GRAY, alignItems: 'center', justifyContent: 'center' },
  emojiBtnSel: { backgroundColor: '#EEF0FF', borderWidth: 2, borderColor: PURPLE },
  emojiItem: { fontSize: 22 },
  input: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 16, color: TEXT, marginBottom: 20 },
  inputSmall: { marginBottom: 20 },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  typeBtn: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center' },
  typeBtnSel: { backgroundColor: '#EEF0FF', borderColor: PURPLE },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: SUBTEXT },
  typeBtnTextSel: { color: PURPLE },
  sheetButtons: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 16, borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center' },
  cancelBtnText: { fontSize: 16, fontWeight: '700', color: SUBTEXT },
  saveBtn: { flex: 1, padding: 16, borderRadius: 14, backgroundColor: PURPLE, alignItems: 'center' },
  saveBtnDisabled: { backgroundColor: '#E5E7EB' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  saveBtnTextDisabled: { color: '#9CA3AF' },

  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  alertBox: { backgroundColor: '#fff', borderRadius: 24, padding: 28, alignItems: 'center', width: '100%' },
  alertEmoji: { fontSize: 48, marginBottom: 12 },
  alertTitle: { fontSize: 20, fontWeight: '800', color: TEXT, textAlign: 'center', marginBottom: 10 },
  alertBody: { fontSize: 15, color: SUBTEXT, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  alertButtons: { flexDirection: 'row', gap: 12, width: '100%' },
  alertSecondary: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center' },
  alertSecondaryText: { fontSize: 15, fontWeight: '700', color: SUBTEXT },
  alertPrimary: { flex: 1, padding: 14, borderRadius: 14, backgroundColor: PURPLE, alignItems: 'center' },
  alertPrimaryDestructive: { backgroundColor: '#EF4444' },
  alertPrimaryText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  sheetSubtitle: { fontSize: 14, color: SUBTEXT, marginBottom: 16, marginTop: -12 },
  suggestScroll: { maxHeight: 360 },
  suggestionRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  suggestionOther: { borderBottomWidth: 0 },
  suggestionEmoji: { fontSize: 26, width: 40 },
  suggestionInfo: { flex: 1 },
  suggestionName: { fontSize: 15, fontWeight: '700', color: TEXT },
  suggestionMeta: { fontSize: 12, color: SUBTEXT, marginTop: 2 },
  suggestionChevron: { fontSize: 22, color: '#D1D5DB', fontWeight: '300' },
  backBtn: { marginBottom: 8 },
  backBtnText: { fontSize: 16, color: PURPLE, fontWeight: '700' },
  cancelBtnFull: {
    marginTop: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelBtnFullText: { fontSize: 16, fontWeight: '700', color: TEXT },
});
