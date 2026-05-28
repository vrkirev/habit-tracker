import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { lastNDays, shortDayLabel } from '../utils/dates';

const PURPLE = '#6C63FF';
const TEXT = '#1C1C1E';
const SUBTEXT = '#8E8E93';
const GRAY = '#F5F5F7';
const GREEN = '#22C55E';

export const StatsScreen: React.FC = () => {
  const { habits } = useApp();

  const last7 = useMemo(() => lastNDays(7), []);
  const last28 = useMemo(() => lastNDays(28), []);

  // Bar chart data: completion % per day for last 7 days
  const barData = useMemo(
    () =>
      last7.map(date => {
        if (habits.length === 0) return { date, pct: 0 };
        const done = habits.filter(h => (h.completions[date] ?? 0) >= h.targetCount).length;
        return { date, pct: done / habits.length };
      }),
    [last7, habits]
  );

  // Heatmap: 4 weeks x 7 days — most recent first (top-left → bottom-right)
  const heatmapData = useMemo(
    () =>
      [...last28].reverse().map(date => {
        if (habits.length === 0) return { date, pct: 0 };
        const done = habits.filter(h => (h.completions[date] ?? 0) >= h.targetCount).length;
        return { date, pct: done / habits.length };
      }),
    [last28, habits]
  );

  // Top streaks
  const topHabits = useMemo(
    () => [...habits].sort((a, b) => b.streak - a.streak).slice(0, 5),
    [habits]
  );

  const { overallRate, totalDone, totalPossible } = useMemo(() => {
    if (habits.length === 0) return { overallRate: 0, totalDone: 0, totalPossible: 0 };
    const totalPossible = habits.length * 7;
    const totalDone = last7.reduce((sum, date) => {
      return sum + habits.filter(h => (h.completions[date] ?? 0) >= h.targetCount).length;
    }, 0);
    return { overallRate: totalPossible > 0 ? totalDone / totalPossible : 0, totalDone, totalPossible };
  }, [habits, last7]);

  const heatmapColor = (pct: number) => {
    if (pct === 0) return '#E5E7EB';
    if (pct < 0.34) return '#C4B5FD';
    if (pct < 0.67) return '#7C3AED';
    return PURPLE;
  };

  // Group into rows of 7 for a proper grid
  const heatmapRows = useMemo(() => {
    const rows: typeof heatmapData[] = [];
    for (let i = 0; i < heatmapData.length; i += 7) {
      rows.push(heatmapData.slice(i, i + 7));
    }
    return rows;
  }, [heatmapData]);

  const BAR_MAX = 140;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Stats</Text>
        <Text style={styles.subtitle}>Your consistency</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Weekly score */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>This Week's Score</Text>
          <Text style={styles.scoreValue}>{Math.round(overallRate * 100)}%</Text>
          <Text style={styles.scoreFraction}>
            {totalDone} of {totalPossible} reps completed
          </Text>
          <Text style={styles.scoreFractionSub}>
            {habits.length} habit{habits.length !== 1 ? 's' : ''} × 7 days
          </Text>
          <Text style={styles.scoreSubtext}>
            {overallRate >= 0.8 ? 'Excellent! Keep it up!' : overallRate >= 0.5 ? 'Good progress!' : 'Keep pushing — you can do it!'}
          </Text>
        </View>

        {/* 7-day bar chart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Last 7 Days</Text>
          <View style={styles.barChart}>
            {barData.map(({ date, pct }) => (
              <View key={date} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { height: Math.max(4, Math.round(pct * BAR_MAX)) },
                      pct === 1 && styles.barFillPerfect,
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{shortDayLabel(date)}</Text>
                <Text style={styles.barPct}>{Math.round(pct * 100)}%</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 28-day heatmap */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>28-Day Heatmap</Text>
          <View style={styles.heatmapGrid}>
            {heatmapRows.map((row, ri) => (
              <View key={ri} style={styles.heatmapRow}>
                {row.map(({ date, pct }) => (
                  <View key={date} style={[styles.heatCell, { backgroundColor: heatmapColor(pct) }]} />
                ))}
                {/* Pad last row if fewer than 7 days */}
                {row.length < 7 && Array(7 - row.length).fill(null).map((_, i) => (
                  <View key={`pad-${i}`} style={[styles.heatCell, { backgroundColor: 'transparent' }]} />
                ))}
              </View>
            ))}
          </View>
          <View style={styles.heatLegend}>
            {[0, 0.33, 0.66, 1].map(v => (
              <View key={v} style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: heatmapColor(v) }]} />
                <Text style={styles.legendLabel}>{Math.round(v * 100)}%</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Streak leaderboard */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Streak Leaderboard</Text>
          {topHabits.length === 0 ? (
            <Text style={styles.emptyText}>Complete habits to build streaks!</Text>
          ) : (
            topHabits.map((h, i) => (
              <View key={h.id} style={styles.leaderRow}>
                <Text style={styles.leaderRank}>#{i + 1}</Text>
                <Text style={styles.leaderEmoji}>{h.emoji}</Text>
                <Text style={styles.leaderName} numberOfLines={1}>{h.name}</Text>
                <View style={styles.leaderStreak}>
                  <Text style={styles.leaderStreakText}>🔥 {h.streak}</Text>
                </View>
              </View>
            ))
          )}
        </View>
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

  scoreCard: {
    backgroundColor: PURPLE, borderRadius: 20, padding: 24, marginBottom: 16,
    alignItems: 'center',
  },
  scoreLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  scoreValue: { color: '#fff', fontSize: 56, fontWeight: '900', marginBottom: 4 },
  scoreFraction: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 2 },
  scoreFractionSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '500', marginBottom: 10 },
  scoreSubtext: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: '500' },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardTitle: { fontSize: 17, fontWeight: '800', color: TEXT, marginBottom: 16 },

  barChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 170 },
  barCol: { flex: 1, alignItems: 'center' },
  barTrack: { flex: 1, justifyContent: 'flex-end', width: '60%' },
  barFill: { backgroundColor: PURPLE, borderRadius: 4, minHeight: 4 },
  barFillPerfect: { backgroundColor: GREEN },
  barLabel: { fontSize: 11, color: SUBTEXT, marginTop: 6, fontWeight: '600' },
  barPct: { fontSize: 10, color: SUBTEXT, marginTop: 2 },

  heatmapGrid: { gap: 4 },
  heatmapRow: { flexDirection: 'row', gap: 4 },
  heatCell: { flex: 1, height: 28, borderRadius: 4 },
  heatLegend: { flexDirection: 'row', gap: 16, marginTop: 12, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 12, height: 12, borderRadius: 3 },
  legendLabel: { fontSize: 11, color: SUBTEXT },

  emptyText: { color: SUBTEXT, fontSize: 14, textAlign: 'center', paddingVertical: 12 },

  leaderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  leaderRank: { fontSize: 14, fontWeight: '800', color: SUBTEXT, width: 28 },
  leaderEmoji: { fontSize: 22, marginRight: 10 },
  leaderName: { flex: 1, fontSize: 15, fontWeight: '600', color: TEXT },
  leaderStreak: { backgroundColor: '#FFF7ED', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  leaderStreakText: { fontSize: 13, fontWeight: '700', color: '#EA580C' },
});
