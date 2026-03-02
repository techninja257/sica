import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LineChart } from 'react-native-chart-kit';
import useHydrationStore from '../store/hydrationStore';
import useProfileStore from '../store/profileStore';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 48;
const VIEWS = ['Day', 'Week', 'Month'];

const chartConfig = {
  backgroundGradientFrom: '#FFFFFF',
  backgroundGradientFromOpacity: 0,
  backgroundGradientTo: '#FFFFFF',
  backgroundGradientToOpacity: 0,
  color: (opacity = 1) => `rgba(123, 97, 255, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(26, 26, 46, ${opacity * 0.4})`,
  strokeWidth: 2.5,
  decimalPlaces: 0,
  propsForBackgroundLines: {
    stroke: 'rgba(123,97,255,0.06)',
    strokeDasharray: '',
  },
  propsForLabels: { fontSize: 10 },
  fillShadowGradient: '#7B61FF',
  fillShadowGradientOpacity: 0.12,
};

function formatTime(isoString) {
  const d = new Date(isoString);
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function toLocalDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getMonthName(month) {
  return ['January','February','March','April','May','June',
          'July','August','September','October','November','December'][month];
}

export default function TrendsScreen() {
  const [view, setView] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Month navigation — starts at current month
  const now = new Date();
  const [monthYear, setMonthYear] = useState({ month: now.getMonth(), year: now.getFullYear() });

  const { getDailyTotals, logs } = useHydrationStore();
  const { profile } = useProfileStore();
  const goal = profile?.dailyGoalCl || 250;

  const today = new Date().toISOString().split('T')[0];

  // ── Day view ──
  const selectedDateStr = toLocalDateStr(selectedDate);
  const selectedDayLogs = logs
    .filter((l) => l.loggedFor === selectedDateStr)
    .sort((a, b) => new Date(b.loggedAt) - new Date(a.loggedAt));
  const selectedDayTotal = selectedDayLogs.reduce((s, l) => s + l.amountCl, 0);

  // ── Week view ──
  const weeklyData = getDailyTotals(7);
  const weekTotal = weeklyData.reduce((s, d) => s + d.total, 0);
  const prevWeekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 7 - i);
    const dateStr = d.toISOString().split('T')[0];
    return logs.filter((l) => l.loggedFor === dateStr).reduce((s, l) => s + l.amountCl, 0);
  });
  const prevWeekTotal = prevWeekData.reduce((s, v) => s + v, 0);
  const weekChangePercent = prevWeekTotal > 0
    ? Math.round(((weekTotal - prevWeekTotal) / prevWeekTotal) * 100)
    : 0;
  const weekChartData = {
    labels: weeklyData.map((d) => {
      const date = new Date(d.date);
      return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
    }),
    datasets: [{ data: weeklyData.map((d) => d.total || 0) }],
  };

  // ── Month view ──
  const { month, year } = monthYear;
  const daysInMonth = getDaysInMonth(year, month);
  const isCurrentMonth = month === now.getMonth() && year === now.getFullYear();

  // Build array of all days in the selected calendar month
  const monthDayData = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const total = logs
      .filter((l) => l.loggedFor === dateStr)
      .reduce((s, l) => s + l.amountCl, 0);
    return { day, dateStr, total };
  });

  const monthTotal = monthDayData.reduce((s, d) => s + d.total, 0);
  const daysWithData = monthDayData.filter((d) => d.total > 0).length;
  const monthAvg = daysWithData > 0 ? Math.round(monthTotal / daysWithData) : 0;
  const goalHitDays = monthDayData.filter((d) => d.total >= goal).length;
  const hasAnyData = monthTotal > 0;

  // Sample every ~5 days for chart labels (max ~6 points)
  const sampleEvery = Math.ceil(daysInMonth / 6);
  const sampledDays = monthDayData.filter((_, i) => i % sampleEvery === 0);
  const monthChartData = {
    labels: sampledDays.map((d) => String(d.day)),
    datasets: [{ data: sampledDays.map((d) => d.total || 0) }],
  };

  const goToPrevMonth = () => {
    setMonthYear(({ month, year }) => {
      if (month === 0) return { month: 11, year: year - 1 };
      return { month: month - 1, year };
    });
  };

  const goToNextMonth = () => {
    if (isCurrentMonth) return;
    setMonthYear(({ month, year }) => {
      if (month === 11) return { month: 0, year: year + 1 };
      return { month: month + 1, year };
    });
  };

  // ── Today/week stats ──
  const todayTotal = logs
    .filter((l) => l.loggedFor === today)
    .reduce((s, l) => s + l.amountCl, 0);
  const yesterdayStr = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; })();
  const yesterdayTotal = logs
    .filter((l) => l.loggedFor === yesterdayStr)
    .reduce((s, l) => s + l.amountCl, 0);
  const vsYesterday = todayTotal - yesterdayTotal;
  const vsYesterdayPercent = yesterdayTotal > 0
    ? Math.round((vsYesterday / yesterdayTotal) * 100) : 0;
  const dailyAvg = Math.round(weekTotal / 7);
  const recentLogs = logs
    .filter((l) => l.loggedFor === today)
    .sort((a, b) => new Date(b.loggedAt) - new Date(a.loggedAt));
  const visibleLogs = showAll ? recentLogs : recentLogs.slice(0, 3);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View style={{ width: 40 }} />
          <Text style={s.headerTitle}>Trends</Text>
          <TouchableOpacity style={s.calendarBtn} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={22} color="#1A1A2E" />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={s.tabs}>
          {VIEWS.map((v, i) => (
            <TouchableOpacity
              key={v}
              style={[s.tab, view === i && s.tabActive]}
              onPress={() => setView(i)}
            >
              <Text style={[s.tabText, view === i && s.tabTextActive]}>{v}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── DAY VIEW ── */}
        {view === 0 && (
          <>
            <View style={s.chartCard}>
              <Text style={s.chartCardLabel}>Hydration</Text>
              <Text style={s.chartCardTotal}>{selectedDayTotal}cl</Text>
              <Text style={s.chartCardDate}>{formatDateLabel(selectedDateStr)}</Text>
              {selectedDayLogs.length === 0 ? (
                <View style={s.emptyChart}>
                  <Ionicons name="water-outline" size={32} color="rgba(123,97,255,0.3)" />
                  <Text style={s.emptyChartText}>No logs for this day</Text>
                </View>
              ) : (
                <LineChart
                  data={{
                    labels: selectedDayLogs.map((l) => formatTime(l.loggedAt)).reverse(),
                    datasets: [{ data: selectedDayLogs.map((l) => l.amountCl).reverse() }],
                  }}
                  width={CHART_WIDTH - 32}
                  height={180}
                  chartConfig={chartConfig}
                  bezier
                  withInnerLines
                  style={s.chart}
                />
              )}
            </View>
            <View style={s.logsSection}>
              <Text style={s.logsSectionTitle}>Logs for {formatDateLabel(selectedDateStr)}</Text>
              {selectedDayLogs.length === 0 ? (
                <Text style={s.emptyLogsText}>No entries found.</Text>
              ) : (
                selectedDayLogs.map((log) => (
                  <View key={log.id} style={s.logItem}>
                    <View style={s.logIcon}>
                      <Ionicons name="water" size={20} color="#7B61FF" />
                    </View>
                    <View style={s.logInfo}>
                      <Text style={s.logAmount}>{log.amountCl}cl</Text>
                      <Text style={s.logType}>Water</Text>
                    </View>
                    <Text style={s.logTime}>{formatTime(log.loggedAt)}</Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {/* ── WEEK VIEW ── */}
        {view === 1 && (
          <>
            <View style={s.chartCard}>
              <Text style={s.chartCardLabel}>Hydration</Text>
              <Text style={s.chartCardTotal}>{weekTotal}cl</Text>
              <View style={s.changeRow}>
                <Text style={[s.changeText, weekChangePercent >= 0 ? s.changePos : s.changeNeg]}>
                  {weekChangePercent >= 0 ? '+' : ''}{weekChangePercent}%
                </Text>
                <Text style={s.changeLabel}> vs last week</Text>
              </View>
              <LineChart
                data={weekChartData}
                width={CHART_WIDTH - 32}
                height={180}
                chartConfig={chartConfig}
                bezier
                withInnerLines
                style={s.chart}
              />
            </View>
            <View style={s.statRow}>
              <View style={s.statCard}>
                <Text style={s.statCardLabel}>VS YESTERDAY</Text>
                <View style={s.statValueRow}>
                  <Text style={s.statCardValue}>{vsYesterday >= 0 ? '+' : ''}{vsYesterday}cl</Text>
                  <Ionicons
                    name={vsYesterday >= 0 ? 'arrow-up' : 'arrow-down'}
                    size={16}
                    color={vsYesterday >= 0 ? '#4CAF50' : '#FF5252'}
                    style={{ marginLeft: 4, marginTop: 4 }}
                  />
                </View>
                <Text style={[s.statPercent, vsYesterdayPercent >= 0 ? s.changePos : s.changeNeg]}>
                  {vsYesterdayPercent >= 0 ? '+' : ''}{vsYesterdayPercent}%
                </Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statCardLabel}>DAILY AVG</Text>
                <Text style={s.statCardValue}>{dailyAvg}cl</Text>
                <Text style={s.statGoal}>Goal: {goal}cl</Text>
              </View>
            </View>
            <View style={s.logsSection}>
              <View style={s.logsSectionHeader}>
                <Text style={s.logsSectionTitle}>Recent Logs</Text>
                {recentLogs.length > 3 && (
                  <TouchableOpacity onPress={() => setShowAll(!showAll)}>
                    <Text style={s.seeAllText}>{showAll ? 'Show less' : 'See all'}</Text>
                  </TouchableOpacity>
                )}
              </View>
              {visibleLogs.length === 0 ? (
                <Text style={s.emptyLogsText}>No logs today yet.</Text>
              ) : (
                visibleLogs.map((log) => (
                  <View key={log.id} style={s.logItem}>
                    <View style={s.logIcon}>
                      <Ionicons name="water" size={20} color="#7B61FF" />
                    </View>
                    <View style={s.logInfo}>
                      <Text style={s.logAmount}>{log.amountCl}cl</Text>
                      <Text style={s.logType}>Water</Text>
                    </View>
                    <Text style={s.logTime}>{formatTime(log.loggedAt)}</Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}

        {/* ── MONTH VIEW ── */}
        {view === 2 && (
          <>
            <View style={s.chartCard}>

              {/* Month navigation */}
              <View style={s.monthNav}>
                <TouchableOpacity style={s.monthNavBtn} onPress={goToPrevMonth}>
                  <Ionicons name="chevron-back" size={20} color="#7B61FF" />
                </TouchableOpacity>
                <Text style={s.monthNavTitle}>{getMonthName(month)} {year}</Text>
                <TouchableOpacity
                  style={[s.monthNavBtn, isCurrentMonth && s.monthNavBtnDisabled]}
                  onPress={goToNextMonth}
                  disabled={isCurrentMonth}
                >
                  <Ionicons name="chevron-forward" size={20} color={isCurrentMonth ? 'rgba(26,26,46,0.2)' : '#7B61FF'} />
                </TouchableOpacity>
              </View>

              <Text style={s.chartCardLabel}>Total Hydration</Text>
              <Text style={s.chartCardTotal}>{monthTotal}cl</Text>

              {!hasAnyData ? (
                <View style={s.emptyChart}>
                  <Ionicons name="water-outline" size={32} color="rgba(123,97,255,0.3)" />
                  <Text style={s.emptyChartText}>No data for {getMonthName(month)}</Text>
                </View>
              ) : (
                <LineChart
                  data={monthChartData}
                  width={CHART_WIDTH - 32}
                  height={180}
                  chartConfig={chartConfig}
                  bezier
                  withInnerLines
                  style={s.chart}
                />
              )}
            </View>

            {/* Stats */}
            <View style={s.statRow}>
              <View style={s.statCard}>
                <Text style={s.statCardLabel}>DAILY AVG</Text>
                <Text style={s.statCardValue}>{monthAvg}cl</Text>
                <Text style={s.statGoal}>{daysWithData > 0 ? `${daysWithData} active days` : 'No data'}</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statCardLabel}>GOAL HIT</Text>
                <Text style={s.statCardValue}>
                  {goalHitDays}
                  <Text style={s.statGoal}> / {daysInMonth}</Text>
                </Text>
                <Text style={s.statGoal}>Days in {getMonthName(month)}</Text>
              </View>
            </View>

            {/* Best day */}
            {hasAnyData && (() => {
              const best = monthDayData.reduce((a, b) => a.total > b.total ? a : b);
              return best.total > 0 ? (
                <View style={s.bestDayCard}>
                  <View style={s.bestDayLeft}>
                    <Text style={s.bestDayLabel}>BEST DAY</Text>
                    <Text style={s.bestDayDate}>{formatDateLabel(best.dateStr)}</Text>
                  </View>
                  <View style={s.bestDayRight}>
                    <Text style={s.bestDayValue}>{best.total}cl</Text>
                    <Ionicons name="trophy-outline" size={18} color="#7B61FF" style={{ marginLeft: 6 }} />
                  </View>
                </View>
              ) : null;
            })()}
          </>
        )}

      </ScrollView>

      {/* Date picker */}
      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date) { setSelectedDate(date); setView(0); }
          }}
        />
      )}
      <Modal
        visible={showDatePicker && Platform.OS === 'ios'}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={s.pickerOverlay}>
          <TouchableOpacity style={s.pickerBackdrop} activeOpacity={1} onPress={() => setShowDatePicker(false)} />
          <View style={s.pickerCard}>
            <View style={s.pickerHeader}>
              <Text style={s.pickerTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={s.pickerDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="spinner"
              maximumDate={new Date()}
              textColor="#1A1A2E"
              onChange={(event, date) => {
                if (date) { setSelectedDate(date); setView(0); }
              }}
            />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#E6E6FA' },
  scroll: { paddingBottom: 110 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A2E', letterSpacing: 0.3 },
  calendarBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },

  tabs: {
    flexDirection: 'row', marginHorizontal: 24, marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 16, padding: 4, gap: 4,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  tabActive: { backgroundColor: '#7B61FF' },
  tabText: { fontSize: 14, fontWeight: '600', color: 'rgba(26,26,46,0.5)' },
  tabTextActive: { color: '#fff', fontWeight: '700' },

  chartCard: {
    marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 24,
    padding: 20, marginBottom: 16,
    shadowColor: '#7B61FF', shadowOpacity: 0.07, shadowRadius: 16, elevation: 3,
  },
  chartCardLabel: { fontSize: 13, color: 'rgba(26,26,46,0.45)', fontWeight: '600', marginBottom: 4 },
  chartCardTotal: { fontSize: 36, fontWeight: '800', color: '#1A1A2E', letterSpacing: -1, marginBottom: 16 },
  chartCardDate: { fontSize: 13, color: 'rgba(26,26,46,0.45)', marginBottom: 16 },
  changeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  changeText: { fontSize: 14, fontWeight: '700' },
  changePos: { color: '#4CAF50' },
  changeNeg: { color: '#FF5252' },
  changeLabel: { fontSize: 13, color: 'rgba(26,26,46,0.45)', fontWeight: '500' },
  chart: { borderRadius: 12, marginLeft: -8 },
  emptyChart: { height: 120, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyChartText: { fontSize: 13, color: 'rgba(26,26,46,0.35)' },

  // Month navigation
  monthNav: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  monthNavBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(123,97,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  monthNavBtnDisabled: { backgroundColor: 'rgba(26,26,46,0.04)' },
  monthNavTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A2E', letterSpacing: -0.3 },

  // Best day card
  bestDayCard: {
    marginHorizontal: 24, backgroundColor: '#FFFFFF', borderRadius: 20,
    padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#7B61FF', shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  bestDayLeft: {},
  bestDayLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(26,26,46,0.4)', letterSpacing: 1.5, marginBottom: 4 },
  bestDayDate: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  bestDayRight: { flexDirection: 'row', alignItems: 'center' },
  bestDayValue: { fontSize: 24, fontWeight: '800', color: '#7B61FF', letterSpacing: -0.5 },

  statRow: { flexDirection: 'row', marginHorizontal: 24, gap: 12, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18,
    shadowColor: '#7B61FF', shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
  },
  statCardLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(26,26,46,0.4)', letterSpacing: 1.5, marginBottom: 8 },
  statValueRow: { flexDirection: 'row', alignItems: 'center' },
  statCardValue: { fontSize: 26, fontWeight: '800', color: '#1A1A2E', letterSpacing: -0.5 },
  statPercent: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  statGoal: { fontSize: 12, color: 'rgba(26,26,46,0.4)', marginTop: 4 },

  logsSection: { marginHorizontal: 24, marginBottom: 16 },
  logsSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  logsSectionTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  seeAllText: { fontSize: 14, fontWeight: '700', color: '#7B61FF' },
  emptyLogsText: { fontSize: 13, color: 'rgba(26,26,46,0.35)', textAlign: 'center', paddingVertical: 20 },
  logItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF',
    borderRadius: 16, padding: 16, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6, elevation: 1,
  },
  logIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(123,97,255,0.1)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  logInfo: { flex: 1 },
  logAmount: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  logType: { fontSize: 12, color: 'rgba(26,26,46,0.45)', marginTop: 2 },
  logTime: { fontSize: 13, fontWeight: '500', color: 'rgba(26,26,46,0.4)' },

  pickerOverlay: { flex: 1, justifyContent: 'flex-end' },
  pickerBackdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pickerCard: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 20, paddingBottom: 48,
  },
  pickerHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
  },
  pickerTitle: { fontSize: 17, fontWeight: '700', color: '#1A1A2E' },
  pickerDone: { fontSize: 17, fontWeight: '700', color: '#7B61FF' },
});