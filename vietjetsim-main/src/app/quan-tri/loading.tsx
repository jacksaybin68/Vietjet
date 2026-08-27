'use client';

import React from 'react';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      {/* Fast skeleton - minimal render */}
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-stone-200 animate-pulse" />
        <div className="w-32 h-3 bg-stone-100 rounded animate-pulse" />
      </div>
    </div>
  );
}
