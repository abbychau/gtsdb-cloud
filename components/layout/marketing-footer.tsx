import Link from "next/link";
import { Logo } from "@/components/layout/logo";

const COLUMNS: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Benchmarks", href: "/#benchmarks" },
      { label: "Pricing", href: "/pricing" },
      { label: "Quickstart", href: "/docs" },
    ],
  },
  {
    title: "Developers",
    links: [
      { label: "REST API", href: "/docs#rest" },
      { label: "TCP protocol", href: "/docs#tcp" },
      { label: "Drivers", href: "/docs#drivers" },
      { label: "Data model", href: "/docs#data-model" },
    ],
  },
  {
    title: "Open Source",
    links: [
      { label: "GTSDB (MIT)", href: "https://github.com/abbychau/gtsdb" },
      { label: "GTSDB Cloud", href: "https://github.com/abbychau/gtsdb-cloud" },
      { label: "Homepage", href: "https://github.com/abbychau/gtsdb-homepage" },
      { label: "Admin tool", href: "https://github.com/abbychau/gtsdb-admin" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="container py-12">
        <div className="grid gap-10 md:grid-cols-5">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              The dead simple managed timeseries database. WAL-first storage,
              sub-millisecond reads, and a delightful cloud console.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold">{col.title}</h4>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      target={link.href.startsWith("http") ? "_blank" : undefined}
                      rel={link.href.startsWith("http") ? "noreferrer" : undefined}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} GTSDB Cloud. Built on the MIT-licensed{" "}
          <a
            href="https://github.com/abbychau/gtsdb"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2 hover:text-foreground"
          >
            GTSDB
          </a>{" "}
          engine. Demo platform — not affiliated with Firebase.
        </div>
      </div>
    </footer>
  );
}
