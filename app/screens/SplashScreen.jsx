import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { Path } from 'react-native-svg';

export default function SplashScreen({ onFinish }) {
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslate = useRef(new Animated.Value(20)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const footerOpacity = useRef(new Animated.Value(0)).current;
  const waveTranslate = useRef(new Animated.Value(-140)).current;
  const glowOpacity = useRef(new Animated.Value(0.4)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(contentTranslate, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start(() => {
      Animated.timing(taglineOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start();
      Animated.timing(footerOpacity, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }).start();
    });

    Animated.loop(
      Animated.timing(waveTranslate, { toValue: 140, duration: 1800, useNativeDriver: true })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowOpacity, { toValue: 1, duration: 1500, useNativeDriver: true }),
        Animated.timing(glowOpacity, { toValue: 0.4, duration: 1500, useNativeDriver: true }),
      ])
    ).start();

    const timer = setTimeout(() => {
      Animated.timing(screenOpacity, { toValue: 0, duration: 500, useNativeDriver: true })
        .start(() => onFinish && onFinish());
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <StatusBar style="light" />
      <View style={{ flex: 1 }} />

      <Animated.View style={[styles.branding, { opacity: contentOpacity, transform: [{ translateY: contentTranslate }] }]}>
        {/* Outlined hollow water drop to match design */}
        <Animated.View style={{ opacity: glowOpacity, marginBottom: 28 }}>
          <Svg width={72} height={90} viewBox="0 0 72 90" fill="none">
            <Path
              d="M36 6 C36 6 8 38 8 56 C8 72.569 20.431 85 37 85 C53.569 85 66 72.569 66 56 C66 38 36 6 36 6 Z"
              stroke="white"
              strokeWidth={6.2}
              strokeLinejoin="round"
              fill="none"
            />
          </Svg>
        </Animated.View>

        <Text style={styles.appName}>S I C A</Text>

        {/* Horizontal divider line */}
        <Animated.View style={[styles.divider, { opacity: taglineOpacity }]} />
      </Animated.View>

      <Animated.View style={[styles.bottomSection, { opacity: footerOpacity }]}>
        <View style={styles.loadingBarContainer}>
          <Animated.View style={[styles.loadingBarFill, { transform: [{ translateX: waveTranslate }] }]} />
        </View>
        <Text style={styles.footerText}>HYDRATING YOUR JOURNEY.</Text>
        <Text style={styles.footerSubText}>A PERSONAL OASIS</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7B6BA8',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 32,
  },
  branding: { alignItems: 'center', justifyContent: 'center' },
  appName: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '300',
    letterSpacing: 18,
    textTransform: 'uppercase',
    marginBottom: 24,
  },
  divider: {
    width: 200,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.35)',
    marginTop: 4,
  },
  bottomSection: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 52,
    width: '100%',
    gap: 10,
  },
  loadingBarContainer: {
    width: 140,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 32,
  },
  loadingBarFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    width: 84,
    borderRadius: 999,
    opacity: 0.7,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  footerText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    letterSpacing: 4,
    fontWeight: '300',
  },
  footerSubText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 9,
    letterSpacing: 4,
    fontWeight: '300',
  },
});
