/**
 * analytics.js
 * PostHog wrapper for Sica event tracking.
 * All functions are try/catch protected — analytics never crashes the app.
 */

import { PostHog } from 'posthog-react-native';

const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;

let client = null;

export const initAnalytics = async () => {
  try {
    client = new PostHog(POSTHOG_KEY, {
      host: 'https://us.i.posthog.com',
    });
    await client.ready;
    console.log('PostHog ready, client:', client ? 'OK' : 'NULL');
  } catch (e) {
    console.warn('PostHog init failed:', e);
  }
};

export const identifyUser = (userId, properties = {}) => {
  try {
    client?.identify(userId, properties);
  } catch (e) {
    console.warn('PostHog identify failed:', e);
  }
};

export const track = (event, properties = {}) => {
  try {
    client?.capture(event, properties);
  } catch (e) {
    console.warn('PostHog track failed:', e);
  }
};

// ── Specific event helpers ──

export const trackAppOpened = () => {
  track('app_opened');
};

export const trackOnboardingStarted = () => {
  track('onboarding_started');
};

export const trackOnboardingCompleted = (profile) => {
  track('onboarding_completed', {
    city: profile.city,
    daily_goal_cl: profile.dailyGoalCl,
    gender: profile.gender,
    notification_interval_hours: profile.notificationIntervalHours,
    weather_nudges_enabled: profile.weatherAdjustEnabled,
  });
};

export const trackWaterLogged = ({ amountCl, totalToday, goalCl }) => {
  const pct = Math.round((totalToday / goalCl) * 100);
  track('water_logged', {
    amount_cl: amountCl,
    total_today_cl: totalToday,
    goal_cl: goalCl,
    goal_pct: pct,
  });
};

export const trackGoalReached = ({ goalCl }) => {
  track('goal_reached', { goal_cl: goalCl });
};

export const trackStreakMilestone = (streakDays) => {
  track('streak_milestone', { streak_days: streakDays });
};

export const trackStageLevelUp = (newStage, stageName) => {
  track('stage_level_up', { stage: newStage, stage_name: stageName });
};

export const trackNotificationTapped = () => {
  track('notification_tapped');
};