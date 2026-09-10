import { NextResponse } from "next/server";
import { prisma, needsReminder, isExpired, deletionDue } from "@mtanda/database";
import { sendMail } from "@/lib/email/mailer";
import { brandedEmail } from "@/lib/email/templates";

// Daily trial lifecycle runner (GitHub Actions cron → here, guarded by CRON_SECRET):
// - TRIALING ending within 15 days → reminder email (margin math)
// - TRIALING past end → subscription EXPIRED + school SUSPENDED
// - EXPIRED 30+ days with zero completed payments → tenant deleted
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const provided =
    request.headers.get("authorization")?.replace("Bearer ", "") ??
    new URL(request.url).searchParams.get("secret") ??
    "";
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const now = new Date();
  const report = { reminded: 0, suspended: 0, deleted: 0, errors: [] as string[] };

  const trialing = await prisma.subscription.findMany({
    where: { status: "TRIALING" },
    include: {
      plan: true,
      school: { select: { id: true, name: true, email: true } },
    },
  });

  for (const sub of trialing) {
    try {
      if (isExpired(sub.currentPeriodEnd, now)) {
        await prisma.$transaction([
          prisma.subscription.update({
            where: { id: sub.id },
            data: { status: "EXPIRED", churnedAt: now },
          }),
          prisma.school.update({
            where: { id: sub.schoolId },
            data: { status: "SUSPENDED" },
          }),
          prisma.auditLog.create({
            data: {
              schoolId: sub.schoolId,
              action: "platform.trial_expired_suspended",
              metadata: { plan: sub.plan.slug },
            },
          }),
        ]);
        report.suspended++;
      } else if (needsReminder(sub.currentPeriodEnd, now) && sub.school.email) {
        const mailed = await sendMail({
          to: sub.school.email,
          subject: `Your MtandaoLabs trial ends in 15 days — ${sub.school.name}`,
          html: brandedEmail(
            "Your trial ends soon",
            `<p>Hi ${sub.school.name},</p><p>Your <strong>${sub.plan.name}</strong> trial ends on ${sub.currentPeriodEnd.toDateString()}.</p><p>Continue for <strong>KSh ${Number(sub.plan.quarterlyPrice).toLocaleString()} per 3 months</strong> — complete payment from your dashboard to avoid suspension.</p>`
          ),
        });
        await prisma.auditLog.create({
          data: {
            schoolId: sub.schoolId,
            action: "platform.trial_reminder_sent",
            metadata: { emailed: mailed.ok },
          },
        });
        if (mailed.ok) report.reminded++;
      }
    } catch (e) {
      report.errors.push(`${sub.schoolId}: ${e instanceof Error ? e.message : "error"}`);
    }
  }

  // 30 days after expiry with no completed payment → delete tenant data.
  const expired = await prisma.subscription.findMany({
    where: { status: "EXPIRED" },
    include: {
      school: {
        select: {
          id: true,
          platformPayments: { where: { status: "COMPLETED" }, select: { id: true } },
        },
      },
    },
  });
  for (const sub of expired) {
    try {
      const everPaid = sub.school.platformPayments.length > 0;
      if (deletionDue(sub.currentPeriodEnd, now, everPaid)) {
        await prisma.school.delete({ where: { id: sub.schoolId } });
        report.deleted++;
      }
    } catch (e) {
      report.errors.push(`${sub.schoolId}: ${e instanceof Error ? e.message : "error"}`);
    }
  }

  return NextResponse.json({ ok: true, ...report });
}
