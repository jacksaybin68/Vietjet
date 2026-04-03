'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';

export default function NotFound() {
  const router = useRouter();

  const handleGoHome = () => {
    router?.push('/homepage');
  };

  const handleGoBack = () => {
    if (typeof window !== 'undefined') {
      window.history?.back();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4 font-body">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <h1
              className="text-9xl font-black text-primary"
              style={{
                opacity: 0.15,
                fontWeight: 900,
              }}
            >
              404
            </h1>
          </div>
        </div>

        {/* Plane icon */}
        <div className="flex justify-center mb-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{
              background:
                'linear-gradient(20.12deg, rgba(217,26,33,1) 19.6%, rgba(111,0,0,1) 93.86%)',
            }}
          >
            <svg viewBox="0 0 24 24" fill="white" className="w-8 h-8">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
            </svg>
          </div>
        </div>

        <h2
          className="text-2xl font-black mb-2 text-vj-text"
          style={{
            fontWeight: 900,
          }}
        >
          Trang không tìm thấy
        </h2>
        <p className="mb-8 text-vj-gray">
          Trang bạn đang tìm kiếm không tồn tại. Hãy quay lại trang chủ!
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleGoBack}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all hover:opacity-90"
            style={{
              background:
                'linear-gradient(20.12deg, rgba(217,26,33,1) 19.6%, rgba(111,0,0,1) 93.86%)',
              color: 'white',
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(236,32,41,0.28)',
            }}
          >
            <Icon name="ArrowLeftIcon" size={16} />
            Quay lại
          </button>

          <button
            onClick={handleGoHome}
            className="inline-flex items-center justify-center gap-2 border px-6 py-3 rounded-xl font-bold transition-all text-primary"
            style={{
              borderColor: '#EC2029',
              background: 'transparent',
              fontWeight: 700,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#EC2029';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#EC2029';
            }}
          >
            <Icon name="HomeIcon" size={16} />
            Về trang chủ
          </button>
        </div>
      </div>
    </div>
  );
}
