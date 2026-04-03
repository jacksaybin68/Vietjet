'use client';

import React from 'react';
import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function BreadcrumbNav({ items, className = '' }: BreadcrumbNavProps) {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center flex-wrap gap-0 ${className}`}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isFirst = index === 0;

        return (
          <React.Fragment key={index}>
            {/* Breadcrumb item */}
            <span
              className={`
                flex items-center gap-1.5 text-sm font-semibold
                transition-colors duration-150
                ${isLast ? 'text-primary cursor-default' : 'text-navy/60 hover:text-navy'}
                ${isFirst ? '' : ''}
              `}
            >
              {item.icon && (
                <span className={`flex-shrink-0 ${isLast ? 'text-primary' : 'text-navy/50'}`}>
                  {item.icon}
                </span>
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="hover:text-navy transition-colors duration-150 underline-offset-2 hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? 'page' : undefined}>{item.label}</span>
              )}
            </span>

            {/* Red accent separator */}
            {!isLast && (
              <span aria-hidden="true" className="mx-2 flex items-center">
                {/* Red chevron separator */}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  className="text-primary opacity-80"
                >
                  <path
                    d="M5 3l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
