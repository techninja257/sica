import 'react-native-get-random-values';
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { useNavigationContainerRef } from '@react-navigation/native';
import { useFonts, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';

import SplashScreen from './app/screens/SplashScreen';
import OnboardingScreen from './app/screens/OnboardingScreen';
import AppNavigator from './app/navigation/AppNavigator';

import useProfileStore from './app/store/profileStore';
import useHydrationStore from './app/store/hydrationStore';
import { requestPermissions, scheduleHydrationReminders } from './app/utils/notificationEngine';
import {
  initAnalytics,
  identifyUser,
  trackAppOpened,
  trackNotificationTapped,
} from './app/utils/analytics';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [appReady, setAppReady] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);

  const navigationRef = useNavigationContainerRef();

  const { loadProfile, profile, userId, isLoaded: profileLoaded } = useProfileStore();
  const { loadData, isLoaded: dataLoaded } = useHydrationStore();

  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  // Init analytics + load data
  useEffect(() => {
    const init = async () => {
      await initAnalytics();
      await Promise.all([loadProfile(), loadData()]);
      setAppReady(true);
    };
    init();
  }, []);

  // Identify user + track app_opened once userId is ready
  useEffect(() => {
    if (!userId) return;
    identifyUser(userId, {
      city: profile?.city,
      daily_goal_cl: profile?.dailyGoalCl,
      gender: profile?.gender,
      notification_interval_hours: profile?.notificationIntervalHours,
      weather_nudges_enabled: profile?.weatherAdjustEnabled,
      platform: Platform.OS,
    });
    trackAppOpened();
  }, [userId]);

  // Schedule notifications when profile is ready
  useEffect(() => {
    if (profile?.onboardingComplete) {
      requestPermissions().then((granted) => {
        if (granted) scheduleHydrationReminders(profile);
      });
    }
  }, [profile]);

  // Reset onboarding when profile cleared
  useEffect(() => {
    if (!profile && appReady) {
      setOnboardingDone(false);
    }
  }, [profile]);

  // Notification tap listener
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      trackNotificationTapped();
      navigationRef.current?.navigate('Notification');
    });
    return () => sub.remove();
  }, []);

  const handleSplashFinish = () => {
    if (appReady) setShowSplash(false);
    else {
      const interval = setInterval(() => {
        if (appReady) {
          clearInterval(interval);
          setShowSplash(false);
        }
      }, 100);
    }
  };

  const handleOnboardingComplete = () => {
    setOnboardingDone(true);
  };

  if (!fontsLoaded) return <View style={styles.loading} />;

  if (showSplash) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <SplashScreen onFinish={handleSplashFinish} />
      </SafeAreaProvider>
    );
  }

  if (!profileLoaded || !dataLoaded) {
    return <View style={styles.loading} />;
  }

  if (!profile?.onboardingComplete && !onboardingDone) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <AppNavigator navigationRef={navigationRef} />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#E6E6FA',
  },
});