'use client';

import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showFirstLast?: boolean;
  siblingCount?: number;
  className?: string;
}

function generatePageRange(current: number, total: number, siblings: number): (number | '...')[] {
  const totalNumbers = siblings * 2 + 3; // siblings + current + first + last
  const totalBlocks = totalNumbers + 2; // + 2 ellipsis

  if (total <= totalBlocks) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(current - siblings, 1);
  const rightSiblingIndex = Math.min(current + siblings, total);

  const showLeftEllipsis = leftSiblingIndex > 2;
  const showRightEllipsis = rightSiblingIndex < total - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftRange = Array.from({ length: 3 + 2 * siblings }, (_, i) => i + 1);
    return [...leftRange, '...', total];
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const rightRange = Array.from(
      { length: 3 + 2 * siblings },
      (_, i) => total - (3 + 2 * siblings) + 1 + i
    );
    return [1, '...', ...rightRange];
  }

  const middleRange = Array.from(
    { length: rightSiblingIndex - leftSiblingIndex + 1 },
    (_, i) => leftSiblingIndex + i
  );
  return [1, '...', ...middleRange, '...', total];
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showFirstLast = true,
  siblingCount = 1,
  className = '',
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = generatePageRange(currentPage, totalPages, siblingCount);

  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  return (
    <nav
      aria-label="Pagination"
      className={`flex items-center justify-center gap-1 select-none ${className}`}
    >
      {/* First page */}
      {showFirstLast && (
        <button
          onClick={() => onPageChange(1)}
          disabled={!canPrev}
          aria-label="First page"
          className={`
            w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold
            transition-all duration-200
            ${
              !canPrev
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-navy hover:bg-primary/10 hover:text-primary active:scale-95'
            }
          `}
        >
          {/* Double chevron left */}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M9 11L6 8l3-3M5 11L2 8l3-3"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      {/* Prev */}
      <button
        onClick={() => canPrev && onPageChange(currentPage - 1)}
        disabled={!canPrev}
        aria-label="Previous page"
        className={`
          w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold
          transition-all duration-200
          ${
            !canPrev
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-navy hover:bg-primary/10 hover:text-primary active:scale-95'
          }
        `}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M10 12L6 8l4-4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Page numbers */}
      {pages.map((page, idx) =>
        page === '...' ? (
          <span
            key={`ellipsis-${idx}`}
            className="w-9 h-9 flex items-center justify-center text-sm text-gray-400 font-medium"
          >
            ···
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page as number)}
            aria-label={`Page ${page}`}
            aria-current={currentPage === page ? 'page' : undefined}
            className={`
              w-9 h-9 flex items-center justify-center rounded-lg text-sm font-bold
              transition-all duration-200
              ${
                currentPage === page
                  ? 'bg-gradient-to-br from-primary to-primary-dark text-white shadow-vj-btn scale-105 ring-2 ring-primary/30'
                  : 'text-navy hover:bg-primary/10 hover:text-primary active:scale-95'
              }
            `}
          >
            {page}
          </button>
        )
      )}

      {/* Next */}
      <button
        onClick={() => canNext && onPageChange(currentPage + 1)}
        disabled={!canNext}
        aria-label="Next page"
        className={`
          w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold
          transition-all duration-200
          ${
            !canNext
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-navy hover:bg-primary/10 hover:text-primary active:scale-95'
          }
        `}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M6 4l4 4-4 4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* Last page */}
      {showFirstLast && (
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={!canNext}
          aria-label="Last page"
          className={`
            w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold
            transition-all duration-200
            ${
              !canNext
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-navy hover:bg-primary/10 hover:text-primary active:scale-95'
            }
          `}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M7 11l3-3-3-3M11 11l3-3-3-3"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </nav>
  );
}
