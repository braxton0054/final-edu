import RegisterForm from "./RegisterForm";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  return (
    <div>
      <a href="/">← Back home</a>
      <h1>Get started</h1>
      <p>Create your account and your school — no manual setup needed.</p>
      <RegisterForm initialPlan={plan} />
    </div>
  );
}
