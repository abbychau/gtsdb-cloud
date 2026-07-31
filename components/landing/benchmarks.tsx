import { Check, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const ROWS: Array<{ metric: string; gtsdb: string; influx: string; ratio: string }> = [
  { metric: "Write 10k sequential", gtsdb: "21.76 ms", influx: "5,070 ms", ratio: "233×" },
  { metric: "Read latest data", gtsdb: "<1 ms", influx: "4.48 ms", ratio: "sub-ms" },
  { metric: "Read 10k queries", gtsdb: "205 ms", influx: "967 ms", ratio: "4.7×" },
  { metric: "Multi-write 10k parallel", gtsdb: "51 ms", influx: "851 ms", ratio: "16.6×" },
  { metric: "Storage (5,000 points)", gtsdb: "9.8 KB", influx: "78.1 KB", ratio: "7.98×" },
];

export function Benchmarks() {
  return (
    <section id="benchmarks" className="container py-20">
      <div className="mx-auto max-w-2xl text-center">
        <Badge variant="outline" className="mb-3">
          i7-13700KF · Windows
        </Badge>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          GTSDB vs InfluxDB 2.9.1
        </h2>
        <p className="mt-3 text-muted-foreground">
          10 sensors × 1,000 points each. GTSDB over TCP, InfluxDB over HTTP.
        </p>
      </div>
      <div className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
              <TableHead>
                <span className="flex items-center gap-1">
                  <Check className="h-4 w-4 text-primary" /> GTSDB
                </span>
              </TableHead>
              <TableHead>
                <span className="flex items-center gap-1">
                  <X className="h-4 w-4 text-muted-foreground" /> InfluxDB
                </span>
              </TableHead>
              <TableHead className="text-right">Speedup</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROWS.map((row) => (
              <TableRow key={row.metric}>
                <TableCell className="font-medium">{row.metric}</TableCell>
                <TableCell className="font-semibold text-primary">
                  {row.gtsdb}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.influx}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary">{row.ratio}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Source:{" "}
        <a
          href="https://github.com/abbychau/gtsdb-benchmark"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          gtsdb-benchmark
        </a>
      </p>
    </section>
  );
}
