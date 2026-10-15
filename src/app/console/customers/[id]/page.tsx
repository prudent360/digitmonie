import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteCustomerAction, forceSignOutAction, logContactAction, setStatusAction, unlockPinAction, updateDetailsAction, viewAsAction } from "@/app/actions/customers";
import { setLimitOverride } from "@/app/actions/loans";
import { assignOfficerAction } from "@/app/actions/onboarding";
import { ContactForm, EditDetailsForm, StatusForm } from "@/components/app/customer-forms";
import { ActionButton, SelectForm, SimpleActionForm } from "@/components/app/loan-staff";
import { LoanPlan } from "@/components/app/loan-plan";
import { RepaymentBreakdown } from "@/components/app/repayment-breakdown";
import { AlertIcon, EyeIcon } from "@/components/icons";
import { Avatar, Badge, Card, CardHeader, StatTile, StatusBadge } from "@/components/ui";
import { logAudit } from "@/lib/audit";
import { can, fullName, loadUser, requirePermission } from "@/lib/auth";
import { creditLimit } from "@/lib/credit/limits";
import { CHANNELS, OUTCOMES, customerProfile } from "@/lib/customers";
import { formatDate } from "@/lib/format";
import { tierNames } from "@/lib/kyc";
import { ageOn } from "@/lib/kyc/matching";
import { toNaira } from "@/lib/loans/math";
import { LOAN_STATUS_LABEL, LOAN_STATUS_TONE } from "@/lib/loans/status";
import { creditOfficers } from "@/lib/onboarding";
import { formatNgPhone } from "@/lib/phone";

export const metadata: Metadata = { title: "Customer" };

