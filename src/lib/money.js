export const cents = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error('Amount must be a number.');
  return Math.round(n * 100);
};
export const euro = (value) => (Number(value) / 100).toFixed(2);
export const requirePositive = (value, label = 'Amount') => {
  const result = cents(value);
  if (result <= 0) throw new Error(`${label} must be greater than zero.`);
  return result;
};
