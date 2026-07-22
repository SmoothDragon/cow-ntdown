import { Fredoka_600SemiBold, Fredoka_700Bold, useFonts } from '@expo-google-fonts/fredoka';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const DURATION_SEC = 60;
type Phase = 'idle' | 'running' | 'paused' | 'done';

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Restart from the beginning and play (sync play keeps web user-gesture unlock). */
function playFromStart(
  player: ReturnType<typeof useAudioPlayer>,
  volume: number,
) {
  player.volume = volume;
  try {
    player.pause();
  } catch {
    /* ignore */
  }
  void player.seekTo(0).then(() => {
    player.play();
  });
  player.play();
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Fredoka_600SemiBold,
    Fredoka_700Bold,
  });

  const [phase, setPhase] = useState<Phase>('idle');
  const [secondsLeft, setSecondsLeft] = useState(DURATION_SEC);

  const startPlayer = useAudioPlayer(require('./assets/sounds/start.mp3'));
  const mooPlayer = useAudioPlayer(require('./assets/sounds/moo.mp3'));

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const deadlineRef = useRef<number | null>(null);
  const pulse = useRef(new Animated.Value(1)).current;
  const flash = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'duckOthers',
    });
    startPlayer.volume = 0.75;
    mooPlayer.volume = 1.0;
  }, [startPlayer, mooPlayer]);

  const clearTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    deadlineRef.current = null;
  }, []);

  const stopSounds = useCallback(() => {
    try {
      startPlayer.pause();
      mooPlayer.pause();
    } catch {
      /* ignore */
    }
  }, [startPlayer, mooPlayer]);

  const resetIdle = useCallback(() => {
    clearTick();
    stopSounds();
    deactivateKeepAwake();
    setPhase('idle');
    setSecondsLeft(DURATION_SEC);
  }, [clearTick, stopSounds]);

  const finish = useCallback(() => {
    clearTick();
    setPhase('done');
    setSecondsLeft(0);
    Animated.sequence([
      Animated.timing(flash, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0, duration: 400, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
    playFromStart(mooPlayer, 1.0);
    deactivateKeepAwake();
    setTimeout(() => {
      setPhase('idle');
      setSecondsLeft(DURATION_SEC);
    }, 5500);
  }, [clearTick, flash, mooPlayer]);

  const beginTicking = useCallback(
    (fromSeconds: number) => {
      clearTick();
      const safe = Math.max(0, fromSeconds);
      setSecondsLeft(safe);
      if (safe <= 0) {
        finish();
        return;
      }
      deadlineRef.current = Date.now() + safe * 1000;
      intervalRef.current = setInterval(() => {
        const deadline = deadlineRef.current;
        if (deadline == null) return;
        const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        setSecondsLeft(left);
        if (left <= 0) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          deadlineRef.current = null;
          finish();
        }
      }, 200);
    },
    [clearTick, finish],
  );

  const start = useCallback(() => {
    if (phase === 'running' || phase === 'paused') return;

    Animated.sequence([
      Animated.spring(pulse, { toValue: 1.08, useNativeDriver: true, friction: 4 }),
      Animated.spring(pulse, { toValue: 1, useNativeDriver: true, friction: 5 }),
    ]).start();

    playFromStart(startPlayer, 0.8);
    void activateKeepAwakeAsync();
    setPhase('running');
    beginTicking(DURATION_SEC);
  }, [phase, pulse, startPlayer, beginTicking]);

  const pause = useCallback(() => {
    if (phase !== 'running') return;
    const deadline = deadlineRef.current;
    const left =
      deadline != null
        ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
        : secondsLeft;
    clearTick();
    setSecondsLeft(left);
    setPhase('paused');
    deactivateKeepAwake();
  }, [phase, secondsLeft, clearTick]);

  const resume = useCallback(() => {
    if (phase !== 'paused') return;
    void activateKeepAwakeAsync();
    setPhase('running');
    beginTicking(secondsLeft);
  }, [phase, secondsLeft, beginTicking]);

  const reset = useCallback(() => {
    resetIdle();
  }, [resetIdle]);

  useEffect(() => {
    return () => {
      clearTick();
      deactivateKeepAwake();
    };
  }, [clearTick]);

  const running = phase === 'running';
  const paused = phase === 'paused';
  const done = phase === 'done';
  const active = running || paused;

  let tagline = 'One minute. Ready, set, go!';
  if (done) tagline = 'Time’s up — moo!';
  else if (paused) tagline = 'Paused';
  else if (running) tagline = 'Counting down…';

  const brandFont = fontsLoaded ? 'Fredoka_700Bold' : undefined;
  const bodyFont = fontsLoaded ? 'Fredoka_600SemiBold' : undefined;

  return (
    <View style={styles.root}>
      <Image
        source={require('./assets/flying-cow-fullbody.png')}
        style={styles.background}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      <View style={styles.scrim} pointerEvents="none" />

      <StatusBar style="light" />

      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.flashOverlay,
          { opacity: flash },
        ]}
      />

      <View style={styles.content}>
        <Text style={[styles.brand, brandFont ? { fontFamily: brandFont } : null]}>
          Cow-ntdown
        </Text>
        <Text style={[styles.tagline, bodyFont ? { fontFamily: bodyFont } : null]}>
          {tagline}
        </Text>

        <Animated.Text
          style={[
            styles.timer,
            brandFont ? { fontFamily: brandFont } : null,
            (running || paused) && styles.timerRunning,
            paused && styles.timerPaused,
            done && styles.timerDone,
            { transform: [{ scale: pulse }] },
          ]}
        >
          {formatTime(secondsLeft)}
        </Animated.Text>

        {!active && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Start one minute timer"
            onPress={start}
            disabled={done}
            style={({ pressed }) => [
              styles.button,
              styles.buttonStart,
              (pressed || done) && styles.buttonPressed,
            ]}
          >
            <Text style={[styles.buttonLabel, brandFont ? { fontFamily: brandFont } : null]}>
              Start
            </Text>
          </Pressable>
        )}

        {active && (
          <View style={styles.buttonRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={paused ? 'Resume timer' : 'Pause timer'}
              onPress={paused ? resume : pause}
              style={({ pressed }) => [
                styles.button,
                styles.buttonHalf,
                styles.buttonPause,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={[styles.buttonLabel, brandFont ? { fontFamily: brandFont } : null]}>
                {paused ? 'Resume' : 'Pause'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reset timer"
              onPress={reset}
              style={({ pressed }) => [
                styles.button,
                styles.buttonHalf,
                styles.buttonReset,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={[styles.buttonLabel, brandFont ? { fontFamily: brandFont } : null]}>
                Reset
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B1020',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 12, 28, 0.18)',
  },
  flashOverlay: {
    backgroundColor: '#FF8FAB',
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 36,
    zIndex: 2,
  },
  brand: {
    fontSize: 42,
    color: '#FFFDF8',
    letterSpacing: -0.5,
    marginBottom: 6,
    fontWeight: '700',
  },
  tagline: {
    fontSize: 16,
    color: '#E8EEFF',
    marginBottom: 28,
    fontWeight: '600',
  },
  timer: {
    fontSize: 80,
    color: '#FFFDF8',
    letterSpacing: 2,
    marginVertical: 8,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  timerRunning: {
    color: '#9EC5FF',
  },
  timerPaused: {
    color: '#F0D9A0',
  },
  timerDone: {
    color: '#FF8FAB',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    width: '100%',
    maxWidth: 360,
    justifyContent: 'center',
  },
  button: {
    marginTop: 20,
    minWidth: 220,
    paddingVertical: 18,
    paddingHorizontal: 36,
    borderRadius: 28,
    alignItems: 'center',
  },
  buttonHalf: {
    flex: 1,
    minWidth: 0,
    marginTop: 0,
    paddingHorizontal: 16,
  },
  buttonStart: {
    backgroundColor: '#FF8FAB',
  },
  buttonPause: {
    backgroundColor: '#2B4C7E',
  },
  buttonReset: {
    backgroundColor: '#1A1A1A',
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonLabel: {
    fontSize: 22,
    color: '#FFFDF8',
    letterSpacing: 0.5,
    fontWeight: '700',
  },
});
