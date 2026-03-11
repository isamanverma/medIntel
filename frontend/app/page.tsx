import LandingNavbar from "@/components/landing/LandingNavbar";
import HeroSection from "@/components/landing/HeroSection";
import WhatWeDoSection from "@/components/landing/WhatWeDoSection";
import CapabilitiesSection from "@/components/landing/CapabilitiesSection";
import AudienceSection from "@/components/landing/AudienceSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import ArchitectureSection from "@/components/landing/ArchitectureSection";
import SecuritySection from "@/components/landing/SecuritySection";
import CtaSection from "@/components/landing/CtaSection";
import LandingFooter from "@/components/landing/LandingFooter";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <LandingNavbar />
      <main className="flex-1">
        <HeroSection />
        <WhatWeDoSection />
        <CapabilitiesSection />
        <AudienceSection />
        <HowItWorksSection />
        <ArchitectureSection />
        <SecuritySection />
        <CtaSection />
      </main>
      <LandingFooter />
    </div>
  );
}
