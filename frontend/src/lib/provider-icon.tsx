'use client';

import React from 'react';

export type CloudProvider = 'AWS' | 'AZURE' | 'GCP' | 'MULTI';

interface ProviderIconProps {
  provider: CloudProvider | string;
  size?: number;
  className?: string;
}

/**
 * Brand-colored provider glyph. Uses compact vector approximations of the
 * AWS smile, Azure diamond, and GCP circle palettes.
 */
export function ProviderIcon({ provider, size = 16, className = '' }: ProviderIconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    className,
  };

  switch (provider) {
    case 'AWS':
      return (
        <svg {...common}>
          <path
            d="M6 15.5c3.4 2.6 8.6 2.9 12.3.6l.7 1.1c-3.9 2.7-9.7 2.4-13.4-.6L6 15.5z"
            fill="#FF9900"
          />
          <path
            d="M17.6 15.9c.7-.8 1.9-.5 2.2.4.3 1-.5 1.9-1.4 1.7l-.8-2.1z"
            fill="#FF9900"
          />
          <path
            d="M12.6 12.3c0-.7.2-1.2.6-1.9.5-.7 1.3-1.4 2.1-2.1-.7-.9-1.1-1.7-1.1-2.6 0-1.7 1.3-3 3.2-3 .6 0 1.2.1 1.7.4l-.5 1.7c-.4-.2-.7-.3-1.1-.3-.7 0-1.2.4-1.2 1.1 0 .6.3 1 .9 1.7l.5.6c.9 1 1.5 1.9 1.5 3.1 0 1.9-1.5 3.2-3.5 3.2-1.7 0-3.1-.9-3.1-1.9z"
            fill="#FF9900"
          />
          <path
            d="M6.4 11.2c-.4-.5-.7-1-.7-1.7 0-1.7 1.3-2.9 3.3-2.9.9 0 1.7.2 2.4.5l-.5 1.6c-.5-.2-.9-.3-1.3-.3-.8 0-1.3.4-1.3 1 0 .4.2.7.6 1.2l.4.5c.6.7 1 1.4 1 2.3 0 1.5-1.2 2.6-3 2.6-.9 0-1.7-.2-2.4-.6l.5-1.6c.5.3 1 .4 1.5.4.6 0 1-.3 1-.9 0-.3-.1-.6-.5-1l-.1-.1z"
            fill="#FF9900"
          />
        </svg>
      );
    case 'AZURE':
      return (
        <svg {...common}>
          <defs>
            <linearGradient id="az-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4FC3F7" />
              <stop offset="100%" stopColor="#0288D1" />
            </linearGradient>
          </defs>
          <path d="M13.2 3 6 17.4h4.6L21 3h-7.8z" fill="url(#az-grad)" />
          <path d="M9.5 9.8 3 19.1h8.2l1.9-3.7-3.6-5.6z" fill="#29B6F6" />
        </svg>
      );
    case 'GCP':
      return (
        <svg {...common}>
          <path
            d="M12 10.2V14h5.2c-.3 1.3-1.7 3.9-5.2 3.9-3.1 0-5.7-2.6-5.7-5.9S8.9 6.1 12 6.1c1.8 0 3 .8 3.6 1.4l2.5-2.4C16.5 3.6 14.5 2.7 12 2.7 6.9 2.7 2.8 6.9 2.8 12S6.9 21.3 12 21.3c5.3 0 8.8-3.7 8.8-9 0-.6-.1-1.1-.2-1.6L12 10.2z"
            fill="#4285F4"
          />
          <path
            d="M12 10.2V14h5.2c-.2 1-1.2 2.9-3.4 3.6l2.8 2.2c1.7-1.5 3.2-3.8 3.2-7.1 0-.6-.1-1.1-.2-1.6L12 10.2z"
            fill="#34A853"
            opacity="0.9"
          />
        </svg>
      );
    case 'MULTI':
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="3" fill="#FF9900" />
          <circle cx="16" cy="8" r="3" fill="#4FC3F7" />
          <circle cx="12" cy="16" r="3" fill="#4285F4" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" fill="#64748B" />
        </svg>
      );
  }
}
