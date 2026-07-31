import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "What is GTSDB Cloud?",
    a: "GTSDB Cloud is a managed, freemium control plane for the open-source GTSDB timeseries database. It gives you a web console for instances, data exploration, querying and usage analytics — while the underlying GTSDB engine does the heavy lifting of storage and querying.",
  },
  {
    q: "Do I need my own GTSDB server?",
    a: "No. Every instance ships with a built-in simulator so you can explore the entire platform immediately. To ingest real production data, point an instance at a GTSDB server (docker or the single binary) and add its connection token.",
  },
  {
    q: "How does the free tier work?",
    a: "The free tier includes one instance, up to 10 series, and 1M data points per month — no credit card required. When you hit a limit you'll be prompted to upgrade to Pro or Team.",
  },
  {
    q: "What protocols does GTSDB support?",
    a: "GTSDB speaks both HTTP (port 5556) and a JSON-line TCP protocol (port 5555). Both expose the same operations: write, read, batch-write, multi-read, export, data-patch and real-time subscribe.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. GTSDB uses token-based authentication with per-user namespaces. The platform store keeps your instance connection tokens server-side — they are never exposed to the browser.",
  },
  {
    q: "Can I self-host?",
    a: "Absolutely. The whole platform is a Next.js app with a file-backed store. Run it anywhere, or replace the store with your own database for a fully-managed deployment.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="container max-w-3xl py-20">
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Frequently asked questions
        </h2>
      </div>
      <Accordion type="single" collapsible className="mt-8">
        {FAQS.map((item, i) => (
          <AccordionItem key={item.q} value={`item-${i}`}>
            <AccordionTrigger>{item.q}</AccordionTrigger>
            <AccordionContent>{item.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
