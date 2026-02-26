import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import useProfileStore from '../store/profileStore';
import useHydrationStore from '../store/hydrationStore';
import { getGreeting } from '../utils/hydrationEngine';
import { getCurrentTemperature, geocodeCity, isHotDay } from '../utils/weatherService';
import {
  trackWaterLogged,
  trackGoalReached,
  trackStreakMilestone,
} from '../utils/analytics';

const { width } = Dimensions.get('window');
const RING_SIZE = 224;
const STROKE = 12;
const RADIUS = (RING_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const LOG_AMOUNTS = [25, 33, 50, 60, 75, 150];
const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

function calculateStreak(logs, goalCl) {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const total = logs
      .filter((l) => l.loggedFor === dateStr)
      .reduce((sum, l) => sum + l.amountCl, 0);
    if (total >= goalCl) {
      streak++;
    } else {
      if (i === 0) continue;
      break;
    }
  }
  return streak;
}

function ProgressRing({ progress }) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: progress,
      duration: 900,
      useNativeDriver: false,
    }).start();
    const listener = animatedValue.addListener(({ value }) => setDisplayProgress(value));
    return () => animatedValue.removeListener(listener);
  }, [progress]);

  const strokeDashoffset = CIRCUMFERENCE * (1 - displayProgress / 100);

  return (
    <Svg
      width={RING_SIZE}
      height={RING_SIZE}
      style={{ transform: [{ rotate: '-90deg' }] }}
    >
      <Circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RADIUS}
        stroke="rgba(123,97,255,0.1)"
        strokeWidth={STROKE}
        fill="none"
      />
      <Circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RADIUS}
        stroke="#7B61FF"
        strokeWidth={STROKE}
        fill="none"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default function DashboardScreen() {
  const { profile } = useProfileStore();
  const {
    addLog,
    undoLastLog,
    getTodayTotal,
    logs,
    journey,
    pendingUndo,
    clearPendingUndo,
  } = useHydrationStore();

  const [temperature, setTemperature] = useState(null);
  const [weatherCity, setWeatherCity] = useState('');
  const [weatherLoaded, setWeatherLoaded] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [undoVisible, setUndoVisible] = useState(false);

  const confirmTimer = useRef(null);
  const undoTimer = useRef(null);
  const undoOpacity = useRef(new Animated.Value(0)).current;
  const prevGoalReached = useRef(false);

  const todayTotal = getTodayTotal();
  const goal = profile?.dailyGoalCl || 250;
  const progress = Math.min(100, Math.round((todayTotal / goal) * 100));
  const streak = calculateStreak(logs, goal);

  const STAGE_NAMES = [
    'Desert Mist',
    'Mountain Spring',
    'River Guide',
    'Tide Shifter',
    'Deep Blue',
    profile?.gender === 'goddess' ? 'Ocean Goddess' : 'Ocean God',
  ];
  const stageName = STAGE_NAMES[journey?.currentStage ?? 0];

  const initials = profile?.name
    ? profile.name.trim().split(' ').map((w) => w[0].toUpperCase()).slice(0, 2).join('')
    : '?';

  const greeting = profile ? getGreeting(profile.name) : 'Welcome back.';

  // Fetch weather
  useEffect(() => {
    const fetchWeather = async () => {
      if (!profile?.city) { setWeatherLoaded(true); return; }
      const geo = await geocodeCity(profile.city);
      if (!geo) { setWeatherLoaded(true); return; }
      const temp = await getCurrentTemperature(geo.latitude, geo.longitude);
      setTemperature(temp);
      setWeatherCity(geo.name);
      setWeatherLoaded(true);
    };
    fetchWeather();
  }, [profile?.city]);

  // Undo timer
  useEffect(() => {
    if (pendingUndo) {
      setUndoVisible(true);
      Animated.timing(undoOpacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      clearTimeout(undoTimer.current);
      undoTimer.current = setTimeout(() => {
        hideUndo();
        clearPendingUndo();
      }, 60000);
    }
    return () => clearTimeout(undoTimer.current);
  }, [pendingUndo]);

  const hideUndo = () => {
    Animated.timing(undoOpacity, { toValue: 0, duration: 300, useNativeDriver: true })
      .start(() => setUndoVisible(false));
  };

  const handleLogPress = (amount) => {
    if (confirmState === amount) {
      clearTimeout(confirmTimer.current);
      setConfirmState(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      addLog(amount, null).then(() => {
        const newTotal = todayTotal + amount;

        // Track water logged
        trackWaterLogged({
          amountCl: amount,
          totalToday: newTotal,
          goalCl: goal,
        });

        // Track goal reached (only once per day)
        if (!prevGoalReached.current && newTotal >= goal) {
          prevGoalReached.current = true;
          trackGoalReached({ goalCl: goal });
        }

        // Track streak milestones
        if (STREAK_MILESTONES.includes(streak)) {
          trackStreakMilestone(streak);
        }
      });
    } else {
      if (confirmState !== null) clearTimeout(confirmTimer.current);
      setConfirmState(amount);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      confirmTimer.current = setTimeout(() => setConfirmState(null), 3000);
    }
  };

  // Reset goal reached flag at midnight
  useEffect(() => {
    prevGoalReached.current = todayTotal >= goal;
  }, []);

  const handleUndo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    undoLastLog();
    hideUndo();
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.avatarRow}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
            <Text style={s.greetingText}>{greeting}</Text>
          </View>
          <View style={s.streakBadge}>
            <Text style={s.streakFire}>🔥</Text>
            <Text style={s.streakCount}>{streak}</Text>
          </View>
        </View>

        {/* ── Progress ring card ── */}
        <View style={s.ringCard}>
          <View style={s.ringDecor} />
          <View style={s.ringWrapper}>
            <ProgressRing progress={progress} />
            <View style={s.ringCenter}>
              <Text style={s.ringIntake}>{todayTotal} / {goal}</Text>
              <Text style={s.ringUnit}>CL</Text>
              <Text style={s.ringPercent}>{progress}%</Text>
            </View>
          </View>
          <View style={s.stageBadge}>
            <Text style={s.stageBadgeText}>Stage: {stageName}</Text>
          </View>
        </View>

        {/* ── Weather card ── */}
        {weatherLoaded && isHotDay(temperature) && (
          <View style={s.weatherCard}>
            <View style={s.weatherLeft}>
              <Text style={s.weatherTempLarge}>{Math.round(temperature)}°</Text>
              <Text style={s.weatherCityText}>{weatherCity}</Text>
            </View>
            <View style={s.weatherRight}>
              <View style={s.weatherIconRow}>
                <Ionicons name="thermometer" size={16} color="#FF9800" />
                <Text style={s.weatherHotLabel}>Hot day alert</Text>
              </View>
              <Text style={s.weatherTip}>
                Try drinking an extra 25cl to compensate for the heat.
              </Text>
            </View>
          </View>
        )}

        {/* ── Quick log buttons — 3 columns x 2 rows ── */}
        <View style={s.logGrid}>
          {LOG_AMOUNTS.map((amount) => {
            const isConfirm = confirmState === amount;
            return (
              <TouchableOpacity
                key={amount}
                style={[s.logBtn, isConfirm && s.logBtnConfirm]}
                onPress={() => handleLogPress(amount)}
                activeOpacity={0.8}
              >
                <Text style={[s.logBtnText, isConfirm && s.logBtnTextConfirm]}>
                  {isConfirm ? 'Confirm?' : `+${amount}cl`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Undo ── */}
        {undoVisible && (
          <Animated.View style={[s.undoRow, { opacity: undoOpacity }]}>
            <TouchableOpacity style={s.undoBtn} onPress={handleUndo}>
              <Ionicons name="arrow-undo" size={14} color="rgba(26,26,46,0.5)" />
              <Text style={s.undoBtnText}>Undo last entry</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── Daily summary ── */}
        <View style={s.summaryCard}>
          <View style={s.summaryItem}>
            <Text style={s.summaryValue}>{Math.max(0, goal - todayTotal)}</Text>
            <Text style={s.summaryLabel}>cl remaining</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryItem}>
            <Text style={s.summaryValue}>{todayTotal}</Text>
            <Text style={s.summaryLabel}>cl logged today</Text>
          </View>
          <View style={s.summaryDivider} />
          <View style={s.summaryItem}>
            <Text style={s.summaryValue}>{streak}</Text>
            <Text style={s.summaryLabel}>day streak</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#E6E6FA' },
  scroll: { paddingBottom: 110 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#7B61FF',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  avatarText: {
    fontSize: 15, fontWeight: '700', color: '#fff',
    fontFamily: 'Manrope_700Bold',
  },
  greetingText: {
    fontSize: 18, fontWeight: '700', color: '#1A1A2E',
    fontFamily: 'Manrope_700Bold', flexShrink: 1,
  },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  streakFire: { fontSize: 18 },
  streakCount: {
    fontSize: 18, fontWeight: '700', color: '#7B61FF',
    fontFamily: 'Manrope_700Bold',
  },

  ringCard: {
    marginHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 24, padding: 32,
    alignItems: 'center',
    shadowColor: '#7B61FF', shadowOpacity: 0.08, shadowRadius: 20,
    elevation: 4, marginBottom: 16, overflow: 'hidden',
  },
  ringDecor: {
    position: 'absolute', top: -40, right: -40,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(123,97,255,0.05)',
  },
  ringWrapper: {
    width: RING_SIZE, height: RING_SIZE,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  ringCenter: {
    position: 'absolute',
    alignItems: 'center', justifyContent: 'center',
  },
  ringIntake: {
    fontSize: 30, fontWeight: '800', color: '#1A1A2E', letterSpacing: -1,
    fontFamily: 'Manrope_800ExtraBold',
  },
  ringUnit: {
    fontSize: 11, fontWeight: '700', color: 'rgba(26,26,46,0.4)',
    letterSpacing: 4, marginTop: 2, fontFamily: 'Manrope_700Bold',
  },
  ringPercent: {
    fontSize: 13, fontWeight: '600', color: '#7B61FF', marginTop: 4,
    fontFamily: 'Manrope_600SemiBold',
  },
  stageBadge: {
    marginTop: 20, paddingHorizontal: 16, paddingVertical: 6,
    backgroundColor: 'rgba(123,97,255,0.1)', borderRadius: 99,
  },
  stageBadgeText: {
    fontSize: 13, fontWeight: '600', color: '#7B61FF',
    fontFamily: 'Manrope_600SemiBold',
  },

  weatherCard: {
    marginHorizontal: 24, marginBottom: 16,
    backgroundColor: '#FFFFFF', borderRadius: 20,
    padding: 16, flexDirection: 'row', gap: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    borderLeftWidth: 3, borderLeftColor: '#FF9800',
  },
  weatherLeft: { alignItems: 'center', justifyContent: 'center', minWidth: 56 },
  weatherTempLarge: {
    fontSize: 28, fontWeight: '800', color: '#FF9800',
    fontFamily: 'Manrope_800ExtraBold',
  },
  weatherCityText: {
    fontSize: 10, color: 'rgba(26,26,46,0.4)',
    fontWeight: '600', textAlign: 'center', fontFamily: 'Manrope_600SemiBold',
  },
  weatherRight: { flex: 1 },
  weatherIconRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  weatherHotLabel: { fontSize: 13, fontWeight: '700', color: '#FF9800', fontFamily: 'Manrope_700Bold' },
  weatherTip: { fontSize: 12, color: 'rgba(26,26,46,0.55)', lineHeight: 18, fontFamily: 'Manrope_400Regular' },

  logGrid: {
    marginHorizontal: 24, marginBottom: 16,
    flexDirection: 'row', flexWrap: 'wrap', gap: 10,
  },
  logBtn: {
    width: (width - 48 - 20) / 3,
    height: 56, borderRadius: 99,
    backgroundColor: '#FFFFFF',
    borderWidth: 2, borderColor: '#7B61FF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7B61FF', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  logBtnConfirm: { backgroundColor: 'rgba(123,97,255,0.1)' },
  logBtnText: {
    fontSize: 15, fontWeight: '700', color: '#7B61FF',
    fontFamily: 'Manrope_700Bold',
  },
  logBtnTextConfirm: { fontSize: 13, color: '#7B61FF' },

  undoRow: { alignItems: 'center', marginBottom: 16 },
  undoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 99,
    borderWidth: 1, borderColor: 'rgba(123,97,255,0.15)',
  },
  undoBtnText: {
    fontSize: 14, color: 'rgba(26,26,46,0.55)', fontWeight: '500',
    fontFamily: 'Manrope_500Medium',
  },

  summaryCard: {
    marginHorizontal: 24, backgroundColor: '#FFFFFF',
    borderRadius: 24, padding: 24, flexDirection: 'row',
    shadowColor: '#7B61FF', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 24, fontWeight: '700', color: '#1A1A2E', fontFamily: 'Manrope_700Bold' },
  summaryLabel: {
    fontSize: 11, color: 'rgba(26,26,46,0.45)', marginTop: 4,
    textAlign: 'center', fontFamily: 'Manrope_400Regular',
  },
  summaryDivider: { width: 1, backgroundColor: 'rgba(26,26,46,0.08)', marginHorizontal: 8 },
});