import React from 'react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HeroSection from './trang-chu/components/HeroSection';
import PopularRoutesSection from './trang-chu/components/PopularRoutesSection';
import HowItWorksSection from './trang-chu/components/HowItWorksSection';
import StatsSection from './trang-chu/components/StatsSection';
import DealsSection from './trang-chu/components/DealsSection';
import PromotionalBannersSection from './trang-chu/components/PromotionalBannersSection';
import UserChat from '@/components/chat/UserChat';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white overflow-x-hidden">
      <Header />
      <HeroSection />
      <PromotionalBannersSection />
      <PopularRoutesSection />
      <HowItWorksSection />
      <StatsSection />
      <DealsSection />
      <Footer />
      <UserChat />
    </main>
  );
}