const ngn = (kobo: number) => `₦${toNaira(kobo).toLocaleString("en-NG", { minimumFractionDigits: kobo % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
const when = (d: Date) => formatDate(d.toISOString(), { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const CHANNEL_LABEL = Object.fromEntries(CHANNELS.map((c) => [c.value, c.label]));
const OUTCOME_LABEL = Object.fromEntries(OUTCOMES.map((o) => [o.value, o.label]));

function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  return <dl className="space-y-2 text-sm">{rows.map(([k, v]) => <div key={k} className="flex justify-between gap-4"><dt className="text-muted">{k}</dt><dd className="text-right font-semibold text-ink">{v}</dd></div>)}</dl>;
}

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requirePermission("users.view");
  const { id } = await params;
  const data = await customerProfile(Number(id));
  if (!data) notFound();
  const { user, kyc, credit, loans, contacts, activity, promises, verifications, instalmentsFor, paymentsFor, totals } = data;
  await logAudit({ actorId: staff.id, action: "customer.viewed", summary: `viewed ${fullName(user)}'s profile`, target: { type: "user", id: user.id } });
  const limit = await creditLimit(user.id, user.kycTier);
  const pinLocked = user.pinLockedUntil && user.pinLockedUntil > new Date();
  const manage = can(staff, "users.manage");
  const canViewAs = can(staff, "users.view_as") && user.status !== "closed";
  const officers = manage ? await creditOfficers() : [];
  const officerName = async (id: number | null) => (id ? (await loadUser(id).then((u) => (u ? fullName(u) : "Former staff member"))) : null);
  const [officer, onboardedBy] = await Promise.all([officerName(user.officerId), officerName(user.invitedById)]);
  const names = await tierNames();
  const payoutAccounts = [...new Map(loans.filter(({ loan }) => loan.payoutAccount).map(({ loan }) => [`${loan.payoutBank}${loan.payoutAccount}`, `${loan.payoutBank} ••${loan.payoutAccount.slice(-4)} (${loan.payoutName})`])).values()];
  const current = loans.find(({ loan }) => ["awaiting_customer", "pending", "reviewed", "approved", "active", "defaulted"].includes(loan.status));
  const verified = (at: Date | null) => (at ? `Yes, ${formatDate(at.toISOString())}` : "No");

  return (
    <div className="space-y-6">
      <Link href="/console/customers" className="text-sm font-semibold text-brand">← Customers</Link>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar name={fullName(user)} className="size-14 text-base" />
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold text-ink">{fullName(user)}</h1>
          <p className="text-sm text-muted">{user.email} · {formatNgPhone(user.phone)} · customer since {formatDate(user.createdAt.toISOString())}</p>
        </div>
        <div className="flex items-center gap-2">{user.kycTier ? <Badge tone="brand">KYC {names[user.kycTier]}</Badge> : <Badge>Not verified</Badge>}<StatusBadge status={user.status} /></div>
      </div>

      {canViewAs && (
        <details className="rounded-[7px] border border-line bg-white">
          <summary className="flex cursor-pointer items-center gap-2 px-5 py-3.5 text-sm font-semibold text-brand"><EyeIcon className="size-4" /> View as customer</summary>
          <div className="border-t border-line p-5">
            <p className="mb-4 text-sm text-body">See exactly what {user.firstName} sees, to help with a support question. It&apos;s <b>read-only</b>: you can&apos;t apply, pay or change anything. It ends after 30 minutes and is recorded in the audit log with your reason.</p>
            <SimpleActionForm action={viewAsAction.bind(null, user.id)} submit="Open their account" fields={[{ name: "reason", label: "Why do you need to see it?", placeholder: "For example: ticket #123, can't find their repayment", textarea: true }]} />
          </div>
        </details>
      )}

      {user.status !== "active" && user.statusReason && (
        <p className="flex items-start gap-2 rounded-[7px] border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning"><AlertIcon className="mt-0.5 size-4 shrink-0" /><span><b className="capitalize">{user.status}</b>{user.statusChangedAt ? ` on ${formatDate(user.statusChangedAt.toISOString())}` : ""}: {user.statusReason}</span></p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile label="Owes now" value={ngn(totals.outstanding)} hint={current ? `${current.loan.reference} · ${LOAN_STATUS_LABEL[current.loan.status]}` : "No open loan"} />
        <StatTile label="Total borrowed" value={ngn(totals.borrowed)} hint={`${loans.filter(({ loan }) => loan.disbursedAt).length} loan${loans.filter(({ loan }) => loan.disbursedAt).length === 1 ? "" : "s"} paid out`} />
        <StatTile label="Total repaid" value={ngn(totals.repaid)} />
        <StatTile label="Repaid on time" value={totals.paidInstalments ? `${Math.round((totals.paidOnTime / totals.paidInstalments) * 100)}%` : "—"} hint={`${totals.paidOnTime} of ${totals.paidInstalments} instalments`} />
        <StatTile label="Loan limit" value={ngn(limit.limit)} hint={limit.overridden ? "Set by staff" : "Calculated"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.35fr]">
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="text-[15px] font-bold text-ink">Account</h2>
            <div className="mt-3"><Facts rows={[
              ["Joined", onboardedBy ? `Opened by ${onboardedBy}, ${formatDate(user.createdAt.toISOString())}` : `Signed up, ${formatDate(user.createdAt.toISOString())}`],
              ["Phone verified", verified(user.phoneVerifiedAt)], ["Email verified", verified(user.emailVerifiedAt)], ["Transaction PIN", user.pinHash ? (pinLocked ? <span key="p" className="text-danger">Locked</span> : "Set") : "Not set"],
              ["Last sign-in", user.lastLoginAt ? when(user.lastLoginAt) : "Never"],
              ["Credit officer", officer ?? "None"],
            ]} /></div>
            {manage && officers.length > 0 && (
              <div className="mt-4"><SelectForm action={assignOfficerAction.bind(null, user.id)} name="officerId" label="Credit officer" value={String(user.officerId ?? "")} submit="Assign"
                options={[{ value: "", label: "No credit officer" }, ...officers.map((o) => ({ value: String(o.id), label: o.name }))]} /></div>
            )}
            {manage && (
              <details className="mt-4 rounded-[7px] border border-line p-4">
                <summary className="cursor-pointer text-sm font-semibold text-brand">Edit details</summary>
                <div className="mt-3"><EditDetailsForm action={updateDetailsAction.bind(null, user.id)} nameLocked={user.kycTier > 0} initial={{ firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone ? formatNgPhone(user.phone) : "" }} /></div>
              </details>
            )}
            {manage && (
              <div className="mt-4 flex flex-wrap gap-3 border-t border-line pt-4">
                {pinLocked && <ActionButton action={unlockPinAction.bind(null, user.id)} label="Unlock PIN" tone="secondary" />}
                <ActionButton action={forceSignOutAction.bind(null, user.id)} label="Sign out of all devices" tone="secondary" confirm="Sign this customer out on every device?" />
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="text-[15px] font-bold text-ink">Identity</h2>
            <div className="mt-3"><Facts rows={[
              ["Name on ID", kyc?.legalFirstName ? [kyc.legalFirstName, kyc.legalMiddleName, kyc.legalLastName].filter(Boolean).join(" ") : "—"],
              ["Date of birth", kyc?.dateOfBirth ? `${formatDate(kyc.dateOfBirth)} (${ageOn(kyc.dateOfBirth)})` : "—"], ["Gender", kyc?.gender || "—"],
              ["NIN", kyc?.ninLast4 ? `••••••• ${kyc.ninLast4}` : "—"], ["BVN", kyc?.bvnLast4 ? `••••••• ${kyc.bvnLast4}` : "—"],
              ["Address", [kyc?.addressLine, kyc?.city, kyc?.state].filter(Boolean).join(", ") || "—"],
              ["Consented to checks", kyc?.consentAt ? formatDate(kyc.consentAt.toISOString()) : "—"],
            ]} /></div>
          </Card>

          <Card>
            <CardHeader title="Verification history" subtitle="Every identity check, newest first" />
            {verifications.length ? (
              <ol className="divide-y divide-line">
                {verifications.map(({ s, reviewerFirst, reviewerLast }) => (
                  <li key={s.id} className="px-5 py-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold text-ink">{can(staff, "kyc.review") ? <Link href={`/console/kyc/${s.id}`} className="hover:text-brand">{names[s.tier]}</Link> : names[s.tier]}{s.tier === 1 && s.checks.idKind && <span className="font-normal text-muted"> · {s.checks.idKind.toUpperCase()}</span>}</span>
                      <StatusBadge status={s.status === "approved" ? "successful" : s.status === "rejected" ? "failed" : "pending"} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {formatDate(s.createdAt.toISOString())} · {s.decidedBy === "manual" ? `decided by ${reviewerFirst ? `${reviewerFirst} ${reviewerLast}` : "staff"}` : s.decidedBy === "auto" ? "checked automatically" : "waiting for review"}
                      {[s.checks.nameScore != null && `name ${s.checks.nameScore}%`, s.checks.faceScore != null && `face ${s.checks.faceScore}%`, s.checks.dobMatch === false && "DOB differs"].filter(Boolean).map((x) => ` · ${x}`).join("")}
                    </p>
                    {s.reason && <p className="mt-1 text-xs text-body">{s.reason}</p>}
                  </li>
                ))}
              </ol>
            ) : <p className="p-5 text-sm text-muted">No identity checks yet.</p>}
          </Card>

          <Card className="p-5">
            <h2 className="text-[15px] font-bold text-ink">Credit</h2>
            <div className="mt-3"><Facts rows={[
              ["Loan limit", `${ngn(limit.limit)}${limit.overridden ? " (set by staff)" : ""}`],
              ["History", `${limit.history.repaidOnTime} on time · ${limit.history.repaidLate} late · ${limit.history.defaulted} defaulted`],
              ["Declared income", credit?.monthlyIncome ? `${ngn(credit.monthlyIncome)} a month` : "—"], ["Employment", [credit?.employmentType, credit?.employer].filter(Boolean).join(" · ") || "—"],
              ["Paid into", payoutAccounts.length ? <span key="p">{payoutAccounts.map((a) => <span key={a} className="block">{a}</span>)}</span> : "—"],
            ]} /></div>
            {can(staff, "loans.approve") && (
              <details className="mt-4 rounded-[7px] border border-line p-4">
                <summary className="cursor-pointer text-sm font-semibold text-brand">Change loan limit</summary>
                <div className="mt-3"><SimpleActionForm action={setLimitOverride.bind(null, user.id)} submit="Save limit" fields={[{ name: "limit", label: "Limit in ₦ (empty = calculated limit)", inputMode: "decimal", required: false, defaultValue: credit?.limitOverride != null ? String(credit.limitOverride / 100) : "" }]} /></div>
              </details>
            )}
          </Card>

          {manage && (
            <Card className="p-5">
              <h2 className="text-[15px] font-bold text-ink">Account status</h2>
              <p className="mt-1 text-xs text-muted">Currently <b className="capitalize">{user.status}</b>. Every change is recorded in the audit log.</p>
              <div className="mt-4"><StatusForm action={setStatusAction.bind(null, user.id)} current={user.status} /></div>
            </Card>
          )}

          {manage && (
            <Card className="border-danger/30 p-5">
              <h2 className="text-[15px] font-bold text-danger">Delete account</h2>
              {loans.length ? (
                <p className="mt-1 text-sm text-body">{user.firstName} has loan history, which we&apos;re required to keep, so this account can&apos;t be deleted. Close it instead under Account status.</p>
              ) : (
                <>
                  <p className="mt-1 text-sm text-body">Permanently removes this customer, their identity checks and their notifications. Use it for test sign-ups or duplicates. <b>This can&apos;t be undone.</b></p>
                  <div className="mt-4"><SimpleActionForm action={deleteCustomerAction.bind(null, user.id)} tone="danger" submit="Delete permanently" confirm={`Permanently delete ${fullName(user)}? This can't be undone.`} fields={[{ name: "confirmEmail", label: `Type ${user.email} to confirm` }]} /></div>
                </>
              )}
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Loans and repayment plans" subtitle="Open a loan to see each instalment and payment" />
            {loans.length ? (
              <div className="divide-y divide-line border-t border-line">
                {loans.map(({ loan, productName }) => {
                  const plan = instalmentsFor(loan.id);
                  return (
                    <details key={loan.id} open={loan.id === current?.loan.id} className="group">
                      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-5 py-3.5 hover:bg-canvas/60">
                        <span>
                          <span className="font-semibold text-ink">{ngn(loan.principal)} {productName}</span>
                          <span className="ml-2 font-mono text-xs text-muted">{loan.reference}</span>
                          <span className="block text-xs text-muted">{loan.tenorMonths} month{loan.tenorMonths > 1 ? "s" : ""} at {(loan.monthlyRateBps / 100).toFixed(2).replace(/\.?0+$/, "")}% a month · applied {formatDate(loan.createdAt.toISOString())}{loan.purpose ? ` · ${loan.purpose}` : ""}</span>
                        </span>
                        <Badge tone={LOAN_STATUS_TONE[loan.status]} dot>{LOAN_STATUS_LABEL[loan.status]}</Badge>
                      </summary>
                      <div className="space-y-3 px-5 pb-5">
                        {plan.length ? <RepaymentBreakdown loan={loan} instalments={plan} payments={paymentsFor(loan.id)} />
                          : ["awaiting_customer", "pending", "reviewed", "approved"].includes(loan.status) ? <LoanPlan loan={loan} productName={productName} />
                          : <p className="text-sm text-muted">{loan.declineReason ? `Declined: ${loan.declineReason}` : "This loan was never paid out, so it has no repayment plan."}</p>}
                        <Link href={`/console/loans/${loan.id}`} className="inline-block text-sm font-semibold text-brand">Open loan file →</Link>
                      </div>
                    </details>
                  );
                })}
              </div>
            ) : <p className="p-5 text-sm text-muted">No loans yet.</p>}
            {promises.length > 0 && (
              <div className="border-t border-line px-5 py-4 text-sm">
                <p className="mb-2 font-bold text-ink">Promises to pay</p>
                {promises.slice(0, 5).map((p) => <p key={p.id} className="flex justify-between py-1"><span>{ngn(p.amount)} by {formatDate(p.dueDate)}</span><StatusBadge status={p.status === "kept" ? "successful" : p.status === "broken" ? "failed" : p.status === "open" ? "pending" : "cancelled"} /></p>)}
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title="Contact log" subtitle="Calls, messages, visits and notes" />
            <div className="border-b border-line p-5">
              <ContactForm action={logContactAction.bind(null, user.id)} channels={CHANNELS} outcomes={OUTCOMES} loans={loans.map(({ loan, productName }) => ({ value: String(loan.id), label: `${loan.reference} · ${productName}` }))} />
            </div>
            {contacts.length ? (
              <ol className="divide-y divide-line">
                {contacts.map(({ c, authorFirst, authorLast, loanRef }) => (
                  <li key={c.id} className="px-5 py-3.5 text-sm">
                    <p className="flex flex-wrap items-center gap-2"><Badge tone={c.channel === "note" ? "neutral" : "brand"}>{CHANNEL_LABEL[c.channel]}</Badge>{c.outcome && <span className="text-xs font-semibold text-body">{OUTCOME_LABEL[c.outcome]}</span>}{loanRef && <span className="font-mono text-xs text-muted">{loanRef}</span>}</p>
                    <p className="mt-1.5 whitespace-pre-line text-ink">{c.note}</p>
                    <p className="mt-1 text-xs text-muted">{authorFirst ? `${authorFirst} ${authorLast}` : "Staff"} · {when(c.createdAt)}</p>
                  </li>
                ))}
              </ol>
            ) : <p className="p-5 text-sm text-muted">Nothing logged yet.</p>}
          </Card>

          <Card>
            <CardHeader title="Activity" subtitle="From the audit log" />
            <ol className="space-y-3 p-5">
              {activity.map(({ a, actorFirst, actorLast }) => (
                <li key={a.id} className="flex gap-3 text-sm"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" /><div><p className="text-ink"><b>{actorFirst ? `${actorFirst} ${actorLast}` : "System"}</b> {a.summary}</p><p className="text-xs text-muted">{when(a.createdAt)}</p></div></li>
              ))}
              {!activity.length && <li className="text-sm text-muted">No activity yet.</li>}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  );
}
