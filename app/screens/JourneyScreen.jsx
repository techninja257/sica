import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Line } from 'react-native-svg';
import useProfileStore from '../store/profileStore';
import useHydrationStore from '../store/hydrationStore';

const { width } = Dimensions.get('window');

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function getThisWeekDates() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

function getMotivationalMessage(daysHit, currentDay) {
  const remaining = 5 - daysHit;
  if (daysHit >= 5) return "🎉 You've secured your progress this week. Keep it up!";
  if (remaining === 1) return `One more day to secure your level. You've got this!`;
  if (daysHit === 0) return `Start strong — hit your goal today to begin your streak.`;
  return `You're on track! ${remaining} more day${remaining > 1 ? 's' : ''} to secure your next level.`;
}

function InfoModal({ visible, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={m.overlay}>
        <View style={m.card}>
          <View style={m.iconCircle}>
            <Ionicons name="information-circle" size={36} color="#7B61FF" />
          </View>
          <Text style={m.title}>What is the Weekly Tracker?</Text>
          <Text style={m.body}>
            Life happens — and that's okay. The Weekly Tracker is your built-in safety net.{'\n\n'}
            As long as you hit your hydration goal at least <Text style={m.bold}>5 out of 7 days</Text> each week, your progress is secured and you'll continue to level up.{'\n\n'}
            Miss more than two days, and you might slip back to a previous stage.
          </Text>
          <TouchableOpacity style={m.btn} onPress={onClose} activeOpacity={0.85}>
            <Text style={m.btnText}>Got it!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function JourneyScreen() {
  const [showInfo, setShowInfo] = useState(false);
  const { profile } = useProfileStore();
  const { logs, journey } = useHydrationStore();

  const goal = profile?.dailyGoalCl || 250;
  const currentStage = journey?.currentStage ?? 0;
  const gender = profile?.gender;

  const STAGES = [
    { name: 'Desert Mist', icon: 'partly-sunny-outline' },
    { name: 'Mountain Spring', icon: 'water-outline' },
    { name: 'River Guide', icon: 'navigate-outline' },
    { name: 'Tide Shifter', icon: 'pulse-outline' },
    { name: 'Deep Blue', icon: 'planet-outline' },
    { name: gender === 'goddess' ? 'Ocean Goddess' : 'Ocean God', icon: 'sparkles-outline' },
  ];

  // Weekly progress
  const weekDates = getThisWeekDates();
  const today = new Date().toISOString().split('T')[0];
  const todayIndex = weekDates.indexOf(today);

  const weekStatus = weekDates.map((date, i) => {
    const total = logs
      .filter((l) => l.loggedFor === date)
      .reduce((s, l) => s + l.amountCl, 0);
    const isPast = i < todayIndex;
    const isToday = i === todayIndex;
    const isFuture = i > todayIndex;
    const hit = total >= goal;
    return { date, hit, isPast, isToday, isFuture, total };
  });

  const daysHit = weekStatus.filter((d) => d.hit).length;
  const weekProgress = daysHit / 7;
  const motivationalMsg = getMotivationalMessage(daysHit, todayIndex);

  return (
    <SafeAreaView style={s.safe}>
      <InfoModal visible={showInfo} onClose={() => setShowInfo(false)} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={{ width: 40 }} />
          <Text style={s.headerTitle}>Your Journey</Text>
          <TouchableOpacity style={s.headerBtn} onPress={() => setShowInfo(true)}>
            <Ionicons name="information-circle-outline" size={22} color="#1A1A2E" />
          </TouchableOpacity>
        </View>

        {/* ── Hero card ── */}
        <View style={s.heroCard}>
          <View style={s.heroIconCircle}>
            <Ionicons name="water" size={40} color="#7B61FF" />
          </View>
          <Text style={s.heroStageName}>{STAGES[currentStage].name}</Text>
          <Text style={s.heroLevel}>Level {currentStage + 1} of 6</Text>

          <View style={s.progressSection}>
            <View style={s.progressLabelRow}>
              <Text style={s.progressLabel}>Weekly Progress</Text>
              <Text style={s.progressLabel}>{daysHit}/7 days</Text>
            </View>
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${weekProgress * 100}%` }]} />
            </View>
            <Text style={s.progressNote}>{daysHit}/7 days completed this week.</Text>
          </View>
        </View>

        {/* ── Weekly Tracker ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>WEEKLY TRACKER</Text>
          <View style={s.trackerCard}>
            {weekStatus.map((day, i) => {
              const dayLabel = WEEK_DAYS[i];
              if (day.hit) {
                // Completed — filled drop
                return (
                  <View key={i} style={s.dayCol}>
                    <Ionicons name="water" size={24} color="#7B61FF" />
                    <Text style={s.dayLabelActive}>{dayLabel}</Text>
                  </View>
                );
              } else if (day.isToday || (day.isPast && !day.hit)) {
                // Today incomplete or past missed — outline drop
                return (
                  <View key={i} style={s.dayCol}>
                    <Ionicons name="water-outline" size={24} color="rgba(26,26,46,0.2)" />
                    <Text style={s.dayLabelInactive}>{dayLabel}</Text>
                  </View>
                );
              } else {
                // Future — empty circle
                return (
                  <View key={i} style={s.dayCol}>
                    <View style={s.dayEmptyCircle} />
                    <Text style={s.dayLabelFuture}>{dayLabel}</Text>
                  </View>
                );
              }
            })}
          </View>
          <Text style={s.motivationalMsg}>"{motivationalMsg}"</Text>
        </View>

        {/* ── Milestone Map ── */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>MILESTONE MAP</Text>
          <View style={s.milestoneList}>
            {STAGES.map((stage, i) => {
              const isCompleted = i < currentStage;
              const isActive = i === currentStage;
              const isLocked = i > currentStage;
              const isLast = i === STAGES.length - 1;

              return (
                <View key={i} style={s.milestoneRow}>
                  {/* Connector line */}
                  {!isLast && (
                    <View style={s.connectorWrapper}>
                      <View style={[
                        s.connector,
                        isCompleted ? s.connectorActive : s.connectorInactive,
                      ]} />
                    </View>
                  )}

                  {/* Node */}
                  <View style={[
                    s.milestoneNode,
                    isCompleted && s.milestoneNodeCompleted,
                    isActive && s.milestoneNodeActive,
                    isLocked && s.milestoneNodeLocked,
                  ]}>
                    {isCompleted && <Ionicons name="checkmark" size={16} color="#7B61FF" />}
                    {isActive && <Ionicons name="water" size={16} color="#fff" />}
                    {isLocked && <Ionicons name="lock-closed" size={14} color="rgba(26,26,46,0.3)" />}
                  </View>

                  {/* Label */}
                  <View style={[s.milestoneInfo, isLocked && s.milestoneLocked]}>
                    <Text style={[
                      s.milestoneName,
                      isActive && s.milestoneNameActive,
                      isCompleted && s.milestoneNameCompleted,
                    ]}>
                      {stage.name}
                    </Text>
                    {isCompleted && <Text style={s.milestoneStatus}>Completed</Text>}
                    {isActive && <Text style={s.milestoneStatusActive}>Currently Mastering</Text>}
                    {isLocked && <Text style={s.milestoneStatus}>Locked</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

// Modal styles
const m = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(123,97,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20, fontWeight: '800', color: '#1A1A2E',
    marginBottom: 16, textAlign: 'center',
  },
  body: {
    fontSize: 14, color: 'rgba(26,26,46,0.6)',
    lineHeight: 22, textAlign: 'center', marginBottom: 24,
  },
  bold: { fontWeight: '700', color: '#1A1A2E' },
  btn: {
    width: '100%', backgroundColor: '#7B61FF',
    borderRadius: 99, paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#7B61FF', shadowOpacity: 0.3, shadowRadius: 12, elevation: 5,
  },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

// Screen styles
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#E6E6FA' },
  scroll: { paddingBottom: 110 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Hero card
  heroCard: {
    marginHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(123,97,255,0.2)',
    shadowColor: '#7B61FF',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 4,
    marginBottom: 24,
  },
  heroIconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(123,97,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  heroStageName: {
    fontSize: 24, fontWeight: '800', color: '#1A1A2E',
    marginBottom: 4,
  },
  heroLevel: { fontSize: 14, fontWeight: '600', color: '#7B61FF', marginBottom: 20 },
  progressSection: { width: '100%' },
  progressLabelRow: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8,
  },
  progressLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(26,26,46,0.5)' },
  progressTrack: {
    height: 8, backgroundColor: 'rgba(26,26,46,0.06)',
    borderRadius: 99, overflow: 'hidden', marginBottom: 8,
  },
  progressFill: { height: '100%', backgroundColor: '#7B61FF', borderRadius: 99 },
  progressNote: { fontSize: 11, color: 'rgba(26,26,46,0.4)', textAlign: 'center' },

  // Section
  section: { marginHorizontal: 24, marginBottom: 28 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: 'rgba(26,26,46,0.4)',
    letterSpacing: 2, marginBottom: 12,
  },

  // Weekly tracker
  trackerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20, padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: 'rgba(26,26,46,0.04)',
    marginBottom: 12,
  },
  dayCol: { alignItems: 'center', gap: 6 },
  dayLabelActive: { fontSize: 10, fontWeight: '700', color: '#7B61FF' },
  dayLabelInactive: { fontSize: 10, fontWeight: '700', color: 'rgba(26,26,46,0.3)' },
  dayLabelFuture: { fontSize: 10, fontWeight: '700', color: 'rgba(26,26,46,0.2)' },
  dayEmptyCircle: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: 'rgba(26,26,46,0.1)',
  },
  motivationalMsg: {
    fontSize: 13, fontStyle: 'italic',
    color: 'rgba(26,26,46,0.55)', lineHeight: 20,
    paddingHorizontal: 4,
  },

  // Milestone map
  milestoneList: { paddingLeft: 4 },
  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 0,
    position: 'relative',
  },
  connectorWrapper: {
    position: 'absolute',
    left: 15,
    top: 32,
    width: 2,
    height: 48,
    zIndex: 0,
  },
  connector: { flex: 1, width: 2, borderRadius: 1 },
  connectorActive: { backgroundColor: '#7B61FF', opacity: 0.4 },
  connectorInactive: { backgroundColor: 'rgba(26,26,46,0.1)' },
  milestoneNode: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 16, marginBottom: 48, zIndex: 1,
  },
  milestoneNodeCompleted: {
    backgroundColor: 'rgba(123,97,255,0.15)',
  },
  milestoneNodeActive: {
    backgroundColor: '#7B61FF',
    shadowColor: '#7B61FF',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  milestoneNodeLocked: {
    backgroundColor: 'rgba(26,26,46,0.06)',
  },
  milestoneInfo: { flex: 1, paddingTop: 4 },
  milestoneLocked: { opacity: 0.4 },
  milestoneName: {
    fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 2,
  },
  milestoneNameActive: { color: '#1A1A2E' },
  milestoneNameCompleted: { color: 'rgba(26,26,46,0.5)' },
  milestoneStatus: { fontSize: 12, color: 'rgba(26,26,46,0.4)' },
  milestoneStatusActive: { fontSize: 12, color: '#7B61FF', fontWeight: '600' },
});