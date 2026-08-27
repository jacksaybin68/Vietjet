'use client';

import Icon from '@/components/ui/AppIcon';

export default function UserDashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Error Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
          {/* Error Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-red-50 rounded-full p-6">
              <Icon
                name="ExclamationTriangleIcon"
                variant="solid"
                size={48}
                className="text-[#EC2029]"
              />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-[#1A2948] font-koho mb-3">Đã xảy ra lỗi</h2>

          {/* Description */}
          <p className="text-gray-600 mb-4 font-heading-sm">
            Rất tiếc, đã có sự cố xảy ra khi tải dữ liệu. Vui lòng thử lại.
          </p>

          {/* Error Code */}
          {error.digest && (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 mb-6">
              <p className="text-xs text-gray-500 font-mono font-heading-sm">
                Mã lỗi: {error.digest}
              </p>
            </div>
          )}

          {/* Retry Button */}
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 bg-[#EC2029] hover:bg-[#d41b23] text-white font-semibold px-8 py-3 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg active:scale-95 font-koho"
          >
            <Icon name="ArrowPathIcon" variant="outline" size={20} />
            Thử lại
          </button>
        </div>
      </div>
    </div>
  );
}
