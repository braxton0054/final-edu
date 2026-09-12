import { prisma } from "@mtanda/database";
import { hashPassword } from "@/lib/auth/passwords";
import { richTeacherScope } from "@/lib/academics/structure";

// ─── In-app communication channel ───
// Tenant-scoped conversations: staff write to audiences, parents read and
// reply in their inbox. Every query is filtered by schoolId; membership is
// checked on every read and write.

export type Audience =
  | { type: "all_parents" }
  | { type: "class"; classId: string }
  | { type: "users"; userIds: string[] };

export function audienceLabel(a: Audience): string {
  if (a.type === "all_parents") return "All parents";
  if (a.type === "class") return `Class ${a.classId}`;
  return `${a.userIds.length} recipient${a.userIds.length === 1 ? "" : "s"}`;
}

// Resolve an audience to parent user ids within one school. Snapshotted at
// send time: parents added later do not see earlier announcements.
export async function resolveAudienceUserIds(
  schoolId: string,
  audience: Audience
): Promise<string[]> {
  if (audience.type === "users") {
    const members = await prisma.user.findMany({
      where: { schoolId, id: { in: audience.userIds }, userType: "PARENT" },
      select: { id: true },
    });
    return members.map((m) => m.id);
  }
  if (audience.type === "class") {
    const guardians = await prisma.studentGuardian.findMany({
      where: {
        schoolId,
        parentId: { not: null },
        student: { classId: audience.classId },
        parent: { userType: "PARENT" },
      },
      select: { parentId: true },
    });
    return Array.from(new Set(guardians.map((g) => g.parentId as string)));
  }
  const guardians = await prisma.studentGuardian.findMany({
    where: { schoolId, parentId: { not: null }, parent: { userType: "PARENT" } },
    select: { parentId: true },
  });
  return Array.from(new Set(guardians.map((g) => g.parentId as string)));
}

export async function createConversation(opts: {
  schoolId: string;
  title: string;
  audience: Audience;
  audienceRef?: string;
  createdById?: string;
  firstMessage: string;
  senderId: string;
}): Promise<{ id: string }> {
  const memberIds = await resolveAudienceUserIds(opts.schoolId, opts.audience);
  // The sender always sees their own thread.
  const allMembers = Array.from(new Set([...memberIds, opts.senderId]));
  if (allMembers.length === 0) {
    throw new Error("No recipients found for this audience.");
  }
  const now = new Date();
  const conversation = await prisma.$transaction(async (tx) => {
    const created = await tx.conversation.create({
      data: {
        schoolId: opts.schoolId,
        title: opts.title.slice(0, 200),
        audience: opts.audience.type,
        audienceRef:
          opts.audience.type === "class" ? opts.audience.classId : (opts.audienceRef ?? null),
        createdById: opts.createdById ?? opts.senderId,
        lastMessageAt: now,
        members: { create: allMembers.map((userId) => ({ userId })) },
        messages: {
          create: {
            schoolId: opts.schoolId,
            senderId: opts.senderId,
            body: opts.firstMessage.slice(0, 4000),
          },
        },
      },
    });
    // Sender has read their own first message.
    await tx.conversationMember.updateMany({
      where: { conversationId: created.id, userId: opts.senderId },
      data: { lastReadAt: now },
    });
    return created;
  });
  return { id: conversation.id };
}

export async function postMessage(opts: {
  schoolId: string;
  conversationId: string;
  senderId: string;
  body: string;
}): Promise<{ id: string }> {
  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.conversationMessage.create({
      data: {
        schoolId: opts.schoolId,
        conversationId: opts.conversationId,
        senderId: opts.senderId,
        body: opts.body.slice(0, 4000),
      },
    });
    const now = new Date();
    await tx.conversation.update({
      where: { id: opts.conversationId },
      data: { lastMessageAt: now },
    });
    await tx.conversationMember.updateMany({
      where: { conversationId: opts.conversationId, userId: opts.senderId },
      data: { lastReadAt: now },
    });
    return created;
  });
  return { id: message.id };
}

// Access: staff see every conversation of their school; teachers and parents
// see only threads they belong to. Returns null when access is denied.
export async function getConversationFor(
  schoolId: string,
  conversationId: string,
  userId: string,
  userType: string
) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, schoolId },
    include: {
      members: { include: { user: { select: { id: true, firstName: true, lastName: true, userType: true } } } },
    },
  });
  if (!conversation) return null;
  if (userType === "SCHOOL_ADMIN" || userType === "STAFF") return conversation;
  const member = conversation.members.find((m) => m.userId === userId);
  return member ? conversation : null;
}

export type ConversationSummary = {
  id: string;
  title: string;
  audience: string;
  audienceRef: string | null;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  lastSenderName: string | null;
  unread: number;
  memberCount: number;
};

