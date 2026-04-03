'use client';

import React, { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

// Define the ordered flow for directional slide transitions
const ROUTE_ORDER: Record<string, number> = {
  '/homepage': 0,
  '/': 0,
  '/flight-booking': 1,
  '/payment': 2,
  '/confirmation': 3,
};

function getRouteIndex(path: string): number {
  // Match by prefix for nested routes
  for (const [route, idx] of Object.entries(ROUTE_ORDER)) {
    if (path === route || path.startsWith(route + '/')) return idx;
  }
  return -1;
}

type TransitionStage =
  | 'enter-forward'
  | 'exit-forward'
  | 'enter-back'
  | 'exit-back'
  | 'enter-fade'
  | 'exit-fade'
  | 'idle';

interface PageTransitionProps {
  children: React.ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [stage, setStage] = useState<TransitionStage>('idle');
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (prevPathname.current === pathname) {
      setDisplayChildren(children);
      return;
    }

    const prevIdx = getRouteIndex(prevPathname.current);
    const nextIdx = getRouteIndex(pathname);

    let exitStage: TransitionStage;
    let enterStage: TransitionStage;

    if (prevIdx === -1 || nextIdx === -1) {
      // Unknown route — use fade
      exitStage = 'exit-fade';
      enterStage = 'enter-fade';
    } else if (nextIdx > prevIdx) {
      // Moving forward in the flow
      exitStage = 'exit-forward';
      enterStage = 'enter-forward';
    } else {
      // Moving backward
      exitStage = 'exit-back';
      enterStage = 'enter-back';
    }

    setStage(exitStage);

    const exitDuration = 220;
    const timeout = setTimeout(() => {
      prevPathname.current = pathname;
      setDisplayChildren(children);
      setStage(enterStage);

      // Reset to idle after enter animation completes
      const enterTimeout = setTimeout(() => setStage('idle'), 300);
      return () => clearTimeout(enterTimeout);
    }, exitDuration);

    return () => clearTimeout(timeout);
  }, [pathname, children]);

  const stageClass: Record<TransitionStage, string> = {
    idle: '',
    'enter-forward': 'page-enter-forward',
    'exit-forward': 'page-exit-forward',
    'enter-back': 'page-enter-back',
    'exit-back': 'page-exit-back',
    'enter-fade': 'page-enter-fade',
    'exit-fade': 'page-exit-fade',
  };

  return <div className={`page-transition ${stageClass[stage]}`}>{displayChildren}</div>;
}
