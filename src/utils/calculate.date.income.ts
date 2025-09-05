export const getTodayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export const getWeekStart = () => {
  const d = new Date();
  const day = d.getDay(); // Sunday = 0, Monday = 1 ...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // shift to Monday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const getMonthStart = () =>
  new Date(new Date().getFullYear(), new Date().getMonth(), 1);

export const getYearStart = () => new Date(new Date().getFullYear(), 0, 1);
export const toNumberSafe = (val: any) => {
  if (val == null) return 0;
  if (typeof val === "number") return val;
  if (typeof val.toNumber === "function") return val.toNumber(); // Prisma Decimal
  return Number(val);
};
