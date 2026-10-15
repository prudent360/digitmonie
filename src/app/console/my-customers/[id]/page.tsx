import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { officerAddress, officerSelfie, officerTier1, resendSetupLink, withdrawLoan } from "@/app/actions/onboarding";
import { AddressForm, NinSelfieForm, Tier1Form } from "@/components/app/kyc-forms";
import { ActionButton } from "@/components/app/loan-staff";
import { LoanPlan } from "@/components/app/loan-plan";
import { RepaymentBreakdown } from "@/components/app/repayment-breakdown";
import { CancelLoanButton } from "@/components/app/loan-repay";
import { AlertIcon, CheckIcon, ClockIcon, LockIcon } from "@/components/icons";
import { Badge, Card, CardHeader, PageHeader, buttonPrimary } from "@/components/ui";
import { can, fullName, requireStaff } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getTiers, tier1IdKinds } from "@/lib/kyc";
import { getKycState } from "@/lib/kyc/service";
import { NIGERIAN_STATES } from "@/lib/kyc/states";
import { tierNeeds } from "@/lib/kyc/tiers";
import { toNaira } from "@/lib/loans/math";
import { customerLoans, loanPaymentsFor } from "@/lib/loans/queries";
import { loanBalance, loanEligibility } from "@/lib/loans/service";
import { LOAN_STATUS_LABEL, LOAN_STATUS_TONE } from "@/lib/loans/status";
import { officerCustomer } from "@/lib/onboarding";
import { formatNgPhone } from "@/lib/phone";

export const metadata: Metadata = { title: "Customer" };

