import React from 'react';
import type { Metadata, Viewport } from 'next';
import '../styles/tailwind.css';
import PageTransition from '@/components/PageTransition';
import { AuthProvider } from '@/contexts/AuthContext';
import NextTopLoader from 'nextjs-toploader';
import NavigationOptimizer from '@/components/NavigationOptimizer';
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#EC2029',
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:4028'),
  title: 'VietjetSim — Đặt Vé Máy Bay Giá Rẻ',
  description:
    'Trình mô phỏng đặt vé máy bay Vietjet Air. Tìm kiếm, đặt chỗ, chọn ghế và thanh toán trực tuyến.',
  openGraph: {
    title: 'VietjetSim — Đặt Vé Máy Bay Giá Rẻ',
    description:
      'Trình mô phỏng đặt vé máy bay Vietjet Air. Tìm kiếm, đặt chỗ, chọn ghế và thanh toán trực tuyến.',
    url: 'http://localhost:4028',
    siteName: 'VietjetSim',
    images: [
      {
        url: 'https://placehold.co/1200x630/EC2029/FFFFFF?text=VietjetSim',
        width: 1200,
        height: 630,
        alt: 'VietjetSim Booking Interface',
      },
    ],
    locale: 'vi_VN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VietjetSim — Đặt Vé Máy Bay Giá Rẻ',
    description:
      'Trình mô phỏng đặt vé máy bay Vietjet Air. Tìm kiếm, đặt chỗ, chọn ghế và thanh toán trực tuyến.',
    images: ['https://placehold.co/1200x630/EC2029/FFFFFF?text=VietjetSim'],
  },
  icons: {
    icon: [{ url: '/favicon.ico', type: 'image/x-icon' }],
    apple: [{ url: '/apple-touch-icon.png' }],
  },
  verification: {
    google: 'your-google-site-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <head>
        {/* KoHo is VietJet's primary body font; Be Vietnam Pro for headings */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,700&family=KoHo:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap"
          rel="stylesheet"
        />

        <script
          type="module"
          async
          src="https://static.rocket.new/rocket-web.js?_cfg=https%3A%2F%2Fvietjetsim1812back.builtwithrocket.new&_be=https%3A%2F%2Fappanalytics.rocket.new&_v=0.1.17"
        />
        <script type="module" defer src="https://static.rocket.new/rocket-shot.js?v=0.0.2" />
      </head>
      <body>
        {/* Rocket Extension message handler - Suppress unknown message type warnings */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
          (function() {
            window.addEventListener('message', function(event) {
              // Rocket Extension sends messages like: { type: 'update-target-url', ... }
              // We acknowledge receipt so the extension doesn't keep retrying
              if (event.data && typeof event.data === 'object' && event.data.type) {
                // Message received - handled gracefully (no action needed)
                // This prevents console warnings about unknown message types
              }
            }, false);
          })();
        `,
          }}
        />
        <NextTopLoader color="#EC2029" showSpinner={false} />
        <NavigationOptimizer />
        <AuthProvider>
          <PageTransition>{children}</PageTransition>
        </AuthProvider>
      </body>
    </html>
  );
}
