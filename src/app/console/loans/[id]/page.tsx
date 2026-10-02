import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { approveLoanAction, checkPayoutAction, manualPayoutAction, markDefaultedAction, recordPaymentAction, reviewLoanAction, sendPayoutAction, setLimitOverride } from "@/app/actions/loans";
import { ActionButton, DecisionForm, SimpleActionForm } from "@/components/app/loan-staff";
import { AlertIcon } from "@/components/icons";
import { Avatar, Badge, Card, CardHeader, StatusBadge, Table } from "@/components/ui";
import { listAudit } from "@/lib/audit-queries";
import { can, fullName, requirePermission } from "@/lib/auth";
import { creditLimit } from "@/lib/credit/limits";
import { formatDate } from "@/lib/format";
import { bpsToPercent, toNaira } from "@/lib/loans/math";
import { loanPaymentsFor, staffLoanDetail } from "@/lib/loans/queries";
import { loanPayouts } from "@/lib/loans/payouts";
import { loanBalance } from "@/lib/loans/service";
import { getSetting } from "@/lib/settings";
import { LOAN_STATUS_LABEL, LOAN_STATUS_TONE } from "@/lib/loans/status";
import { formatNgPhone } from "@/lib/phone";

export const metadata: Metadata = { title: "Loan" };

