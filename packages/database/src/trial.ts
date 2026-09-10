// Trial lifecycle: 90-day addiction window, then convert or suspend.
// Day 75  → reminder email (15 days left, margin math)
// Day 90  → subscription EXPIRED + school SUSPENDED (graceful cutoff)
// Day 120 → tenant data deleted if never paid (30 days after non-payment)

export const TRIAL_DAYS = 90;
export const REMINDER_DAYS_LEFT = 15;
export const DELETION_GRACE_DAYS = 30;

export function daysLeft(periodEnd: Date, now: Date = new Date()): number {
  return Math.ceil((periodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
}

export function needsReminder(periodEnd: Date, now: Date = new Date()): boolean {
  const left = daysLeft(periodEnd, now);
  return left <= REMINDER_DAYS_LEFT && left > 0;
}

export function isExpired(periodEnd: Date, now: Date = new Date()): boolean {
  return periodEnd.getTime() <= now.getTime();
}

export function deletionDue(
  periodEnd: Date,
  now: Date = new Date(),
  everPaid: boolean
): boolean {
  if (everPaid) return false;
  return now.getTime() - periodEnd.getTime() > DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000;
}
