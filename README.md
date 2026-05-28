# Habit Tracker

A React Native habit tracking app built with Expo. Track daily and volume-based habits, take on multi-day challenges, and earn multi-sensory rewards on every completion.

## Features

### Core loop
- **Daily habits** — tap once to mark complete
- **Volume habits** — tap to increment toward a daily target (e.g. drink water 8×)
- **Multi-sensory reward** on completion: haptic pulse, animated particle burst, and a programmatically generated fanfare chime
- Completion rewards can be toggled on/off in Settings

### Screens
| Tab | Purpose |
|-----|---------|
| Today | Habit list for the day, progress bar, add/delete habits |
| Log | 30-day history grouped by date |
| Stats | 7-day bar chart, 28-day heatmap, streak leaderboard |
| Challenges | Create 3 / 7 / 21-day challenges against any habit |
| Settings | Push notification schedule, reward sound toggle |
| Manage | Developer tools (see below) |

### Challenges
Create a commitment to complete a habit for N consecutive days. On completion a second celebration fires — haptic + chime + trophy overlay.

### Push notifications
Two configurable daily reminders (morning prompt + evening check-in) scheduled via local notifications. Requires notification permission on first enable.

### Developer tools (Manage tab)
- **Simulate habits** — back-fill all habits as complete for 3 / 7 / 14 past days to test streaks, heatmap, and weekly score
- **Force complete challenge** — instantly finish an active challenge and trigger the full reward
- **Test notification** — fires a sample notification after 3 seconds (background the app to see the native banner)
- **Reset onboarding** — clears the seen flag so the welcome flow replays on next launch
- **Clear all data** — wipes habits, challenges, settings, and onboarding state (two-step confirmation)

## Getting started

### Prerequisites
- [Node.js](https://nodejs.org/) 18+
- [Expo Go](https://expo.dev/go) on your iOS or Android device (SDK 54)

### Install & run

```bash
git clone https://github.com/vrkirev/habit-tracker.git
cd habit-tracker
npm install
npm start          # scan QR code with Expo Go
```

```bash
npm run ios        # iOS Simulator (requires Xcode + downloaded runtime)
npm run android    # Android emulator
npm run web        # Browser
```

> **Note:** Always use `npx expo install <package>` when adding dependencies to get the SDK-54-compatible version.

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | React Native + Expo SDK 54 |
| Navigation | React Navigation v7 (bottom tabs + native stack) |
| State | React Context + AsyncStorage |
| Haptics | expo-haptics |
| Audio | expo-audio (WAV generated at runtime — no asset file needed) |
| Notifications | expo-notifications |
| Icons | @expo/vector-icons (Ionicons) |

## Project structure

```
App.tsx                    Navigation root, notification handler, onboarding gate
types.ts                   Shared TypeScript types
context/AppContext.tsx      Global state and all data mutations
utils/
  dates.ts                 Timezone-safe date helpers
  streak.ts                Streak computation
  storage.ts               AsyncStorage wrappers
  notifications.ts         Schedule / cancel daily reminders
  audio.ts                 Generate and play the completion fanfare
components/
  CelebrationOverlay.tsx   Animated reward overlay
  OnboardingModal.tsx      First-launch 4-slide welcome flow
screens/
  TodayScreen.tsx
  LogScreen.tsx
  StatsScreen.tsx
  ChallengesScreen.tsx
  SettingsScreen.tsx
  ManageScreen.tsx
```
