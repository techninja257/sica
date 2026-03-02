import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import useProfileStore from '../store/profileStore';
import useHydrationStore from '../store/hydrationStore';
import { STAGES, TIERS, getTierForStage, getStageName } from '../utils/hydrationEngine';

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function getThisWeekDates() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split('T')[0];
  });
}

function getMotivationalMessage(daysHit, requiredDays) {
  const remaining = requiredDays - daysHit;
  if (daysHit >= requiredDays) return "🎉 You've secured your progress this week. Keep it up!";
  if (remaining === 1) return `One more day to secure your level. You've got this!`;
  if (daysHit === 0) return `Start strong — hit your goal today to begin your streak.`;
  return `You're on track! ${remaining} more day${remaining > 1 ? 's' : ''} to secure this week.`;
}

function InfoModal({ visible, onClose, tier }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={m.overlay}>
        <View style={m.card}>
          <View style={m.iconCircle}>
            <Ionicons name="information-circle" size={36} color="#7B61FF" />
          </View>
          <Text style={m.title}>How Progression Works</Text>
          <Text style={m.body}>
            Sica has <Text style={m.bold}>15 stages</Text> across 3 tiers — Awakening, Ascent, and Legend.{'\n\n'}
            <Text style={m.bold}>Tier 1 — Awakening</Text>{'\n'}
            Hit your goal <Text style={m.bold}>5 out of 7 days</Text> each week to advance.{'\n\n'}
            <Text style={m.bold}>Tier 2 — Ascent</Text>{'\n'}
            Hit your goal <Text style={m.bold}>6 out of 7 days</Text> each week to advance.{'\n\n'}
            <Text style={m.bold}>Tier 3 — Legend</Text>{'\n'}
            Hit your goal <Text style={m.bold}>every day</Text> for 2 consecutive weeks to advance.{'\n\n'}
            Miss your target 2 weeks in a row and you'll slip back one stage.
          </Text>
          <TouchableOpacity style={m.btn} onPress={onClose} activeOpacity={0.85}>
            <Text style={m.btnText}>Got it!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Tier header separator shown in milestone map
function TierDivider({ tier }) {
  return (
    <View style={s.tierDivider}>
      <View style={s.tierDividerLine} />
      <View style={[s.tierBadge, { backgroundColor: tier.activeColor + '22' }]}>
        <Text style={[s.tierBadgeText, { color: tier.activeColor }]}>
          TIER {tier.id} — {tier.name.toUpperCase()}
        </Text>
      </View>
      <View style={s.tierDividerLine} />
    </View>
  );
}

export default function JourneyScreen() {
  const [showInfo, setShowInfo] = useState(false);
  const { profile } = useProfileStore();
  const { logs, journey } = useHydrationStore();

  const goal = profile?.dailyGoalCl || 250;
  const currentStage = journey?.currentStage ?? 0;
  const gender = profile?.gender;
  const currentTier = getTierForStage(currentStage);

  // Weekly progress
  const weekDates = getThisWeekDates();
  const today = new Date().toISOString().split('T')[0];
  const todayIndex = weekDates.indexOf(today);

  const weekStatus = weekDates.map((date, i) => {
    const total = logs
      .filter((l) => l.loggedFor === date)
      .reduce((s, l) => s + l.amountCl, 0);
    return {
      date,
      hit: total >= goal,
      isPast: i < todayIndex,
      isToday: i === todayIndex,
      isFuture: i > todayIndex,
      total,
    };
  });

  const daysHit = weekStatus.filter((d) => d.hit).length;
  const requiredDays = currentTier.requiredDays;
  const weekProgress = Math.min(1, daysHit / requiredDays);
  const motivationalMsg = getMotivationalMessage(daysHit, requiredDays);
  const consecutiveSuccessWeeks = journey?.consecutiveSuccessWeeks ?? 0;

  // Hero icon per tier
  const tierIcons = ['water', 'thunderstorm', 'planet'];
  const heroIcon = tierIcons[currentTier.id - 1];

  return (
    <SafeAreaView style={s.safe}>
      <InfoModal visible={showInfo} onClose={() => setShowInfo(false)} tier={currentTier} />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View style={{ width: 40 }} />
          <Text style={s.headerTitle}>Your Journey</Text>
          <TouchableOpacity style={s.headerBtn} onPress={() => setShowInfo(true)}>
            <Ionicons name="information-circle-outline" size={22} color="#1A1A2E" />
          </TouchableOpacity>
        </View>

        {/* Hero card */}
        <View style={s.heroCard}>
          <View style={[s.tierPill, { backgroundColor: currentTier.activeColor + '18' }]}>
            <Text style={[s.tierPillText, { color: currentTier.activeColor }]}>
              Tier {currentTier.id} — {currentTier.name}
            </Text>
          </View>
          <View style={[s.heroIconCircle, { backgroundColor: currentTier.activeColor + '18' }]}>
            <Ionicons name={heroIcon} size={40} color={currentTier.activeColor} />
          </View>
          <Text style={s.heroStageName}>{getStageName(currentStage, gender)}</Text>
          <Text style={[s.heroLevel, { color: currentTier.activeColor }]}>
            Stage {currentStage + 1} of 15
          </Text>

          <View style={s.progressSection}>
            <View style={s.progressLabelRow}>
              <Text style={s.progressLabel}>Weekly Progress</Text>
              <Text style={s.progressLabel}>{daysHit}/{requiredDays} days needed</Text>
            </View>
            <View style={s.progressTrack}>
              <View style={[
                s.progressFill,
                { width: `${weekProgress * 100}%`, backgroundColor: currentTier.activeColor },
              ]} />
            </View>
            {currentTier.id === 3 && (
              <Text style={s.progressNote}>
                Week {consecutiveSuccessWeeks + 1} of 2 — perfect weeks needed to advance
              </Text>
            )}
            {currentTier.id !== 3 && (
              <Text style={s.progressNote}>{daysHit}/{requiredDays} days completed this week.</Text>
            )}
          </View>
        </View>

        {/* Weekly Tracker */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>WEEKLY TRACKER</Text>
          <View style={s.trackerCard}>
            {weekStatus.map((day, i) => {
              const dayLabel = WEEK_DAYS[i];
              if (day.hit) {
                return (
                  <View key={i} style={s.dayCol}>
                    <Ionicons name="water" size={24} color={currentTier.activeColor} />
                    <Text style={[s.dayLabelActive, { color: currentTier.activeColor }]}>{dayLabel}</Text>
                  </View>
                );
              } else if (day.isToday || (day.isPast && !day.hit)) {
                return (
                  <View key={i} style={s.dayCol}>
                    <Ionicons name="water-outline" size={24} color="rgba(26,26,46,0.2)" />
                    <Text style={s.dayLabelInactive}>{dayLabel}</Text>
                  </View>
                );
              } else {
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

        {/* Milestone Map */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>MILESTONE MAP</Text>
          <View style={s.milestoneList}>
            {STAGES.map((stage, i) => {
              const isCompleted = i < currentStage;
              const isActive = i === currentStage;
              const isLocked = i > currentStage;
              const isLast = i === STAGES.length - 1;
              const stageTier = getTierForStage(i);
              const nodeColor = stageTier.activeColor;
              const stageName = i === 14 ? getStageName(14, gender) : stage.name;

              // Show tier divider before first stage of each tier
              const showTierDivider = i === 0 || getTierForStage(i).id !== getTierForStage(i - 1).id;

              return (
                <View key={i}>
                  {showTierDivider && <TierDivider tier={stageTier} />}

                  <View style={s.milestoneRow}>
                    {/* Connector line */}
                    {!isLast && (
                      <View style={s.connectorWrapper}>
                        <View style={[
                          s.connector,
                          isCompleted
                            ? { backgroundColor: nodeColor, opacity: 0.4 }
                            : s.connectorInactive,
                        ]} />
                      </View>
                    )}

                    {/* Node */}
                    <View style={[
                      s.milestoneNode,
                      isCompleted && { backgroundColor: nodeColor + '22' },
                      isActive && { backgroundColor: nodeColor, shadowColor: nodeColor, shadowOpacity: 0.4, shadowRadius: 10, elevation: 5 },
                      isLocked && s.milestoneNodeLocked,
                    ]}>
                      {isCompleted && <Ionicons name="checkmark" size={16} color={nodeColor} />}
                      {isActive && <Ionicons name="water" size={16} color="#fff" />}
                      {isLocked && <Ionicons name="lock-closed" size={14} color="rgba(26,26,46,0.3)" />}
                    </View>

                    {/* Label */}
                    <View style={[s.milestoneInfo, isLocked && s.milestoneLocked]}>
                      <Text style={[
                        s.milestoneName,
                        isActive && { color: '#1A1A2E' },
                        isCompleted && s.milestoneNameCompleted,
                      ]}>
                        {stageName}
                      </Text>
                      <Text style={s.milestoneEmoji}>{stage.emoji}</Text>
                      {isCompleted && <Text style={[s.milestoneStatus, { color: nodeColor + 'AA' }]}>Completed</Text>}
                      {isActive && <Text style={[s.milestoneStatusActive, { color: nodeColor }]}>Currently Mastering</Text>}
                      {isLocked && <Text style={s.milestoneStatus}>Locked</Text>}
                    </View>
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

const m = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 32,
    alignItems: 'center', width: '100%', maxWidth: 360,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
  },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(123,97,255,0.1)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#1A1A2E', marginBottom: 16, textAlign: 'center' },
  body: { fontSize: 14, color: 'rgba(26,26,46,0.6)', lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  bold: { fontWeight: '700', color: '#1A1A2E' },
  btn: {
    width: '100%', backgroundColor: '#7B61FF', borderRadius: 99, paddingVertical: 16,
    alignItems: 'center', shadowColor: '#7B61FF', shadowOpacity: 0.3, shadowRadius: 12, elevation: 5,
  },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#E6E6FA' },
  scroll: { paddingBottom: 110 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A2E' },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },

  heroCard: {
    marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(123,97,255,0.15)',
    shadowColor: '#7B61FF', shadowOpacity: 0.12, shadowRadius: 20, elevation: 4, marginBottom: 24,
  },
  tierPill: {
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: 99, marginBottom: 16,
  },
  tierPillText: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  heroIconCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  heroStageName: { fontSize: 24, fontWeight: '800', color: '#1A1A2E', marginBottom: 4 },
  heroLevel: { fontSize: 14, fontWeight: '600', marginBottom: 20 },
  progressSection: { width: '100%' },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(26,26,46,0.5)' },
  progressTrack: {
    height: 8, backgroundColor: 'rgba(26,26,46,0.06)',
    borderRadius: 99, overflow: 'hidden', marginBottom: 8,
  },
  progressFill: { height: '100%', borderRadius: 99 },
  progressNote: { fontSize: 11, color: 'rgba(26,26,46,0.4)', textAlign: 'center' },

  section: { marginHorizontal: 24, marginBottom: 28 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: 'rgba(26,26,46,0.4)',
    letterSpacing: 2, marginBottom: 12,
  },

  trackerCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: 'rgba(26,26,46,0.04)', marginBottom: 12,
  },
  dayCol: { alignItems: 'center', gap: 6 },
  dayLabelActive: { fontSize: 10, fontWeight: '700' },
  dayLabelInactive: { fontSize: 10, fontWeight: '700', color: 'rgba(26,26,46,0.3)' },
  dayLabelFuture: { fontSize: 10, fontWeight: '700', color: 'rgba(26,26,46,0.2)' },
  dayEmptyCircle: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: 'rgba(26,26,46,0.1)',
  },
  motivationalMsg: {
    fontSize: 13, fontStyle: 'italic',
    color: 'rgba(26,26,46,0.55)', lineHeight: 20, paddingHorizontal: 4,
  },

  // Tier divider
  tierDivider: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginTop: 8,
  },
  tierDividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(26,26,46,0.08)' },
  tierBadge: {
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99, marginHorizontal: 10,
  },
  tierBadgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },

  // Milestone map
  milestoneList: { paddingLeft: 4 },
  milestoneRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginBottom: 0, position: 'relative',
  },
  connectorWrapper: {
    position: 'absolute', left: 15, top: 32, width: 2, height: 48, zIndex: 0,
  },
  connector: { flex: 1, width: 2, borderRadius: 1 },
  connectorInactive: { backgroundColor: 'rgba(26,26,46,0.1)' },
  milestoneNode: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 16, marginBottom: 48, zIndex: 1,
  },
  milestoneNodeLocked: { backgroundColor: 'rgba(26,26,46,0.06)' },
  milestoneInfo: { flex: 1, paddingTop: 4, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  milestoneLocked: { opacity: 0.35 },
  milestoneName: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  milestoneEmoji: { fontSize: 14 },
  milestoneNameCompleted: { color: 'rgba(26,26,46,0.45)' },
  milestoneStatus: { fontSize: 12, color: 'rgba(26,26,46,0.4)', width: '100%' },
  milestoneStatusActive: { fontSize: 12, fontWeight: '600', width: '100%' },
});