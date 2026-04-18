'use client';

import Link from 'next/link';
import Icon from '@/components/ui/AppIcon';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen bg-gradient-to-br from-[#1A2948] via-[#1e325a] to-[#EC2029]/20 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 text-center space-y-6 animate-fade-in">
            {/* Error Icon */}
            <div className="flex justify-center">
              <div className="bg-red-50 rounded-full p-6">
                <Icon
                  name="ExclamationTriangleIcon"
                  variant="solid"
                  size={64}
                  className="text-[#EC2029]"
                />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-[#1A2948] font-koho">Đã xảy ra lỗi</h1>

            {/* Description */}
            <p className="text-gray-600 text-base leading-relaxed font-heading-sm">
              Rất tiếc, đã có sự cố xảy ra khi xử lý yêu cầu của bạn. Vui lòng thử lại hoặc quay về
              trang chủ.
            </p>

            {/* Error Code */}
            {error.digest && (
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-500 font-mono font-heading-sm">
                  Mã lỗi: {error.digest}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={reset}
                className="inline-flex items-center justify-center gap-2 bg-[#EC2029] hover:bg-[#d41b23] text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg active:scale-95 font-koho"
              >
                <Icon name="ArrowPathIcon" variant="outline" size={20} />
                Thử lại
              </button>

              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 bg-[#1A2948] hover:bg-[#14203a] text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg active:scale-95 font-koho"
              >
                <Icon name="HomeIcon" variant="outline" size={20} />
                Về trang chủ
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
