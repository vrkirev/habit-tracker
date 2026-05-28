# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Dev commands

```bash
npm start               # Start Expo dev server — scan QR with Expo Go
npm run ios             # Open in iOS Simulator (requires full Xcode + a downloaded runtime)
npm run android         # Open in Android emulator
npm run web             # Open in browser (requires react-native-web)
npm start --reset-cache # Use after installing new native packages
```

No test runner or linter is configured.

## SDK version

**Expo SDK 54** — pinned to match Expo Go client SDK 54. Do NOT upgrade to SDK 55/56 without confirming the user's Expo Go version. Reference: https://docs.expo.dev/versions/v54.0.0/

When installing packages always use `npx expo install <pkg>` (not `npm install`) so the SDK-compatible version is resolved automatically.

## Architecture

Multi-screen React Native app with bottom tab navigation. Entry point: `index.ts` → `App.tsx` via `registerRootComponent`.

### Navigation (6 tabs)

```
App.tsx
  ← GestureHandlerRootView + SafeAreaProvider + AppProvider
  ← setNotificationHandler called at module level (must be before any screen loads)
  ← NavigationContainer + Bottom Tab Navigator (Ionicons — filled active / outline inactive)
      TodayScreen       ← habit list, add-habit flow, multi-sensory feedback
      LogScreen         ← 30-day history grouped by date
      StatsScreen       ← 7-day bar chart, 28-day heatmap (most-recent first), streak leaderboard
      ChallengesScreen  ← create / track N-day challenges
      SettingsScreen    ← push notification times, reward sound toggle
      ManageScreen      ← dev tools: simulate days, force-complete challenge, test notification, clear data
```

Tab bar height is computed with `useSafeAreaInsets()` to account for iPhone home indicator.

### State management

All shared state lives in `context/AppContext.tsx` (React Context + `useState`). Every mutation calls both `setState` and the corresponding AsyncStorage save (fire-and-forget). Screens access state via the `useApp()` hook.

AsyncStorage keys: `habits_v2`, `challenges_v1`, `notif_settings_v1`.

### Key files

```
types.ts                        ← Habit, Challenge, NotificationSettings
context/AppContext.tsx           ← AppProvider, useApp(), all mutators including simulateDays / forceCompleteChallenge / clearAllData
utils/dates.ts                  ← localDateStr(), todayStr(), lastNDays(), friendlyDate()
utils/streak.ts                 ← computeStreak(completions, targetCount)
utils/storage.ts                ← AsyncStorage helpers (import from 'expo-file-system/legacy' pattern)
utils/notifications.ts          ← scheduleReminders(), requestPermissions(), cancelAllReminders()
utils/audio.ts                  ← preloadChime(), playChime() — generates fanfare WAV at runtime
components/CelebrationOverlay.tsx ← animated particle burst (8 emoji outward + central card)
components/OnboardingModal.tsx  ← 4-slide first-launch modal, persists seen flag to AsyncStorage
screens/TodayScreen.tsx         ← habit tracking, suggestion list, KeyboardAvoidingView modal
screens/ManageScreen.tsx        ← developer tools screen
```

## Key types

```ts
type HabitType = 'daily' | 'volume';

type Habit = {
  id: string;
  name: string;
  emoji: string;
  type: HabitType;
  targetCount: number;                    // 1 for daily; N for volume (e.g. 8 glasses)
  completions: Record<string, number>;    // 'YYYY-MM-DD' → count achieved
  streak: number;
  createdAt: string;
};

type Challenge = {
  id: string;
  habitId: string;
  durationDays: number;
  startDate: string;      // 'YYYY-MM-DD'
  completedAt?: string;   // set when all N days are done
};

type NotificationSettings = {
  enabled: boolean;
  morningTime: string;        // 'HH:MM'
  eveningTime: string;        // 'HH:MM'
  rewardSoundEnabled: boolean;
};
```

## Critical implementation rules

### Date handling — always use local time
**Never use `.toISOString().split('T')[0]`** — it returns UTC and breaks for any UTC+ timezone (shifts the date back by hours). Always use `localDateStr(d: Date)` from `utils/dates.ts`, which uses `getFullYear / getMonth / getDate`.

This applies everywhere: streak computation, challenge day loops, heatmap data, the log screen.

### expo-notifications trigger format
expo-notifications 0.32 requires the `type` field on every trigger. Omitting it silently schedules nothing:

```ts
// ✅ correct
{ type: SchedulableTriggerInputTypes.DAILY, hour: 9, minute: 0 }
{ type: SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3 }

// ❌ silently fails
{ hour: 9, minute: 0, repeats: true }
{ seconds: 3 }
```

### updateNotificationSettings — always spread
Every call to `updateNotificationSettings` must spread the existing settings to avoid silently wiping unrelated fields (e.g. `rewardSoundEnabled`):
```ts
updateNotificationSettings({ ...notificationSettings, enabled: true });
```

### Audio — expo-audio + expo-file-system/legacy
Audio is generated as a PCM WAV buffer at runtime in `utils/audio.ts` (no bundled asset). It uses `expo-audio`'s `createAudioPlayer` (not `expo-av`). The WAV is written to `FileSystem.cacheDirectory` using `expo-file-system/legacy` (import path must be `/legacy` — the root `expo-file-system` export deprecated `writeAsStringAsync`). Use the string `'base64'` directly instead of `FileSystem.EncodingType.Base64` (the enum is undefined at runtime).

## Completion reward flow

When a habit reaches `targetCount` for today:
1. `expo-haptics` — `NotificationFeedbackType.Success`
2. `CelebrationOverlay` — animated particle burst (visual, blocks background taps via `pointerEvents="box-only"`)
3. `playChime()` — only if `notificationSettings.rewardSoundEnabled` is true

When a challenge completes (natural or forced):
- Same reward fires after a 1800 ms delay (so habit reward settles first)
- `ManageScreen` triggers it immediately on force-complete
