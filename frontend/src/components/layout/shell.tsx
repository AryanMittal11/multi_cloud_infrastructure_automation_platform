'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from './navbar';
import { Sidebar } from './sidebar';
import { AppShell } from '../cerebro/app-shell';
import { ToastProvider } from '../cerebro/ui-kit';

/** Routes that render their own chrome (marketing pages) */
const FULL_PAGE_ROUTES = ['/'];

export function Shell({ children }: { children: React.ReactNode }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Marketing/landing pages render without the app navbar/sidebar
  if (FULL_PAGE_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  // New CerebrOps dashboard app shell (persistent across dashboard sections)
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    return (
      <ToastProvider>
        <AppShell>{children}</AppShell>
      </ToastProvider>
    );
  }

  return (
    <div className="min-h-screen text-[var(--ink)] flex flex-col" style={{ background: 'var(--bg)' }}>
      <Navbar
        onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        isMobileSidebarOpen={isMobileSidebarOpen}
      />
      <div className="flex-1 flex">
        <Sidebar
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
