import type { LedgerAccountType } from "@/db/schema";

/** Chart of accounts. Codes are stable; add new ones rather than renaming. */
export const ACCOUNTS = {
  flutterwave: { code: "1000", name: "Cash: Flutterwave balance", type: "asset" },
  bank: { code: "1010", name: "Cash: company bank account", type: "asset" },
  paystack: { code: "1020", name: "Cash: Paystack balance", type: "asset" },
  loansReceivable: { code: "1100", name: "Loans receivable (principal)", type: "asset" },
  funding: { code: "3000", name: "Funding (capital put into the business)", type: "equity" },
  interestIncome: { code: "4000", name: "Interest income", type: "income" },
  feeIncome: { code: "4010", name: "Processing fee income", type: "income" },
  lateFeeIncome: { code: "4020", name: "Late fee income", type: "income" },
  recoveries: { code: "4030", name: "Recoveries on written-off loans", type: "income" },
  loanLosses: { code: "5000", name: "Loan losses (written off)", type: "expense" },
  providerFees: { code: "5010", name: "Payment provider fees", type: "expense" },
} as const satisfies Record<string, { code: string; name: string; type: LedgerAccountType }>;
export type AccountKey = keyof typeof ACCOUNTS;
