import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { MarketingHeader } from "@/components/layout/marketing-header";
import { MarketingFooter } from "@/components/layout/marketing-footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const SECTIONS: Array<[string, string]> = [
  [
    "1. Information we collect",
    "We collect account information you provide when you sign up (such as your name and email address via Firebase Authentication), and the timeseries data, series names, and metadata you write to the Service. We also collect limited usage and diagnostic information needed to operate the platform.",
  ],
  [
    "2. Authentication",
    "Sign-in is provided by Firebase Authentication (Google and Email/Password). We do not see or store your password. Google sign-in shares your Google profile name, email, and avatar with us in accordance with Google's own privacy policy.",
  ],
  [
    "3. How we use your information",
    "We use your information to: provide and maintain the Service; authenticate you and scope your data to your account; monitor usage and quotas; diagnose and fix technical issues; and improve the product. We do not sell your personal data.",
  ],
  [
    "4. Your timeseries data",
    "Your timeseries data is stored in our managed database and is only accessible to you (and, where applicable, members of your organization with access). It is used solely to provide the Service to you.",
  ],
  [
    "5. Cookies and analytics",
    "We use cookies and a privacy-respecting analytics service to understand aggregate usage of the console. You can disable cookies in your browser; this may limit some functionality.",
  ],
  [
    "6. Data sharing",
    "We do not share your personal information with third parties except: (a) with service providers who help us operate the Service under confidentiality obligations, (b) to comply with law or legal process, or (c) to protect the rights and safety of the Service and its users.",
  ],
  [
    "7. Data retention",
    "We retain your data for as long as your account is active. If you delete an instance or your account, we will delete the associated data within a reasonable period unless we are required to retain it by law.",
  ],
  [
    "8. Security",
    "We take reasonable technical and organizational measures to protect your data, including tenant isolation between accounts and transport encryption on public endpoints. No method of transmission or storage is 100% secure, and we cannot guarantee absolute security.",
  ],
  [
    "9. Your rights",
    "Depending on your jurisdiction, you may have the right to access, correct, export, or delete your personal data. You can exercise these rights by managing your data in the console or contacting us.",
  ],
  [
    "10. Children",
    "The Service is not directed at children under 13 (or the equivalent minimum age in your jurisdiction). We do not knowingly collect personal information from children.",
  ],
  [
    "11. Changes to this policy",
    "We may update this Privacy Policy from time to time. Material changes will be posted on this page with an updated effective date. We encourage you to review it periodically.",
  ],
  [
    "12. Contact",
    "For privacy questions, please reach out to the GTSDB maintainers through the repository or the contact details provided on our website.",
  ],
];

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex-1">
        <div className="container py-16">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <Badge variant="outline" className="mb-3">
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Legal
              </Badge>
              <h1 className="text-4xl font-extrabold tracking-tight">
                Privacy Policy
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
