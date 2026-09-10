import React from 'react';

export default function Mascot() {
  return (
    <div className="fixed bottom-10 right-10 z-50 flex items-end gap-2">
      <div className="bg-white rounded-2xl p-4 shadow-lg border border-vjred animate-bounce">
        <p className="text-vjred font-bold">Xin chào!</p>
      </div>
      <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
        {/* Placeholder for 3D Mascot Image */}
        <span>3D</span>
      </div>
    </div>
  );
}
