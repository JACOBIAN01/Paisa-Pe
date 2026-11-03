import { Redirect } from 'expo-router';
import { useAuthState } from '@pp/svc-auth';

export default function Index() {
  const auth = useAuthState();
  return <Redirect href={auth.activeUserId ? '/home' : '/welcome'} />;
}
