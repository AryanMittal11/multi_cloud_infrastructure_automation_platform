'use client';

import React from 'react';
import { LandingNav } from '../components/marketing/LandingNav';
import { Hero } from '../components/marketing/Hero';
import { Features, DesignerShowcase, Pipeline, Integrations } from '../components/marketing/Features';
import { Testimonials, FAQ, FinalCTA, Footer } from '../components/marketing/Closing';

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#05070d] text-slate-100 overflow-x-clip">
      <LandingNav />
      <Hero />
      <Features />
      <DesignerShowcase />
      <Pipeline />
      <Integrations />
      <Testimonials />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  );
}
