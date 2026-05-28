// Always use local date, never toISOString() which returns UTC and breaks UTC+ timezones
export const localDateStr = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const todayStr = (): string => localDateStr(new Date());

export const dateLabel = (date?: Date): string => {
  const d = date ?? new Date();
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
};

export const lastNDays = (n: number): string[] => {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(localDateStr(d));
  }
  return days;
};

export const shortDayLabel = (dateStr: string): string => {
  const [y, m, day] = dateStr.split('-').map(Number);
  const d = new Date(y, m - 1, day);
  return d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
};

export const friendlyDate = (dateStr: string): string => {
  const today = todayStr();
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yesterday = localDateStr(d);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const [y, m, day] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, day).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
};
