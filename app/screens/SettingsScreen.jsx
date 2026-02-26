import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Modal,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import useProfileStore from '../store/profileStore';
import useHydrationStore from '../store/hydrationStore';
import { cancelAllNotifications } from '../utils/notificationEngine';

// ── Helpers ──────────────────────────────────────────────
const toDisplay = (cl, unit) => unit === 'ml' ? cl * 10 : cl;
const toCl = (val, unit) => unit === 'ml' ? Math.round(val / 10) : val;
const formatHour = (h) => `${String(h).padStart(2, '0')}:00`;

// ── Stepper Modal ─────────────────────────────────────────
function StepperModal({ visible, onClose, title, value, onSave, min, max, step = 1, unit = '' }) {
  const [current, setCurrent] = useState(value);

  const increment = () => {
    const next = Math.min(max, current + step);
    setCurrent(next);
    Haptics.selectionAsync();
  };
  const decrement = () => {
    const next = Math.max(min, current - step);
    setCurrent(next);
    Haptics.selectionAsync();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={m.overlay}>
        <View style={m.card}>
          <Text style={m.title}>{title}</Text>
          <View style={m.stepperRow}>
            <TouchableOpacity
              style={[m.stepBtn, current <= min && m.stepBtnDisabled]}
              onPress={decrement}
              disabled={current <= min}
            >
              <Ionicons name="remove" size={24} color={current <= min ? 'rgba(26,26,46,0.2)' : '#7B61FF'} />
            </TouchableOpacity>
            <View style={m.valueBox}>
              <Text style={m.valueText}>{current}</Text>
              {unit ? <Text style={m.unitText}>{unit}</Text> : null}
            </View>
            <TouchableOpacity
              style={[m.stepBtn, current >= max && m.stepBtnDisabled]}
              onPress={increment}
              disabled={current >= max}
            >
              <Ionicons name="add" size={24} color={current >= max ? 'rgba(26,26,46,0.2)' : '#7B61FF'} />
            </TouchableOpacity>
          </View>
          <View style={m.btnRow}>
            <TouchableOpacity style={m.cancelBtn} onPress={onClose}>
              <Text style={m.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={m.saveBtn}
              onPress={() => { onSave(current); onClose(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
            >
              <Text style={m.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Hour Picker Modal ─────────────────────────────────────
function HourPickerModal({ visible, onClose, startHour, endHour, onSave }) {
  const [start, setStart] = useState(startHour);
  const [end, setEnd] = useState(endHour);

  const adjust = (type, dir) => {
    Haptics.selectionAsync();
    if (type === 'start') {
      const next = Math.min(Math.max(start + dir, 0), 23);
      if (next < end) setStart(next);
    } else {
      const next = Math.min(Math.max(end + dir, 0), 23);
      if (next > start) setEnd(next);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={m.overlay}>
        <View style={m.card}>
          <Text style={m.title}>Drinking Window</Text>
          <View style={m.windowRow}>
            <View style={m.windowCol}>
              <Text style={m.windowLabel}>Start</Text>
              <TouchableOpacity style={m.stepBtn} onPress={() => adjust('start', 1)}>
                <Ionicons name="chevron-up" size={22} color="#7B61FF" />
              </TouchableOpacity>
              <View style={m.valueBox}>
                <Text style={m.valueText}>{formatHour(start)}</Text>
              </View>
              <TouchableOpacity style={m.stepBtn} onPress={() => adjust('start', -1)}>
                <Ionicons name="chevron-down" size={22} color="#7B61FF" />
              </TouchableOpacity>
            </View>
            <Text style={m.windowSep}>→</Text>
            <View style={m.windowCol}>
              <Text style={m.windowLabel}>End</Text>
              <TouchableOpacity style={m.stepBtn} onPress={() => adjust('end', 1)}>
                <Ionicons name="chevron-up" size={22} color="#7B61FF" />
              </TouchableOpacity>
              <View style={m.valueBox}>
                <Text style={m.valueText}>{formatHour(end)}</Text>
              </View>
              <TouchableOpacity style={m.stepBtn} onPress={() => adjust('end', -1)}>
                <Ionicons name="chevron-down" size={22} color="#7B61FF" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={m.btnRow}>
            <TouchableOpacity style={m.cancelBtn} onPress={onClose}>
              <Text style={m.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={m.saveBtn}
              onPress={() => { onSave(start, end); onClose(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
            >
              <Text style={m.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Edit Name Modal ───────────────────────────────────────
function EditNameModal({ visible, onClose, currentName, onSave }) {
  const [name, setName] = useState(currentName);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={m.overlay}>
        <View style={m.card}>
          <Text style={m.title}>Edit Name</Text>
          <TextInput
            style={m.textInput}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor="rgba(26,26,46,0.3)"
            autoFocus
            textAlign="center"
          />
          <View style={m.btnRow}>
            <TouchableOpacity style={m.cancelBtn} onPress={onClose}>
              <Text style={m.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[m.saveBtn, !name.trim() && m.saveBtnDisabled]}
              disabled={!name.trim()}
              onPress={() => { onSave(name.trim()); onClose(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
            >
              <Text style={m.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Edit Weight Modal ─────────────────────────────────────
function EditWeightModal({ visible, onClose, currentWeight, onSave }) {
  const [weight, setWeight] = useState(currentWeight);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={m.overlay}>
        <View style={m.card}>
          <Text style={m.title}>Edit Weight</Text>
          <View style={m.stepperRow}>
            <TouchableOpacity
              style={[m.stepBtn, weight <= 30 && m.stepBtnDisabled]}
              onPress={() => { if (weight > 30) { setWeight(weight - 1); Haptics.selectionAsync(); } }}
              disabled={weight <= 30}
            >
              <Ionicons name="remove" size={24} color={weight <= 30 ? 'rgba(26,26,46,0.2)' : '#7B61FF'} />
            </TouchableOpacity>
            <View style={m.valueBox}>
              <Text style={m.valueText}>{weight}</Text>
              <Text style={m.unitText}>kg</Text>
            </View>
            <TouchableOpacity
              style={[m.stepBtn, weight >= 250 && m.stepBtnDisabled]}
              onPress={() => { if (weight < 250) { setWeight(weight + 1); Haptics.selectionAsync(); } }}
              disabled={weight >= 250}
            >
              <Ionicons name="add" size={24} color={weight >= 250 ? 'rgba(26,26,46,0.2)' : '#7B61FF'} />
            </TouchableOpacity>
          </View>
          <View style={m.btnRow}>
            <TouchableOpacity style={m.cancelBtn} onPress={onClose}>
              <Text style={m.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={m.saveBtn}
              onPress={() => { onSave(weight); onClose(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
            >
              <Text style={m.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────
export default function SettingsScreen() {
  const { profile, saveProfile, clearProfile } = useProfileStore();
  const { clearAllData } = useHydrationStore();

  const [unit, setUnit] = useState('cl');
  const [showEditName, setShowEditName] = useState(false);
  const [showEditWeight, setShowEditWeight] = useState(false);
  const [showEditGoal, setShowEditGoal] = useState(false);
  const [showEditWindow, setShowEditWindow] = useState(false);
  const [showEditInterval, setShowEditInterval] = useState(false);

  const name = profile?.name || '—';
  const weight = profile?.weightKg || 70;
  const goalCl = profile?.dailyGoalCl || 250;
  const windowStart = profile?.activeWindowStart ?? 6;
  const windowEnd = profile?.activeWindowEnd ?? 22;
  const intervalHours = profile?.notificationIntervalHours ?? 2;
  const weatherEnabled = profile?.weatherAdjustEnabled ?? true;
  const city = profile?.city || 'your city';

  const displayGoal = toDisplay(goalCl, unit);
  const initials = name !== '—'
    ? name.trim().split(' ').map((w) => w[0].toUpperCase()).slice(0, 2).join('')
    : '?';

  const handleClearData = () => {
    Alert.alert(
      'Clear All Data',
      "This will delete all your logs, journey progress, and profile. You'll be taken back to onboarding. This cannot be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Everything',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            await clearProfile();
            await cancelAllNotifications();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  };

  const Row = ({ icon, label, value, onPress, danger }) => (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7}>
      <View style={s.rowLeft}>
        <Ionicons name={icon} size={20} color={danger ? '#FF5252' : '#7B61FF'} />
        <Text style={[s.rowLabel, danger && s.rowLabelDanger]}>{label}</Text>
      </View>
      <View style={s.rowRight}>
        {value ? <Text style={s.rowValue}>{value}</Text> : null}
        <Ionicons name="chevron-forward" size={18} color="rgba(26,26,46,0.25)" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={s.safe}>

      {/* Modals */}
      <EditNameModal
        visible={showEditName}
        onClose={() => setShowEditName(false)}
        currentName={name}
        onSave={(n) => saveProfile({ ...profile, name: n })}
      />
      <EditWeightModal
        visible={showEditWeight}
        onClose={() => setShowEditWeight(false)}
        currentWeight={weight}
        onSave={(w) => saveProfile({ ...profile, weightKg: w })}
      />
      <StepperModal
        visible={showEditGoal}
        onClose={() => setShowEditGoal(false)}
        title="Daily Goal"
        value={goalCl}
        min={50}
        max={600}
        step={10}
        unit="cl"
        onSave={(v) => saveProfile({ ...profile, dailyGoalCl: v })}
      />
      <HourPickerModal
        visible={showEditWindow}
        onClose={() => setShowEditWindow(false)}
        startHour={windowStart}
        endHour={windowEnd}
        onSave={(s, e) => saveProfile({ ...profile, activeWindowStart: s, activeWindowEnd: e })}
      />
      <StepperModal
        visible={showEditInterval}
        onClose={() => setShowEditInterval(false)}
        title="Reminder Interval"
        value={intervalHours}
        min={1}
        max={12}
        step={1}
        unit="hrs"
        onSave={(v) => saveProfile({ ...profile, notificationIntervalHours: v })}
      />

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <View style={{ width: 40 }} />
          <Text style={s.headerTitle}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Profile section */}
        <View style={s.sectionCard}>
          <TouchableOpacity style={s.editBtn} onPress={() => setShowEditName(true)}>
            <Text style={s.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <View style={s.profileRow}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{initials}</Text>
            </View>
            <View>
              <Text style={s.profileName}>{name}</Text>
              <Text style={s.profileSub}>
                Target: {displayGoal}{unit} · {weight}kg
              </Text>
            </View>
          </View>
        </View>

        {/* Hydration Preferences */}
        <Text style={s.groupLabel}>HYDRATION PREFERENCES</Text>
        <View style={s.sectionCard}>
          <Row
            icon="flag-outline"
            label="Daily Goal"
            value={`${displayGoal}${unit}`}
            onPress={() => setShowEditGoal(true)}
          />
          <View style={s.rowDivider} />
          <Row
            icon="time-outline"
            label="Drinking Window"
            value={`${formatHour(windowStart)} – ${formatHour(windowEnd)}`}
            onPress={() => setShowEditWindow(true)}
          />
          <View style={s.rowDivider} />
          <Row
            icon="notifications-outline"
            label="Reminder Interval"
            value={`Every ${intervalHours}h`}
            onPress={() => setShowEditInterval(true)}
          />
          <View style={s.rowDivider} />
          <Row
            icon="scale-outline"
            label="Weight"
            value={`${weight}kg`}
            onPress={() => setShowEditWeight(true)}
          />
          <View style={s.rowDivider} />

          {/* Units toggle */}
          <View style={s.row}>
            <View style={s.rowLeft}>
              <Ionicons name="resize-outline" size={20} color="#7B61FF" />
              <Text style={s.rowLabel}>Units</Text>
            </View>
            <View style={s.unitToggle}>
              <TouchableOpacity
                style={[s.unitBtn, unit === 'cl' && s.unitBtnActive]}
                onPress={() => setUnit('cl')}
              >
                <Text style={[s.unitBtnText, unit === 'cl' && s.unitBtnTextActive]}>cl</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.unitBtn, unit === 'ml' && s.unitBtnActive]}
                onPress={() => setUnit('ml')}
              >
                <Text style={[s.unitBtnText, unit === 'ml' && s.unitBtnTextActive]}>ml</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Smart Features */}
        <Text style={s.groupLabel}>SMART FEATURES</Text>
        <View style={s.sectionCard}>
          <View style={s.smartRow}>
            <View style={s.smartIconBox}>
              <Ionicons name="thermometer-outline" size={20} color="#7B61FF" />
            </View>
            <View style={s.smartContent}>
              <Text style={s.smartTitle}>Temperature Sync</Text>
              <Text style={s.smartDesc}>
                Adjust suggestions based on {city} weather
              </Text>
            </View>
            <Switch
              value={weatherEnabled}
              onValueChange={(v) => saveProfile({ ...profile, weatherAdjustEnabled: v })}
              trackColor={{ false: 'rgba(26,26,46,0.1)', true: 'rgba(123,97,255,0.5)' }}
              thumbColor={weatherEnabled ? '#7B61FF' : '#ccc'}
            />
          </View>
        </View>

        {/* Support */}
        <Text style={s.groupLabel}>SUPPORT</Text>
        <View style={s.sectionCard}>
          <Row
            icon="shield-outline"
            label="Privacy Policy"
            onPress={() => Linking.openURL('https://anthropic.com')}
          />
          <View style={s.rowDivider} />
          <Row
            icon="help-circle-outline"
            label="Contact Support"
            onPress={() => Linking.openURL('mailto:support@sica.app')}
          />
        </View>

        {/* Clear data */}
        <TouchableOpacity style={s.clearBtn} onPress={handleClearData} activeOpacity={0.8}>
          <Ionicons name="trash-outline" size={18} color="#FF5252" />
          <Text style={s.clearBtnText}>Clear All Data</Text>
        </TouchableOpacity>

        <Text style={s.versionText}>Sica v1.0.0</Text>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Modal styles ──────────────────────────────────────────
const m = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 28, padding: 28,
    width: '100%', maxWidth: 340,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
    alignItems: 'center',
  },
  title: {
    fontSize: 18, fontWeight: '800', color: '#1A1A2E',
    marginBottom: 24, textAlign: 'center',
  },
  stepperRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 20, marginBottom: 28,
  },
  stepBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(123,97,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnDisabled: { backgroundColor: 'rgba(26,26,46,0.05)' },
  valueBox: { alignItems: 'center', minWidth: 80 },
  valueText: {
    fontSize: 44, fontWeight: '900', color: '#7B61FF',
    letterSpacing: -2, lineHeight: 50,
  },
  unitText: {
    fontSize: 14, fontWeight: '600',
    color: 'rgba(123,97,255,0.6)', marginTop: 2,
  },
  windowRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 16, marginBottom: 28,
  },
  windowCol: { alignItems: 'center', gap: 8, flex: 1 },
  windowLabel: {
    fontSize: 12, fontWeight: '700',
    color: 'rgba(26,26,46,0.4)', letterSpacing: 1,
  },
  windowSep: { fontSize: 20, color: 'rgba(26,26,46,0.2)', fontWeight: '300' },
  btnRow: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 99,
    backgroundColor: 'rgba(26,26,46,0.06)',
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: 'rgba(26,26,46,0.5)' },
  saveBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 99,
    backgroundColor: '#7B61FF', alignItems: 'center',
    shadowColor: '#7B61FF', shadowOpacity: 0.3, shadowRadius: 10, elevation: 4,
  },
  saveBtnDisabled: { backgroundColor: 'rgba(123,97,255,0.3)', shadowOpacity: 0 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  textInput: {
    width: '100%', borderWidth: 2, borderColor: 'rgba(123,97,255,0.2)',
    borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20,
    fontSize: 20, fontWeight: '600', color: '#1A1A2E',
    marginBottom: 24, textAlign: 'center',
    backgroundColor: '#F8F7FF',
  },
});

// ── Screen styles ─────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#E6E6FA' },
  scroll: { paddingBottom: 110 },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A2E' },

  groupLabel: {
    fontSize: 10, fontWeight: '700', color: 'rgba(26,26,46,0.4)',
    letterSpacing: 2, marginHorizontal: 24,
    marginBottom: 8, marginTop: 20,
  },

  sectionCard: {
    marginHorizontal: 24, backgroundColor: '#FFFFFF',
    borderRadius: 20, overflow: 'hidden',
    shadowColor: '#7B61FF', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
    borderWidth: 1, borderColor: 'rgba(123,97,255,0.05)',
  },

  // Profile
  editBtn: { position: 'absolute', top: 16, right: 16, zIndex: 1 },
  editBtnText: { fontSize: 14, fontWeight: '700', color: '#7B61FF' },
  profileRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 16, padding: 20,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#7B61FF',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
  },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  profileName: { fontSize: 18, fontWeight: '800', color: '#1A1A2E', marginBottom: 2 },
  profileSub: { fontSize: 13, color: 'rgba(26,26,46,0.45)', fontWeight: '500' },

  // Rows
  row: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowLabel: { fontSize: 15, fontWeight: '600', color: '#1A1A2E' },
  rowLabelDanger: { color: '#FF5252' },
  rowValue: { fontSize: 14, color: 'rgba(26,26,46,0.45)', fontWeight: '500' },
  rowDivider: { height: 1, backgroundColor: 'rgba(26,26,46,0.04)', marginHorizontal: 20 },

  // Units toggle
  unitToggle: {
    flexDirection: 'row', backgroundColor: 'rgba(26,26,46,0.06)',
    borderRadius: 10, padding: 3, gap: 2,
  },
  unitBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  unitBtnActive: { backgroundColor: '#7B61FF' },
  unitBtnText: { fontSize: 13, fontWeight: '700', color: 'rgba(26,26,46,0.4)' },
  unitBtnTextActive: { color: '#fff' },

  // Smart features
  smartRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, padding: 20,
  },
  smartIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(123,97,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  smartContent: { flex: 1 },
  smartTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A2E', marginBottom: 2 },
  smartDesc: { fontSize: 12, color: 'rgba(26,26,46,0.45)', lineHeight: 18 },

  // Clear data
  clearBtn: {
    marginHorizontal: 24, marginTop: 28,
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 99,
    backgroundColor: 'rgba(255,82,82,0.08)',
    borderWidth: 1.5, borderColor: 'rgba(255,82,82,0.2)',
  },
  clearBtnText: { fontSize: 15, fontWeight: '700', color: '#FF5252' },

  versionText: {
    textAlign: 'center', fontSize: 12,
    color: 'rgba(26,26,46,0.25)', marginTop: 16, marginBottom: 8,
  },
});