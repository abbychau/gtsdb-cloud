import { PlugZap, Send, LineChart } from "lucide-react";

const STEPS = [
  {
    icon: PlugZap,
    step: "01",
    title: "Create an instance",
    description:
      "Spin up a managed GTSDB instance in seconds. Connect it to your own GTSDB server or explore with the built-in sandbox.",
  },
  {
    icon: Send,
    step: "02",
    title: "Ingest data",
    description:
      "Write points over REST or TCP with a single curl call. Batch-write up to 10,000 points per request.",
  },
  {
    icon: LineChart,
    step: "03",
    title: "Query & visualize",
    description:
      "Explore your series with time ranges, downsampling and aggregations — rendered as charts in the console.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-t bg-muted/40">
      <div className="container py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            From zero to query in 3 steps
          </h2>
          <p className="mt-3 text-muted-foreground">
            No clusters to babysit, no YAML to write. Just data in, insight out.
          </p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <div
              key={s.step}
              className="rounded-xl border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <s.icon className="h-5 w-5" />
                </div>
                <span className="text-3xl font-extrabold text-muted-foreground/20">
                  {s.step}
                </span>
              </div>
              <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {s.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
