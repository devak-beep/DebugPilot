export const PASSWORD_RULES = [
  { test: (p: string) => p.length >= 8,          label: 'At least 8 characters' },
  { test: (p: string) => /[A-Z]/.test(p),        label: 'One uppercase letter' },
  { test: (p: string) => /[0-9]/.test(p),        label: 'One number' },
  { test: (p: string) => /[^A-Za-z0-9]/.test(p), label: 'One special character' },
]

export function validatePassword(p: string): string | null {
  for (const rule of PASSWORD_RULES) {
    if (!rule.test(p)) return rule.label + ' required'
  }
  return null
}
