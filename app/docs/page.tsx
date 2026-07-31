import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Cable,
  Database,
  Radio,
  ShieldCheck,
  TerminalSquare,
} from "lucide-react";
import { MarketingHeader } from "@/components/layout/marketing-header";
import { MarketingFooter } from "@/components/layout/marketing-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-muted/40">
      <div className="border-b bg-muted/60 px-3 py-1.5 text-xs font-medium text-muted-foreground">
        {title}
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

const OPERATIONS: Array<[string, string, string]> = [
  ["write", "Store a single data point", "key"],
  ["batch-write", "Write up to 10,000 points across keys", "points[]"],
  ["read", "Read by time range or last N", "key"],
  ["multi-read", "Read multiple keys at once", "keys[]"],
  ["export", "Export as CSV or JSON", "key"],
  ["data-patch", "Bulk upsert (CSV or JSON)", "key + data"],
  ["deleteDataPoint", "Delete by value condition / time range", "key"],
  ["ids / idswithcount", "List keys (with counts)", "—"],
  ["subscribe", "Real-time SSE notifications", "key"],
  ["initkey / renamekey / deletekey / reloadkey", "Key management", "key"],
  ["compact", "Compact the WAL with Gorilla compression", "key"],
  ["serverinfo", "Server diagnostics", "—"],
];

