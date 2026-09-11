import { prisma } from "@mtanda/database";

// Parent-portal reads: children linked to a parent login, each with live fee
// totals. Everything filters by schoolId + parentId — a parent can never see
// another family's students, invoices, or payments.

export type ParentChild = {
  studentId: string;
  admissionNo: string;
  firstName: string | null;
  lastName: string | null;
  classId: string | null;
  relation: string | null;
  invoiced: number;
  paid: number;
  outstanding: number;
};

export async function parentChildren(
  schoolId: string,
  parentUserId: string
): Promise<ParentChild[]> {
  const links = await prisma.studentGuardian.findMany({
    where: { schoolId, parentId: parentUserId },
    include: { student: true },
    orderBy: { createdAt: "asc" },
  });

  return Promise.all(
    links.map(async (link) => {
      const [invoices, payments] = await Promise.all([
        prisma.invoice.aggregate({
          where: { schoolId, studentId: link.studentId, status: { not: "CANCELLED" } },
          _sum: { total: true, balance: true },
        }),
        prisma.payment.aggregate({
          where: { schoolId, studentId: link.studentId, status: "COMPLETED" },
          _sum: { amount: true },
        }),
      ]);
      const invoiced = Number(invoices._sum.total ?? 0);
      const balance = Number(invoices._sum.balance ?? 0);
      return {
        studentId: link.studentId,
        admissionNo: link.student.admissionNo,
        firstName: link.student.firstName,
        lastName: link.student.lastName,
        classId: link.student.classId,
        relation: link.relation,
        invoiced,
        paid: Number(payments._sum.amount ?? 0),
        outstanding: balance,
      };
    })
  );
}

export function childName(c: Pick<ParentChild, "firstName" | "lastName">): string {
  return [c.firstName, c.lastName].filter(Boolean).join(" ") || "Student";
}

export function fmtKES(n: number): string {
  return `KSh ${Math.round(n).toLocaleString()}`;
}
