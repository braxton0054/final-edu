import ResetPasswordForm from "./ResetPasswordForm";

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  return <ResetPasswordForm searchParams={searchParams} />;
}
