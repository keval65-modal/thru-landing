
import { redirect } from 'next/navigation';

export default function WelcomePage() {
  // The welcome page is now the root page. Redirect any old bookmarks.
  redirect('/'); 
  return null; 
}
