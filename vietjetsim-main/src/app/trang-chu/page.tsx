import React from 'react';
import { Header } from '@/shared/components/navigation';
import { Footer } from '@/shared/components/navigation';
import HeroSection from './components/HeroSection';
import ServiceStripSection from './components/ServiceStripSection';
import SwiftCargoSection from './components/SwiftCargoSection';
import DealsSection from './components/DealsSection';
import AttractiveDestinationsSection from './components/AttractiveDestinationsSection';
import ShoppingSection from './components/ShoppingSection';
import HomepageSections from './components/HomepageSections';

export default function Homepage() {
  return (
    // `<Header />` và `<Footer />` đứng *ngoài* `<main>`: chúng lặp lại trên mọi
    // trang, còn `<main>` chỉ được chứa nội dung riêng của trang này. Đây cũng là
    // điều kiện để skip link ở `src/app/layout.tsx` có tác dụng — trỏ vào
    // `#main-content` phải nhảy *qua* thanh điều hướng, không phải tới nó.
    //
    // Cấu trúc trang chủ bám theo vietjetair.com (đo 13/11/2026): Hero + dải
    // đặt vé → dải thẻ dịch vụ 4 thẻ → Swift 247 → Ưu đãi giá tốt mỗi ngày →
    // Điểm đến → Mua sắm trực tuyến.
    //
    // `HomepageSections` là lớp áp dụng bố cục: khi trình soạn thảo trực quan
    // (`/editor`) đã lưu một bố cục, nó đổi thứ tự và ẩn/hiện các section ở
    // đây. Không có bố cục nào được lưu thì nó render đúng như trước — cùng
    // thứ tự, cùng component, cùng style.
    <div className="min-h-screen bg-[var(--background)] overflow-x-hidden">
      <Header />
      <main id="main-content">
        <HomepageSections
          hero={<HeroSection />}
          serviceStrip={<ServiceStripSection />}
          swiftCargo={<SwiftCargoSection />}
          deals={<DealsSection />}
          destinations={<AttractiveDestinationsSection />}
          shopping={<ShoppingSection />}
        />
      </main>
      <Footer />
    </div>
  );
}