const ngn = (kobo: number) => `₦${toNaira(kobo).toLocaleString("en-NG", { minimumFractionDigits: kobo % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

export default async function OfficerCustomerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ notice?: string }> }) {
  const staff = await requireStaff();
  if (!can(staff, "console.access") || !(can(staff, "customers.onboard") || can(staff, "users.manage"))) redirect("/console?denied=1");
  const customer = await officerCustomer(staff, Number((await params).id) || 0);
  if (!customer) redirect("/console/my-customers?missing=1");
  const { notice } = await searchParams;

  const [{ profile, latest }, tiers, idKinds, loans, eligibility] = await Promise.all([
    getKycState(customer.id), getTiers(), tier1IdKinds(), customerLoans(customer.id), loanEligibility(customer, true),
  ]);
  const open = loans.find((l) => ["awaiting_customer", "pending", "reviewed", "approved", "active", "defaulted"].includes(l.loan.status)) ?? null;
  const balance = open && ["active", "defaulted"].includes(open.loan.status) ? await loanBalance(open.loan.id) : null;
  const payments = balance && open ? await loanPaymentsFor(open.loan.id) : [];
  const stageOf = (tier: number) => {
    if (customer.kycTier >= tier) return "done";
    if (latest(tier)?.status === "pending_review") return "pending";
    return customer.kycTier === tier - 1 && !(tier > 1 && latest(tier - 1)?.status === "pending_review") ? "current" : "locked";
  };
  const first = customer.firstName;

  return (
    <div className="space-y-6">
      <Link href="/console/my-customers" className="text-sm font-semibold text-brand">← My customers</Link>
      <PageHeader title={fullName(customer)} subtitle={`${customer.email} · ${formatNgPhone(customer.phone)} · added ${formatDate(customer.createdAt.toISOString())}`} />
      {notice && <p role="status" className="rounded-[7px] bg-success-soft px-4 py-3 text-sm font-medium text-success">{notice}</p>}

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-bold text-ink">Account</h2>
            {customer.status === "pending" ? (
              <p className="mt-1 text-sm text-body"><Badge tone="warning" dot>Not set up yet</Badge> <span className="ml-2">{first} hasn&apos;t chosen a password yet. The link lasts 7 days.</span></p>
            ) : (
              <p className="mt-1 text-sm text-body"><Badge tone={customer.status === "active" ? "success" : "danger"} dot>{customer.status}</Badge> <span className="ml-2">{customer.lastLoginAt ? `Last signed in ${formatDate(customer.lastLoginAt.toISOString())}` : "Hasn't signed in yet"}</span></p>
            )}
          </div>
          {customer.status === "pending" && <ActionButton action={resendSetupLink.bind(null, customer.id)} label="Resend set-up link" tone="secondary" />}
        </div>
      </Card>

      <Card>
        <CardHeader title="Identity checks" subtitle={`Do these with ${first} present. They're checked the same way as if ${first} did them in the app.`} />
        <ol className="divide-y divide-line">
          {tiers.map((t) => {
            const stage = stageOf(t.tier);
            const last = latest(t.tier);
            const rejected = stage === "current" && last?.status === "rejected" ? last.reason : null;
            return (
              <li key={t.tier} className="p-5">
                <div className="flex items-start gap-3">
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-[7px] ${stage === "done" ? "bg-success text-white" : stage === "pending" ? "bg-warning-soft text-warning" : stage === "current" ? "bg-brand text-white" : "bg-canvas text-muted"}`}>
                    {stage === "done" ? <CheckIcon className="size-4" /> : stage === "pending" ? <ClockIcon className="size-4" /> : stage === "locked" ? <LockIcon className="size-4" /> : <span className="text-sm font-bold">{t.tier}</span>}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink">{t.name} <span className="font-normal text-muted">· {tierNeeds(t, idKinds).replace("your", "their")} · starting limit {ngn(t.startingLimit)}</span></p>
                    {stage === "done" && t.tier === 1 && <p className="mt-1 text-xs text-muted">{[profile?.ninLast4 && `NIN ••${profile.ninLast4}`, profile?.bvnLast4 && `BVN ••${profile.bvnLast4}`, `${profile?.legalFirstName ?? ""} ${profile?.legalLastName ?? ""}`.trim(), profile?.dateOfBirth].filter(Boolean).join(" · ")}</p>}
                    {stage === "pending" && <p className="mt-1 text-sm text-warning">With the KYC team for a manual check.</p>}
                  </div>
                </div>
                {stage === "current" && (
                  <div className="mt-5 border-t border-line pt-5">
                    {rejected && <p className="mb-5 flex items-start gap-2 rounded-[7px] bg-danger-soft px-4 py-3 text-sm text-danger"><AlertIcon className="mt-0.5 size-4 shrink-0" /><span><b>Last attempt wasn&apos;t approved:</b> {rejected}</span></p>}
                    {t.tier === 1 && <Tier1Form action={officerTier1.bind(null, customer.id)} idKinds={idKinds} onBehalf={first} />}
                    {t.tier === 2 && <NinSelfieForm action={officerSelfie.bind(null, customer.id)} ninLast4={profile?.ninLast4} onBehalf={first} />}
                    {t.tier === 3 && <AddressForm action={officerAddress.bind(null, customer.id)} states={NIGERIAN_STATES} />}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </Card>

      <Card>
        <CardHeader title="Loans" subtitle={eligibility.blocked ? undefined : `Can borrow up to ${ngn(eligibility.limit)} right now.`}
          action={!eligibility.blocked ? <Link href={`/console/my-customers/${customer.id}/loan`} className={buttonPrimary}>Prepare a loan</Link> : undefined} />
        <div className="space-y-5 p-5">
          {eligibility.blocked && !open && <p className="rounded-[7px] bg-canvas px-4 py-3 text-sm text-body">{eligibility.blocked}</p>}

          {open?.loan.status === "awaiting_customer" && (
            <div className="space-y-4 rounded-[7px] border border-gold/50 p-5">
              <p className="flex flex-wrap items-center gap-2 text-sm text-body"><Badge tone="gold" dot>Waiting for {first}</Badge> {first} needs to sign in and accept this with their PIN before it goes for review.</p>
              <LoanPlan loan={open.loan} productName={open.productName} />
              {open.loan.preparedById === staff.id && <CancelLoanButton action={withdrawLoan.bind(null, customer.id)} loanId={open.loan.id} label="Withdraw this loan" confirm={`Withdraw this loan? ${first} won't be able to accept it.`} />}
            </div>
          )}

          {open && balance && (
            <div className="rounded-[7px] border border-line p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-sm text-muted">{open.productName} · {open.loan.reference}</p><p className="font-display text-2xl font-bold tabular-nums text-ink">{ngn(balance.outstanding)} <span className="text-sm font-normal text-muted">left of {ngn(open.loan.totalRepayable)}</span></p></div>
                <Badge tone={LOAN_STATUS_TONE[open.loan.status]} dot>{LOAN_STATUS_LABEL[open.loan.status]}</Badge>
              </div>
              <div className="mt-4"><RepaymentBreakdown loan={open.loan} instalments={balance.instalments} payments={payments} /></div>
            </div>
          )}

          {open && !balance && open.loan.status !== "awaiting_customer" && (
            <p className="flex flex-wrap items-center gap-2 text-sm text-body"><Badge tone={LOAN_STATUS_TONE[open.loan.status]} dot>{LOAN_STATUS_LABEL[open.loan.status]}</Badge> {ngn(open.loan.principal)} {open.productName} ({open.loan.reference})</p>
          )}

          {loans.filter((l) => l.loan.id !== open?.loan.id).length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-ink">Earlier loans</h3>
              <ul className="mt-2 divide-y divide-line text-sm">
                {loans.filter((l) => l.loan.id !== open?.loan.id).map((l) => (
                  <li key={l.loan.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span className="text-ink">{ngn(l.loan.principal)} {l.productName} <span className="text-muted">· {l.loan.reference} · {formatDate(l.loan.createdAt.toISOString())}</span></span><Badge tone={LOAN_STATUS_TONE[l.loan.status]}>{LOAN_STATUS_LABEL[l.loan.status]}</Badge></li>
                ))}
              </ul>
            </div>
          )}
          {!loans.length && !eligibility.blocked && <p className="text-sm text-muted">No loans yet.</p>}
        </div>
      </Card>
    </div>
  );
}
