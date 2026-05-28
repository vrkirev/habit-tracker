import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';

// Builds a celebratory fanfare WAV:
//   Phase 1 — ascending arpeggio: C5 → E5 → G5 → C6 (4 × 110ms)
//   Phase 2 — full C-major chord (C5+E5+G5) held with decay (350ms)
const buildCelebrationWav = (): string => {
  const sampleRate = 44100;

  const arpNotes  = [523.25, 659.25, 783.99, 1046.50]; // C5 E5 G5 C6
  const noteLen   = 0.11;  // seconds per arpeggio note
  const arpLen    = arpNotes.length * noteLen;           // 0.44 s

  const chordNotes   = [523.25, 659.25, 783.99];        // C5 E5 G5
  const chordLen  = 0.38;  // seconds for the final chord

  const totalDuration = arpLen + chordLen;               // ~0.82 s
  const numSamples = Math.floor(sampleRate * totalDuration);

  const buf  = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buf);

  const ws = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  ws(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  ws(8, 'WAVE');
  ws(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);  // PCM
  view.setUint16(22, 1, true);  // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ws(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    let sample = 0;

    if (t < arpLen) {
      // ── Arpeggio phase ──
      const ni    = Math.min(Math.floor(t / noteLen), arpNotes.length - 1);
      const noteT = t - ni * noteLen;
      const freq  = arpNotes[ni];
      const env   = noteT < 0.008
        ? noteT / 0.008                         // fast attack
        : Math.exp(-(noteT - 0.008) * 18);      // sharp decay between notes
      // fundamental + one octave harmonic for brightness
      sample = (Math.sin(2 * Math.PI * freq * t) +
                Math.sin(2 * Math.PI * freq * 2 * t) * 0.18) * env * 0.6;
    } else {
      // ── Chord phase ──
      const ct  = t - arpLen;
      const env = ct < 0.015
        ? ct / 0.015                            // brief attack
        : Math.exp(-(ct - 0.015) * 5.5);       // slow, warm decay
      for (const freq of chordNotes) {
        sample += Math.sin(2 * Math.PI * freq * t) * env * 0.22;
      }
    }

    // Hard-clamp to prevent any clipping distortion
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, Math.round(clamped * 32767), true);
  }

  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
};

type AudioPlayer = ReturnType<typeof createAudioPlayer>;
let player: AudioPlayer | null = null;
let chimeUri: string | null = null;

export const preloadChime = async (): Promise<void> => {
  try {
    await setAudioModeAsync({ playsInSilentModeIOS: true });

    const base64 = buildCelebrationWav();
    const uri = `${FileSystem.cacheDirectory}chime.wav`;
    await FileSystem.writeAsStringAsync(uri, base64, {
      encoding: 'base64',
    });
    chimeUri = uri;
    player = createAudioPlayer({ uri });
    console.log('[Audio] chime preloaded OK →', uri);
  } catch (e) {
    console.log('[Audio] preload failed:', e);
  }
};

export const playChime = async (): Promise<void> => {
  try {
    if (!player || !chimeUri) {
      console.log('[Audio] player not ready, attempting reload');
      await preloadChime();
    }
    if (!player) return;
    player.seekTo(0);
    player.play();
  } catch (e) {
    console.log('[Audio] play failed:', e);
  }
};

export const unloadChime = (): void => {
  try {
    player?.remove();
    player = null;
    chimeUri = null;
  } catch {}
};
