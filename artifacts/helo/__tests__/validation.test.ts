import {
  sanitizeText,
  sanitizeBarcode,
  sanitizeName,
  sanitizeEmail,
  sanitizePartnerCode,
  sanitizeChatMessage,
  isValidBarcode,
} from '../lib/validation';

describe('sanitizeText', () => {
  test('strips HTML script tags (XSS prevention)', () => {
    const result = sanitizeText("<script>alert('xss')</script>");
    expect(result).toBe("alert('xss')");
  });

  test('strips angle brackets and their content (HTML tags)', () => {
    // <World> looks like an HTML tag, so its content is removed entirely
    const result = sanitizeText('Hello <World>');
    expect(result).toBe('Hello');
  });

  test('trims whitespace', () => {
    expect(sanitizeText('  hello  ')).toBe('hello');
  });

  test('respects max length (default 500)', () => {
    const long = 'a'.repeat(600);
    expect(sanitizeText(long).length).toBe(500);
  });

  test('respects custom max length', () => {
    expect(sanitizeText('hello world', 5).length).toBe(5);
  });

  test('preserves normal text unchanged', () => {
    expect(sanitizeText('Bonjour, je suis enceinte.')).toBe('Bonjour, je suis enceinte.');
  });
});

describe('sanitizeBarcode', () => {
  test('valid 13-digit barcode passes through', () => {
    expect(sanitizeBarcode('3017620425400')).toBe('3017620425400');
  });

  test('valid 8-digit barcode passes through', () => {
    expect(sanitizeBarcode('12345678')).toBe('12345678');
  });

  test('strips non-digit characters', () => {
    expect(sanitizeBarcode('abc123')).toBe('123');
  });

  test('strips spaces and dashes', () => {
    expect(sanitizeBarcode('3017-620 425 400')).toBe('3017620425400');
  });
});

describe('isValidBarcode', () => {
  test('13-digit barcode is valid', () => {
    expect(isValidBarcode('3017620425400')).toBe(true);
  });

  test('8-digit barcode is valid', () => {
    expect(isValidBarcode('12345678')).toBe(true);
  });

  test('other lengths are invalid', () => {
    expect(isValidBarcode('123')).toBe(false);
    expect(isValidBarcode('123456789012')).toBe(false);
  });
});

describe('sanitizeName', () => {
  test('strips angle brackets', () => {
    expect(sanitizeName('Sophie<>')).toBe('Sophie');
  });

  test('preserves accented characters', () => {
    expect(sanitizeName('Éléonore')).toBe('Éléonore');
  });

  test('strips curly braces', () => {
    expect(sanitizeName('Test{Hack}')).toBe('TestHack');
  });

  test('respects max length', () => {
    expect(sanitizeName('a'.repeat(200)).length).toBe(100);
  });

  test('preserves spaces', () => {
    expect(sanitizeName('Marie Dupont')).toBe('Marie Dupont');
  });
});

describe('sanitizeEmail', () => {
  test('valid email returns lowercase', () => {
    expect(sanitizeEmail('Test@Example.COM')).toBe('test@example.com');
  });

  test('invalid email → empty string', () => {
    expect(sanitizeEmail('not-an-email')).toBe('');
    expect(sanitizeEmail('missing@domain')).toBe('');
    expect(sanitizeEmail('')).toBe('');
  });

  test('trims whitespace before validating', () => {
    expect(sanitizeEmail('  test@example.com  ')).toBe('test@example.com');
  });
});

describe('sanitizePartnerCode', () => {
  test('strips non-alphanumeric characters and uppercases', () => {
    expect(sanitizePartnerCode('abc-123')).toBe('ABC123');
  });

  test('truncates to 6 characters', () => {
    expect(sanitizePartnerCode('ABCDEFGHIJ')).toBe('ABCDEF');
  });

  test('handles valid 6-char code', () => {
    expect(sanitizePartnerCode('ABC123')).toBe('ABC123');
  });
});

describe('sanitizeChatMessage', () => {
  test('strips HTML', () => {
    const result = sanitizeChatMessage('<b>Hello</b>');
    expect(result).toBe('Hello');
  });

  test('allows up to 1000 characters', () => {
    const long = 'a'.repeat(1200);
    expect(sanitizeChatMessage(long).length).toBe(1000);
  });
});
