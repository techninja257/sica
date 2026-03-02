/**
 * hydrationEngine.js
 * Goal calculation and Journey logic — 15 stages across 3 tiers
 */

// ── Tier definitions ──
export const TIERS = [
  {
    id: 1,
    name: 'Awakening',
    requiredDays: 5,      // 5/7 days per week
    weeksToAdvance: 1,    // 1 successful week per stage
    color: 'rgba(123,97,255,0.15)',
    activeColor: '#7B61FF',
    stages: [0, 1, 2, 3, 4],
  },
  {
    id: 2,
    name: 'Ascent',
    requiredDays: 6,      // 6/7 days per week
    weeksToAdvance: 1,
    color: 'rgba(90,60,220,0.18)',
    activeColor: '#5A3CDC',
    stages: [5, 6, 7, 8, 9],
  },
  {
    id: 3,
    name: 'Legend',
    requiredDays: 7,      // 7/7 days per week, 2 consecutive weeks
    weeksToAdvance: 2,
    color: 'rgba(60,20,180,0.2)',
    activeColor: '#3C14B4',
    stages: [10, 11, 12, 13, 14],
  },
];

export const STAGES = [
  // Tier 1 — Awakening
  { name: 'Desert Mist',      emoji: '🌫️',  tier: 1, description: 'Every drop counts. Your oasis awaits.' },
  { name: 'Morning Dew',      emoji: '🌅',  tier: 1, description: 'A new habit takes its first breath.' },
  { name: 'Pebble Creek',     emoji: '🪨',  tier: 1, description: 'Small steps carve the deepest rivers.' },
  { name: 'Forest Spring',    emoji: '🌿',  tier: 1, description: 'Life thrives where water flows freely.' },
  { name: 'Canyon Stream',    emoji: '🏜️',  tier: 1, description: 'Cutting through resistance, drop by drop.' },
  // Tier 2 — Ascent
  { name: 'River Walker',     emoji: '🌊',  tier: 2, description: 'You move with the current now.' },
  { name: 'Glacial Melt',     emoji: '🧊',  tier: 2, description: 'Ancient ice bends to your commitment.' },
  { name: 'Storm Basin',      emoji: '⛈️',  tier: 2, description: 'Gathering strength from every storm.' },
  { name: 'Tidal Force',      emoji: '🌙',  tier: 2, description: 'The tides shift at your command.' },
  { name: 'Arctic Current',   emoji: '❄️',  tier: 2, description: 'Cold, clear and unstoppable.' },
  // Tier 3 — Legend
  { name: 'Abyssal Depths',   emoji: '🌑',  tier: 3, description: 'Where few dare to dive.' },
  { name: 'Tempest Born',     emoji: '🌪️',  tier: 3, description: 'Forged in the eye of the storm.' },
  { name: 'Glacier Sovereign',emoji: '🏔️',  tier: 3, description: 'Immovable. Ancient. Absolute.' },
  { name: 'Tsunami Rider',    emoji: '🌊',  tier: 3, description: 'Riding the wave that reshapes worlds.' },
  { name: 'Ocean',            emoji: '🌊',  tier: 3, description: 'You have become the ocean itself.' }, // God/Goddess suffix applied at runtime
];

export const getTierForStage = (stageIndex) => {
  if (stageIndex <= 4) return TIERS[0];
  if (stageIndex <= 9) return TIERS[1];
  return TIERS[2];
};

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
  if (stageIndex === 14) {
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
 * Tiered progression: harder requirements as you go up.
 */
export const evaluateJourney = (logs, journey, dailyGoalCl) => {
  const today = new Date().toISOString().split('T')[0];
  if (journey.lastEvaluatedAt === today) return journey;

  const tier = getTierForStage(journey.currentStage ?? 0);
  const requiredDays = tier.requiredDays;

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

  let { currentStage, stageProgress, consecutiveFailWeeks, consecutiveSuccessWeeks } = journey;
  consecutiveSuccessWeeks = consecutiveSuccessWeeks ?? 0;

  const weekPassed = successDays >= requiredDays;

  if (weekPassed) {
    consecutiveFailWeeks = 0;
    consecutiveSuccessWeeks += 1;

    // Tier 3 requires 2 consecutive successful weeks to advance
    const weeksNeeded = tier.weeksToAdvance;
    if (consecutiveSuccessWeeks >= weeksNeeded) {
      consecutiveSuccessWeeks = 0;
      stageProgress = Math.min(100, stageProgress + 20);
      if (stageProgress >= 100) {
        stageProgress = 0;
        currentStage = Math.min(14, currentStage + 1);
      }
    }
  } else {
    consecutiveSuccessWeeks = 0;
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
    consecutiveSuccessWeeks,
    lastEvaluatedAt: today,
  };
};