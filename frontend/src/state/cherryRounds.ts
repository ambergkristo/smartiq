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

export function calculateSoloRoundXp(roundNumber: number, correctAnswerCount: number, wasSuccessful: boolean) {
  if (!wasSuccessful) {
    return 0;
  }

  const normalizedCorrectAnswerCount = Number.isInteger(correctAnswerCount) && correctAnswerCount > 0
    ? correctAnswerCount
    : 0;

  return normalizedCorrectAnswerCount
    * BASE_XP_PER_CORRECT_ANSWER
    * getCherryRoundReward(roundNumber).multiplier;
}
