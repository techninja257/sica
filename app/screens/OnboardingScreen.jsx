import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  Switch,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle } from 'react-native-svg';
import useProfileStore from '../store/profileStore';
import { calculateDailyGoal } from '../utils/hydrationEngine';
import { trackOnboardingStarted, trackOnboardingCompleted } from '../utils/analytics';

const { width } = Dimensions.get('window');
const TOTAL_STEPS = 6;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const INTERVALS = ['Every 1h', 'Every 2h', 'Every 3h'];
const formatHour = (h) => `${String(h).padStart(2, '0')}:00`;

const kgToLbs = (kg) => Math.round(kg * 2.20462);
const lbsToKg = (lbs) => Math.round(lbs / 2.20462);

function WaterIllustration() {
  return (
    <Svg width={120} height={120} viewBox="0 0 120 120">
      <Circle cx="60" cy="60" r="58" fill="rgba(123,97,255,0.08)" stroke="rgba(123,97,255,0.15)" strokeWidth="1.5" />
      <Circle cx="60" cy="60" r="44" fill="rgba(123,97,255,0.1)" />
      <Path
        d="M60 22 C60 22 38 48 38 63 C38 75.15 47.85 85 60 85 C72.15 85 82 75.15 82 63 C82 48 60 22 60 22Z"
        fill="#7B61FF"
        opacity={0.9}
      />
      <Path d="M52 50 C52 50 47 58 47 64" stroke="white" strokeWidth="3" strokeLinecap="round" opacity={0.4} />
      <Path d="M88 32 C88 32 83 38 83 42 C83 44.76 85.24 47 88 47 C90.76 47 93 44.76 93 42 C93 38 88 32 88 32Z" fill="#A390FF" opacity={0.7} />
      <Path d="M28 40 C28 40 24 45 24 48 C24 50.21 25.79 52 28 52 C30.21 52 32 50.21 32 48 C32 45 28 40 28 40Z" fill="#A390FF" opacity={0.5} />
    </Svg>
  );
}

