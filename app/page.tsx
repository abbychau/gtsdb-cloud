import { MarketingHeader } from "@/components/layout/marketing-header";
import { MarketingFooter } from "@/components/layout/marketing-footer";
import { Hero } from "@/components/landing/hero";
import { Stats } from "@/components/landing/stats";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Benchmarks } from "@/components/landing/benchmarks";
import { PricingSection } from "@/components/landing/pricing-section";
import { Faq } from "@/components/landing/faq";
import { Cta } from "@/components/landing/cta";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex-1">
        <Hero />
        <Stats />
        <Features />
        <HowItWorks />
        <Benchmarks />
        <PricingSection />
        <Faq />
        <Cta />
      </main>
      <MarketingFooter />
    </div>
  );
}
