// How closely the names on an ID record match the names the customer gave us (0–100).
// Tolerates swapped first/last names, middle names, case, punctuation and small typos.

const normalize = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z\s-]/g, "").split(/[\s-]+/).filter(Boolean);

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const m = a.length, n = b.length;
  if (!m || !n) return 0;
  const dp = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return 1 - dp[n] / Math.max(m, n);
}

/** Best match for each of the customer's names among all the record's name parts, averaged. */
export function nameScore(given: { firstName: string; lastName: string }, record: { firstName: string; middleName?: string; lastName: string }): number {
  const recordTokens = normalize(`${record.firstName} ${record.middleName ?? ""} ${record.lastName}`);
  const wanted = [...normalize(given.firstName), ...normalize(given.lastName)];
  if (!wanted.length || !recordTokens.length) return 0;
  const scores = wanted.map((w) => Math.max(...recordTokens.map((r) => similarity(w, r))));
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100);
}

export function ageOn(dob: string, today = new Date()): number {
  const [y, m, d] = dob.split("-").map(Number);
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--;
  return age;
}
