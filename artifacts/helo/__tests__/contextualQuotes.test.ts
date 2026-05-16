import { getContextualQuote } from '@/lib/contextualQuotes';

describe('getContextualQuote', () => {
  const verdicts = ['safe', 'caution', 'danger'] as const;
  const phases = [1, 2, 3, 'breastfeeding'] as const;

  it('returns a quote with text and source for every (phase, verdict) combination', () => {
    for (const phase of phases) {
      for (const verdict of verdicts) {
        const q = getContextualQuote(phase, verdict);
        expect(q.text.length).toBeGreaterThan(20);
        expect(q.text.length).toBeLessThan(200);
        expect(q.source.length).toBeGreaterThan(0);
      }
    }
  });

  it('uses a real, citable source (no fabricated attribution)', () => {
    const allowed = new Set(['CRAT', 'EFSA', 'ANSES', 'ANSM']);
    for (const phase of phases) {
      for (const verdict of verdicts) {
        const q = getContextualQuote(phase, verdict);
        expect(allowed.has(q.source)).toBe(true);
      }
    }
  });

  it('mentions the 1st trimester explicitly for safe/caution/danger at phase 1', () => {
    expect(getContextualQuote(1, 'safe').text).toMatch(/1er trimestre/i);
    expect(getContextualQuote(1, 'caution').text).toMatch(/1er trimestre/i);
    expect(getContextualQuote(1, 'danger').text).toMatch(/1er trimestre|embryon/i);
  });

  it('mentions breastfeeding explicitly for the breastfeeding phase', () => {
    for (const verdict of verdicts) {
      const q = getContextualQuote('breastfeeding', verdict);
      expect(q.text).toMatch(/allait|lait/i);
    }
  });

  it('uses non-alarmist language for the safe verdict', () => {
    for (const phase of phases) {
      const q = getContextualQuote(phase, 'safe');
      expect(q.text).not.toMatch(/danger|évit|toxique/i);
    }
  });
});
