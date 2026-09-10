'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/shared/components/ui';

interface ServiceItem {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  price: string;
  priceNote: string;
  features: string[];
}

const SERVICES: ServiceItem[] = [
  {
    id: 'baggage',
    icon: 'BriefcaseIcon',
    title: 'Hành lý ký gửi',
    subtitle: 'Checked Baggage',
    description: 'Mua trước hành lý ký gửi trực tuyến để tiết kiệm chi phí so với mua tại sân bay.',
    price: '165.000₫',
    priceNote: 'Từ 15kg',
    features: [
      'Tiết kiệm đến 20% so với mua tại sân bay',
      'Chọn gói 15kg, 20kg, 30kg hoặc 40kg',
      'Miễn phí cân quá tải 1kg',
      'Theo dõi hành lý realtime',
    ],
  },
  {
    id: 'meal',
    icon: 'CakeIcon',
    title: 'Đặt trước bữa ăn',
    subtitle: 'Pre-order Meals',
    description: 'Chọn trước suất ăn yêu thích trên chuyến bay. Đa dạng món Á - Âu tươi ngon.',
    price: '85.000₫',
    priceNote: 'Từ 1 suất',
    features: [
      'Thực đơn đa dạng: Việt, Á, Âu, Chay',
      'Đặt trước ít nhất 24 giờ trước bay',
      'Ưu tiên phục vụ trước trên máy bay',
      'Có suất ăn đặc biệt (trẻ em, dị ứng)',
    ],
  },
  {
    id: 'seat',
    icon: 'TicketIcon',
    title: 'Chọn chỗ ngồi',
    subtitle: 'Seat Selection',
    description: 'Chọn vị trí ghế yêu thích: cạnh cửa sổ, lối đi, hoặc hàng đầu tiên rộng rãi.',
    price: '50.000₫',
    priceNote: 'Từ 1 chỗ',
    features: [
      'Ghế thường: 50.000₫ - 80.000₫',
      'Ghế rộng (hàng đầu): 150.000₫ - 250.000₫',
      'Ghế SkyBoss: 450.000₫ - 650.000₫',
      'Xem trước sơ đồ ghế trực quan',
    ],
  },
  {
    id: 'insurance',
    icon: 'ShieldCheckIcon',
    title: 'Bảo hiểm du lịch',
    subtitle: 'Travel Insurance',
    description: 'Bảo vệ chuyến đi toàn diện với bảo hiểm du lịch trong nước và quốc tế.',
    price: '49.000₫',
    priceNote: 'Từ 1 lượt',
    features: [
      'Bồi thường tối đa 500.000.000₫',
      'Bảo hiểm y tế & tai nạn',
      'Hỗ trợ hoãn/hủy chuyến bay',
      'Hỗ trợ mất hành lý & giấy tờ',
    ],
  },
  {
    id: 'priority',
    icon: 'BoltIcon',
    title: 'Check-in ưu tiên',
    subtitle: 'Priority Check-in',
    description: 'Bỏ qua hàng đợi với quầy check-in ưu tiên riêng và lên máy bay trước.',
    price: '99.000₫',
    priceNote: 'Mỗi lượt',
    features: [
      'Quầy check-in riêng VIP',
      'Lên máy bay ưu tiên nhóm 1',
      'Hành lý ký gửi ưu tiên trả trước',
      'Lối đi riêng tại sân bay (tùy sân bay)',
    ],
  },
  {
    id: 'lounge',
    icon: 'SparklesIcon',
    title: 'Phòng chờ thương gia',
    subtitle: 'Business Lounge',
    description: 'Thư giãn trước chuyến bay tại phòng chờ thương gia với đồ ăn thức uống miễn phí.',
    price: '350.000₫',
    priceNote: 'Mỗi lượt',
    features: [
      'Đồ ăn & thức uống miễn phí',
      'WiFi tốc độ cao & ổ sạc',
      'Phòng tắm & khu nghỉ ngơi',
      'Thông báo lên máy bay riêng',
    ],
  },
];

