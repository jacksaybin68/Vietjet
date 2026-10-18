import React from 'react';
import { redirect } from 'next/navigation';
import { Header } from '@/shared/components/navigation';
import ActivityBar from '@/shared/components/navigation/ActivityBar';
import { Footer } from '@/shared/components/navigation';
import { ErrorBoundary } from '@/shared/components/feedback';
import FlightBookingResultsWrapper from './components/FlightBookingResultsWrapper';

export default async function FlightBookingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const hasSearchCriteria = ['from', 'to', 'depart'].every((key) => {
    const value = params[key];
    return typeof value === 'string' && value.trim().length > 0;
  });

  // A direct visit to /tim-ve has no booking criteria yet. Send the user to the
  // homepage form so route, date, passenger count and other options are chosen
  // before results are rendered.
  if (!hasSearchCriteria) redirect('/trang-chu#hero-booking-form');

  const from = typeof params.from === 'string' ? params.from : String(params.from ?? '');
  const to = typeof params.to === 'string' ? params.to : String(params.to ?? '');
  const depart = typeof params.depart === 'string' ? params.depart : String(params.depart ?? '');
  const trip = `${from.toUpperCase()} → ${to.toUpperCase()}`;
  const date = depart
    ? new Date(depart).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '--/--/----';

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Header />
      <ActivityBar />

      <main id="main-content">
        <ErrorBoundary variant="booking">
          <FlightBookingResultsWrapper trip={trip} date={date} />
        </ErrorBoundary>
      </main>

      <Footer />
    </div>
  );
}
