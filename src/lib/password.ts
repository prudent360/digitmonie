export const MIN_PASSWORD_LENGTH = 10;

/** Returns a problem with a password, or null if it is acceptable. */
export function passwordProblem(password: string, label = "Password"): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `${label} must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (password.length > 200) return `${label} is too long.`;
  if (/^(.)\1+$/.test(password)) return `${label} must not repeat a single character.`;
  return null;
}

const WEAK_PINS = new Set(["0000", "1111", "2222", "3333", "4444", "5555", "6666", "7777", "8888", "9999", "1234", "4321", "0123", "1212"]);

export function pinProblem(pin: string): string | null {
  if (!/^\d{4}$/.test(pin)) return "Your PIN must be exactly 4 digits.";
  if (WEAK_PINS.has(pin)) return "That PIN is too easy to guess. Choose another.";
  return null;
}
