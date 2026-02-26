import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function NotificationScreen() {
  const navigation = useNavigation();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <TouchableOpacity
      style={s.overlay}
      activeOpacity={1}
      onPress={() => navigation.goBack()}
    >
      {/* Background dashboard shapes */}
      <View style={s.bgLayer}>
        <View style={s.bgRow}>
          <View style={s.bgCircle} />
          <View style={s.bgPill} />
          <View style={s.bgCircle} />
        </View>
        <View style={s.bgRow}>
          <View style={s.bgBlock} />
          <View style={s.bgBlock} />
        </View>
        <View style={s.bgWide} />
        <View style={s.bgWide} />
      </View>

      {/* Glass overlay */}
      <View style={s.glassOverlay} />

      {/* Card */}
      <View style={s.card}>

        {/* Water drop icon */}
        <View style={s.iconWrapper}>
          <Animated.View style={[s.iconGlow, { transform: [{ scale: pulseAnim }] }]} />
          <Ionicons name="water" size={72} color="#7B61FF" />
        </View>

        {/* Title */}
        <Text style={s.title}>Hydration Nudge</Text>

        {/* Message */}
        <Text style={s.message}>
          Tap anywhere to continue.
        </Text>

      </View>

    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#E6E6FA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Background shapes
  bgLayer: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    padding: 24,
    opacity: 0.5,
  },
  bgRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  bgCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(123,97,255,0.2)',
  },
  bgPill: {
    flex: 1, height: 24, borderRadius: 99,
    backgroundColor: 'rgba(123,97,255,0.1)',
  },
  bgBlock: {
    flex: 1, height: 120, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  bgWide: {
    height: 80, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginBottom: 16,
  },

  // Glass
  glassOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // Card
  card: {
    width: width - 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingVertical: 48,
    paddingHorizontal: 32,
    alignItems: 'center',
    shadowColor: '#7B61FF',
    shadowOpacity: 0.2,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 20 },
    elevation: 12,
  },

  // Icon
  iconWrapper: {
    width: 96, height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(123,97,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  iconGlow: {
    position: 'absolute',
    width: 80, height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(123,97,255,0.15)',
  },

  // Text
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#7B61FF',
    fontFamily: 'Manrope_800ExtraBold',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  message: {
    fontSize: 16,
    color: 'rgba(26,26,46,0.55)',
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
    lineHeight: 26,
  },

  // Tap hint
  tapHint: {
    position: 'absolute',
    bottom: 48,
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(123,97,255,0.5)',
    fontFamily: 'Manrope_600SemiBold',
    letterSpacing: 0.3,
  },
});