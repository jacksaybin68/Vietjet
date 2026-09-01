import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroSection from './components/HeroSection';
import DealsSection from './components/DealsSection';
import PopularRoutesSection from './components/PopularRoutesSection';
import HowItWorksSection from './components/HowItWorksSection';
import StatsSection from './components/StatsSection';
import UserChat from '@/components/chat/UserChat';

export default function Homepage() {
  return (
    <main className="min-h-screen bg-white overflow-x-hidden">
      <Header />
      <HeroSection />
      <DealsSection />
      <PopularRoutesSection />
      <HowItWorksSection />
      <StatsSection />
      <Footer />
      <UserChat />
    </main>
  );
}
