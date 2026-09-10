import { randomBytes } from "node:crypto";
import { prisma } from "@mtanda/database";
import { hashPassword } from "./auth/passwords";

export const TERMS_VERSION = "2026-09-09-v1";
export const PRIVACY_VERSION = "2026-09-09-v1";

export type SchoolRegistrationInput = {
  // Step 1 — admin account
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  jobTitle: string; // Position: Owner | Director | Headteacher | …
  password: string;
  // Step 2 — school information
  schoolName: string;
  shortName?: string;
  schoolType: string;
  ownership: string;
  schoolEmail: string;
  schoolPhone: string;
  alternativePhone?: string;
  admissionsEmail?: string;
  financeEmail?: string;
  whatsappNumber?: string;
  website?: string;
  regNumber?: string;
  knecCode?: string;
  kraPin?: string;
  // Step 3 — location
  county: string;
  subCounty: string;
  ward?: string;
  town: string;
  location?: string;
  address: string;
  postalAddress?: string;
  postalCode?: string;
  // Step 4 — CBC setup
  curriculum: string;
  levelsOffered: string[];
  academicYear: string;
  currentTerm: string;
  termStartDate?: string;
  termEndDate?: string;
  estimatedStudents?: number;
  estimatedTeachers?: number;
  estimatedClasses?: number;
  estimatedStreams?: number;
  // Step 5 — branding
  motto?: string;
  description?: string;
  primaryColor?: string;
  secondaryColor?: string;
  reportCardPreference?: string;
  studentIdFormat?: string;
  admissionPrefix?: string;
  subdomain: string;
  // Step 6 — subscription + service intentions
  planSlug: string;
  feesChoice?: string;
  mpesaChoice?: string;
  emailChoice?: string;
  whatsappChoice?: string;
  // Step 7 — legal
  acceptTerms: boolean;
  acceptPrivacy: boolean;
  authorizedConfirm: boolean;
  accuracyConfirm: boolean;
  requestIp?: string;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function required(value: string | undefined, field: string): string {
  const v = (value ?? "").trim();
  if (!v) throw new Error(`${field} is required.`);
  return v;
}

const opt = (v: string | undefined) => (v ?? "").trim() || null;
const toDate = (v: string | undefined) => {
  if (!v?.trim()) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

export async function registerSchool(input: SchoolRegistrationInput) {
  // Step 1
  const firstName = required(input.firstName, "First name");
  const lastName = required(input.lastName, "Last name");
  const phone = required(input.phone, "Phone number");
  const email = required(input.email, "Email address").toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error("Enter a valid email address.");
  }
  if ((input.password ?? "").length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }

  // Step 2
  const schoolName = required(input.schoolName, "Official school name");
  const schoolType = required(input.schoolType, "School type");
  const ownership = required(input.ownership, "Ownership");

  // Step 3
  const county = required(input.county, "County");
  const subCounty = required(input.subCounty, "Sub-county");
  const town = required(input.town, "Town / city");
  const address = required(input.address, "Physical address");

  // Step 4
  const curriculum = required(input.curriculum, "Curriculum");
  const academicYear = required(input.academicYear, "Academic year");
  const currentTerm = required(input.currentTerm, "Current term");

  const slug = slugify(schoolName);
  const subdomain = slugify(input.subdomain ?? "");
  if (!slug || !subdomain) throw new Error("School name and subdomain are required.");

  // Step 7
  if (!input.acceptTerms || !input.acceptPrivacy || !input.authorizedConfirm || !input.accuracyConfirm) {
    throw new Error("Accept the Terms, Privacy Policy, and both confirmations.");
  }
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { slug: input.planSlug },
  });
  if (!plan || !plan.active) throw new Error("Selected plan is not available.");

  const clash = await prisma.school.findFirst({
    where: { OR: [{ slug }, { subdomain }] },
  });
  if (clash) throw new Error("That school name or subdomain is already taken.");

  const passwordHash = await hashPassword(input.password);
  const now = new Date();
  const trialEnd = new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000);
  const token = randomBytes(32).toString("hex");
  const tokenExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const school = await prisma.$transaction(async (tx) => {
    const created = await tx.school.create({
      data: {
        name: schoolName,
        slug,
        subdomain,
        status: "PENDING_VERIFICATION",
        verificationStatus: "PENDING",
        schoolType,
        ownership,
        shortName: opt(input.shortName),
        email: (input.schoolEmail || email).toLowerCase().trim(),
        phone: input.schoolPhone || phone,
        alternativePhone: opt(input.alternativePhone),
        admissionsEmail: opt(input.admissionsEmail)?.toLowerCase() ?? null,
        financeEmail: opt(input.financeEmail)?.toLowerCase() ?? null,
        whatsappNumber: opt(input.whatsappNumber),
        website: opt(input.website),
        regNumber: opt(input.regNumber),
        knecCode: opt(input.knecCode),
        kraPin: opt(input.kraPin),
        county,
        subCounty,
        town,
        ward: opt(input.ward),
        location: opt(input.location),
        address,
        postalAddress: opt(input.postalAddress),
        postalCode: opt(input.postalCode),
        curriculum,
        levelsOffered: input.levelsOffered ?? [],
        academicYear,
        currentTerm,
        termStartDate: toDate(input.termStartDate),
        termEndDate: toDate(input.termEndDate),
        estimatedStudents: input.estimatedStudents || null,
        estimatedTeachers: input.estimatedTeachers || null,
        estimatedClasses: input.estimatedClasses || null,
        estimatedStreams: input.estimatedStreams || null,
        motto: opt(input.motto),
        description: opt(input.description),
        primaryColor: opt(input.primaryColor),
        secondaryColor: opt(input.secondaryColor),
        reportCardPreference: opt(input.reportCardPreference) ?? "default-template",
        studentIdFormat: opt(input.studentIdFormat) ?? "automatic",
        admissionPrefix: opt(input.admissionPrefix),
        feesChoice: opt(input.feesChoice) ?? "later",
        mpesaChoice: opt(input.mpesaChoice) ?? "later",
        emailChoice: opt(input.emailChoice) ?? "later",
        whatsappChoice: opt(input.whatsappChoice) ?? "not-now",
        calendarType: "term-based",
        termsVersion: TERMS_VERSION,
        privacyVersion: PRIVACY_VERSION,
        termsAcceptedAt: now,
        authorizedConfirm: true,
        accuracyConfirm: true,
        termsAcceptedIp: input.requestIp ?? null,
      },
    });

    const user = await tx.user.create({
      data: {
        schoolId: created.id,
        email,
        passwordHash,
        userType: "SCHOOL_ADMIN",
        firstName,
        lastName,
        phone,
        jobTitle: input.jobTitle?.trim() || null,
      },
    });

    const subscription = await tx.subscription.create({
      data: {
        schoolId: created.id,
        planId: plan.id,
        status: "TRIALING",
        currentPeriodStart: now,
        currentPeriodEnd: trialEnd,
      },
    });

    await tx.platformInvoice.create({
      data: {
        schoolId: created.id,
        subscriptionId: subscription.id,
        amount: plan.quarterlyPrice,
        status: "DRAFT",
        periodStart: now,
        periodEnd: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
      },
    });

    await tx.emailVerificationToken.create({
      data: {
        schoolId: created.id,
        userId: user.id,
        token,
        expiresAt: tokenExpiry,
      },
    });

    await tx.school.update({
      where: { id: created.id },
      data: { termsAcceptedBy: user.id },
    });

    await tx.auditLog.create({
      data: {
        schoolId: created.id,
        actorId: user.id,
        action: "school.self_registered",
        metadata: {
          plan: plan.slug,
          subdomain,
          county,
          curriculum,
          estimatedStudents: input.estimatedStudents ?? null,
        },
      },
    });

    return created;
  });

  // TODO: send verification email via queued job. In development the token
  // is surfaced so the flow can be completed without SMTP.
  return { schoolId: school.id, slug: school.slug, subdomain, verificationToken: token };
}
