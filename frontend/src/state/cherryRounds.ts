export const CHERRY_ROUND_TYPE = {
  NORMAL: 'normal',
  CHERRY: 'cherry',
  DOUBLE_CHERRY: 'double-cherry'
};

const BASE_XP_PER_CORRECT_ANSWER = 100;

function normalizeRoundNumber(roundNumber: number) {
  return Number.isInteger(roundNumber) && roundNumber > 0 ? roundNumber : 1;
}

export function getCherryRoundReward(roundNumber: number) {
  const normalizedRoundNumber = normalizeRoundNumber(roundNumber);

  if (normalizedRoundNumber % 10 === 0) {
    return {
      type: CHERRY_ROUND_TYPE.DOUBLE_CHERRY,
      label: 'Double Cherry',
      badgeLabel: 'Double Cherry',
      multiplierLabel: 'XP x3',
      multiplier: 3
    };
  }

  if (normalizedRoundNumber % 5 === 0) {
    return {
      type: CHERRY_ROUND_TYPE.CHERRY,
      label: 'Cherry',
      badgeLabel: 'Cherry',
      multiplierLabel: 'XP x2',
      multiplier: 2
    };
  }

  return {
    type: CHERRY_ROUND_TYPE.NORMAL,
    label: 'Normal',
    badgeLabel: 'Normal round',
    multiplierLabel: 'XP x1',
    multiplier: 1
  };
}

export function getSoloRoundXpBreakdown(roundNumber: number, correctAnswerCount: number, wasSuccessful: boolean) {
  const reward = getCherryRoundReward(roundNumber);
  const normalizedCorrectAnswerCount = Number.isInteger(correctAnswerCount) && correctAnswerCount > 0
    ? correctAnswerCount
    : 0;
  const baseXp = wasSuccessful ? normalizedCorrectAnswerCount * BASE_XP_PER_CORRECT_ANSWER : 0;
  const speedBonusXp = 0;
  const subtotalXp = baseXp + speedBonusXp;
  const cherryBoostXp = wasSuccessful ? subtotalXp * Math.max(reward.multiplier - 1, 0) : 0;
  const totalXp = wasSuccessful ? subtotalXp + cherryBoostXp : 0;

  return {
    roundType: reward.type,
    roundLabel: reward.label,
    multiplier: reward.multiplier,
    multiplierLabel: reward.multiplierLabel,
    baseXp,
    speedBonusXp,
    subtotalXp,
    cherryBoostXp,
    totalXp
  };
}

export function calculateSoloRoundXp(roundNumber: number, correctAnswerCount: number, wasSuccessful: boolean) {
  return getSoloRoundXpBreakdown(roundNumber, correctAnswerCount, wasSuccessful).totalXp;
}
