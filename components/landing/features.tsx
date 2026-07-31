import {
  Zap,
  Layers,
  Radio,
  Database,
  LineChart,
  ShieldCheck,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const FEATURES = [
  {
    icon: Zap,
    title: "Sub-millisecond reads",
    description:
      "WAL-first storage with optional indexes keeps reads blistering fast — even across millions of points.",
  },
  {
    icon: Radio,
    title: "Real-time subscriptions",
    description:
      "Subscribe to keys and stream live updates over SSE, just like a pub/sub for your sensors.",
  },
  {
    icon: Layers,
    title: "Downsampling & aggregation",
    description:
      "avg, sum, min, max, median, p50, p95 and p99 — turn raw samples into insight instantly.",
  },
  {
    icon: Database,
    title: "Gorilla compression",
    description:
      "Facebook's time-series algorithm packs your data ~8× smaller without losing fidelity.",
  },
  {
    icon: LineChart,
    title: "Beautiful explorer",
    description:
      "Visualize series with charts, run ad-hoc queries and manage keys from a single console.",
  },
  {
    icon: ShieldCheck,
    title: "Multi-tenant & secure",
    description:
      "Token-based auth, per-user namespaces and automatic path-traversal protection.",
  },
];

export function Features() {
  return (
    <section id="features" className="container py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Everything you need to ship timeseries
        </h2>
        <p className="mt-3 text-muted-foreground">
          A managed control plane for the GTSDB engine — ingest, query and
          visualize without running infrastructure.
        </p>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <Card key={f.title} className="transition-shadow hover:shadow-md">
            <CardHeader>
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg">{f.title}</CardTitle>
              <CardDescription>{f.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}
