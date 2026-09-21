import { redirect } from 'next/navigation';

// Baggage is a purchasable extra rather than a page of its own, so this route
// forwards to the baggage section of the services page.
export default function BaggagePage() {
  redirect('/dich-vu?service=baggage');
}
