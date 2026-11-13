/**
 * Authentication and input normalization helpers for Nigerian logistics users
 */

export function normalizeNigerianPhone(input: string): string {
  // Strip non-digit characters except leading plus
  let cleaned = input.trim().replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+234')) {
    cleaned = cleaned.slice(4);
  } else if (cleaned.startsWith('234')) {
    cleaned = cleaned.slice(3);
  } else if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }

  // Format as E.164: +234XXXXXXXXXX
  return `+234${cleaned}`;
}

export function formatNigerianPhoneDisplay(phone: string): string {
  const normalized = normalizeNigerianPhone(phone);
  // +234 812 345 6789
  const digits = normalized.replace('+234', '');
  if (digits.length <= 3) return `+234 ${digits}`;
  if (digits.length <= 6) return `+234 ${digits.slice(0, 3)} ${digits.slice(3)}`;
  return `+234 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
}

export interface PasswordStrength {
  score: number; // 0 to 4
  label: 'Too Weak' | 'Weak' | 'Medium' | 'Strong' | 'Very Strong';
  color: string;
}

export function evaluatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { score: 0, label: 'Too Weak', color: 'bg-neutral-500' };
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  switch (score) {
    case 1:
      return { score: 1, label: 'Weak', color: 'bg-red-500' };
    case 2:
      return { score: 2, label: 'Medium', color: 'bg-amber-500' };
    case 3:
      return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
    case 4:
      return { score: 4, label: 'Very Strong', color: 'bg-bayniks-orange' };
    default:
      return { score: 0, label: 'Too Weak', color: 'bg-red-700' };
  }
}

