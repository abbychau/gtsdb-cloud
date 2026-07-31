import { MarketingHeader } from "@/components/layout/marketing-header";
import { MarketingFooter } from "@/components/layout/marketing-footer";
import { PricingSection } from "@/components/landing/pricing-section";
import { Faq } from "@/components/landing/faq";
import { Cta } from "@/components/landing/cta";

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex-1">
        <PricingSection />
        <Faq />
        <Cta />
      </main>
      <MarketingFooter />
    </div>
  );
}
