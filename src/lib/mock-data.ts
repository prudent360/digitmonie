// Placeholder data for the UI. Every export here will be replaced by database queries.

export type TxStatus = "successful" | "pending" | "failed";
export type TxType = "credit" | "debit";
export type TxCategory = "transfer" | "savings" | "investment" | "loan" | "bills" | "card" | "deposit";

export type Transaction = {
  id: string;
  title: string;
  detail: string;
  amount: number;
  type: TxType;
  category: TxCategory;
  status: TxStatus;
  date: string;
  reference: string;
};

export const account = {
  holder: "Adaeze Okafor",
  accountNumber: "8034 512 907",
  bank: "DigitMonie MFB",
  tier: "Tier 2",
  kycProgress: 2,
  kycSteps: 3,
  walletBalance: 1_284_560.45,
  savingsBalance: 2_150_000,
  investmentBalance: 4_620_000,
  loanOutstanding: 735_000,
  creditLimit: 3_000_000,
  points: 2_480,
};

export const netWorthHistory = [
  { label: "Oct", value: 4_120_000 },
  { label: "Nov", value: 4_380_000 },
  { label: "Dec", value: 4_210_000 },
  { label: "Jan", value: 4_690_000 },
  { label: "Feb", value: 5_020_000 },
  { label: "Mar", value: 5_310_000 },
  { label: "Apr", value: 5_240_000 },
  { label: "May", value: 5_780_000 },
  { label: "Jun", value: 6_120_000 },
  { label: "Jul", value: 6_490_000 },
  { label: "Aug", value: 6_870_000 },
  { label: "Sep", value: 7_319_560 },
];

export const cashflow = [
  { label: "Apr", inflow: 820_000, outflow: 610_000 },
  { label: "May", inflow: 940_000, outflow: 700_000 },
  { label: "Jun", inflow: 880_000, outflow: 560_000 },
  { label: "Jul", inflow: 1_120_000, outflow: 790_000 },
  { label: "Aug", inflow: 960_000, outflow: 640_000 },
  { label: "Sep", inflow: 1_240_000, outflow: 720_000 },
];

export const allocation = [
  { label: "Fixed income", value: 2_400_000 },
  { label: "Savings", value: 2_150_000 },
  { label: "Treasury bills", value: 1_420_000 },
  { label: "Mutual funds", value: 800_000 },
];

export const transactions: Transaction[] = [
  { id: "t1", title: "Salary — Paystack Ltd", detail: "Inward transfer", amount: 850_000, type: "credit", category: "deposit", status: "successful", date: "2026-09-30T09:12:00", reference: "DM-91822731" },
  { id: "t2", title: "Transfer to Chinedu Eze", detail: "GTBank · 0123456789", amount: 45_000, type: "debit", category: "transfer", status: "successful", date: "2026-09-29T18:40:00", reference: "DM-91822114" },
  { id: "t3", title: "Loan repayment", detail: "Personal loan · 4 of 12", amount: 98_450, type: "debit", category: "loan", status: "successful", date: "2026-09-28T08:00:00", reference: "DM-91820970" },
  { id: "t4", title: "Ikeja Electric", detail: "Prepaid token · 120 kWh", amount: 25_000, type: "debit", category: "bills", status: "successful", date: "2026-09-27T21:05:00", reference: "DM-91819402" },
  { id: "t5", title: "Treasury bill interest", detail: "91-day T-bill", amount: 38_720, type: "credit", category: "investment", status: "successful", date: "2026-09-26T10:30:00", reference: "DM-91817755" },
  { id: "t6", title: "Rent Vault top-up", detail: "Auto-save", amount: 150_000, type: "debit", category: "savings", status: "successful", date: "2026-09-25T07:00:00", reference: "DM-91816120" },
  { id: "t7", title: "Netflix", detail: "Virtual card ••4821", amount: 7_500, type: "debit", category: "card", status: "failed", date: "2026-09-24T03:15:00", reference: "DM-91814888" },
  { id: "t8", title: "MTN Airtime", detail: "0803 *** 5531", amount: 5_000, type: "debit", category: "bills", status: "successful", date: "2026-09-23T13:44:00", reference: "DM-91813010" },
  { id: "t9", title: "Transfer from Bola Ade", detail: "Access Bank", amount: 120_000, type: "credit", category: "transfer", status: "pending", date: "2026-09-22T16:20:00", reference: "DM-91811207" },
  { id: "t10", title: "DigitMonie Fixed Note", detail: "12-month investment", amount: 500_000, type: "debit", category: "investment", status: "successful", date: "2026-09-20T11:00:00", reference: "DM-91808332" },
];

