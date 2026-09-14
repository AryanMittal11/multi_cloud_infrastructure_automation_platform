'use client';

import React from 'react';
import { LandingNav } from '../components/marketing/LandingNav';
import { Hero } from '../components/marketing/Hero';
import { Showcase } from '../components/marketing/Showcase';
import { MultiCloud, Designer, Capabilities, TechMarquee } from '../components/marketing/Features';
import { ForTeams, FAQ, FinalCTA, Footer } from '../components/marketing/Closing';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-clip" style={{ background: 'var(--bg)', color: 'var(--ink)' }}>
      <LandingNav />
      <main>
        <Hero />
        <div className="break-section" />
        <Showcase />
        <div className="break-section" />
        <MultiCloud />
        <div className="break-section" />
        <Designer />
        <div className="break-section" />
        <Capabilities />
        <TechMarquee />
        <div className="break-section" />
        <ForTeams />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}
