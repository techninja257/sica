/**
 * activeWindow.js
 * Helpers for determining if current time is within the user's active hydration window.
 */

export const isWithinActiveWindow = (startHour, endHour) => {
  const hour = new Date().getHours();
  if (startHour <= endHour) {
    return hour >= startHour && hour < endHour;
  }
  // Wraps midnight
  return hour >= startHour || hour < endHour;
};

export const minutesUntilWindowStart = (startHour) => {
  const now = new Date();
  const start = new Date();
  start.setHours(startHour, 0, 0, 0);
  if (start <= now) start.setDate(start.getDate() + 1);
  return Math.round((start - now) / 60000);
};

export const formatHour = (hour) => {
  const h = hour % 12 || 12;
  const suffix = hour < 12 ? 'AM' : 'PM';
  return `${h}:00 ${suffix}`;
};
