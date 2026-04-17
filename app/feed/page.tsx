import { redirect } from 'next/navigation';

// The feed has moved to the root route "/"
export default function FeedRedirect() {
  redirect('/');
}