export const savingsPlans = [
  { id: "s1", name: "Rent Vault", goal: 1_800_000, saved: 1_150_000, rate: 0.14, frequency: "Weekly · ₦37,500", maturity: "2027-01-15", locked: true },
  { id: "s2", name: "Emergency fund", goal: 1_000_000, saved: 640_000, rate: 0.12, frequency: "Monthly · ₦80,000", maturity: null, locked: false },
  { id: "s3", name: "Japa fund", goal: 5_000_000, saved: 360_000, rate: 0.15, frequency: "Monthly · ₦150,000", maturity: "2027-12-31", locked: true },
];

export const investments = [
  { id: "i1", name: "DigitMonie Fixed Note", kind: "Fixed income", principal: 2_000_000, current: 2_186_000, rate: 0.21, tenor: "12 months", maturity: "2027-03-20", status: "active" as const },
  { id: "i2", name: "91-day Treasury Bill", kind: "Treasury bills", principal: 1_400_000, current: 1_420_000, rate: 0.178, tenor: "91 days", maturity: "2026-11-02", status: "active" as const },
  { id: "i3", name: "Naira Money Market Fund", kind: "Mutual funds", principal: 750_000, current: 800_000, rate: 0.192, tenor: "Flexible", maturity: null, status: "active" as const },
  { id: "i4", name: "Agro Commodity Note", kind: "Fixed income", principal: 200_000, current: 214_000, rate: 0.19, tenor: "6 months", maturity: "2026-10-12", status: "maturing" as const },
];

export const investmentProducts = [
  { id: "p1", name: "DigitMonie Fixed Note", kind: "Fixed income", rate: 0.21, min: 100_000, tenor: "3 – 12 months", risk: "Low", subscribed: 0.72 },
  { id: "p2", name: "Naira Money Market Fund", kind: "Mutual fund", rate: 0.192, min: 5_000, tenor: "Flexible", risk: "Low", subscribed: 0.48 },
  { id: "p3", name: "182-day Treasury Bill", kind: "Government", rate: 0.185, min: 50_000, tenor: "182 days", risk: "Very low", subscribed: 0.91 },
  { id: "p4", name: "Real Estate Income Note", kind: "Alternative", rate: 0.24, min: 500_000, tenor: "24 months", risk: "Medium", subscribed: 0.35 },
];

export const activeLoan = {
  id: "LN-20431",
  product: "Personal loan",
  principal: 1_000_000,
  outstanding: 735_000,
  monthly: 98_450,
  paidInstallments: 4,
  installments: 12,
  nextDue: "2026-10-28",
  rate: 0.035,
  disbursed: "2026-05-28",
};

export const loanSchedule = Array.from({ length: 12 }, (_, i) => {
  const due = new Date(2026, 5 + i, 28);
  return {
    n: i + 1,
    due: due.toISOString(),
    amount: 98_450,
    status: i < 4 ? ("paid" as const) : i === 4 ? ("due" as const) : ("upcoming" as const),
  };
});

export const loanProducts = [
  { name: "Salary advance", range: "₦20k – ₦500k", tenor: "Up to 1 month", rate: "3% flat", icon: "zap" as const },
  { name: "Personal loan", range: "₦100k – ₦5m", tenor: "3 – 12 months", rate: "From 3.5% / mo", icon: "wallet" as const },
  { name: "SME working capital", range: "₦500k – ₦50m", tenor: "3 – 18 months", rate: "From 3% / mo", icon: "briefcase" as const },
];

/* ---------- Console (staff / admin) ---------- */

export const consoleKpis = {
  aum: 18_420_000_000,
  aumChange: 0.064,
  loanBook: 6_910_000_000,
  loanBookChange: 0.038,
  activeUsers: 248_310,
  usersChange: 0.052,
  nplRatio: 0.031,
  nplChange: -0.004,
};

