import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
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

export default function TrendsScreen() {
  const [view, setView] = useState(1); // default Week
  const [showAll, setShowAll] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { getDailyTotals, logs } = useHydrationStore();
  const { profile } = useProfileStore();
  const goal = profile?.dailyGoalCl || 250;

  const today = new Date().toISOString().split('T')[0];

  // ── Day view data ──
  const selectedDateStr = selectedDate.toISOString().split('T')[0];
  const selectedDayLogs = logs
    .filter((l) => l.loggedFor === selectedDateStr)
    .sort((a, b) => new Date(b.loggedAt) - new Date(a.loggedAt));
  const selectedDayTotal = selectedDayLogs.reduce((s, l) => s + l.amountCl, 0);

  // ── Week view data ──
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

  // ── Month view data ──
  const monthData = getDailyTotals(30);
  const monthTotal = monthData.reduce((s, d) => s + d.total, 0);
  const monthAvg = Math.round(monthTotal / 30);
  const monthChartData = {
    labels: monthData
      .filter((_, i) => i % 5 === 0)
      .map((d) => {
        const date = new Date(d.date);
        return String(date.getDate());
      }),
    datasets: [{
      data: monthData.filter((_, i) => i % 5 === 0).map((d) => d.total || 0),
    }],
  };

  // ── Today stats ──
  const todayTotal = logs
    .filter((l) => l.loggedFor === today)
    .reduce((s, l) => s + l.amountCl, 0);
  const yesterdayStr = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; })();
  const yesterdayTotal = logs
    .filter((l) => l.loggedFor === yesterdayStr)
    .reduce((s, l) => s + l.amountCl, 0);
  const vsYesterday = todayTotal - yesterdayTotal;
  const vsYesterdayPercent = yesterdayTotal > 0
    ? Math.round((vsYesterday / yesterdayTotal) * 100)
    : 0;

  // Daily average (last 7 days)
  const dailyAvg = Math.round(weekTotal / 7);

  // Recent logs (today)
  const recentLogs = logs
    .filter((l) => l.loggedFor === today)
    .sort((a, b) => new Date(b.loggedAt) - new Date(a.loggedAt));
  const visibleLogs = showAll ? recentLogs : recentLogs.slice(0, 3);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={{ width: 40 }} />
          <Text style={s.headerTitle}>Trends</Text>
          <TouchableOpacity
            style={s.calendarBtn}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={22} color="#1A1A2E" />
          </TouchableOpacity>
        </View>

        {/* ── Date picker ── */}
        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) {
                setSelectedDate(date);
                setView(0); // switch to Day view
              }
            }}
          />
        )}

        {/* ── Tabs ── */}
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

            {/* Day log list */}
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
                <Text style={s.changeLabel}> This Week</Text>
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

            {/* Stat cards */}
            <View style={s.statRow}>
              <View style={s.statCard}>
                <Text style={s.statCardLabel}>VS YESTERDAY</Text>
                <View style={s.statValueRow}>
                  <Text style={s.statCardValue}>
                    {vsYesterday >= 0 ? '+' : ''}{vsYesterday}cl
                  </Text>
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

            {/* Recent logs */}
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
              <Text style={s.chartCardLabel}>Hydration</Text>
              <Text style={s.chartCardTotal}>{monthTotal}cl</Text>
              <View style={s.changeRow}>
                <Text style={s.changeLabel}>30-day total</Text>
              </View>
              <LineChart
                data={monthChartData}
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
                <Text style={s.statCardLabel}>MONTHLY AVG</Text>
                <Text style={s.statCardValue}>{monthAvg}cl</Text>
                <Text style={s.statGoal}>Per day</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.statCardLabel}>GOAL HIT</Text>
                <Text style={s.statCardValue}>
                  {monthData.filter((d) => d.total >= goal).length}
                  <Text style={s.statGoal}> / 30</Text>
                </Text>
                <Text style={s.statGoal}>Days this month</Text>
              </View>
            </View>
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#E6E6FA' },
  scroll: { paddingBottom: 110 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A2E',
    letterSpacing: 0.3,
  },
  calendarBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },

  // Tabs
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1, paddingVertical: 10,
    borderRadius: 12, alignItems: 'center',
  },
  tabActive: { backgroundColor: '#7B61FF' },
  tabText: { fontSize: 14, fontWeight: '600', color: 'rgba(26,26,46,0.5)' },
  tabTextActive: { color: '#fff', fontWeight: '700' },

  // Chart card
  chartCard: {
    marginHorizontal: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#7B61FF',
    shadowOpacity: 0.07,
    shadowRadius: 16,
    elevation: 3,
  },
  chartCardLabel: {
    fontSize: 13,
    color: 'rgba(26,26,46,0.45)',
    fontWeight: '600',
    marginBottom: 4,
  },
  chartCardTotal: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1A1A2E',
    letterSpacing: -1,
    marginBottom: 4,
  },
  chartCardDate: {
    fontSize: 13,
    color: 'rgba(26,26,46,0.45)',
    marginBottom: 16,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  changeText: { fontSize: 14, fontWeight: '700' },
  changePos: { color: '#4CAF50' },
  changeNeg: { color: '#FF5252' },
  changeLabel: { fontSize: 13, color: 'rgba(26,26,46,0.45)', fontWeight: '500' },
  chart: { borderRadius: 12, marginLeft: -8 },
  emptyChart: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyChartText: {
    fontSize: 13,
    color: 'rgba(26,26,46,0.35)',
  },

  // Stat cards
  statRow: {
    flexDirection: 'row',
    marginHorizontal: 24,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#7B61FF',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  statCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(26,26,46,0.4)',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  statValueRow: { flexDirection: 'row', alignItems: 'center' },
  statCardValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A2E',
    letterSpacing: -0.5,
  },
  statPercent: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  statGoal: {
    fontSize: 12,
    color: 'rgba(26,26,46,0.4)',
    marginTop: 4,
  },

  // Logs
  logsSection: {
    marginHorizontal: 24,
    marginBottom: 16,
  },
  logsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logsSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7B61FF',
  },
  emptyLogsText: {
    fontSize: 13,
    color: 'rgba(26,26,46,0.35)',
    textAlign: 'center',
    paddingVertical: 20,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  logIcon: {
    width: 44, height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(123,97,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  logInfo: { flex: 1 },
  logAmount: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  logType: { fontSize: 12, color: 'rgba(26,26,46,0.45)', marginTop: 2 },
  logTime: { fontSize: 13, fontWeight: '500', color: 'rgba(26,26,46,0.4)' },
});