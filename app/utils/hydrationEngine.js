/**
 * hydrationEngine.js
 * Goal calculation and Wife Mode (Journey) logic
 */

export const STAGES = [
  { name: 'Desert Mist', emoji: '🌫️', description: 'Every drop counts. Your oasis awaits.' },
  { name: 'Mountain Spring', emoji: '🏔️', description: 'Cold and clear. Rising steadily.' },
  { name: 'River Guide', emoji: '🌊', description: 'Flowing with purpose and grace.' },
  { name: 'Tide Shifter', emoji: '🌙', description: 'The tides move with you now.' },
  { name: 'Deep Blue', emoji: '💙', description: 'Diving deep into your rhythm.' },
  { name: 'Ocean', emoji: '🌊', description: 'You have become the ocean itself.' }, // suffixed with God/Goddess
];

export const calculateDailyGoal = (weightKg) => {
  return Math.round((weightKg * 30) / 10); // cl
};

export const getGreeting = (name) => {
  const hour = new Date().getHours();
  if (hour < 12) return `Good Morning, ${name}.`;
  if (hour < 17) return `Good Afternoon, ${name}.`;
  return `Good Evening, ${name}.`;
};

export const getStageName = (stageIndex, gender) => {
  if (stageIndex === 5) {
    return gender === 'goddess' ? 'Ocean Goddess' : 'Ocean God';
  }
  return STAGES[stageIndex]?.name || 'Desert Mist';
};

export const isGracePeriod = () => {
  const hour = new Date().getHours();
  return hour >= 22 || hour < 2;
};

/**
 * Evaluate journey stage based on last 7 days.
 * Returns updated journey state.
 */
export const evaluateJourney = (logs, journey, dailyGoalCl) => {
  const today = new Date().toISOString().split('T')[0];
  if (journey.lastEvaluatedAt === today) return journey;

  // Count days where goal was met in last 7 days
  let successDays = 0;
  for (let i = 1; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const total = logs
      .filter((l) => l.loggedFor === dateStr)
      .reduce((sum, l) => sum + l.amountCl, 0);
    if (total >= dailyGoalCl) successDays++;
  }

  let { currentStage, stageProgress, consecutiveFailWeeks } = journey;

  if (successDays >= 5) {
    // Advance
    consecutiveFailWeeks = 0;
    stageProgress = Math.min(100, stageProgress + 20);
    if (stageProgress >= 100) {
      stageProgress = 0;
      currentStage = Math.min(5, currentStage + 1);
    }
  } else {
    // Fail
    consecutiveFailWeeks += 1;
    stageProgress = 0;
    if (consecutiveFailWeeks >= 2) {
      currentStage = Math.max(0, currentStage - 1);
      consecutiveFailWeeks = 0;
    }
  }

  return {
    currentStage,
    stageProgress,
    consecutiveFailWeeks,
    lastEvaluatedAt: today,
  };
};
