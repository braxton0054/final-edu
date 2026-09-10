import { NextResponse } from "next/server";
import { registerSchool } from "@/lib/school-registration";
import { sendMail } from "@/lib/email/mailer";

const str = (v: unknown) => String(v ?? "");
const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : undefined;
};

// Self-registration: 7-step CBC wizard → email verification → payment → tenant.
export async function POST(request: Request) {
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
    // Real verification email via the configured platform SMTP.
    const base =
      process.env.NEXT_PUBLIC_APP_URL ??
      `${new URL(request.url).protocol}//${new URL(request.url).host}`;
    const mailed = await sendMail({
      to: String(body.email ?? ""),
      subject: "Verify your MtandaoLabs school account",
      html: `<p>Your school <strong>${result.slug}</strong> is registered.</p><p><a href="${base}/verify-email?token=${result.verificationToken}">Verify your email to activate it</a> (link expires in 24 hours).</p>`,
    });
    response.emailSent = mailed.ok;
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
