import AuthForm from '@/components/AuthForm';
export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; registered?: string; confirmed?: string; reset?: string; error?: string }> }) {
  const sp = await searchParams;
  const notice = sp.reset ? 'Password updated. Log in with your new password.' : sp.confirmed ? 'Email confirmed. You can log in now.'
    : sp.registered ? 'Account created. Check your email for a confirmation link, then log in.' : sp.error === 'link' ? 'That link has expired or was already used. Please try again.' : undefined;
  return <AuthForm mode="login" next={sp.next} notice={notice} />;
}
