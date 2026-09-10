import { NextResponse } from "next/server";
import { registerSchool } from "@/lib/school-registration";
import { sendMail } from "@/lib/email/mailer";
import { issueOtp } from "@/lib/auth/otp";
import { sendSubscriptionInvoice } from "@/lib/billing/invoice-email";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

const str = (v: unknown) => String(v ?? "");
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
};

// Self-registration: 7-step CBC wizard → email verification → payment → tenant.
export async function POST(request: Request) {
  const rl = await checkRateLimit(`rl:register:${clientIp(request)}`, 5, 3600);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many registrations. Try again later." },
      { status: 429 }
    );
  }
  try {
    const body = await request.json();
    const levels = Array.isArray(body.levelsOffered)
      ? body.levelsOffered.map(str).filter(Boolean)
      : [];
    const result = await registerSchool({
      firstName: str(body.firstName),
      lastName: str(body.lastName),
      phone: str(body.phone),
      email: str(body.email),
      jobTitle: str(body.jobTitle),
      password: str(body.password),
      schoolName: str(body.schoolName),
      shortName: str(body.shortName),
      schoolType: str(body.schoolType),
      ownership: str(body.ownership),
      schoolEmail: str(body.schoolEmail),
      schoolPhone: str(body.schoolPhone),
      alternativePhone: str(body.alternativePhone),
      admissionsEmail: str(body.admissionsEmail),
      financeEmail: str(body.financeEmail),
      whatsappNumber: str(body.whatsappNumber),
      website: str(body.website),
      regNumber: str(body.regNumber),
      knecCode: str(body.knecCode),
      kraPin: str(body.kraPin),
      county: str(body.county),
      subCounty: str(body.subCounty),
      ward: str(body.ward),
      town: str(body.town),
      location: str(body.location),
      address: str(body.address),
      postalAddress: str(body.postalAddress),
      postalCode: str(body.postalCode),
      curriculum: str(body.curriculum),
      levelsOffered: levels,
      academicYear: str(body.academicYear),
      currentTerm: str(body.currentTerm),
      termStartDate: str(body.termStartDate),
      termEndDate: str(body.termEndDate),
      estimatedStudents: num(body.estimatedStudents),
      estimatedTeachers: num(body.estimatedTeachers),
      estimatedClasses: num(body.estimatedClasses),
      estimatedStreams: num(body.estimatedStreams),
      motto: str(body.motto),
      description: str(body.description),
      primaryColor: str(body.primaryColor),
      secondaryColor: str(body.secondaryColor),
      reportCardPreference: str(body.reportCardPreference),
      studentIdFormat: str(body.studentIdFormat),
      admissionPrefix: str(body.admissionPrefix),
      subdomain: str(body.subdomain),
      planSlug: str(body.planSlug),
      feesChoice: str(body.feesChoice),
      mpesaChoice: str(body.mpesaChoice),
      emailChoice: str(body.emailChoice),
      whatsappChoice: str(body.whatsappChoice),
      acceptTerms: body.acceptTerms === true,
      acceptPrivacy: body.acceptPrivacy === true,
      authorizedConfirm: body.authorizedConfirm === true,
      accuracyConfirm: body.accuracyConfirm === true,
      requestIp:
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    });
    const response: Record<string, unknown> = { ok: true, ...result };
    // Email confirmation: 6-digit OTP code + verification link.
    const email = String(body.email ?? "");
    const { code } = await issueOtp(email, "verify");
    const base =
      process.env.NEXT_PUBLIC_APP_URL ??
      `${new URL(request.url).protocol}//${new URL(request.url).host}`;
    const mailed = await sendMail({
      to: email,
      subject: "Confirm your MtandaoLabs email address",
      html: `<p>Your school <strong>${result.slug}</strong> is registered.</p><p>Your confirmation code is <strong style="font-size:1.4rem">${code}</strong> (expires in 10 minutes).</p><p>Enter it at ${base}/verify-email, or <a href="${base}/verify-email?token=${result.verificationToken}">click here to verify instantly</a>.</p>`,
    });
    response.emailSent = mailed.ok;
    // Subscription invoice to the school email (trial signup included).
    const invoiced = await sendSubscriptionInvoice({
      to: email,
      schoolName: String(body.schoolName ?? result.slug),
      invoiceNo: result.invoiceNo,
      planName: result.planName,
      amount: result.planAmount,
      trialDays: result.trialDays,
      trialEnd: new Date(result.trialEnd),
      payUrl: `${base}/register/payment/${result.schoolId}`,
    });
    response.invoiceSent = invoiced.ok;
    response.invoiceNo = result.invoiceNo;
    // Development fallback: surface the link when no SMTP is configured.
    if (!mailed.ok && process.env.NODE_ENV !== "production") {
      response.verifyUrl = `/verify-email?token=${result.verificationToken}`;
    }
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Registration failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
