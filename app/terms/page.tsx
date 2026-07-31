import Link from "next/link";
import { FileText } from "lucide-react";
import { MarketingHeader } from "@/components/layout/marketing-header";
import { MarketingFooter } from "@/components/layout/marketing-footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const SECTIONS: Array<[string, string]> = [
  [
    "1. Acceptance of terms",
    "By creating an account, accessing, or using GTSDB Cloud (\"the Service\"), you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, please do not use the Service.",
  ],
  [
    "2. The service",
    "GTSDB Cloud is a managed, multi-tenant timeseries database platform. We provide a web console, programmatic APIs (HTTP and TCP), and a shared backend database. We may add, change, or remove features at any time, and we will use reasonable efforts to notify you of material changes.",
  ],
  [
    "3. Accounts and eligibility",
    "You must be at least 18 years old (or the age of majority in your jurisdiction) to use the Service. You are responsible for safeguarding your account credentials and for all activity that occurs under your account. Notify us immediately of any unauthorized use.",
  ],
  [
    "4. Fair use and quotas",
    "Free and paid plans include usage limits (e.g., data points, series, reads/writes per month, and instance counts). We reserve the right to enforce these limits, throttle, or suspend accounts that exceed their plan quotas or that we reasonably believe are abusing the Service.",
  ],
  [
    "5. Your data",
    "You retain all rights to the timeseries data you write to the Service. You are solely responsible for the accuracy, legality, and security of the data you store. You grant us the limited right to process, store, and transmit your data solely to operate and improve the Service.",
  ],
  [
    "6. Acceptable use",
    "You agree not to: attempt to access another tenant's data; reverse engineer, probe, or interfere with the Service; upload malicious content; use the Service to store unlawful material; or resell the Service without our written consent.",
  ],
  [
    "7. Billing and payments",
    "Paid plans are billed in advance on a recurring basis. Charges are non-refundable except where required by law. You are responsible for all taxes. We may change pricing with at least 14 days' notice; continued use after a change constitutes acceptance.",
  ],
  [
    "8. Availability and SLA",
    "We aim for high availability but provide the Service on a best-effort basis. The Service is provided \"as is\" and \"as available\", without warranties of any kind, express or implied. We are not liable for interruptions, data loss, or delays.",
  ],
  [
    "9. Termination",
    "You may stop using the Service at any time. We may suspend or terminate your account for violation of these Terms, abuse, or non-payment. Upon termination, your access ends and we may delete your data after a reasonable grace period.",
  ],
  [
    "10. Limitation of liability",
    "To the maximum extent permitted by law, GTSDB Cloud and its contributors shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, data, or goodwill, arising from your use of the Service.",
  ],
  [
    "11. Changes to these terms",
    "We may revise these Terms from time to time. Material changes will be posted on this page with an updated effective date. Your continued use of the Service after changes take effect constitutes acceptance of the revised Terms.",
  ],
  [
    "12. Contact",
    "Questions about these Terms can be directed to the GTSDB maintainers via the repository or the contact details provided on our website.",
  ],
];

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex-1">
        <div className="container py-16">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <Badge variant="outline" className="mb-3">
                <FileText className="mr-1.5 h-3.5 w-3.5" /> Legal
              </Badge>
              <h1 className="text-4xl font-extrabold tracking-tight">
                Terms of Service
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">
                Last updated: August 1, 2026
              </p>
            </div>
            <Card className="mt-8">
              <CardContent className="space-y-6 py-8">
                {SECTIONS.map(([title, body]) => (
                  <section key={title}>
                    <h2 className="text-sm font-semibold">{title}</h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {body}
                    </p>
                  </section>
                ))}
                <p className="pt-2 text-sm text-muted-foreground">
                  Back to{" "}
                  <Link href="/docs" className="underline underline-offset-2 hover:text-primary">
                    documentation
                  </Link>
                  .
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
