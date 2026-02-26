import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

const LOGS_KEY = 'sica_logs';
const JOURNEY_KEY = 'sica_journey';

const today = () => new Date().toISOString().split('T')[0];

const useHydrationStore = create((set, get) => ({
  logs: [],
  journey: null,
  isLoaded: false,
  pendingUndo: null, // last committed log for undo
  undoTimer: null,

  loadData: async () => {
    try {
      const [rawLogs, rawJourney] = await Promise.all([
        AsyncStorage.getItem(LOGS_KEY),
        AsyncStorage.getItem(JOURNEY_KEY),
      ]);
      set({
        logs: rawLogs ? JSON.parse(rawLogs) : [],
        journey: rawJourney
          ? JSON.parse(rawJourney)
          : {
              currentStage: 0,
              stageProgress: 0,
              lastEvaluatedAt: today(),
              consecutiveFailWeeks: 0,
            },
        isLoaded: true,
      });
    } catch (e) {
      set({ logs: [], isLoaded: true });
    }
  },

  addLog: async (amountCl, loggedFor = null) => {
    const now = new Date();
    const entry = {
      id: uuid.v4(),
      amountCl,
      loggedAt: now.toISOString(),
      loggedFor: loggedFor || today(),
    };
    const logs = [...get().logs, entry];
    set({ logs, pendingUndo: entry });
    await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(logs));
    return entry;
  },

  undoLastLog: async () => {
    const { pendingUndo, logs } = get();
    if (!pendingUndo) return;
    const updated = logs.filter((l) => l.id !== pendingUndo.id);
    set({ logs: updated, pendingUndo: null });
    await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(updated));
  },

  clearPendingUndo: () => set({ pendingUndo: null }),

  getTodayTotal: () => {
    const { logs } = get();
    const t = today();
    return logs
      .filter((l) => l.loggedFor === t)
      .reduce((sum, l) => sum + l.amountCl, 0);
  },

  getLogsForDate: (date) => {
    return get().logs.filter((l) => l.loggedFor === date);
  },

  getDailyTotals: (days = 7) => {
    const { logs } = get();
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const total = logs
        .filter((l) => l.loggedFor === dateStr)
        .reduce((sum, l) => sum + l.amountCl, 0);
      result.push({ date: dateStr, total });
    }
    return result;
  },

  saveJourney: async (data) => {
    const merged = { ...get().journey, ...data };
    set({ journey: merged });
    await AsyncStorage.setItem(JOURNEY_KEY, JSON.stringify(merged));
  },

  clearAllData: async () => {
    await Promise.all([
      AsyncStorage.removeItem(LOGS_KEY),
      AsyncStorage.removeItem(JOURNEY_KEY),
    ]);
    set({
      logs: [],
      journey: {
        currentStage: 0,
        stageProgress: 0,
        lastEvaluatedAt: today(),
        consecutiveFailWeeks: 0,
      },
      pendingUndo: null,
    });
  },
}));

export default useHydrationStore;
