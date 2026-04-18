'use client';

import React from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 font-body">
      {/* Hero Section */}
      <div
        className="relative py-24 px-4 text-center text-white overflow-hidden"
        style={{
          background: 'linear-gradient(20.12deg, rgba(217,26,33,1) 19.6%, rgba(111,0,0,1) 93.86%)',
        }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-40 h-40 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-56 h-56 bg-[#FFD400] rounded-full blur-3xl"></div>
        </div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-sm mb-6">
            <Icon name="InformationCircleIcon" size={16} />
            <span className="text-xs font-semibold tracking-wider uppercase">Giới thiệu</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 font-body">Về Vietjet Air</h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
            Hệ thống đặt vé máy bay hàng đầu Việt Nam, mang đến trải nghiệm đặt vé chân thực, hiện
            đại và trực quan.
          </p>
          <Link
            href="/homepage"
            className="inline-flex items-center gap-2 mt-8 px-6 py-3 rounded-lg bg-[#FFD400] text-[#1A2948] font-bold hover:bg-[#FFE033] transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <Icon name="ArrowLeftIcon" size={18} />
            Quay lại trang chủ
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-16 -mt-10 relative z-20">
        {/* About Card */}
        <div className="bg-white rounded-2xl shadow-vj-lg p-8 md:p-12 mb-12">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <h2 className="text-2xl font-bold text-[#1A2948] mb-4 font-heading-800">
                Sứ mệnh của chúng tôi
              </h2>
              <p className="text-[#333333] leading-relaxed mb-4">
                Vietjet Air được phát triển như một nền tảng toàn diện cho quy trình đặt vé máy bay
                nội địa và quốc tế. Chúng tôi giúp người dùng thực hiện các bước đặt vé, chọn ghế,
                thanh toán và quản lý hành trình một cách trực quan nhất.
              </p>
              <p className="text-[#6D6E71] leading-relaxed">
                Dù bạn là hành khách lần đầu đặt vé hay chuyên gia du lịch, Vietjet Air cung cấp
                công cụ mạnh mẽ để trải nghiệm quy trình booking chuyên nghiệp, nhanh chóng và an
                toàn.
              </p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-yellow-50 rounded-xl p-6 border border-red-100">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Chuyến bay', value: '150+', icon: 'PaperAirplaneIcon' },
                  { label: 'Điểm đến', value: '50+', icon: 'MapPinIcon' },
                  { label: 'Người dùng', value: '10K+', icon: 'UsersIcon' },
                  { label: 'Hài lòng', value: '99%', icon: 'StarIcon' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white rounded-lg p-4 text-center shadow-sm">
                    <div className="text-[#EC2029] mb-2 flex justify-center">
                      <Icon name={stat.icon as any} size={24} />
                    </div>
                    <div className="text-2xl font-extrabold text-[#1A2948]">{stat.value}</div>
                    <div className="text-xs text-[#6D6E71] font-medium">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-[#1A2948] mb-8 text-center font-heading-800">
            Công nghệ sử dụng
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { name: 'Next.js 15', desc: 'React Framework', color: '#000000' },
              { name: 'React 19', desc: 'UI Library', color: '#61DAFB' },
              { name: 'TypeScript', desc: 'Type Safety', color: '#3178C6' },
              { name: 'Tailwind CSS', desc: 'Styling', color: '#06B6D4' },
              { name: 'Supabase', desc: 'Backend & DB', color: '#3ECF8E' },
            ].map((tech, i) => (
              <div
                key={i}
                className="bg-white rounded-xl p-5 shadow-vj-sm hover:shadow-vj-md transition-all duration-300 border border-gray-100 group"
              >
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-3 mx-auto group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: `${tech.color}15` }}
                >
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tech.color }} />
                </div>
                <h3 className="text-sm font-bold text-[#1A2948] text-center mb-1">{tech.name}</h3>
                <p className="text-xs text-[#6D6E71] text-center">{tech.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Team & Acknowledgments */}
        <div className="bg-[#1A2948] rounded-2xl p-8 md:p-12 text-white">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold mb-3 font-heading-800">Đội ngũ phát triển</h2>
            <p className="text-white/70 max-w-xl mx-auto">
              Được xây dựng bởi đội ngũ kỹ sư đam mê công nghệ và hàng không, mang đến giải pháp mô
              phỏng tiên tiến.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { role: 'Frontend Lead', name: 'Nguyễn Văn A', desc: 'Next.js, React, Tailwind' },
              { role: 'Backend Lead', name: 'Trần Thị B', desc: 'Supabase, API, Database' },
              { role: 'UI/UX Designer', name: 'Lê Văn C', desc: 'Figma, Design System' },
            ].map((member, i) => (
              <div
                key={i}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/10 hover:bg-white/15 transition-colors"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#EC2029] to-[#FFD400] mx-auto mb-4 flex items-center justify-center text-xl font-bold">
                  {member.name.charAt(0)}
                </div>
                <h3 className="text-lg font-bold text-center mb-1">{member.name}</h3>
                <p className="text-[#FFD400] text-sm font-semibold text-center mb-2">
                  {member.role}
                </p>
                <p className="text-white/60 text-xs text-center">{member.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 pt-6 border-t border-white/10 text-center">
            <p className="text-sm text-white/70">
              Cảm ơn <span className="text-[#FFD400] font-semibold">Vietjet Air</span> vì cảm hứng
              thiết kế và{' '}
              <span className="text-[#FFD400] font-semibold">cộng đồng mã nguồn mở</span> vì các
              công cụ tuyệt vời.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