export default function ServicesPage() {
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const handleQuantityChange = (id: string, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 1) + delta),
    }));
  };

  const selected = SERVICES.find((s) => s.id === selectedService);

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-r from-[var(--vj-red)] via-[var(--vj-red-dark)] to-[var(--vj-red)]">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
            }}
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:py-20 text-center">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Icon name="Squares2X2Icon" size={32} className="text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 font-heading-sm">
            Dịch Vụ Chuyến Bay
          </h1>
          <p className="text-white/70 text-base sm:text-lg max-w-2xl mx-auto font-koho">
            Nâng cao trải nghiệm bay với các dịch vụ bổ trợ đa dạng và tiện ích
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-semibold transition-all border border-white/20"
          >
            <Icon name="ArrowLeftIcon" size={16} />
            Quay lại trang chủ
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-10">
        {/* Services Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          {SERVICES.map((service) => (
            <button
              key={service.id}
              onClick={() => setSelectedService(service.id)}
              className={`text-left bg-[var(--surface)] rounded-2xl border-2 border-[var(--border)] overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 ${
                selectedService === service.id ? 'ring-2 ring-[var(--vj-yellow)] border-[var(--vj-yellow)]' : ''
              }`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-[var(--vj-red)]/10">
                    <Icon name={service.icon} size={24} className="text-[var(--vj-red)]" />
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 rounded-full bg-[var(--vj-yellow)]/25 text-[var(--vj-red)]">
                    {service.price}
                  </span>
                </div>
                <h3 className="font-bold text-[var(--foreground)] text-base mb-0.5">{service.title}</h3>
                <p className="text-xs text-[var(--foreground-subtle)] mb-2">{service.subtitle}</p>
                <p className="text-sm text-[var(--foreground-muted)] line-clamp-2">{service.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Selected Service Detail */}
        {selected && (
          <div
            className="bg-[var(--surface)] rounded-2xl border-2 border-[var(--vj-yellow)]/40 overflow-hidden shadow-sm mb-10"
          >
            {/* Detail Header */}
            <div className="p-6 sm:p-8 bg-[var(--vj-red)]/5">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 bg-[var(--vj-red)]/10">
                  <Icon name={selected.icon} size={28} className="text-[var(--vj-red)]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-black text-[var(--foreground)]">{selected.title}</h2>
                  <p className="text-sm text-[var(--foreground-subtle)] mt-1">{selected.description}</p>
                </div>
              </div>
            </div>

            {/* Features & Pricing */}
            <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Features */}
              <div>
                <h3 className="text-sm font-bold text-[var(--foreground-subtle)] uppercase tracking-wider mb-3">
                  Tính năng nổi bật
                </h3>
                <ul className="space-y-2.5">
                  {selected.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-[var(--foreground)]">
                      <Icon name="CheckCircleIcon" size={18} className="flex-shrink-0 mt-0.5 text-[var(--vj-red)]" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Pricing & Quantity */}
              <div>
                <h3 className="text-sm font-bold text-[var(--foreground-subtle)] uppercase tracking-wider mb-3">
                  Giá & Số lượng
                </h3>
                <div className="bg-[var(--vj-sky)] rounded-xl p-4 border border-[var(--border)]">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[var(--foreground-muted)] text-sm">Đơn giá</span>
                    <div>
                      <span className="text-xl font-black text-[var(--vj-red)]">
                        {selected.price}
                      </span>
                      <span className="text-xs text-[var(--foreground-subtle)] ml-1">/ {selected.priceNote}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--foreground-muted)] text-sm">Số lượng</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleQuantityChange(selected.id, -1)}
                        className="w-8 h-8 rounded-lg bg-white border border-[var(--border)] flex items-center justify-center text-[var(--foreground-muted)] hover:border-primary hover:text-primary transition-colors"
                      >
                        <Icon name="MinusIcon" size={14} />
                      </button>
                      <span className="w-8 text-center font-bold text-[var(--foreground)]">
                        {quantities[selected.id] || 1}
                      </span>
                      <button
                        onClick={() => handleQuantityChange(selected.id, 1)}
                        className="w-8 h-8 rounded-lg bg-white border border-[var(--border)] flex items-center justify-center text-[var(--foreground-muted)] hover:border-primary hover:text-primary transition-colors"
                      >
                        <Icon name="PlusIcon" size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex gap-3">
                  <Link
                    href="/tim-ve"
                    className="flex-1 py-3 text-center font-black text-[var(--vj-red)] bg-[var(--vj-yellow)] rounded-xl transition-all hover:bg-[var(--vj-yellow-2)]"
                  >
                    Đặt ngay
                  </Link>
                  <button
                    onClick={() => setSelectedService(null)}
                    className="px-4 py-3 bg-white border border-[var(--border)] text-[var(--foreground-muted)] font-semibold rounded-xl hover:border-[var(--foreground-subtle)] transition-colors"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Why Choose Section */}
        <div className="bg-white rounded-2xl border border-[var(--border)] p-6 sm:p-8 mb-10">
          <h2 className="text-xl font-black text-center text-[var(--foreground)] mb-6 font-heading-sm">
            Tại sao nên đặt dịch vụ trước?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: 'BanknotesIcon',
                title: 'Tiết kiệm chi phí',
                desc: 'Giá đặt trước rẻ hơn 15-30% so với mua tại sân bay',
              },
              {
                icon: 'ClockIcon',
                title: 'Tiết kiệm thời gian',
                desc: 'Không phải xếp hàng chờ đợi tại quầy dịch vụ',
              },
              {
                icon: 'ShieldCheckIcon',
                title: 'Đảm bảo có chỗ',
                desc: 'Giữ suất dịch vụ chắc chắn, không lo hết chỗ',
              },
              {
                icon: 'DevicePhoneMobileIcon',
                title: 'Quản lý dễ dàng',
                desc: 'Xem và thay đổi dịch vụ mọi lúc trên ứng dụng',
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 bg-[var(--vj-yellow)]/15">
                  <Icon name={item.icon} size={24} className="text-[var(--vj-red)]" />
                </div>
                <h3 className="font-bold text-[var(--foreground)] text-sm mb-1">{item.title}</h3>
                <p className="text-xs text-[var(--foreground-subtle)]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-gradient-to-r from-[var(--vj-red)] to-[var(--vj-red-dark)] rounded-2xl p-6 sm:p-8 text-center text-white">
          <h2 className="text-xl sm:text-2xl font-black mb-2">Bạn cần hỗ trợ thêm?</h2>
          <p className="text-white/80 text-sm mb-4">
            Liên hệ tổng đài 1900-6886 để được tư vấn dịch vụ phù hợp nhất
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/lien-he"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-[var(--vj-red)] font-bold rounded-xl hover:bg-[var(--surface-2)] transition-colors"
            >
              <Icon name="ChatBubbleLeftRightIcon" size={18} />
              Liên hệ hỗ trợ
            </Link>
            <Link
              href="/hoi-dap"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 text-white font-bold rounded-xl border border-white/30 hover:bg-white/20 transition-colors"
            >
              <Icon name="QuestionMarkCircleIcon" size={18} />
              Câu hỏi thường gặp
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
