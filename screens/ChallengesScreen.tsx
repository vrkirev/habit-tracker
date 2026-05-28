import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Modal, StyleSheet,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { lastNDays, friendlyDate, todayStr } from '../utils/dates';
import { CelebrationOverlay } from '../components/CelebrationOverlay';

const PURPLE = '#6C63FF';
const TEXT = '#1C1C1E';
const SUBTEXT = '#8E8E93';
const GRAY = '#F5F5F7';
const GREEN = '#22C55E';

const DURATIONS = [3, 7, 21];

export const ChallengesScreen: React.FC = () => {
  const { habits, challenges, addChallenge } = useApp();
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedHabitId, setSelectedHabitId] = useState<string>('');
  const [selectedDuration, setSelectedDuration] = useState(3);
  const [celebration, setCelebration] = useState(false);

  const today = todayStr();

  const enriched = useMemo(
    () =>
      challenges.map(c => {
        const habit = habits.find(h => h.id === c.habitId);
        if (!habit) return null;

        let doneCount = 0;
        let missedCount = 0;
        const daysCovered = [];
        const [sy, sm, sd] = c.startDate.split('-').map(Number);
        for (let i = 0; i < c.durationDays; i++) {
          // Use local date arithmetic — never toISOString() which shifts the date in UTC+ zones
          const d = new Date(sy, sm - 1, sd + i);
          const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          if (ds > today) break;
          daysCovered.push(ds);
          const done = (habit.completions[ds] ?? 0) >= habit.targetCount;
          if (done) doneCount++;
          else if (ds < today) missedCount++; // today not yet missed — still time
        }

        const daysElapsed = daysCovered.length;
        const endDate = (() => {
          const d = new Date(sy, sm - 1, sd + c.durationDays - 1);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })();

        return { ...c, habit, doneCount, daysElapsed, missedCount, endDate };
      }).filter(Boolean) as Array<NonNullable<ReturnType<typeof enriched[0]>>>,
    [challenges, habits, today]
  );

  const active = enriched.filter(c => !c.completedAt);
  const completed = enriched.filter(c => !!c.completedAt);

  const canStart = () => {
    if (!selectedHabitId) return false;
    // Don't allow duplicate active challenge for same habit
    const exists = active.find(c => c.habitId === selectedHabitId);
    return !exists;
  };

  const handleCreate = () => {
    if (!canStart()) return;
    addChallenge(selectedHabitId, selectedDuration);
    setModalVisible(false);
    setSelectedHabitId('');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Challenges</Text>
        <Text style={styles.subtitle}>Commit & earn rewards</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.newBtn} onPress={() => setModalVisible(true)}>
          <Text style={styles.newBtnText}>+ New Challenge</Text>
        </TouchableOpacity>

        {active.length === 0 && completed.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🏆</Text>
            <Text style={styles.emptyTitle}>No challenges yet</Text>
            <Text style={styles.emptySubtitle}>Start a challenge to stay motivated!</Text>
          </View>
        )}

        {active.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Active</Text>
            {active.map(c => {
              const pct = c.daysElapsed > 0 ? c.doneCount / c.durationDays : 0;
              return (
                <View key={c.id} style={styles.challengeCard}>
                  <View style={styles.challengeTop}>
                    <Text style={styles.challengeEmoji}>{c.habit.emoji}</Text>
                    <View style={styles.challengeInfo}>
                      <Text style={styles.challengeName}>{c.habit.name}</Text>
                      <Text style={styles.challengeMeta}>
                        {c.durationDays}-day challenge · ends {friendlyDate(c.endDate)}
                      </Text>
                    </View>
                    <View style={styles.challengeDayBadge}>
                      <Text style={styles.challengeDayNum}>{c.doneCount}</Text>
                      <Text style={styles.challengeDayOf}>/{c.durationDays}</Text>
                    </View>
                  </View>
                  <View style={styles.challengeTrack}>
                    <View style={[styles.challengeFill, { width: `${Math.round(pct * 100)}%` }]} />
                  </View>
                  <Text style={styles.challengeFooter}>
                    {c.missedCount === 0
                      ? `Perfect so far! ${c.durationDays - c.doneCount} days to go`
                      : `${c.missedCount} day(s) missed`}
                  </Text>
                </View>
              );
            })}
          </>
        )}

        {completed.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Completed</Text>
            {completed.map(c => (
              <View key={c.id} style={[styles.challengeCard, styles.challengeCardDone]}>
                <View style={styles.challengeTop}>
                  <Text style={styles.challengeEmoji}>{c.habit.emoji}</Text>
                  <View style={styles.challengeInfo}>
                    <Text style={styles.challengeName}>{c.habit.name}</Text>
                    <Text style={styles.challengeMetaDone}>
                      {c.durationDays}-day challenge completed!
                    </Text>
                  </View>
                  <Text style={styles.trophyIcon}>🏆</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      {/* New Challenge Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity style={styles.sheet} activeOpacity={1}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>New Challenge</Text>

            <Text style={styles.fieldLabel}>Choose a habit</Text>
            {habits.map(h => (
              <TouchableOpacity
                key={h.id}
                style={[styles.habitOption, selectedHabitId === h.id && styles.habitOptionSel]}
                onPress={() => setSelectedHabitId(h.id)}
              >
                <Text style={styles.habitOptionEmoji}>{h.emoji}</Text>
                <Text style={[styles.habitOptionName, selectedHabitId === h.id && styles.habitOptionNameSel]}>
                  {h.name}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={[styles.fieldLabel, { marginTop: 20 }]}>Duration</Text>
            <View style={styles.durationRow}>
              {DURATIONS.map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.durationBtn, selectedDuration === d && styles.durationBtnSel]}
                  onPress={() => setSelectedDuration(d)}
                >
                  <Text style={[styles.durationNum, selectedDuration === d && styles.durationNumSel]}>{d}</Text>
                  <Text style={[styles.durationLabel, selectedDuration === d && styles.durationLabelSel]}>days</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.sheetButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, !canStart() && styles.saveBtnDisabled]}
                onPress={handleCreate}
                disabled={!canStart()}
              >
                <Text style={styles.saveBtnText}>Start!</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <CelebrationOverlay visible={celebration} emoji="🏆" habitName="Challenge Complete!" isBig />
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

  newBtn: { backgroundColor: PURPLE, borderRadius: 16, padding: 16, alignItems: 'center', marginBottom: 20 },
  newBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: TEXT, marginBottom: 6 },
  emptySubtitle: { fontSize: 14, color: SUBTEXT, textAlign: 'center' },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: SUBTEXT, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12, marginTop: 4 },

  challengeCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  challengeCardDone: { backgroundColor: '#F0FDF4' },
  challengeTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  challengeEmoji: { fontSize: 32, marginRight: 12 },
  challengeInfo: { flex: 1 },
  challengeName: { fontSize: 16, fontWeight: '700', color: TEXT, marginBottom: 2 },
  challengeMeta: { fontSize: 12, color: SUBTEXT },
  challengeMetaDone: { fontSize: 12, color: '#16A34A', fontWeight: '600' },
  challengeDayBadge: { flexDirection: 'row', alignItems: 'baseline', backgroundColor: '#EEF0FF', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  challengeDayNum: { fontSize: 20, fontWeight: '900', color: PURPLE },
  challengeDayOf: { fontSize: 13, fontWeight: '600', color: SUBTEXT },
  challengeTrack: { height: 8, backgroundColor: '#F3F4F6', borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  challengeFill: { height: '100%', backgroundColor: PURPLE, borderRadius: 4 },
  challengeFooter: { fontSize: 12, color: SUBTEXT },
  trophyIcon: { fontSize: 28 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: TEXT, marginBottom: 20 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: SUBTEXT, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 },

  habitOption: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: '#E5E7EB', marginBottom: 8 },
  habitOptionSel: { backgroundColor: '#EEF0FF', borderColor: PURPLE },
  habitOptionEmoji: { fontSize: 22, marginRight: 10 },
  habitOptionName: { fontSize: 15, fontWeight: '600', color: TEXT },
  habitOptionNameSel: { color: PURPLE },

  durationRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  durationBtn: { flex: 1, alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1.5, borderColor: '#E5E7EB' },
  durationBtnSel: { backgroundColor: '#EEF0FF', borderColor: PURPLE },
  durationNum: { fontSize: 28, fontWeight: '900', color: SUBTEXT },
  durationNumSel: { color: PURPLE },
  durationLabel: { fontSize: 12, fontWeight: '600', color: SUBTEXT },
  durationLabelSel: { color: PURPLE },

  sheetButtons: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 16, borderRadius: 14, borderWidth: 1.5, borderColor: '#E5E7EB', alignItems: 'center' },
  cancelBtnText: { fontSize: 16, fontWeight: '700', color: SUBTEXT },
  saveBtn: { flex: 1, padding: 16, borderRadius: 14, backgroundColor: PURPLE, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