const ngn = (kobo: number) => `₦${toNaira(kobo).toLocaleString("en-NG", { minimumFractionDigits: kobo % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
const nameOf = (first: string | null, last: string | null) => (first ? `${first} ${last ?? ""}`.trim() : "—");

function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="space-y-2 text-sm">
      {rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4"><dt className="text-muted">{k}</dt><dd className="text-right font-semibold text-ink">{v}</dd></div>)}
    </dl>
  );
}

export default async function ConsoleLoanPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePermission("loans.review");
  const { id } = await params;
  const data = await staffLoanDetail(Number(id));
  if (!data) notFound();
  const { loan, product, customer, kyc, credit, documents, otherLoans } = data;
  const balance = loan.status === "active" || loan.status === "repaid" || loan.status === "defaulted" ? await loanBalance(loan.id) : null;
  const payments = balance ? await loanPaymentsFor(loan.id) : [];
  const limit = await creditLimit(customer.id, customer.kycTier);
  const payoutList = await loanPayouts(loan.id);
  const inFlight = payoutList.find((p) => p.status === "processing");
  const payoutMode = await getSetting("payoutMode");
  const timeline = (await listAudit({ limit: 30, query: loan.reference })).rows;
  const s = loan.score;
  const b = loan.bureau;
  const dti = loan.declaredIncome ? Math.round((loan.instalment / loan.declaredIncome) * 100) : null;

  return (
    <div className="space-y-6">
      <Link href="/console/loans" className="text-sm font-semibold text-brand">← Loans</Link>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={fullName(customer)} className="size-14 text-base" />
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-ink">{ngn(loan.principal)} {product.name} · {fullName(customer)}</h1>
          <p className="text-sm text-muted"><span className="font-mono">{loan.reference}</span> · {customer.email} · {formatNgPhone(customer.phone)} · KYC Tier {customer.kycTier} · customer since {formatDate(customer.createdAt.toISOString())}</p>
        </div>
        <Badge tone={LOAN_STATUS_TONE[loan.status]} dot>{LOAN_STATUS_LABEL[loan.status]}</Badge>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.15fr]">
        <div className="space-y-6">
          {/* ---------- Decision panel ---------- */}
          <Card className="border-brand-200 p-5">
            <h2 className="text-[15px] font-bold text-ink">Next step</h2>
            <div className="mt-4">
              {loan.status === "pending" && (
                <>
                  <p className="mb-4 text-sm text-body">Review the score, bureau report and affordability. Recommending approval sends it to a second person with approval rights.</p>
                  <DecisionForm action={reviewLoanAction.bind(null, loan.id)} approveLabel="Recommend approval" />
                </>
              )}
              {loan.status === "reviewed" && (
                loan.reviewedById === staff.id ? <p className="text-sm text-warning">You reviewed this application, so another approver must make the final decision.</p>
                : !can(staff, "loans.approve") ? <p className="text-sm text-body">Waiting for someone with approval rights.</p>
                : <>
                    <p className="mb-4 text-sm text-body">Recommended by <b>{nameOf(data.reviewerFirst, data.reviewerLast)}</b>{loan.reviewNote ? `: “${loan.reviewNote}”` : "."}</p>
                    <DecisionForm action={approveLoanAction.bind(null, loan.id)} approveLabel="Approve loan" />
                  </>
              )}
              {loan.status === "approved" && (
                <div className="space-y-5">
                  <p className="text-sm text-body">
                    Pay <b>{ngn(loan.principal - loan.processingFee)}</b> to <b>{loan.payoutName}</b>, {loan.payoutBank} <span className="font-mono">{loan.payoutAccount}</span>
                    {loan.payoutBankCode ? " (name confirmed with the bank)" : ""}. The repayment schedule starts when the money arrives.
                  </p>
                  <p className="text-xs text-muted">Payout method in Settings: <b>{payoutMode === "automatic" ? "Automatic" : "Manual"}</b>{loan.autoApproved ? " · approved automatically" : ""}</p>
                  {inFlight ? (
                    <div className="rounded-[5px] bg-warning-soft p-4 text-sm text-warning">
                      <p><b>Transfer {inFlight.reference} is processing at the bank.</b> Wait for it to finish before trying anything else, so the customer isn&apos;t paid twice.</p>
                      <div className="mt-3"><ActionButton action={checkPayoutAction.bind(null, loan.id, inFlight.reference)} label="Check status now" tone="secondary" /></div>
                    </div>
                  ) : !can(staff, "loans.approve") ? (
                    <p className="text-sm text-body">Waiting for someone with approval rights to pay it out.</p>
                  ) : (
                    <>
                      {loan.payoutBankCode && (
                        <div>
                          <p className="mb-2 text-sm font-bold text-ink">Send through Flutterwave</p>
                          <ActionButton action={sendPayoutAction.bind(null, loan.id)} label={`Send ${ngn(loan.principal - loan.processingFee)} now`} confirm={`Send ${ngn(loan.principal - loan.processingFee)} to ${loan.payoutName} (${loan.payoutBank} ${loan.payoutAccount})?`} />
                        </div>
                      )}
                      <details className="rounded-[5px] border border-line p-4" open={!loan.payoutBankCode}>
                        <summary className="cursor-pointer text-sm font-bold text-ink">Paid it yourself? Record a manual transfer</summary>
                        <div className="mt-3"><SimpleActionForm action={manualPayoutAction.bind(null, loan.id)} submit="Record manual payout" fields={[{ name: "reference", label: "Bank transfer reference", placeholder: "e.g. NIP 000013241002…" }]} /></div>
                      </details>
                    </>
                  )}
                </div>
              )}
              {loan.status === "active" && balance && (
                <div className="space-y-6">
                  <Facts rows={[["Outstanding", ngn(balance.outstanding)], ["Overdue", balance.overdueAmount ? <span className="text-danger">{ngn(balance.overdueAmount)}</span> : "Nothing"], ["Next due", balance.next ? `${ngn(balance.next.principal + balance.next.interest + balance.next.lateFee - balance.next.paid)} on ${formatDate(balance.next.dueDate)}` : "—"]]} />
                  {balance.overdueCount > 0 && (
                    <p className="flex items-start gap-2 rounded-[5px] bg-warning-soft px-3 py-2 text-xs text-warning"><AlertIcon className="mt-0.5 size-4 shrink-0" />FCCPC rules: contact only the borrower (and their declared guarantor, if any), between 8am and 6pm, without threats. Never contact people in their phonebook.</p>
                  )}
                  {can(staff, "loans.collect") && <div><p className="mb-2 text-sm font-bold text-ink">Record a repayment received by bank transfer</p><SimpleActionForm action={recordPaymentAction.bind(null, loan.id)} submit="Record repayment" fields={[{ name: "amount", label: "Amount (₦)", inputMode: "decimal" }, { name: "note", label: "Transfer reference or note" }]} /></div>}
                  {can(staff, "loans.approve") && balance.overdueCount > 0 && <div><p className="mb-2 text-sm font-bold text-ink">Mark as defaulted</p><SimpleActionForm action={markDefaultedAction.bind(null, loan.id)} submit="Mark as defaulted" tone="danger" confirm="Mark this loan as defaulted? It will be reported to the credit bureau." fields={[{ name: "note", label: "Reason", textarea: true }]} /></div>}
                </div>
              )}
              {["repaid", "declined", "cancelled", "defaulted", "written_off"].includes(loan.status) && (
                <p className="text-sm text-body">{LOAN_STATUS_LABEL[loan.status]}{loan.closedAt ? ` on ${formatDate(loan.closedAt.toISOString())}` : ""}.{loan.declineReason ? ` Reason: ${loan.declineReason}` : ""}</p>
              )}
            </div>
          </Card>

          {/* ---------- Assessment ---------- */}
          {s && (
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-[15px] font-bold text-ink">Credit score</h2>
                <Badge tone={s.band === "A" ? "success" : s.band === "B" ? "brand" : s.band === "C" ? "warning" : "danger"}>{s.score}/100 · Band {s.band} · {s.recommendation}</Badge>
              </div>
              {s.hardStops.length > 0 && <ul className="mt-3 space-y-1">{s.hardStops.map((h) => <li key={h} className="rounded-[5px] bg-danger-soft px-3 py-2 text-sm font-semibold text-danger">⛔ {h}</li>)}</ul>}
              <ul className="mt-3 divide-y divide-line text-sm">
                {s.reasons.map((r) => <li key={r.label} className="flex justify-between py-2"><span className="text-body">{r.label}</span><span className={`font-bold ${r.points > 0 ? "text-success" : r.points < 0 ? "text-danger" : "text-muted"}`}>{r.points > 0 ? "+" : ""}{r.points}</span></li>)}
              </ul>
            </Card>
          )}

          <Card className="p-5">
            <h2 className="text-[15px] font-bold text-ink">Credit bureau</h2>
            {b ? (
              <div className="mt-3"><Facts rows={[
                ["Bureau", b.provider === "sandbox" ? "Test bureau" : b.provider], ["Bureau score", b.score ?? "—"], ["Open loans elsewhere", `${b.openLoans} with ${b.lenders} lender${b.lenders === 1 ? "" : "s"}`],
                ["Owed elsewhere", ngn(b.outstanding)], ["Worst status", <span key="w" className={b.delinquent ? "text-danger" : "text-success"}>{b.worstStatus}</span>], ["Checked", formatDate(b.checkedAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })],
              ]} /></div>
            ) : <p className="mt-2 text-sm text-warning">No bureau check was available for this application. Review the statement and affordability carefully.</p>}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-[15px] font-bold text-ink">Terms</h2>
            <div className="mt-3"><Facts rows={[
              ["Amount", ngn(loan.principal)], ["Paid out (after fee)", ngn(loan.principal - loan.processingFee)], ["Repay over", `${loan.tenorMonths} month${loan.tenorMonths > 1 ? "s" : ""}`],
              ["Monthly instalment", ngn(loan.instalment)], ["Interest", `${bpsToPercent(loan.monthlyRateBps)} a month (${loan.interestMethod}) · APR ${bpsToPercent(loan.aprBps)}`],
              ["Total repayable", ngn(loan.totalRepayable)], ["Purpose", loan.purpose], ["Pay to", `${loan.payoutName} · ${loan.payoutBank} ${loan.payoutAccount}`],
            ]} /></div>
          </Card>

          <Card className="p-5">
            <h2 className="text-[15px] font-bold text-ink">Applicant</h2>
            <div className="mt-3"><Facts rows={[
              ["Name on BVN", kyc?.legalFirstName ? `${kyc.legalFirstName} ${kyc.legalLastName}` : "—"], ["Declared income", loan.declaredIncome ? `${ngn(loan.declaredIncome)} a month` : "—"],
              ["Repayment / income", dti != null ? <span key="d" className={dti > 33 ? "text-warning" : "text-success"}>{dti}%</span> : "—"], ["Employment", [credit?.employmentType, credit?.employer].filter(Boolean).join(" · ") || "—"],
              ["Loan limit", `${ngn(limit.limit)}${limit.overridden ? " (set by staff)" : ""}`], ["DigitMonie history", `${limit.history.repaidOnTime} on time · ${limit.history.repaidLate} late · ${limit.history.defaulted} defaulted`],
            ]} /></div>
            {documents.map((d) => <a key={d.id} href={`/console/loans/document/${d.id}`} target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-between rounded-[5px] border border-line px-4 py-3 text-sm font-semibold text-brand hover:bg-brand-50">📄 {d.fileName}<span className="text-xs text-muted">{Math.round(d.size / 1024)} KB · opens in new tab</span></a>)}
            {can(staff, "loans.approve") && (
              <details className="mt-4 rounded-[5px] border border-line p-4">
                <summary className="cursor-pointer text-sm font-semibold text-brand">Change this customer&apos;s loan limit</summary>
                <div className="mt-3"><SimpleActionForm action={setLimitOverride.bind(null, customer.id)} submit="Save limit" fields={[{ name: "limit", label: "Limit in ₦ (leave empty to use the calculated limit)", inputMode: "decimal", required: false, defaultValue: credit?.limitOverride != null ? String(credit.limitOverride / 100) : "" }]} /></div>
              </details>
            )}
          </Card>

          {payoutList.length > 0 && (
            <Card>
              <CardHeader title="Payouts" subtitle="Every attempt to send this loan" />
              <ul className="divide-y divide-line pt-2 text-sm">
                {payoutList.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                    <span><span className="font-mono text-xs">{p.reference}</span> · {p.method === "flutterwave" ? "Flutterwave" : p.method === "test" ? "Test transfer" : "Manual"} · {formatDate(p.createdAt.toISOString(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}{p.failureReason ? <span className="block text-xs text-danger">{p.failureReason}</span> : null}</span>
                    <span className="flex items-center gap-3"><b className="tabular-nums">{ngn(p.amount)}</b><StatusBadge status={p.status === "processing" ? "pending" : p.status === "successful" ? "successful" : "failed"} /></span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {balance && (
            <Card>
              <CardHeader title="Repayment schedule" subtitle={`Paid out ${loan.disbursedAt ? formatDate(loan.disbursedAt.toISOString()) : ""} · ref ${loan.disbursementReference ?? ""}`} />
              <div className="mt-3">
                <Table head={["#", "Due", "Amount", "Late fee", "Paid", "Status"]}>
                  {balance.instalments.map((i) => (
                    <tr key={i.id} className={i.status === "overdue" ? "bg-danger-soft/40" : ""}>
                      <td className="px-5 py-2.5 text-muted">{i.n}</td><td className="px-5 py-2.5">{formatDate(i.dueDate)}</td>
                      <td className="px-5 py-2.5 tabular-nums">{ngn(i.principal + i.interest)}</td><td className="px-5 py-2.5 tabular-nums">{i.lateFee ? ngn(i.lateFee) : "—"}</td>
                      <td className="px-5 py-2.5 tabular-nums">{i.paid ? ngn(i.paid) : "—"}</td><td className="px-5 py-2.5"><StatusBadge status={i.status} /></td>
                    </tr>
                  ))}
                </Table>
              </div>
              {payments.length > 0 && (
                <ul className="divide-y divide-line border-t border-line text-sm">
                  {payments.map((p) => <li key={p.id} className="flex justify-between px-5 py-2.5"><span className="text-body">{p.paidAt ? formatDate(p.paidAt.toISOString(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""} · {p.method}{p.note ? ` · ${p.note}` : ""}</span><span className="font-bold tabular-nums text-success">+{ngn(p.amount)}</span></li>)}
                </ul>
              )}
            </Card>
          )}

          <Card>
            <CardHeader title="Timeline" />
            <ol className="space-y-3 p-5">
              {timeline.map((t) => (
                <li key={t.id} className="flex gap-3 text-sm"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" /><div><p className="text-ink"><b>{t.actorName ?? "System"}</b> {t.summary}</p><p className="text-xs text-muted">{formatDate(t.createdAt.toISOString(), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p></div></li>
              ))}
            </ol>
            {otherLoans.length > 0 && (
              <div className="border-t border-line p-5 text-sm">
                <p className="mb-2 font-bold text-ink">Other loans</p>
                {otherLoans.map((o) => <Link key={o.id} href={`/console/loans/${o.id}`} className="flex justify-between py-1 hover:text-brand"><span className="font-mono text-xs">{o.reference}</span><span>{ngn(o.principal)} · {LOAN_STATUS_LABEL[o.status]}</span></Link>)}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