export default function DocsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex-1">
        <div className="container py-16">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-3">
              <BookOpen className="mr-1.5 h-3.5 w-3.5" /> Documentation
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight">
              GTSDB Cloud quickstart
            </h1>
            <p className="mt-3 text-lg text-muted-foreground">
              Write your first data point in under a minute.
            </p>
          </div>

          <div className="mx-auto mt-12 max-w-3xl space-y-12">
            {/* 1. Create */}
            <section>
              <h2 className="flex items-center gap-2 text-2xl font-bold">
                <Badge>1</Badge> Create an instance
              </h2>
              <p className="mt-2 text-muted-foreground">
                Sign in, then head to the dashboard and hit{" "}
                <b>New instance</b>. Every instance ships with a sandbox
                simulator so you can start querying immediately — or point it at
                your own GTSDB server (single binary or Docker).
              </p>
              <div className="mt-4">
                <Button asChild>
                  <Link href="/signup">
                    Create an instance <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </section>

            {/* 2. Write */}
            <section>
              <h2 className="flex items-center gap-2 text-2xl font-bold">
                <Badge>2</Badge> Write data
              </h2>
              <p className="mt-2 text-muted-foreground">
                GTSDB is HTTP-first. POST a JSON operation to{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  /api/instances/&lt;id&gt;/proxy
                </code>{" "}
                through the platform, or talk to your endpoint directly:
              </p>
              <div className="mt-4 space-y-3">
                <CodeBlock
                  title="curl — write a single point"
                  code={`curl -X POST http://localhost:5556/ \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <token>" \\
  -d '{"operation":"write","key":"sensor-1","write":{"value":42.5}}'`}
                />
                <CodeBlock
                  title="curl — batch write 3 points"
                  code={`curl -X POST http://localhost:5556/ \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <token>" \\
  -d '{"operation":"batch-write","points":[
    {"key":"sensor-1","value":42.5,"timestamp":1717965210},
    {"key":"sensor-2","value":99.9,"timestamp":1717965210}
  ]}'`}
                />
              </div>
            </section>

            {/* 3. Read */}
            <section>
              <h2 className="flex items-center gap-2 text-2xl font-bold">
                <Badge>3</Badge> Read & downsample
              </h2>
              <div className="mt-4 space-y-3">
                <CodeBlock
                  title="curl — latest 10 points"
                  code={`curl -X POST http://localhost:5556/ \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <token>" \\
  -d '{"operation":"read","key":"sensor-1","read":{"lastx":10}}'`}
                />
                <CodeBlock
                  title="curl — time range with 60s downsampling (avg)"
                  code={`curl -X POST http://localhost:5556/ \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <token>" \\
  -d '{"operation":"read","key":"sensor-1","read":{
    "start_timestamp":1717965210,
    "end_timestamp":1717965310,
    "downsampling":60,
    "aggregation":"avg"
  }}'`}
                />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Aggregations: <code className="text-xs">avg</code>,{" "}
                <code className="text-xs">sum</code>, <code className="text-xs">min</code>,{" "}
                <code className="text-xs">max</code>, <code className="text-xs">first</code>,{" "}
                <code className="text-xs">last</code>, <code className="text-xs">count</code>,{" "}
                <code className="text-xs">median</code>, <code className="text-xs">p50</code>,{" "}
                <code className="text-xs">p95</code>, <code className="text-xs">p99</code>.
              </p>
            </section>

            {/* Operations */}
            <section id="rest">
              <h2 className="flex items-center gap-2 text-2xl font-bold">
                <TerminalSquare className="h-6 w-6 text-primary" /> REST API
              </h2>
              <p className="mt-2 text-muted-foreground">
                All operations are POST / with{" "}
                <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  Authorization: Bearer &lt;token&gt;
                </code>
                .
              </p>
              <div className="mt-4 overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Operation</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Requires</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {OPERATIONS.map(([op, desc, req]) => (
                      <TableRow key={op}>
                        <TableCell className="font-mono text-xs">{op}</TableCell>
                        <TableCell>{desc}</TableCell>
                        <TableCell className="font-mono text-xs">{req}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>

            {/* Data model */}
            <section id="data-model">
              <h2 className="flex items-center gap-2 text-2xl font-bold">
                <Database className="h-6 w-6 text-primary" /> Data model
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Series (key)</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    A named time series, e.g. <code className="text-xs">sensor-1</code>. Keys
                    can be organized with dots or slashes.
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Data point</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    A <code className="text-xs">(timestamp, value)</code> pair — 16 bytes on
                    disk, epoch seconds + float64.
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Storage</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    WAL-first .aof files, optional .idx indexes, Gorilla-compressed
                    .aof.gor after compaction.
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Real-time */}
            <section>
              <h2 className="flex items-center gap-2 text-2xl font-bold">
                <Radio className="h-6 w-6 text-primary" /> Real-time subscribe
              </h2>
              <p className="mt-2 text-muted-foreground">
                Subscribe to a key to receive live updates as data arrives
                (SSE-style push). Unsubscribe with the{" "}
                <code className="text-xs">unsubscribe</code> operation.
              </p>
              <div className="mt-4">
                <CodeBlock
                  title="curl — subscribe"
                  code={`curl -N -X POST http://localhost:5556/ \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <token>" \\
  -d '{"operation":"subscribe","key":"sensor-1","since":1717965210}'`}
                />
              </div>
            </section>

            {/* TCP */}
            <section id="tcp">
              <h2 className="flex items-center gap-2 text-2xl font-bold">
                <Cable className="h-6 w-6 text-primary" /> TCP protocol
              </h2>
              <p className="mt-2 text-muted-foreground">
                The same JSON operations work over the TCP port (default 5555)
                with a JSON-line protocol — ideal for high-throughput edge
                devices.
              </p>
              <p className="mt-2 text-sm">
                <a
                  href="https://github.com/abbychau/gtsdb/blob/main/docs/tcp-protocol.md"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline underline-offset-2"
                >
                  Read the TCP protocol reference →
                </a>
              </p>
            </section>

            {/* Drivers */}
            <section id="drivers">
              <h2 className="flex items-center gap-2 text-2xl font-bold">
                <BookOpen className="h-6 w-6 text-primary" /> Drivers & SDKs
              </h2>
              <p className="mt-2 text-muted-foreground">
                Official and community drivers for the GTSDB ecosystem:
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {[
                  { name: "Go", href: "https://github.com/abbychau/gtsdb-drivers/tree/main/go" },
                  { name: "JavaScript / Node", href: "https://github.com/abbychau/gtsdb-drivers/tree/main/js" },
                  { name: "REST + TCP", href: "https://github.com/abbychau/gtsdb/blob/main/docs/api.http" },
                ].map((d) => (
                  <Card key={d.name}>
                    <CardContent className="pt-6 text-sm">
                      <div className="font-semibold">{d.name}</div>
                      <a
                        href={d.href}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs text-primary underline underline-offset-2"
                      >
                        View source →
                      </a>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            {/* Security */}
            <section>
              <h2 className="flex items-center gap-2 text-2xl font-bold">
                <ShieldCheck className="h-6 w-6 text-primary" /> Security
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                <li>Token-based authentication with per-user namespaces.</li>
                <li>
                  The platform stores connection tokens server-side — they are
                  never sent to the browser.
                </li>
                <li>Path-traversal-safe key validation.</li>
                <li>
                  Timestamps validated to the 2000–2100 range; batch size capped
                  at 10,000 points.
                </li>
                <li>
                  Optional HTTPS via your own reverse proxy or platform ingress.
                </li>
              </ul>
            </section>

            <div className="rounded-xl border bg-muted/40 p-6 text-center">
              <h3 className="text-lg font-semibold">Ready to build?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a free instance and start writing data in seconds.
              </p>
              <Button asChild className="mt-4">
                <Link href="/signup">
                  Get started <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