function HourWheel({ value, onChange, onTouchStart, onTouchEnd }) {
  const ITEM_HEIGHT = 44;
  return (
    <View
      style={wStyles.wheelMask}
      onStartShouldSetResponder={() => true}
    >
      <View style={wStyles.wheelHighlight} pointerEvents="none" />
      <ScrollView
        style={wStyles.wheelScroll}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        nestedScrollEnabled={true}
        contentOffset={{ y: value * ITEM_HEIGHT }}
        onScrollBeginDrag={onTouchStart}
        onMomentumScrollEnd={(e) => {
          const h = Math.min(Math.max(Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT), 0), 23);
          onChange(h);
          onTouchEnd && onTouchEnd();
          Haptics.selectionAsync();
        }}
        onScrollEndDrag={(e) => {
          const h = Math.min(Math.max(Math.round(e.nativeEvent.contentOffset.y / ITEM_HEIGHT), 0), 23);
          onChange(h);
          onTouchEnd && onTouchEnd();
        }}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
      >
        {HOURS.map((h) => (
          <View key={h} style={wStyles.wheelItem}>
            <Text style={[wStyles.wheelText, h === value && wStyles.wheelTextActive]}>
              {formatHour(h)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const wStyles = StyleSheet.create({
  wheelMask: {
    height: 220, width: '100%', alignItems: 'center',
    overflow: 'hidden', position: 'relative',
  },
  wheelHighlight: {
    position: 'absolute', top: '50%', left: 8, right: 8,
    height: 44, marginTop: -22,
    backgroundColor: 'rgba(123,97,255,0.1)', borderRadius: 12,
    borderWidth: 1.5, borderColor: 'rgba(123,97,255,0.25)', zIndex: 1,
  },
  wheelScroll: { width: '100%' },
  wheelItem: { height: 44, alignItems: 'center', justifyContent: 'center' },
  wheelText: { fontSize: 16, color: 'rgba(26,26,46,0.25)', fontWeight: '500' },
  wheelTextActive: { fontSize: 22, color: '#7B61FF', fontWeight: '800' },
});

export default function OnboardingScreen({ onComplete }) {
  const { saveProfile } = useProfileStore();
  const [step, setStep] = useState(0);

  const [name, setName] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [gender, setGender] = useState(null);

  // Weight — stored internally always in kg
  const [weightKg, setWeightKg] = useState(70);
  const [weightUnit, setWeightUnit] = useState('kg'); // 'kg' or 'lbs'
  const [weightInput, setWeightInput] = useState('70');
  const weightInputRef = useRef(null);

  const [goalCl, setGoalCl] = useState(210);
  const [goalInput, setGoalInput] = useState('210');
  const [windowStart, setWindowStart] = useState(6);
  const [windowEnd, setWindowEnd] = useState(22);
  const [reminderInterval, setReminderInterval] = useState(1);
  const [customInterval, setCustomInterval] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [weatherEnabled, setWeatherEnabled] = useState(true);
  const [city, setCity] = useState('');

  const [parentScrollEnabled, setParentScrollEnabled] = useState(true);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1 / TOTAL_STEPS)).current;

  // Track onboarding started once
  useEffect(() => {
    trackOnboardingStarted();
  }, []);

  // Weight helpers
  const displayWeight = weightUnit === 'kg' ? weightKg : kgToLbs(weightKg);

  const handleWeightUnitSwitch = (unit) => {
    setWeightUnit(unit);
    const newDisplay = unit === 'kg' ? weightKg : kgToLbs(weightKg);
    setWeightInput(String(newDisplay));
  };

  const handleWeightInputChange = (text) => {
    // Numbers only
    const cleaned = text.replace(/[^0-9]/g, '');
    setWeightInput(cleaned);
    const num = parseInt(cleaned);
    if (!isNaN(num) && num > 0) {
      const kg = weightUnit === 'kg' ? num : lbsToKg(num);
      const clamped = Math.min(Math.max(kg, 30), 250);
      setWeightKg(clamped);
      const newGoal = calculateDailyGoal(clamped);
      setGoalCl(newGoal);
      setGoalInput(String(newGoal));
    }
  };

  const handleWeightStep = (delta) => {
    Haptics.selectionAsync();
    if (weightUnit === 'kg') {
      const newKg = Math.min(Math.max(weightKg + delta, 30), 250);
      setWeightKg(newKg);
      setWeightInput(String(newKg));
      const newGoal = calculateDailyGoal(newKg);
      setGoalCl(newGoal);
      setGoalInput(String(newGoal));
    } else {
      const currentLbs = kgToLbs(weightKg);
      const newLbs = currentLbs + delta;
      const newKg = Math.min(Math.max(lbsToKg(newLbs), 30), 250);
      setWeightKg(newKg);
      setWeightInput(String(kgToLbs(newKg)));
      const newGoal = calculateDailyGoal(newKg);
      setGoalCl(newGoal);
      setGoalInput(String(newGoal));
    }
  };

  const animateStep = (direction = 1) => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -width * direction, duration: 220, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: width * direction, duration: 0, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  };

  const next = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateStep(1);
    const nextStep = step + 1;
    setStep(nextStep);
    Animated.timing(progressAnim, {
      toValue: (nextStep + 1) / TOTAL_STEPS,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const back = () => {
    if (step === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    animateStep(-1);
    const prevStep = step - 1;
    setStep(prevStep);
    Animated.timing(progressAnim, {
      toValue: (prevStep + 1) / TOTAL_STEPS,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const handleFinish = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const intervalHours = showCustom
      ? parseInt(customInterval) || 2
      : [1, 2, 3][reminderInterval];
    const profileData = {
      name: name.trim(),
      gender: gender === 'female' ? 'goddess' : 'god',
      weightKg,
      dailyGoalCl: goalCl,
      activeWindowStart: windowStart,
      activeWindowEnd: windowEnd,
      notificationIntervalHours: intervalHours,
      weatherAdjustEnabled: weatherEnabled,
      city: city.trim() || 'your city',
      onboardingComplete: true,
    };
    await saveProfile(profileData);
    trackOnboardingCompleted(profileData);
    onComplete && onComplete();
  };

  const canProceed = [
    name.trim().length > 0,
    gender !== null,
    true,
    goalCl > 0,
    true,
    true,
  ][step];

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="dark" />

      {/* Header — hidden on step 1 when keyboard is open */}
      {!(step === 0 && keyboardVisible) && (
        <>
          <View style={s.header}>
            <TouchableOpacity style={s.backBtn} onPress={back} disabled={step === 0}>
              <Text style={[s.backBtnText, step === 0 && { opacity: 0 }]}>‹</Text>
            </TouchableOpacity>
            <Text style={s.stepLabel}>Step {step + 1} of {TOTAL_STEPS}</Text>
            <View style={{ width: 44 }} />
          </View>
          <View style={s.progressTrack}>
            <Animated.View style={[s.progressFill, { width: progressWidth }]} />
          </View>
        </>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View style={[{ flex: 1 }, { transform: [{ translateX: slideAnim }] }]}>

          {/* ── STEP 1 — Name ── */}
          {step === 0 && (
            <View style={s.step1Outer}>
              {/* Hero — hidden when keyboard is open */}
              {!keyboardVisible && (
                <View style={s.step1Top}>
                  <Text style={[s.titleCenter, { fontSize: 42, lineHeight: 52 }]}>
                    Welcome to{'\n'}Sica.
                  </Text>
                  <View style={s.iconCircle}>
                    <Svg width={52} height={62} viewBox="0 0 26 31" fill="none">
                      <Path
                        d="M13 2 C13 2 2 13 2 20 C2 26.08 6.92 31 13 31 C19.08 31 24 26.08 24 20 C24 13 13 2 13 2Z"
                        stroke="#7B61FF"
                        strokeWidth={1.6}
                        fill="rgba(123,97,255,0.15)"
                        strokeLinejoin="round"
                      />
                    </Svg>
                  </View>
                </View>
              )}
              <View style={[s.step1Bottom, keyboardVisible && { flex: 1, justifyContent: 'center' }]}>
                <View style={s.card}>
                  <Text style={s.cardLabel}>What should we call you?</Text>
                  <TextInput
                    style={s.nameInput}
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your name"
                    placeholderTextColor="rgba(26,26,46,0.3)"
                    autoFocus
                    returnKeyType="next"
                    onSubmitEditing={() => canProceed && next()}
                    textAlign="center"
                    onFocus={() => setKeyboardVisible(true)}
                    onBlur={() => setKeyboardVisible(false)}
                  />
                  <Text style={s.inputHint}>THIS IS HOW YOU'LL APPEAR IN THE APP</Text>
                </View>
              </View>
            </View>
          )}

          {/* ── STEP 2 — Gender ── */}
          {step === 1 && (
            <ScrollView contentContainerStyle={s.stepScroll}>
              <Text style={s.titleCenter}>Your Gender</Text>
              <Text style={s.subtitleCenter}>
                Please choose your gender so Sica can personalize your hydration journey.
              </Text>
              <View style={s.genderRow}>
                <TouchableOpacity
                  style={[s.genderCard, gender === 'female' && s.genderCardSelected]}
                  onPress={() => { setGender('female'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                  activeOpacity={0.8}
                >
                  <View style={[s.avatarCircle, gender === 'female' && s.avatarCircleSelected]}>
                    <Text style={s.avatarEmoji}>👩</Text>
                  </View>
                  <Text style={[s.genderLabel, gender === 'female' && s.genderLabelSelected]}>Female</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.genderCard, gender === 'male' && s.genderCardSelected]}
                  onPress={() => { setGender('male'); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                  activeOpacity={0.8}
                >
                  <View style={[s.avatarCircle, gender === 'male' && s.avatarCircleSelected]}>
                    <Text style={s.avatarEmoji}>👨</Text>
                  </View>
                  <Text style={[s.genderLabel, gender === 'male' && s.genderLabelSelected]}>Male</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* ── STEP 3 — Weight ── */}
          {step === 2 && (
            <ScrollView contentContainerStyle={s.stepScroll} keyboardShouldPersistTaps="handled">
              <Text style={s.titleCenter}>Your Current{'\n'}Weight</Text>
              <Text style={s.subtitleCenter}>
                To give you the most accurate daily water intake, we need to know your weight.
              </Text>
              <View style={s.card}>
                {/* kg / lbs toggle */}
                <View style={s.unitToggle}>
                  <TouchableOpacity
                    style={[s.unitBtn, weightUnit === 'kg' && s.unitBtnActive]}
                    onPress={() => handleWeightUnitSwitch('kg')}
                  >
                    <Text style={[s.unitBtnText, weightUnit === 'kg' && s.unitBtnTextActive]}>kg</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.unitBtn, weightUnit === 'lbs' && s.unitBtnActive]}
                    onPress={() => handleWeightUnitSwitch('lbs')}
                  >
                    <Text style={[s.unitBtnText, weightUnit === 'lbs' && s.unitBtnTextActive]}>lbs</Text>
                  </TouchableOpacity>
                </View>

                {/* Weight display — tappable to type */}
                <View style={s.stepperRow}>
                  <TouchableOpacity
                    style={s.stepperBtn}
                    onPress={() => handleWeightStep(-1)}
                    onLongPress={() => handleWeightStep(-5)}
                  >
                    <Text style={s.stepperBtnText}>−</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={s.weightTapArea}
                    onPress={() => weightInputRef.current?.focus()}
                    activeOpacity={0.7}
                  >
                    <TextInput
                      ref={weightInputRef}
                      style={s.weightValueInput}
                      value={weightInput}
                      onChangeText={handleWeightInputChange}
                      keyboardType="number-pad"
                      textAlign="center"
                      selectTextOnFocus
                    />
                    <Text style={s.weightUnit}>{weightUnit}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={s.stepperBtn}
                    onPress={() => handleWeightStep(1)}
                    onLongPress={() => handleWeightStep(5)}
                  >
                    <Text style={s.stepperBtnText}>+</Text>
                  </TouchableOpacity>
                </View>

                <Text style={s.stepperHint}>Hold button to change by 5 • Tap number to type</Text>
                <Text style={s.goalPreview}>Daily goal: {calculateDailyGoal(weightKg)} cl</Text>
              </View>
            </ScrollView>
          )}

          {/* ── STEP 4 — Goal + Window ── */}
          {step === 3 && (
            <ScrollView contentContainerStyle={s.stepScroll} keyboardShouldPersistTaps="handled" scrollEnabled={parentScrollEnabled}>
              <Text style={s.titleCenter}>Hydration Goal</Text>
              <Text style={s.subtitleCenter}>
                Based on your profile, Sica recommends{' '}
                <Text style={{ fontWeight: '700', color: '#1A1A2E' }}>{calculateDailyGoal(weightKg)}cl</Text> daily.
                You can adjust below.
              </Text>

              {/* Goal card */}
              <View style={[s.card, { marginBottom: 16 }]}>
                <View style={s.goalRow}>
                  <TouchableOpacity
                    style={s.goalBtn}
                    onPress={() => { const v = Math.max(50, goalCl - 10); setGoalCl(v); setGoalInput(String(v)); }}
                  >
                    <Text style={s.goalBtnText}>−</Text>
                  </TouchableOpacity>
                  <View style={s.goalCenter}>
                    <TextInput
                      style={s.goalInput}
                      value={goalInput}
                      onChangeText={(t) => {
                        setGoalInput(t);
                        const n = parseInt(t);
                        if (!isNaN(n) && n > 0) setGoalCl(n);
                      }}
                      keyboardType="number-pad"
                      textAlign="center"
                    />
                    <Text style={s.goalUnit}>cl</Text>
                  </View>
                  <TouchableOpacity
                    style={s.goalBtn}
                    onPress={() => { const v = goalCl + 10; setGoalCl(v); setGoalInput(String(v)); }}
                  >
                    <Text style={s.goalBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={s.goalSubLabel}>DAILY TARGET</Text>
              </View>

              {/* Window card */}
              <View style={s.card}>
                <Text style={s.windowTitle}>DRINKING WINDOW</Text>

                {/* Start Time row */}
                <View style={s.timeRow}>
                  <Text style={s.timeRowLabel}>Start Time</Text>
                  <View style={s.timeRowControls}>
                    <TouchableOpacity
                      style={s.timeStepperBtn}
                      onPress={() => { setWindowStart(Math.max(0, windowStart - 1)); Haptics.selectionAsync(); }}
                      onLongPress={() => setWindowStart(Math.max(0, windowStart - 2))}
                    >
                      <Text style={s.timeStepperBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={s.timeStepperValue}>{formatHour(windowStart)}</Text>
                    <TouchableOpacity
                      style={s.timeStepperBtn}
                      onPress={() => { setWindowStart(Math.min(windowEnd - 1, windowStart + 1)); Haptics.selectionAsync(); }}
                      onLongPress={() => setWindowStart(Math.min(windowEnd - 1, windowStart + 2))}
                    >
                      <Text style={s.timeStepperBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={s.timeRowDivider} />

                {/* End Time row */}
                <View style={s.timeRow}>
                  <Text style={s.timeRowLabel}>End Time</Text>
                  <View style={s.timeRowControls}>
                    <TouchableOpacity
                      style={s.timeStepperBtn}
                      onPress={() => { setWindowEnd(Math.max(windowStart + 1, windowEnd - 1)); Haptics.selectionAsync(); }}
                      onLongPress={() => setWindowEnd(Math.max(windowStart + 1, windowEnd - 2))}
                    >
                      <Text style={s.timeStepperBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={s.timeStepperValue}>{formatHour(windowEnd)}</Text>
                    <TouchableOpacity
                      style={s.timeStepperBtn}
                      onPress={() => { setWindowEnd(Math.min(23, windowEnd + 1)); Haptics.selectionAsync(); }}
                      onLongPress={() => setWindowEnd(Math.min(23, windowEnd + 2))}
                    >
                      <Text style={s.timeStepperBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

              </View>
            </ScrollView>
          )}

          {/* ── STEP 5 — Reminders ── */}
          {step === 4 && (
            <ScrollView contentContainerStyle={s.stepScroll} keyboardShouldPersistTaps="handled">
              <Text style={s.titleCenter}>Smart Reminders</Text>
              <Text style={s.subtitleCenter}>
                How often should Sica nudge you to stay hydrated?
              </Text>

              <Text style={s.sectionLabel}>Reminder Interval</Text>
              <View style={s.intervalRow}>
                {INTERVALS.map((label, i) => (
                  <TouchableOpacity
                    key={label}
                    style={[s.intervalBtn, !showCustom && reminderInterval === i && s.intervalBtnActive]}
                    onPress={() => { setReminderInterval(i); setShowCustom(false); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  >
                    <Text style={[s.intervalBtnText, !showCustom && reminderInterval === i && s.intervalBtnTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[s.intervalBtn, showCustom && s.intervalBtnActive]}
                  onPress={() => { setShowCustom(true); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                >
                  <Text style={[s.intervalBtnText, showCustom && s.intervalBtnTextActive]}>Custom</Text>
                </TouchableOpacity>
              </View>

              {showCustom && (
                <View style={s.customIntervalCard}>
                  <Text style={s.customIntervalLabel}>Enter interval in hours</Text>
                  <TextInput
                    style={s.customIntervalInput}
                    value={customInterval}
                    onChangeText={setCustomInterval}
                    keyboardType="number-pad"
                    placeholder="e.g. 4"
                    placeholderTextColor="rgba(26,26,46,0.3)"
                    textAlign="center"
                    autoFocus
                  />
                </View>
              )}

              {/* City card — always visible, city always collected */}
              <View style={s.cityCard}>
                <View style={s.cityCardHeader}>
                  <View style={s.cityIconBox}>
                    <Text style={{ fontSize: 22 }}>🌡️</Text>
                  </View>
                  <View style={s.cityCardTitleBlock}>
                    <Text style={s.cityCardTitle}>Your City</Text>
                    <Text style={s.cityCardDesc}>
                      Sica uses this to suggest more water on hot days.
                    </Text>
                  </View>
                </View>
                <TextInput
                  style={s.cityInput}
                  value={city}
                  onChangeText={setCity}
                  placeholder="Enter your city..."
                  placeholderTextColor="rgba(26,26,46,0.3)"
                />
                {/* Toggle — only controls nudges, city still collected */}
                <View style={s.cityToggleRow}>
                  <Text style={s.cityToggleLabel}>Enable temperature nudges</Text>
                  <Switch
                    value={weatherEnabled}
                    onValueChange={setWeatherEnabled}
                    trackColor={{ false: 'rgba(26,26,46,0.1)', true: 'rgba(123,97,255,0.5)' }}
                    thumbColor={weatherEnabled ? '#7B61FF' : '#ccc'}
                  />
                </View>
              </View>
            </ScrollView>
          )}

          {/* ── STEP 6 — Complete ── */}
          {step === 5 && (
            <ScrollView contentContainerStyle={s.stepScroll}>
              <Text style={s.titleCenter}>Personalization{'\n'}Complete</Text>
              <Text style={s.subtitleCenter}>
                Sica is ready to guide you on your hydration journey. We've customized your plan based on your goals.
              </Text>
              <View style={s.summaryCard}>
                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                  <WaterIllustration />
                </View>
                <Text style={s.summaryGoalLabel}>Your Daily Goal</Text>
                <View style={s.summaryGoalRow}>
                  <Text style={s.summaryGoalValue}>{goalCl}</Text>
                  <Text style={s.summaryGoalUnit}>cl</Text>
                </View>
                <View style={s.summaryDivider} />
                <View style={s.summaryStats}>
                  <View style={s.summaryStat}>
                    <Text style={s.summaryStatLabel}>NAME</Text>
                    <Text style={s.summaryStatValue}>{name || '—'}</Text>
                  </View>
                  <View style={s.summaryStatDivider} />
                  <View style={s.summaryStat}>
                    <Text style={s.summaryStatLabel}>REMINDER</Text>
                    <Text style={s.summaryStatValue}>
                      {showCustom ? `Every ${customInterval || '?'}h` : INTERVALS[reminderInterval]}
                    </Text>
                  </View>
                  <View style={s.summaryStatDivider} />
                  <View style={s.summaryStat}>
                    <Text style={s.summaryStatLabel}>WINDOW</Text>
                    <Text style={s.summaryStatValue}>{formatHour(windowStart)}–{formatHour(windowEnd)}</Text>
                  </View>
                </View>
              </View>
            </ScrollView>
          )}

        </Animated.View>

        {/* Footer */}
        <View style={s.footer}>
          <TouchableOpacity
            style={[s.continueBtn, !canProceed && s.continueBtnDisabled]}
            onPress={step === TOTAL_STEPS - 1 ? handleFinish : next}
            disabled={!canProceed}
            activeOpacity={0.85}
          >
            <Text style={s.continueBtnText}>
              {step === TOTAL_STEPS - 1 ? 'Start Your Journey' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#E6E6FA' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8, height: 52,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 32, color: '#1A1A2E', lineHeight: 36 },
  stepLabel: {
    fontSize: 13, fontWeight: '700', color: '#1A1A2E',
    letterSpacing: 0.5, textTransform: 'uppercase',
    fontFamily: 'Manrope_700Bold',
  },

  // Progress
  progressTrack: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.4)',
    marginHorizontal: 20, borderRadius: 99, overflow: 'hidden', marginBottom: 4,
  },
  progressFill: { height: '100%', backgroundColor: '#7B61FF', borderRadius: 99 },

  // Shared scroll
  stepScroll: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 16, alignItems: 'center' },

  // Typography
  titleCenter: {
    fontSize: 36, fontWeight: '800', color: '#1A1A2E',
    letterSpacing: -0.5, lineHeight: 44, marginBottom: 12,
    textAlign: 'center', width: '100%',
    fontFamily: 'Manrope_800ExtraBold',
  },
  subtitleCenter: {
    fontSize: 16, color: 'rgba(26,26,46,0.55)', lineHeight: 26,
    marginBottom: 28, textAlign: 'center', width: '100%',
    fontFamily: 'Manrope_400Regular',
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 28, padding: 28,
    shadowColor: '#7B61FF', shadowOpacity: 0.08, shadowRadius: 16,
    elevation: 4, marginBottom: 16, width: '100%',
  },
  cardLabel: {
    fontSize: 16, fontWeight: '600', color: 'rgba(26,26,46,0.6)',
    marginBottom: 16, textAlign: 'center',
    fontFamily: 'Manrope_600SemiBold',
  },

  // Step 1
  step1Outer: { flex: 1, paddingHorizontal: 24 },
  step1Top: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  step1Bottom: { paddingBottom: 8 },
  iconCircle: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7B61FF', shadowOpacity: 0.2, shadowRadius: 30, elevation: 4,
    marginTop: 24,
  },
  nameInput: {
    backgroundColor: '#F8F7FF', borderWidth: 2, borderColor: 'rgba(123,97,255,0.15)',
    borderRadius: 20, paddingVertical: 18, paddingHorizontal: 20,
    fontSize: 18, fontWeight: '600', color: '#1A1A2E', marginBottom: 12,
    fontFamily: 'Manrope_600SemiBold',
  },
  inputHint: {
    fontSize: 10, color: 'rgba(26,26,46,0.35)', letterSpacing: 2,
    fontWeight: '700', textAlign: 'center',
    fontFamily: 'Manrope_700Bold',
  },

  // Step 2 — Gender
  genderRow: { flexDirection: 'row', gap: 16, width: '100%' },
  genderCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24,
    alignItems: 'center', borderWidth: 2.5, borderColor: 'transparent',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3, gap: 16,
  },
  genderCardSelected: {
    borderColor: '#7B61FF',
    shadowColor: '#7B61FF', shadowOpacity: 0.25, shadowRadius: 20, elevation: 6,
  },
  avatarCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(26,26,46,0.06)',
  },
  avatarCircleSelected: { borderColor: 'rgba(123,97,255,0.3)' },
  avatarEmoji: { fontSize: 44 },
  genderLabel: {
    fontSize: 16, fontWeight: '700', color: 'rgba(26,26,46,0.5)',
    fontFamily: 'Manrope_700Bold',
  },
  genderLabelSelected: { color: '#1A1A2E' },

  // Step 3 — Weight
  unitToggle: {
    flexDirection: 'row', backgroundColor: '#F1F0F5',
    borderRadius: 99, padding: 3, width: 140,
    alignSelf: 'center', marginBottom: 28,
  },
  unitBtn: { flex: 1, borderRadius: 99, paddingVertical: 8, alignItems: 'center' },
  unitBtnActive: { backgroundColor: '#7B61FF' },
  unitBtnText: { fontSize: 13, fontWeight: '700', color: 'rgba(26,26,46,0.4)', fontFamily: 'Manrope_700Bold' },
  unitBtnTextActive: { color: '#fff' },
  stepperRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 20, marginBottom: 16,
  },
  stepperBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(123,97,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  stepperBtnText: { fontSize: 28, color: '#7B61FF', fontWeight: '300', lineHeight: 32 },
  weightTapArea: {
    flexDirection: 'row', alignItems: 'baseline',
    justifyContent: 'center', gap: 6,
  },
  weightValueInput: {
    fontSize: 72, fontWeight: '900', color: '#1A1A2E',
    letterSpacing: -2, minWidth: 100, textAlign: 'center',
    fontFamily: 'Manrope_800ExtraBold',
  },
  weightUnit: {
    fontSize: 22, fontWeight: '700', color: '#7B61FF',
    fontFamily: 'Manrope_700Bold',
  },
  stepperHint: {
    fontSize: 11, color: 'rgba(26,26,46,0.35)',
    textAlign: 'center', marginBottom: 12,
    fontFamily: 'Manrope_400Regular',
  },
  goalPreview: {
    fontSize: 14, color: '#7B61FF', fontWeight: '600',
    textAlign: 'center', fontFamily: 'Manrope_600SemiBold',
  },

  // Step 4 — Goal
  goalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 8 },
  goalBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(123,97,255,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  goalBtnText: { fontSize: 26, color: '#7B61FF', fontWeight: '300', lineHeight: 30 },
  goalCenter: { flexDirection: 'row', alignItems: 'baseline' },
  goalInput: {
    fontSize: 64, fontWeight: '800', color: '#1A1A2E',
    minWidth: 120, letterSpacing: -2,
    fontFamily: 'Manrope_800ExtraBold',
  },
  goalUnit: { fontSize: 20, fontWeight: '700', color: 'rgba(26,26,46,0.4)', marginLeft: 4 },
  goalSubLabel: {
    fontSize: 10, fontWeight: '700', color: 'rgba(26,26,46,0.35)',
    letterSpacing: 3, textAlign: 'center',
    fontFamily: 'Manrope_700Bold',
  },
  windowTitle: {
    fontSize: 10, fontWeight: '700', color: 'rgba(26,26,46,0.4)',
    letterSpacing: 3, textAlign: 'center', marginBottom: 16,
    fontFamily: 'Manrope_700Bold',
  },
  windowRow: { flexDirection: 'row', alignItems: 'flex-start' },
  windowCol: { flex: 1, alignItems: 'center' },
  windowColLabel: {
    fontSize: 11, fontWeight: '700', color: 'rgba(26,26,46,0.4)',
    marginBottom: 8, letterSpacing: 1,
    fontFamily: 'Manrope_700Bold',
  },
  timeRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 8,
  },
  timeRowLabel: {
    fontSize: 14, fontWeight: '600', color: 'rgba(26,26,46,0.5)',
    fontFamily: 'Manrope_600SemiBold',
  },
  timeRowControls: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  timeRowDivider: {
    height: 1, backgroundColor: 'rgba(26,26,46,0.07)', marginVertical: 4,
  },
  timeStepperBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(123,97,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  timeStepperBtnText: { fontSize: 24, color: '#7B61FF', fontWeight: '300', lineHeight: 28 },
  timeStepperValue: {
    fontSize: 28, fontWeight: '800', color: '#1A1A2E',
    letterSpacing: -1, minWidth: 80, textAlign: 'center',
    fontFamily: 'Manrope_800ExtraBold',
  },

  // Step 5 — Reminders
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: '#1A1A2E',
    marginBottom: 12, alignSelf: 'flex-start',
    fontFamily: 'Manrope_700Bold',
  },
  intervalRow: { flexDirection: 'row', gap: 8, marginBottom: 16, width: '100%', flexWrap: 'wrap' },
  intervalBtn: {
    paddingVertical: 14, paddingHorizontal: 12,
    backgroundColor: '#FFFFFF', borderRadius: 18,
    alignItems: 'center', borderWidth: 2, borderColor: 'transparent',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    flex: 1,
  },
  intervalBtnActive: {
    backgroundColor: '#7B61FF', borderColor: '#7B61FF',
    shadowColor: '#7B61FF', shadowOpacity: 0.3, shadowRadius: 12, elevation: 5,
  },
  intervalBtnText: {
    fontSize: 12, fontWeight: '700', color: 'rgba(26,26,46,0.5)',
    fontFamily: 'Manrope_700Bold',
  },
  intervalBtnTextActive: { color: '#FFFFFF' },
  customIntervalCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20,
    width: '100%', marginBottom: 16,
    shadowColor: '#7B61FF', shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
    alignItems: 'center',
  },
  customIntervalLabel: {
    fontSize: 13, color: 'rgba(26,26,46,0.5)', marginBottom: 12,
    fontFamily: 'Manrope_400Regular',
  },
  customIntervalInput: {
    borderBottomWidth: 2, borderBottomColor: '#7B61FF',
    fontSize: 32, fontWeight: '700', color: '#7B61FF',
    width: 80, textAlign: 'center', paddingBottom: 4,
    fontFamily: 'Manrope_700Bold',
  },

  // City card (Step 5)
  cityCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20,
    width: '100%',
    shadowColor: '#7B61FF', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
    borderWidth: 1, borderColor: 'rgba(123,97,255,0.05)',
    gap: 14,
  },
  cityCardHeader: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
  },
  cityIconBox: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: 'rgba(123,97,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  cityCardTitleBlock: { flex: 1 },
  cityCardTitle: {
    fontSize: 15, fontWeight: '700', color: '#1A1A2E',
    marginBottom: 4, fontFamily: 'Manrope_700Bold',
  },
  cityCardDesc: {
    fontSize: 13, color: 'rgba(26,26,46,0.5)', lineHeight: 20,
    fontFamily: 'Manrope_400Regular',
  },
  cityInput: {
    backgroundColor: '#F8F7FF', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 16,
    fontSize: 15, color: '#1A1A2E', borderWidth: 1.5,
    borderColor: 'rgba(123,97,255,0.2)',
    fontFamily: 'Manrope_400Regular',
  },
  cityToggleRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
  },
  cityToggleLabel: {
    fontSize: 13, fontWeight: '600', color: 'rgba(26,26,46,0.55)',
    fontFamily: 'Manrope_600SemiBold',
  },

  // Step 6 — Complete
  summaryCard: {
    backgroundColor: '#FFFFFF', borderRadius: 32, padding: 28,
    alignItems: 'center', width: '100%',
    shadowColor: '#7B61FF', shadowOpacity: 0.1, shadowRadius: 20, elevation: 5,
  },
  summaryGoalLabel: {
    fontSize: 13, color: 'rgba(26,26,46,0.4)', marginBottom: 4,
    fontFamily: 'Manrope_400Regular',
  },
  summaryGoalRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 24 },
  summaryGoalValue: {
    fontSize: 52, fontWeight: '900', color: '#1A1A2E', letterSpacing: -2,
    fontFamily: 'Manrope_800ExtraBold',
  },
  summaryGoalUnit: { fontSize: 20, fontWeight: '700', color: '#7B61FF', fontFamily: 'Manrope_700Bold' },
  summaryDivider: { width: '100%', height: 1, backgroundColor: 'rgba(26,26,46,0.06)', marginBottom: 20 },
  summaryStats: { flexDirection: 'row', width: '100%' },
  summaryStat: { flex: 1, alignItems: 'center' },
  summaryStatDivider: { width: 1, backgroundColor: 'rgba(26,26,46,0.06)' },
  summaryStatLabel: {
    fontSize: 9, fontWeight: '700', color: 'rgba(26,26,46,0.35)',
    letterSpacing: 2, marginBottom: 4, fontFamily: 'Manrope_700Bold',
  },
  summaryStatValue: {
    fontSize: 12, fontWeight: '600', color: '#1A1A2E',
    textAlign: 'center', fontFamily: 'Manrope_600SemiBold',
  },

  // Footer
  footer: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 8 },
  continueBtn: {
    backgroundColor: '#7B61FF', borderRadius: 99, paddingVertical: 18, alignItems: 'center',
    shadowColor: '#7B61FF', shadowOpacity: 0.3, shadowRadius: 16, elevation: 6,
  },
  continueBtnDisabled: { backgroundColor: 'rgba(123,97,255,0.3)', shadowOpacity: 0 },
  continueBtnText: {
    fontSize: 18, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3,
    fontFamily: 'Manrope_700Bold',
  },
});