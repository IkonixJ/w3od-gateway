import { Palette } from '@/design/tokens';

// W3OD reward + progression helpers. Placeholder W3OD balance and rank logic
// for the dashboard; the real wallet table lands with the Wallet module.

export interface LevelInfo {
  level: number;
  rank: string;
  xpIntoLevel: number;
  xpForNext: number;
  progress: number; // 0..1
}

const RANK_TIERS: { minLevel: number; rank: string; color: string }[] = [
  { minLevel: 1, rank: 'Initiate', color: Palette.neonCyan },
  { minLevel: 5, rank: 'Operator', color: Palette.electricBlue },
  { minLevel: 10, rank: 'Veteran', color: Palette.purpleGlow },
  { minLevel: 20, rank: 'Elite', color: Palette.neonMagenta },
  { minLevel: 35, rank: 'Legend', color: Palette.neonAmber },
  { minLevel: 50, rank: 'Mythic', color: Palette.neonLime },
];

export function getLevelInfo(xp: number): LevelInfo {
  // Each level requires progressively more XP: level N needs N*100 cumulative.
  if (xp < 0) xp = 0;
  let level = 1;
  let cumulative = 0;
  while (cumulative + level * 100 <= xp) {
    cumulative += level * 100;
    level += 1;
  }
  const xpIntoLevel = xp - cumulative;
  const xpForNext = level * 100;
  const progress = xpForNext > 0 ? xpIntoLevel / xpForNext : 0;

  let rank = RANK_TIERS[0].rank;
  for (const tier of RANK_TIERS) {
    if (level >= tier.minLevel) rank = tier.rank;
  }

  return { level, rank, xpIntoLevel, xpForNext, progress: Math.min(progress, 1) };
}

export function formatBalance(amount: number, hidden: boolean): string {
  if (hidden) return '••••••';
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function getRankColor(level: number): string {
  let color = RANK_TIERS[0].color;
  for (const tier of RANK_TIERS) {
    if (level >= tier.minLevel) color = tier.color;
  }
  return color;
}
