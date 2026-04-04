'use client';

import React from 'react';
import { PopularRoutesSkeleton, DealsSkeleton } from '@/components/ui/SkeletonLoader';

export default function Loading() {
  return (
    <main className="min-h-screen bg-white overflow-x-hidden">
      {/* Header skeleton */}
      <div className="bg-white shadow-sm border-b border-stone-100">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-stone-200 animate-pulse" />
            <div className="w-24 h-4 bg-stone-100 rounded animate-pulse" />
          </div>
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-16 h-3 bg-stone-100 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>

      {/* Hero skeleton */}
      <div className="relative bg-gradient-to-br from-stone-100 to-stone-50 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="w-48 h-8 bg-stone-200 rounded-lg animate-pulse mx-auto" />
          <div className="w-96 h-5 bg-stone-100 rounded animate-pulse mx-auto" />
          <div className="w-80 h-5 bg-stone-100 rounded animate-pulse mx-auto" />
        </div>
      </div>

      {/* Popular routes skeleton */}
      <PopularRoutesSkeleton />
      
      {/* Deals skeleton */}
      <DealsSkeleton />
    </main>
  );
}