export const disbursements = [
  { label: "Apr", inflow: 640_000_000, outflow: 820_000_000 },
  { label: "May", inflow: 710_000_000, outflow: 905_000_000 },
  { label: "Jun", inflow: 768_000_000, outflow: 860_000_000 },
  { label: "Jul", inflow: 812_000_000, outflow: 1_040_000_000 },
  { label: "Aug", inflow: 879_000_000, outflow: 990_000_000 },
  { label: "Sep", inflow: 931_000_000, outflow: 1_120_000_000 },
];

export const signups = [
  { label: "Oct", value: 12_400 }, { label: "Nov", value: 13_900 }, { label: "Dec", value: 15_200 },
  { label: "Jan", value: 14_100 }, { label: "Feb", value: 16_800 }, { label: "Mar", value: 18_300 },
  { label: "Apr", value: 19_000 }, { label: "May", value: 21_600 }, { label: "Jun", value: 22_400 },
  { label: "Jul", value: 24_900 }, { label: "Aug", value: 26_200 }, { label: "Sep", value: 28_700 },
];

export type KycStatus = "verified" | "pending" | "rejected" | "unverified";
export const customers = [
  { id: "u1", name: "Adaeze Okafor", email: "adaeze@example.com", phone: "0803 451 5531", tier: "Tier 2", kyc: "verified" as KycStatus, balance: 8_054_560, joined: "2025-02-11", state: "Lagos", status: "active" },
  { id: "u2", name: "Musa Ibrahim", email: "musa.i@example.com", phone: "0812 908 2210", tier: "Tier 1", kyc: "pending" as KycStatus, balance: 54_200, joined: "2026-09-28", state: "Kano", status: "active" },
  { id: "u3", name: "Grace Effiong", email: "grace.e@example.com", phone: "0706 221 9018", tier: "Tier 3", kyc: "verified" as KycStatus, balance: 22_910_000, joined: "2024-11-03", state: "Akwa Ibom", status: "active" },
  { id: "u4", name: "Emeka Nwosu", email: "emeka.n@example.com", phone: "0909 117 4402", tier: "Tier 1", kyc: "rejected" as KycStatus, balance: 0, joined: "2026-09-21", state: "Enugu", status: "restricted" },
  { id: "u5", name: "Folake Adeyemi", email: "folake@example.com", phone: "0817 552 0198", tier: "Tier 2", kyc: "verified" as KycStatus, balance: 1_320_400, joined: "2025-07-19", state: "Oyo", status: "active" },
  { id: "u6", name: "Ibrahim Sani", email: "ibrahim.s@example.com", phone: "0803 220 7710", tier: "Tier 1", kyc: "unverified" as KycStatus, balance: 12_000, joined: "2026-09-30", state: "Abuja", status: "active" },
  { id: "u7", name: "Ngozi Umeh", email: "ngozi.u@example.com", phone: "0805 664 3321", tier: "Tier 2", kyc: "pending" as KycStatus, balance: 340_750, joined: "2026-09-25", state: "Anambra", status: "active" },
  { id: "u8", name: "Kunle Ojo", email: "kunle.o@example.com", phone: "0814 990 1205", tier: "Tier 3", kyc: "verified" as KycStatus, balance: 46_100_000, joined: "2024-04-08", state: "Lagos", status: "frozen" },
];

export const kycQueue = [
  { id: "k1", name: "Musa Ibrahim", requested: "Tier 2", documents: ["BVN", "NIN", "Selfie"], submitted: "2026-10-01T08:12:00", match: 0.96, risk: "low" },
  { id: "k2", name: "Ngozi Umeh", requested: "Tier 2", documents: ["BVN", "NIN", "Utility bill"], submitted: "2026-09-30T19:40:00", match: 0.88, risk: "low" },
  { id: "k3", name: "Chuka Obi", requested: "Tier 3", documents: ["BVN", "Passport", "Utility bill", "Selfie"], submitted: "2026-09-30T14:05:00", match: 0.71, risk: "medium" },
  { id: "k4", name: "Halima Yusuf", requested: "Tier 1", documents: ["BVN", "Selfie"], submitted: "2026-09-30T10:22:00", match: 0.54, risk: "high" },
];

