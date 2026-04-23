import { calculateSoloRoundXp, getCherryRoundReward, getSoloRoundXpBreakdown } from './cherryRounds';

describe('Cherry round rewards', () => {
  test('marks every 5th round as Cherry', () => {
    expect(getCherryRoundReward(5)).toMatchObject({
      type: 'cherry',
      multiplier: 2,
      multiplierLabel: 'XP x2'
    });
  });

  test('marks every 10th round as Double Cherry', () => {
    expect(getCherryRoundReward(10)).toMatchObject({
      type: 'double-cherry',
      multiplier: 3,
      multiplierLabel: 'XP x3'
    });
  });

  test('awards zero XP on failed Cherry rounds', () => {
    expect(calculateSoloRoundXp(5, 3, false)).toBe(0);
  });

  test('returns a full XP breakdown for Double Cherry solo wins', () => {
    expect(getSoloRoundXpBreakdown(10, 2, true)).toMatchObject({
      roundLabel: 'Double Cherry',
      multiplier: 3,
      baseXp: 200,
      speedBonusXp: 0,
      cherryBoostXp: 400,
      totalXp: 600
    });
  });
});
