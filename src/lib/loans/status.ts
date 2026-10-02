import type { LoanStatus } from "@/db/schema";

export const LOAN_STATUS_LABEL: Record<LoanStatus, string> = {
  pending: "Under review",
  reviewed: "Awaiting approval",
  approved: "Approved · awaiting payout",
  active: "Active",
  repaid: "Repaid",
  defaulted: "Defaulted",
  written_off: "Written off",
  declined: "Declined",
  cancelled: "Cancelled",
};

export const LOAN_STATUS_TONE: Record<LoanStatus, "neutral" | "brand" | "success" | "warning" | "danger" | "gold"> = {
  pending: "warning", reviewed: "warning", approved: "brand", active: "success", repaid: "neutral",
  defaulted: "danger", written_off: "danger", declined: "danger", cancelled: "neutral",
};

export const OPEN_STATUSES: LoanStatus[] = ["pending", "reviewed", "approved", "active"];