export async function listConversationsFor(opts: {
  schoolId: string;
  userId: string;
  userType: string;
}): Promise<ConversationSummary[]> {
  const where =
    opts.userType === "SCHOOL_ADMIN" || opts.userType === "STAFF"
      ? { schoolId: opts.schoolId }
      : { schoolId: opts.schoolId, members: { some: { userId: opts.userId } } };

  const conversations = await prisma.conversation.findMany({
    where,
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    include: {
      _count: { select: { members: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { sender: { select: { firstName: true, lastName: true } } },
      },
      members: { where: { userId: opts.userId }, select: { lastReadAt: true } },
    },
  });

  return await Promise.all(
    conversations.map(async (c) => {
      const lastReadAt = c.members[0]?.lastReadAt ?? new Date(0);
      const unread = await prisma.conversationMessage.count({
        where: {
          conversationId: c.id,
          createdAt: { gt: lastReadAt },
          senderId: { not: opts.userId },
        },
      });
      const last = c.messages[0] ?? null;
      return {
        id: c.id,
        title: c.title,
        audience: c.audience,
        audienceRef: c.audienceRef,
        lastMessageAt: c.lastMessageAt.toISOString(),
        lastMessagePreview: last ? last.body.slice(0, 120) : null,
        lastSenderName: last
          ? [last.sender.firstName, last.sender.lastName].filter(Boolean).join(" ") || "Staff"
          : null,
        unread,
        memberCount: c._count.members,
      };
    })
  );
}

export async function getThread(conversationId: string, limit = 100) {
  const messages = await prisma.conversationMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: limit,
    include: {
      sender: { select: { id: true, firstName: true, lastName: true, userType: true } },
    },
  });
  return messages.map((m) => ({
    id: m.id,
    body: m.body,
    createdAt: m.createdAt.toISOString(),
    senderId: m.senderId,
    senderName:
      [m.sender.firstName, m.sender.lastName].filter(Boolean).join(" ") || "Staff",
    senderType: m.sender.userType,
  }));
}

export async function markRead(conversationId: string, userId: string): Promise<void> {
  await prisma.conversationMember.updateMany({
    where: { conversationId, userId },
    data: { lastReadAt: new Date() },
  });
}

// ─── Parent provisioning (school admin creates logins, links children) ───

export async function createParent(opts: {
  schoolId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  studentAdmissionNos: string[];
}): Promise<{ id: string; linked: number }> {
  const email = opts.email.toLowerCase().trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error("A valid email address is required.");
  }
  if (opts.password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  const existing = await prisma.user.findFirst({
    where: { schoolId: opts.schoolId, email },
  });
  if (existing) throw new Error("A user with this email already exists.");

  const students = await prisma.student.findMany({
    where: {
      schoolId: opts.schoolId,
      admissionNo: { in: opts.studentAdmissionNos },
    },
  });

  const parent = await prisma.user.create({
    data: {
      schoolId: opts.schoolId,
      email,
      passwordHash: await hashPassword(opts.password),
      userType: "PARENT",
      firstName: opts.firstName,
      lastName: opts.lastName,
      phone: opts.phone || null,
      emailVerified: true, // created by the school, no email round-trip
    },
  });

  if (students.length > 0) {
    await prisma.studentGuardian.createMany({
      data: students.map((s) => ({
        schoolId: opts.schoolId,
        studentId: s.id,
        parentId: parent.id,
        parentName: `${opts.firstName} ${opts.lastName}`.trim(),
      })),
    });
  }
  return { id: parent.id, linked: students.length };
}

export async function listParents(schoolId: string) {
  const parents = await prisma.user.findMany({
    where: { schoolId, userType: "PARENT" },
    orderBy: { createdAt: "desc" },
    include: {
      guardianships: { include: { student: { select: { admissionNo: true, firstName: true, lastName: true } } } },
    },
    take: 200,
  });
  return parents.map((p) => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    email: p.email,
    phone: p.phone,
    children: p.guardianships.map((g) => g.student),
  }));
}

export async function distinctClassIds(schoolId: string): Promise<string[]> {
  const rows = await prisma.student.findMany({
    where: { schoolId, classId: { not: null } },
    select: { classId: true },
    distinct: ["classId"],
    take: 200,
  });
  return rows.map((r) => r.classId as string).sort();
}

export async function findParentByPhone(
  schoolId: string,
  phone: string
): Promise<string | null> {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 9) return null;
  const tail = digits.slice(-9);
  const candidates = await prisma.user.findMany({
    where: { schoolId, userType: "PARENT", phone: { not: null } },
    select: { id: true, phone: true },
  });
  const hit = candidates.find((c) =>
    (c.phone ?? "").replace(/\D/g, "").endsWith(tail)
  );
  return hit?.id ?? null;
}

// ─── Teacher scoping (assignment-driven) ───
// A teacher login links to a Teacher row via Teacher.userId; every class,
// student, and thread they see resolves through TeacherAssignment. No row =
// no scope (never fall back to whole-school access).

export type TeacherScope = {
  teacherId: string;
  firstName: string | null;
  lastName: string | null;
  classes: { classId: string; learningAreas: string[]; roles: string[] }[];
  classIds: string[];
  isClassTeacher: boolean;
};

// Resolved from managed Teaching/ClassTeacher assignments (see
// lib/academics/structure). Same shape as before so all consumers keep
// working; extra grade/stream ids ride along where available.
export async function teacherScope(
  schoolId: string,
  userId: string
): Promise<TeacherScope | null> {
  const rich = await richTeacherScope(schoolId, userId);
  if (!rich) return null;
  return {
    teacherId: rich.teacherId,
    firstName: rich.firstName,
    lastName: rich.lastName,
    classes: rich.classes.map((c) => ({
      classId: c.classId,
      learningAreas: c.learningAreas,
      roles: c.roles,
    })),
    classIds: rich.classIds,
    isClassTeacher: rich.isClassTeacher,
  };
}

export async function teacherStudents(schoolId: string, classIds: string[]) {
  if (classIds.length === 0) return [];
  return prisma.student.findMany({
    where: { schoolId, classId: { in: classIds } },
    orderBy: [{ classId: "asc" }, { firstName: "asc" }],
    take: 500,
  });
}
