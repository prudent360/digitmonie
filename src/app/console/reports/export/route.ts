import { desc, eq, gte } from "drizzle-orm";
import { getDb } from "@/db";
import { loanPayments, loanProducts, loans, payouts, users } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth";

const cell = (v: unknown) => {
  const s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  // Quote everything; neutralise spreadsheet formulas (CSV injection).
  return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};
const naira = (kobo: number | null) => (kobo == null ? "" : (kobo / 100).toFixed(2));

export async function GET(request: Request) {
  const staff = await requirePermission("reports.view");
  const url = new URL(request.url);
  const type = url.searchParams.get("type");
  const days = Math.min(3650, Math.max(1, Number(url.searchParams.get("days")) || 30));
  const from = new Date(Date.now() - days * 86_400_000);
  const db = await getDb();
  let header: string[] = [];
  let rows: unknown[][] = [];

  if (type === "loans") {
    header = ["Reference", "Customer", "Email", "Product", "Principal (NGN)", "Tenor (months)", "Monthly rate (%)", "Status", "Applied", "Approved", "Paid out", "Closed"];
    rows = (await db.select({ l: loans, first: users.firstName, last: users.lastName, email: users.email, product: loanProducts.name }).from(loans).innerJoin(users, eq(users.id, loans.userId)).innerJoin(loanProducts, eq(loanProducts.id, loans.productId)).where(gte(loans.createdAt, from)).orderBy(desc(loans.createdAt)))
      .map(({ l, first, last, email, product }) => [l.reference, `${first} ${last}`, email, product, naira(l.principal), l.tenorMonths, l.monthlyRateBps / 100, l.status, l.createdAt, l.approvedAt, l.disbursedAt, l.closedAt]);
  } else if (type === "repayments") {
    header = ["Reference", "Loan", "Customer", "Amount (NGN)", "Method", "Paid at", "Note"];
    rows = (await db.select({ p: loanPayments, ref: loans.reference, first: users.firstName, last: users.lastName }).from(loanPayments).innerJoin(loans, eq(loans.id, loanPayments.loanId)).innerJoin(users, eq(users.id, loans.userId)).where(gte(loanPayments.createdAt, from)).orderBy(desc(loanPayments.createdAt)))
      .filter(({ p }) => p.status === "success").map(({ p, ref, first, last }) => [p.reference, ref, `${first} ${last}`, naira(p.amount), p.method, p.paidAt, p.note]);
  } else if (type === "payouts") {
    header = ["Reference", "Loan", "Customer", "Amount (NGN)", "Fee (NGN)", "Method", "Bank", "Account", "Status", "Created", "Completed", "Failure"];
    rows = (await db.select({ p: payouts, ref: loans.reference, first: users.firstName, last: users.lastName }).from(payouts).innerJoin(loans, eq(loans.id, payouts.loanId)).innerJoin(users, eq(users.id, loans.userId)).where(gte(payouts.createdAt, from)).orderBy(desc(payouts.createdAt)))
      .map(({ p, ref, first, last }) => [p.reference, ref, `${first} ${last}`, naira(p.amount), naira(p.fee), p.method, p.bankName, p.accountNumber, p.status, p.createdAt, p.completedAt, p.failureReason]);
  } else {
    return new Response("Unknown export", { status: 400 });
  }

  await logAudit({ actorId: staff.id, action: "reports.exported", summary: `exported ${rows.length} ${type} rows (last ${days} days)`, target: { type: "report", id: type } });
  const csv = [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
  return new Response(`﻿${csv}`, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="digitmonie-${type}-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "private, no-store" },
  });
}
