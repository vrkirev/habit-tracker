# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Dev commands

```bash
npm start          # Start Expo dev server (scan QR with Expo Go)
npm run ios        # Open in iOS Simulator
npm run android    # Open in Android emulator
npm run web        # Open in browser
```

No test runner or linter is configured yet.

## SDK version

This project uses **Expo SDK 54** (pinned to match Expo Go client SDK 54). Do NOT upgrade to SDK 55/56 without confirming the user's Expo Go version supports it. Reference docs at https://docs.expo.dev/versions/v54.0.0/.

## Architecture

Multi-screen React Native app with bottom tab navigation. Entry point is `index.ts` → registers `App.tsx` as the root component via `registerRootComponent`.

### Navigation structure (5 tabs)
```
App.tsx                        ← GestureHandlerRootView + SafeAreaProvider + AppProvider + NavigationContainer
  Bottom Tab Navigator
    TodayScreen                ← habit list, multi-sensory feedback on completion
    LogScreen                  ← 30-day history grouped by date
    StatsScreen                ← 7-day bar chart, 28-day heatmap, streak leaderboard
    ChallengesScreen           ← create/track N-day challenges
    SettingsScreen             ← push notification scheduling
```

### State management
All shared state lives in `context/AppContext.tsx` (React Context + useState). Persisted to AsyncStorage on every mutation.

### Key files
```
types.ts                       ← Habit, Challenge, NotificationSettings types
context/AppContext.tsx          ← AppProvider + useApp() hook
utils/dates.ts                 ← date helpers (todayStr, lastNDays, friendlyDate, etc.)
utils/streak.ts                ← computeStreak(completions, targetCount)
utils/storage.ts               ← AsyncStorage load/save for habits, challenges, settings
utils/notifications.ts         ← expo-notifications scheduling (daily repeating triggers)
utils/audio.ts                 ← programmatically generates a two-note chime WAV at runtime
components/CelebrationOverlay.tsx  ← animated particle burst shown on habit completion
screens/TodayScreen.tsx        ← main habit tracking UI
screens/LogScreen.tsx          ← history view
screens/StatsScreen.tsx        ← charts/stats
screens/ChallengesScreen.tsx   ← challenges UI
screens/SettingsScreen.tsx     ← notification settings
```

## Key types

```ts
type HabitType = 'daily' | 'volume';

type Habit = {
  id: string;
  name: string;
  emoji: string;
  type: HabitType;
  targetCount: number;       // 1 for daily, N for volume (e.g. 4 glasses of water)
  completions: Record<string, number>; // YYYY-MM-DD -> count achieved
  streak: number;
  createdAt: string;
};

type Challenge = {
  id: string;
  habitId: string;
  durationDays: number;
  startDate: string;         // YYYY-MM-DD
  completedAt?: string;      // set when all N days done
};
```

## Core loop / feedback

When a habit crosses its `targetCount` for today:
1. `expo-haptics` NotificationFeedbackType.Success (tactile)
2. `CelebrationOverlay` animated particle burst (visual)
3. Programmatically generated two-note chime via `expo-av` + `expo-file-system` (audio)

The chime WAV is generated at runtime in `utils/audio.ts` — no audio asset file needed.
