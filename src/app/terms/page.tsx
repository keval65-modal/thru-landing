
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-background p-4">
      <div className="w-full max-w-2xl">
        <Link href="/signup" legacyBehavior passHref>
          <Button variant="ghost" size="icon" className="absolute top-6 left-4 md:top-8 md:left-6">
            <ChevronLeft className="h-6 w-6" />
          </Button>
        </Link>
        <div className="mt-16 md:mt-20">
            <h1 className="text-3xl font-bold text-foreground mb-6 text-center">Terms and Conditions</h1>
            <div className="space-y-4 text-muted-foreground">
                <p>Welcome to Thru!</p>
                <p>These terms and conditions outline the rules and regulations for the use of Thru's Website and Mobile Application.</p>
                <p>By accessing this app we assume you accept these terms and conditions. Do not continue to use Thru if you do not agree to take all of the terms and conditions stated on this page.</p>
                
                <h2 className="text-xl font-semibold text-foreground pt-4">Cookies</h2>
                <p>We employ the use of cookies. By accessing Thru, you agreed to use cookies in agreement with the Thru's Privacy Policy.</p>
                
                <h2 className="text-xl font-semibold text-foreground pt-4">License</h2>
                <p>Unless otherwise stated, Thru and/or its licensors own the intellectual property rights for all material on Thru. All intellectual property rights are reserved. You may access this from Thru for your own personal use subjected to restrictions set in these terms and conditions.</p>
                <p>You must not:</p>
                <ul className="list-disc list-inside ml-4">
                    <li>Republish material from Thru</li>
                    <li>Sell, rent or sub-license material from Thru</li>
                    <li>Reproduce, duplicate or copy material from Thru</li>
                    <li>Redistribute content from Thru</li>
                </ul>
                <p>This Agreement shall begin on the date hereof.</p>

                <h2 className="text-xl font-semibold text-foreground pt-4">User Comments</h2>
                <p>Parts of this app offer an opportunity for users to post and exchange opinions and information in certain areas of the website. Thru does not filter, edit, publish or review Comments prior to their presence on the website. Comments do not reflect the views and opinions of Thru,its agents and/or affiliates. Comments reflect the views and opinions of the person who post their views and opinions.</p>
                {/* Add more sections as needed */}

                <p className="pt-6">Please review these terms periodically. Your continued use of the Service after such modifications will constitute your acknowledgment of the modified Terms and agreement to abide and be bound by the modified Terms.</p>
            </div>
        </div>
         <div className="mt-8 text-center">
            <Button asChild>
                <Link href="/signup">Back to Sign Up</Link>
            </Button>
        </div>
      </div>
    </div>
  );
}
