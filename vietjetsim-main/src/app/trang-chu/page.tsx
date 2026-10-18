import React from 'react';
import { Header } from '@/shared/components/navigation';
import { Footer } from '@/shared/components/navigation';
import HeroSection from './components/HeroSection';
import LargePromoBanners from './components/LargePromoBanners';
import PromotionalBannersSection from './components/PromotionalBannersSection';
import ServiceIconsSection from './components/ServiceIconsSection';
import DealsSection from './components/DealsSection';
import HotDealsSection from './components/HotDealsSection';
import PopularRoutesSection from './components/PopularRoutesSection';
import HowItWorksSection from './components/HowItWorksSection';
import FlyEverywhereSection from './components/FlyEverywhereSection';
import AttractiveDestinationsSection from './components/AttractiveDestinationsSection';
import TravelGuidesSection from './components/TravelGuidesSection';
import FAQSection from './components/FAQSection';
import AwardsSection from './components/AwardsSection';
import StatsSection from './components/StatsSection';

export default function Homepage() {
  return (
    // `<Header />` và `<Footer />` đứng *ngoài* `<main>`: chúng lặp lại trên mọi
    // trang, còn `<main>` chỉ được chứa nội dung riêng của trang này. Đây cũng là
    // điều kiện để skip link ở `src/app/layout.tsx` có tác dụng — trỏ vào
    // `#main-content` phải nhảy *qua* thanh điều hướng, không phải tới nó.
    <div className="min-h-screen bg-[var(--background)] overflow-x-hidden">
      <Header />
      <main id="main-content">
        <HeroSection />
        <ServiceIconsSection />
        <LargePromoBanners />
        <PromotionalBannersSection />
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
      </main>
      <Footer />
    </div>
  );
}
