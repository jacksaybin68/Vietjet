import React from 'react';

interface MascotProps {
  /**
   * Text rendered in the speech bubble next to the character. Pass `null` to show
   * the mascot on its own (used inside the chat panel's welcome state).
   */
  greeting?: string | null;
  /** Sizing classes for the drawing, e.g. `h-24 sm:h-32`. */
  className?: string;
}

/**
 * The Vietjet support mascot as a self-contained inline SVG.
 *
 * vietjetair.com serves the 3D character as a bitmap from the WorldFone chat CDN;
 * we redraw it instead so the launcher stays crisp at any size, renders offline
 * and needs no extra remote image host. Purely decorative — the clickable
 * behaviour lives on the launcher button in `UserChat`.
 */
export default function Mascot({ greeting = 'Xin chào!', className = 'h-24' }: MascotProps) {
  return (
    <span className={`relative flex items-end ${className}`}>
      {greeting ? (
        <span className="absolute bottom-[46%] right-[86%] hidden whitespace-nowrap rounded-2xl rounded-br-[5px] bg-white px-3 py-1.5 text-[13px] font-bold text-navy shadow-[0_6px_18px_rgba(0,0,0,0.16)] ring-1 ring-black/5 sm:block">
          {greeting}
        </span>
      ) : null}

      <svg
        viewBox="0 0 140 172"
        className="chat-mascot block h-full w-auto drop-shadow-[0_10px_18px_rgba(0,0,0,0.18)]"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <clipPath id="vj-chat-mascot-torso">
            <rect x="40" y="98" width="60" height="58" rx="22" />
          </clipPath>
        </defs>

        {/* Waving arms — drawn first so the shoulders tuck behind the torso. */}
        <g stroke="#EC2029" strokeWidth="15" strokeLinecap="round" fill="none">
          <path d="M50 118 L20 92" />
          <path d="M88 118 L124 132" />
        </g>
        <circle cx="18" cy="90" r="9" fill="#4F4F4F" />
        <circle cx="127" cy="133" r="9" fill="#4F4F4F" />

        {/* Feet */}
        <rect x="46" y="142" width="22" height="26" rx="9" fill="#C81E26" />
        <rect x="72" y="142" width="22" height="26" rx="9" fill="#C81E26" />
        <rect x="43" y="158" width="28" height="13" rx="6.5" fill="#A8141B" />
        <rect x="69" y="158" width="28" height="13" rx="6.5" fill="#A8141B" />

        {/* Red uniform */}
        <rect x="40" y="98" width="60" height="58" rx="22" fill="#EC2029" />
        <g clipPath="url(#vj-chat-mascot-torso)">
          <rect x="40" y="98" width="60" height="11" fill="#FFDD00" />
          <rect x="40" y="109" width="60" height="3" fill="#F9A51A" opacity="0.7" />
          <ellipse cx="95" cy="130" rx="16" ry="26" fill="#000000" opacity="0.07" />
        </g>
        <path
          d="M74 126 q11 2 14 9"
          stroke="#FFFFFF"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />

        {/* Ears that poke out of the headset */}
        <path d="M44 42 L16 46 L42 64 Z" fill="#EC2029" />
        <path d="M96 42 L124 46 L98 64 Z" fill="#EC2029" />

        {/* Head + headband (the beanie covers the top of the band) */}
        <circle cx="70" cy="64" r="40" fill="#FFF7EF" />
        <ellipse cx="56" cy="42" rx="16" ry="10" fill="#FFFFFF" opacity="0.75" />
        <path
          d="M34 64 C34 24 106 24 106 64"
          stroke="#3A3A3A"
          strokeWidth="7"
          fill="none"
          strokeLinecap="round"
        />
        <rect x="22" y="52" width="18" height="28" rx="9" fill="#3A3A3A" />
        <rect x="100" y="52" width="18" height="28" rx="9" fill="#3A3A3A" />

        {/* Mic boom */}
        <path
          d="M108 78 Q100 94 88 97"
          stroke="#3A3A3A"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
        />
        <circle cx="86" cy="98" r="4.5" fill="#3A3A3A" />

        {/* Face */}
        <path
          d="M52 63 Q58 53 64 63"
          stroke="#2E2E2E"
          strokeWidth="4.5"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M76 63 Q82 53 88 63"
          stroke="#2E2E2E"
          strokeWidth="4.5"
          strokeLinecap="round"
          fill="none"
        />
        <ellipse cx="46" cy="75" rx="7" ry="4.5" fill="#F3A09A" opacity="0.55" />
        <ellipse cx="94" cy="75" rx="7" ry="4.5" fill="#F3A09A" opacity="0.55" />
        <path d="M58 73 Q70 92 82 73 Z" fill="#B3232B" />
        <path d="M64 83 Q70 91 76 83 Z" fill="#EA7378" />

        {/* Beanie */}
        <path d="M38 36 C38 6 102 6 102 36 Z" fill="#8E8E8E" />
        <path d="M46 22 Q70 8 94 22" stroke="#7A7A7A" strokeWidth="3" fill="none" />
        <rect x="34" y="29" width="72" height="13" rx="6.5" fill="#D91A21" />
      </svg>
    </span>
  );
}
