import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch, TextInput, Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { requestPermissions, scheduleReminders, cancelAllReminders } from '../utils/notifications';
import { playChime } from '../utils/audio';

const PURPLE = '#6C63FF';
const TEXT = '#1C1C1E';
const SUBTEXT = '#8E8E93';
const GRAY = '#F5F5F7';

const isValidTime = (t: string) => /^\d{2}:\d{2}$/.test(t);

export const SettingsScreen: React.FC = () => {
  const { habits, notificationSettings, updateNotificationSettings } = useApp();

  const [enabled, setEnabled] = useState(notificationSettings.enabled);
  const [morningTime, setMorningTime] = useState(notificationSettings.morningTime);
  const [eveningTime, setEveningTime] = useState(notificationSettings.eveningTime);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [timeError, setTimeError] = useState(false);

  useEffect(() => {
    setEnabled(notificationSettings.enabled);
    setMorningTime(notificationSettings.morningTime);
    setEveningTime(notificationSettings.eveningTime);
  }, [notificationSettings]);

  const handleToggle = async (val: boolean) => {
    setPermissionDenied(false);
    if (val) {
      const granted = await requestPermissions();
      if (!granted) {
        setPermissionDenied(true);
        return;
      }
      setEnabled(true);
      updateNotificationSettings({ ...notificationSettings, enabled: true, morningTime, eveningTime });
      try { await scheduleReminders(habits, morningTime, eveningTime); } catch {}
    } else {
      setEnabled(false);
      updateNotificationSettings({ ...notificationSettings, enabled: false, morningTime, eveningTime });
      try { await cancelAllReminders(); } catch {}
    }
  };

  const handleSaveTimes = async () => {
    setTimeError(false);
    if (!isValidTime(morningTime) || !isValidTime(eveningTime)) {
      setTimeError(true);
      return;
    }
    setSaving(true);
    try {
      updateNotificationSettings({ ...notificationSettings, enabled, morningTime, eveningTime });
      if (enabled) await scheduleReminders(habits, morningTime, eveningTime);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // scheduling errors are non-fatal — settings are still saved locally
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>Notifications & preferences</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Notifications section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>

          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Daily Reminders</Text>
              <Text style={styles.rowSubtitle}>Check-ins for your habits</Text>
            </View>
            <Switch
              value={enabled}
              onValueChange={handleToggle}
              trackColor={{ false: '#E5E7EB', true: PURPLE }}
              thumbColor="#fff"
            />
          </View>

          {enabled && (
            <>
              <View style={styles.divider} />
              <View style={styles.timeRow}>
                <View style={styles.timeField}>
                  <Text style={styles.fieldLabel}>Morning reminder</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={morningTime}
                    onChangeText={setMorningTime}
                    placeholder="09:00"
                    placeholderTextColor="#aaa"
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                </View>
                <View style={styles.timeField}>
                  <Text style={styles.fieldLabel}>Evening reminder</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={eveningTime}
                    onChangeText={setEveningTime}
                    placeholder="20:00"
                    placeholderTextColor="#aaa"
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                </View>
              </View>
              {timeError && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>Please use HH:MM format (e.g. 09:00)</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.saveTimesBtn, saving && styles.saveTimesBtnDisabled]}
                onPress={handleSaveTimes}
                disabled={saving}
              >
                <Text style={styles.saveTimesBtnText}>
                  {saving ? 'Saving...' : 'Save Times'}
                </Text>
              </TouchableOpacity>

              {saved && (
                <View style={styles.savedBanner}>
                  <Text style={styles.savedBannerText}>✓ Reminder times saved!</Text>
                </View>
              )}

              <View style={styles.notifInfo}>
                <Text style={styles.notifInfoText}>
                  You'll get a morning prompt and an evening check-in each day. No spam — just two reminders.
                </Text>
              </View>
            </>
          )}

          {permissionDenied && (
            <View style={[styles.errorBanner, { marginTop: 12 }]}>
              <Text style={styles.errorBannerText}>
                Please enable notifications in your iPhone Settings to use this feature.
              </Text>
            </View>
          )}
        </View>

        {/* Sound section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sounds</Text>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>Reward Sounds</Text>
              <Text style={styles.rowSubtitle}>Chime on habit & challenge completion</Text>
            </View>
            <Switch
              value={notificationSettings.rewardSoundEnabled}
              onValueChange={val =>
                updateNotificationSettings({ ...notificationSettings, rewardSoundEnabled: val })
              }
              trackColor={{ false: '#E5E7EB', true: PURPLE }}
              thumbColor="#fff"
            />
          </View>
          {notificationSettings.rewardSoundEnabled && (
            <>
              <View style={styles.divider} />
              <TouchableOpacity
                style={styles.testSoundBtn}
                onPress={async () => {
                  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  await playChime();
                }}
              >
                <Text style={styles.testSoundBtnText}>▶ Test Sound</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* About section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Habits tracked</Text>
            <Text style={styles.aboutValue}>{habits.length}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>App version</Text>
            <Text style={styles.aboutValue}>1.0.0</Text>
          </View>
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

  section: {
    backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: TEXT, marginBottom: 16 },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft: { flex: 1, marginRight: 16 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: TEXT },
  rowSubtitle: { fontSize: 13, color: SUBTEXT, marginTop: 2 },

  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 16 },

  timeRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  timeField: { flex: 1 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: SUBTEXT, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.6 },
  timeInput: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12,
    padding: 12, fontSize: 20, fontWeight: '700', color: TEXT, textAlign: 'center',
  },

  saveTimesBtn: { backgroundColor: PURPLE, borderRadius: 14, padding: 14, alignItems: 'center' },
  saveTimesBtnDisabled: { opacity: 0.6 },
  saveTimesBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  notifInfo: { marginTop: 14, backgroundColor: '#F5F3FF', borderRadius: 12, padding: 12 },
  notifInfoText: { fontSize: 13, color: '#6D28D9', lineHeight: 19 },

  aboutRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  aboutLabel: { fontSize: 15, color: TEXT },
  aboutValue: { fontSize: 15, fontWeight: '700', color: PURPLE },

  testSoundBtn: { backgroundColor: '#EEF0FF', borderRadius: 12, padding: 14, alignItems: 'center' },
  testSoundBtnText: { fontSize: 15, fontWeight: '700', color: PURPLE },

  savedBanner: { marginTop: 10, backgroundColor: '#DCFCE7', borderRadius: 10, padding: 12 },
  savedBannerText: { fontSize: 13, color: '#15803D', fontWeight: '600', textAlign: 'center' },
  errorBanner: { marginBottom: 10, backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12 },
  errorBannerText: { fontSize: 13, color: '#DC2626', fontWeight: '600', textAlign: 'center' },
});
