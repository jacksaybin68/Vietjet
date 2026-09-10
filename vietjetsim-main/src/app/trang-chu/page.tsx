import React from 'react';
import { Header } from '@/shared/components/navigation';
import { Footer } from '@/shared/components/navigation';
import HeroSection from './components/HeroSection';
import PromotionalBannersSection from './components/PromotionalBannersSection';
import ServiceIconsSection from './components/ServiceIconsSection';
import DealsSection from './components/DealsSection';
import HotDealsSection from './components/HotDealsSection';
import PopularRoutesSection from './components/PopularRoutesSection';
import HowItWorksSection from './components/HowItWorksSection';
import StatsSection from './components/StatsSection';
import AwardsSection from './components/AwardsSection';
import FlyEverywhereSection from './components/FlyEverywhereSection';
import AttractiveDestinationsSection from './components/AttractiveDestinationsSection';
import TravelGuidesSection from './components/TravelGuidesSection';
import FAQSection from './components/FAQSection';
import { UserChat } from '@/features/chat';
import { Mascot } from '@/shared/components/ui';

export default function Homepage() {
  return (
    <main className="min-h-screen bg-white overflow-x-hidden">
      <Header />
      <HeroSection />
      <PromotionalBannersSection />
      <ServiceIconsSection />
      <DealsSection />
      <HotDealsSection />
      <PopularRoutesSection />
      <HowItWorksSection />
      <FlyEverywhereSection />
      <AttractiveDestinationsSection />
      <TravelGuidesSection />
      <FAQSection />
      <AwardsSection />
      <StatsSection />
      <Footer />
      <UserChat />
      <Mascot />
    </main>
  );
}