export type LoanAppStatus = "pending" | "approved" | "declined" | "disbursed";
export const loanApplications = [
  { id: "LA-8821", name: "Folake Adeyemi", product: "Personal loan", amount: 1_500_000, tenor: 12, score: 742, income: 650_000, dti: 0.28, submitted: "2026-10-01T07:30:00", status: "pending" as LoanAppStatus },
  { id: "LA-8819", name: "Bayo Martins Ventures", product: "SME working capital", amount: 12_000_000, tenor: 9, score: 688, income: 4_800_000, dti: 0.36, submitted: "2026-09-30T16:12:00", status: "pending" as LoanAppStatus },
  { id: "LA-8814", name: "Ngozi Umeh", product: "Salary advance", amount: 150_000, tenor: 1, score: 701, income: 320_000, dti: 0.18, submitted: "2026-09-30T09:45:00", status: "approved" as LoanAppStatus },
  { id: "LA-8807", name: "Emeka Nwosu", product: "Personal loan", amount: 3_000_000, tenor: 12, score: 512, income: 280_000, dti: 0.71, submitted: "2026-09-29T13:20:00", status: "declined" as LoanAppStatus },
  { id: "LA-8801", name: "Grace Effiong", product: "Personal loan", amount: 2_000_000, tenor: 6, score: 776, income: 1_200_000, dti: 0.22, submitted: "2026-09-28T11:00:00", status: "disbursed" as LoanAppStatus },
];

export const platformTransactions = [
  { id: "x1", reference: "DM-91822731", customer: "Adaeze Okafor", channel: "NIP inward", amount: 850_000, type: "credit" as TxType, status: "successful" as TxStatus, date: "2026-10-01T09:12:00", flagged: false },
  { id: "x2", reference: "DM-91822719", customer: "Kunle Ojo", channel: "NIP outward", amount: 18_500_000, type: "debit" as TxType, status: "pending" as TxStatus, date: "2026-10-01T08:58:00", flagged: true },
  { id: "x3", reference: "DM-91822702", customer: "Grace Effiong", channel: "Investment", amount: 5_000_000, type: "debit" as TxType, status: "successful" as TxStatus, date: "2026-10-01T08:41:00", flagged: false },
  { id: "x4", reference: "DM-91822688", customer: "Musa Ibrahim", channel: "Card", amount: 32_000, type: "debit" as TxType, status: "failed" as TxStatus, date: "2026-10-01T08:30:00", flagged: false },
  { id: "x5", reference: "DM-91822671", customer: "Folake Adeyemi", channel: "Loan repayment", amount: 145_200, type: "credit" as TxType, status: "successful" as TxStatus, date: "2026-10-01T08:02:00", flagged: false },
  { id: "x6", reference: "DM-91822650", customer: "Ibrahim Sani", channel: "NIP outward", amount: 2_400_000, type: "debit" as TxType, status: "pending" as TxStatus, date: "2026-10-01T07:47:00", flagged: true },
  { id: "x7", reference: "DM-91822633", customer: "Ngozi Umeh", channel: "Bills", amount: 12_000, type: "debit" as TxType, status: "successful" as TxStatus, date: "2026-10-01T07:20:00", flagged: false },
];

export const team = [
  { id: "m1", name: "Ifiok Udo", email: "admin@digitmonie.com", role: "admin" as const, lastActive: "Just now" },
  { id: "m2", name: "Tunde Bakare", email: "tunde@digitmonie.com", role: "staff" as const, lastActive: "12 min ago" },
  { id: "m3", name: "Amaka Chukwu", email: "amaka@digitmonie.com", role: "staff" as const, lastActive: "1 hr ago" },
  { id: "m4", name: "Yusuf Bello", email: "yusuf@digitmonie.com", role: "admin" as const, lastActive: "Yesterday" },
];

export const auditLog = [
  { who: "Tunde Bakare", what: "approved KYC Tier 2 for Ngozi Umeh", when: "2026-10-01T08:40:00" },
  { who: "Ifiok Udo", what: "froze account of Kunle Ojo (AML review)", when: "2026-10-01T08:05:00" },
  { who: "Amaka Chukwu", what: "declined loan LA-8807", when: "2026-09-30T17:22:00" },
  { who: "Yusuf Bello", what: "updated Fixed Note rate to 21%", when: "2026-09-30T12:10:00" },
];
