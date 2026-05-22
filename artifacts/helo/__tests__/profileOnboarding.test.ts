import {
  dueDateRawSchema,
  firstNameSchema,
  formatDueDateInput,
  onboardingProfileSchema,
  parseDueDate,
} from '@/lib/validation/profileOnboarding';

describe('dueDateRawSchema', () => {
  it('accepts a valid DD/MM/YYYY date within range and returns a Date', () => {
    const res = dueDateRawSchema.safeParse('15/06/2026');
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data).toBeInstanceOf(Date);
      expect(res.data.getFullYear()).toBe(2026);
      expect(res.data.getMonth()).toBe(5);
      expect(res.data.getDate()).toBe(15);
    }
  });

  it('rejects malformed strings (wrong shape, partial, alpha)', () => {
    for (const bad of ['', '15-06-2026', '5/6/2026', '15/06/26', 'abc', '15/06/2026 ']) {
      expect(dueDateRawSchema.safeParse(bad).success).toBe(false);
    }
  });

  it('rejects out-of-range years', () => {
    expect(dueDateRawSchema.safeParse('01/01/2020').success).toBe(false);
    expect(dueDateRawSchema.safeParse('01/01/2030').success).toBe(false);
  });

  it('rejects impossible civil dates (Feb 31, Apr 31, Feb 29 non-leap)', () => {
    // Without round-trip check, JS Date silently rolls these over.
    expect(dueDateRawSchema.safeParse('31/02/2026').success).toBe(false);
    expect(dueDateRawSchema.safeParse('31/04/2026').success).toBe(false);
    expect(dueDateRawSchema.safeParse('29/02/2026').success).toBe(false); // 2026 not leap
  });

  it('accepts Feb 29 on a leap year', () => {
    expect(dueDateRawSchema.safeParse('29/02/2024').success).toBe(true);
  });
});

describe('firstNameSchema', () => {
  it('trims and accepts ≥ 2 chars', () => {
    expect(firstNameSchema.safeParse('  Léa  ').success).toBe(true);
  });
  it('rejects empty / single-char / whitespace-only', () => {
    for (const bad of ['', ' ', 'A', '   ']) {
      expect(firstNameSchema.safeParse(bad).success).toBe(false);
    }
  });
});

describe('onboardingProfileSchema', () => {
  it('validates the full form', () => {
    const res = onboardingProfileSchema.safeParse({
      firstName: 'Léa',
      dueDate: '15/06/2026',
    });
    expect(res.success).toBe(true);
  });

  it('fails when any field fails', () => {
    const res = onboardingProfileSchema.safeParse({
      firstName: 'A',
      dueDate: '31/02/2026',
    });
    expect(res.success).toBe(false);
  });
});

describe('parseDueDate', () => {
  it('returns Date on success and null on failure', () => {
    expect(parseDueDate('15/06/2026')).toBeInstanceOf(Date);
    expect(parseDueDate('31/02/2026')).toBeNull();
    expect(parseDueDate('not a date')).toBeNull();
  });
});

describe('formatDueDateInput', () => {
  it('inserts slashes progressively', () => {
    expect(formatDueDateInput('1')).toBe('1');
    expect(formatDueDateInput('15')).toBe('15');
    expect(formatDueDateInput('156')).toBe('15/6');
    expect(formatDueDateInput('1506')).toBe('15/06');
    expect(formatDueDateInput('150620')).toBe('15/06/20');
    expect(formatDueDateInput('15062026')).toBe('15/06/2026');
  });
  it('strips non-digits and caps at 8 digits', () => {
    expect(formatDueDateInput('15a/06b/2026extra')).toBe('15/06/2026');
    expect(formatDueDateInput('150620261234')).toBe('15/06/2026');
  });
});
