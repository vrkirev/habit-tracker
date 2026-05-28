import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { lastNDays, friendlyDate } from '../utils/dates';

const PURPLE = '#6C63FF';
const TEXT = '#1C1C1E';
const SUBTEXT = '#8E8E93';
const GRAY = '#F5F5F7';
const GREEN = '#22C55E';

export const LogScreen: React.FC = () => {
  const { habits } = useApp();

  const days = useMemo(() => lastNDays(30).reverse(), []);

  const rows = useMemo(() =>
    days.map(date => {
      const completed = habits.filter(h => (h.completions[date] ?? 0) >= h.targetCount);
      const partial = habits.filter(
        h => h.type === 'volume' && (h.completions[date] ?? 0) > 0 && (h.completions[date] ?? 0) < h.targetCount
      );
      return { date, completed, partial, total: habits.length };
    }).filter(r => r.completed.length > 0 || r.partial.length > 0),
    [days, habits]
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Habit Log</Text>
        <Text style={styles.subtitle}>Last 30 days</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {rows.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={styles.emptyText}>No history yet — start tracking today!</Text>
          </View>
        )}

        {rows.map(({ date, completed, partial, total }) => {
          const pct = total > 0 ? completed.length / total : 0;
          return (
            <View key={date} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayLabel}>{friendlyDate(date)}</Text>
                <View style={[styles.badge, pct === 1 && styles.badgePerfect]}>
                  <Text style={[styles.badgeText, pct === 1 && styles.badgeTextPerfect]}>
                    {completed.length}/{total}
                  </Text>
                </View>
              </View>

              {/* Mini progress bar */}
              <View style={styles.miniTrack}>
                <View style={[styles.miniFill, { width: `${Math.round(pct * 100)}%` }]} />
              </View>

              <View style={styles.pills}>
                {completed.map(h => (
                  <View key={h.id} style={styles.pill}>
                    <Text style={styles.pillEmoji}>{h.emoji}</Text>
                    <Text style={styles.pillName}>{h.name}</Text>
                  </View>
                ))}
                {partial.map(h => (
                  <View key={h.id} style={[styles.pill, styles.pillPartial]}>
                    <Text style={styles.pillEmoji}>{h.emoji}</Text>
                    <Text style={[styles.pillName, styles.pillNamePartial]}>
                      {h.name} ({h.completions[date]}/{h.targetCount})
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
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

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, color: SUBTEXT, textAlign: 'center' },

  dayCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dayLabel: { fontSize: 15, fontWeight: '700', color: TEXT },
  badge: { backgroundColor: '#F3F4F6', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgePerfect: { backgroundColor: '#DCFCE7' },
  badgeText: { fontSize: 13, fontWeight: '700', color: SUBTEXT },
  badgeTextPerfect: { color: '#16A34A' },

  miniTrack: { height: 4, backgroundColor: '#F3F4F6', borderRadius: 2, overflow: 'hidden', marginBottom: 12 },
  miniFill: { height: '100%', backgroundColor: GREEN, borderRadius: 2 },

  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F0FDF4', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  pillPartial: { backgroundColor: '#FFF7ED' },
  pillEmoji: { fontSize: 14 },
  pillName: { fontSize: 13, fontWeight: '600', color: '#16A34A' },
  pillNamePartial: { color: '#EA580C' },
});
