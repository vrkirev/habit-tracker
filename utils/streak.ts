const localDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const computeStreak = (completions: Record<string, number>, targetCount: number): number => {
  const doneDates = Object.keys(completions)
    .filter(d => completions[d] >= targetCount)
    .sort()
    .reverse();

  if (doneDates.length === 0) return 0;

  let streak = 0;
  const cursor = new Date();

  for (const date of doneDates) {
    const expected = localDateStr(cursor);
    if (date === expected) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
};
