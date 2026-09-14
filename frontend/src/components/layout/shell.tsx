'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { AppShell } from '../cerebro/app-shell';
import { ToastProvider } from '../cerebro/ui-kit';

/** Routes that render their own chrome (marketing + auth pages) */
const FULL_PAGE_ROUTES = ['/', '/login', '/register'];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Marketing/landing pages render without the app navbar/sidebar
  if (FULL_PAGE_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  // cloudweave app shell (persistent across all platform sections)
  return (
    <ToastProvider>
      <AppShell>{children}</AppShell>
    </ToastProvider>
  );
}
