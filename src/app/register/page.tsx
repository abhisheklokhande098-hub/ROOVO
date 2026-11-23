import AuthForm from '@/components/AuthForm';
export default async function Register({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const sp = await searchParams;
  return <AuthForm mode="register" next={sp.as === 'provider' ? '/provider' : undefined} />;
}
