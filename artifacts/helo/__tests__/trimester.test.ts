import { calculateTrimester } from '../lib/trimester';

function dueDateInDays(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

describe('calculateTrimester', () => {
  test('due in 250 days → trimester 1', () => {
    // 280 - 250 = 30 days since conception → week 5 → T1
    const result = calculateTrimester(dueDateInDays(250));
    expect(result.trimester).toBe(1);
    expect(result.weekOfPregnancy).toBeGreaterThanOrEqual(1);
    expect(result.weekOfPregnancy).toBeLessThanOrEqual(13);
  });

  test('due in 150 days → trimester 2', () => {
    // 280 - 150 = 130 days since conception → week 19-20 → T2
    const result = calculateTrimester(dueDateInDays(150));
    expect(result.trimester).toBe(2);
    expect(result.weekOfPregnancy).toBeGreaterThanOrEqual(14);
    expect(result.weekOfPregnancy).toBeLessThanOrEqual(26);
  });

  test('due in 50 days → trimester 3', () => {
    // 280 - 50 = 230 days since conception → week 33-34 → T3
    const result = calculateTrimester(dueDateInDays(50));
    expect(result.trimester).toBe(3);
    expect(result.weekOfPregnancy).toBeGreaterThanOrEqual(27);
  });

  test('due date already passed → trimester 3, weekOfPregnancy capped at 40', () => {
    // -10 days past due → daysSinceConception = 290 → rawWeek = 42 → capped to 40
    const result = calculateTrimester(dueDateInDays(-10));
    expect(result.trimester).toBe(3);
    expect(result.weekOfPregnancy).toBe(40);
    expect(result.daysUntilDue).toBeLessThan(0);
  });

  test('accepts a string date', () => {
    const dateStr = dueDateInDays(100).toISOString();
    const result = calculateTrimester(dateStr);
    expect(result.trimester).toBeGreaterThanOrEqual(1);
    expect(result.trimester).toBeLessThanOrEqual(3);
  });

  test('daysUntilDue is approximately correct', () => {
    const result = calculateTrimester(dueDateInDays(50));
    expect(result.daysUntilDue).toBeGreaterThanOrEqual(48);
    expect(result.daysUntilDue).toBeLessThanOrEqual(52);
  });
});
