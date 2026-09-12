export * from "./client";
export * from "./tenant";
export * from "./transactions";
export * from "./enrollment";
export * from "./trial";

// Re-export model types used across the app (WhatsApp multi-tenant plumbing
// reads these without importing @prisma/client directly).
export type { WhatsAppConnection, WhatsAppMessage, WhatsAppStatus } from "@prisma/client";
// In-app channel types (conversations, members, messages, guardians).
export type { Conversation, ConversationMember, ConversationMessage, StudentGuardian } from "@prisma/client";
// Teacher scoping type.
export type { TeacherAssignment } from "@prisma/client";
// Academics + per-school payments types.
export type { Assessment, AssessmentScore, AttendanceRecord, SchoolPaymentConfig } from "@prisma/client";
// Academic structure types (grade/stream/assignments/enrollment).
export type {
  AcademicYear,
  Term,
  Grade,
  Stream,
  LearningArea,
  GradeLearningArea,
  StreamLearningArea,
  TeachingAssignment,
  ClassTeacherAssignment,
  Enrollment,
} from "@prisma/client";
