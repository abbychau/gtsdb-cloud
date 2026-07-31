"use client";

import * as React from "react";
import {
  Activity,
  Download,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "@/lib/auth-context";
import { proxyOperation } from "@/lib/api";
import { AGGREGATIONS, ops } from "@/lib/gtsdb";
import type { DataPoint, GtsdbResponse, KeyCount, PlatformInstance } from "@/lib/types";
import { formatValue } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const COLORS = [
  "hsl(240 5.9% 10%)",
  "hsl(220 20% 45%)",
  "hsl(0 0% 35%)",
  "hsl(260 20% 45%)",
  "hsl(200 25% 45%)",
];

function epochToLocalInput(ts: number): string {
  const d = new Date(ts * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function localInputToEpoch(value: string): number {
  if (!value) return 0;
  return Math.floor(new Date(value).getTime() / 1000);
}

function formatAxis(ts: number): string {
  const d = new Date(ts * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function DataExplorer({ instance }: { instance: PlatformInstance }) {
  const { authToken } = useAuth();
  const [keys, setKeys] = React.useState<KeyCount[]>([]);
  const [selectedKeys, setSelectedKeys] = React.useState<string[]>([]);
  const [allKeys, setAllKeys] = React.useState(false);

  // Query controls
  const [mode, setMode] = React.useState<"last" | "range">("last");
  const [lastN, setLastN] = React.useState(200);
  const [startInput, setStartInput] = React.useState("");
  const [endInput, setEndInput] = React.useState("");
  const [aggregation, setAggregation] = React.useState("avg");
  const [downsampling, setDownsampling] = React.useState("");
  const [live, setLive] = React.useState(false);

  const [results, setResults] = React.useState<DataPoint[]>([]);
  const [running, setRunning] = React.useState(false);
  const [loadingKeys, setLoadingKeys] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [resultCount, setResultCount] = React.useState(0);

  // Write form
  const [writeKey, setWriteKey] = React.useState("");
  const [writeValue, setWriteValue] = React.useState("");
  const [writeTimestamp, setWriteTimestamp] = React.useState("");
  const [writing, setWriting] = React.useState(false);

  // Import dialog
  const [importData, setImportData] = React.useState("");
  const [importOpen, setImportOpen] = React.useState(false);
  const [importing, setImporting] = React.useState(false);

  const token = authToken || "";

  const loadKeys = React.useCallback(async () => {
    setLoadingKeys(true);
    try {
      const res = await proxyOperation<GtsdbResponse>(instance.id, ops.idsWithCount(), token);
      if (res.success) {
        setKeys(res.data as KeyCount[]);
      } else {
        setKeys([]);
      }
    } catch {
      setKeys([]);
    } finally {
      setLoadingKeys(false);
    }
  }, [instance.id, token]);

  const effectiveKeys = React.useMemo(() => {
    if (allKeys) return keys.map((k) => k.key);
    return selectedKeys;
  }, [allKeys, keys, selectedKeys]);

  const runQuery = React.useCallback(async () => {
    if (!effectiveKeys.length) {
      setError("Select at least one key to query.");
      return;
    }
    setRunning(true);
    setError(null);
    try {
      const read =
        mode === "last"
          ? { lastx: lastN, aggregation }
          : {
              start_timestamp: localInputToEpoch(startInput),
              end_timestamp: localInputToEpoch(endInput),
              downsampling: downsampling ? Number(downsampling) : undefined,
              aggregation,
            };
      const op =
        effectiveKeys.length === 1
          ? ops.readLast(effectiveKeys[0], lastN, aggregation)
          : mode === "last"
          ? ops.multiRead(effectiveKeys, { lastx: lastN, aggregation })
          : ops.multiRead(effectiveKeys, read as never);
      const res = await proxyOperation<GtsdbResponse>(instance.id, op, token);
      if (!res.success) {
        setError(res.message || "Query failed");
        setResults([]);
        return;
      }
      if (res.multi_data) {
        const flat: DataPoint[] = [];
        for (const [key, pts] of Object.entries(res.multi_data)) {
          for (const p of pts) flat.push({ ...p, key: p.key || key });
        }
        setResults(flat);
        setResultCount(flat.length);
      } else {
        const pts = (res.data as DataPoint[]) || [];
        setResults(pts);
        setResultCount(pts.length);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setRunning(false);
    }
  }, [effectiveKeys, mode, lastN, startInput, endInput, downsampling, aggregation, instance.id, token]);

  // Polling for "live" mode
  React.useEffect(() => {
    if (!live) return;
    const t = setInterval(() => runQuery(), 5000);
    return () => clearInterval(t);
  }, [live, runQuery]);

  // Initialise default time range + keys
  React.useEffect(() => {
    loadKeys();
    const end = Math.floor(Date.now() / 1000);
    const start = end - 3600;
    setStartInput(epochToLocalInput(start));
    setEndInput(epochToLocalInput(end));
  }, [loadKeys]);

  React.useEffect(() => {
    if (keys.length > 0 && selectedKeys.length === 0) {
      setSelectedKeys([keys[0].key]);
      setWriteKey(keys[0].key);
    }
  }, [keys, selectedKeys.length]);

  const chartData = React.useMemo(() => {
    const map = new Map<number, Record<string, number | string>>();
    for (const p of results) {
      const row = map.get(p.timestamp) ?? { t: p.timestamp };
      (row as Record<string, unknown>)[p.key] = p.value;
      map.set(p.timestamp, row);
    }
    return [...map.values()].sort(
      (a, b) => Number(a.t) - Number(b.t)
    ) as Array<Record<string, number | string>>;
  }, [results]);

  const chartKeys = React.useMemo(() => {
    const set = new Set<string>();
    for (const p of results) set.add(p.key);
    return [...set];
  }, [results]);

  async function handleWrite(e: React.FormEvent) {
    e.preventDefault();
    if (!writeKey || writeValue === "") return;
    setWriting(true);
    try {
      const res = await proxyOperation<GtsdbResponse>(
        instance.id,
        ops.write(
          writeKey,
          Number(writeValue),
          writeTimestamp ? localInputToEpoch(writeTimestamp) : undefined
        ),
        token
      );
      if (res.success) {
        toast.success(`Point written to "${writeKey}"`);
        setWriteValue("");
        setWriteTimestamp("");
        loadKeys();
        runQuery();
      } else {
        toast.error(res.message || "Write failed");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Write failed");
    } finally {
      setWriting(false);
    }
  }

  async function handleImport() {
    setImporting(true);
    try {
      const key = writeKey || selectedKeys[0] || keys[0]?.key || "";
      if (!key) {
        toast.error("Pick a key to import into first.");
        return;
      }
      const res = await proxyOperation<GtsdbResponse>(
        instance.id,
        ops.dataPatch(key, importData),
        token
      );
      if (res.success) {
        toast.success(res.message || "Data imported");
        setImportOpen(false);
        setImportData("");
        loadKeys();
        runQuery();
      } else {
        toast.error(res.message || "Import failed");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  }

  function exportCsv() {
    const lines = results.map((p) => `${p.timestamp},${p.key},${p.value}`);
    const blob = new Blob([["timestamp,key,value", ...lines].join("\n")], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${instance.name}-results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription className="text-xs">{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Key list */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-sm">
              Series ({keys.length})
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={loadKeys}
                aria-label="Refresh keys"
              >
                <RefreshCw
                  className={cn("h-4 w-4", loadingKeys && "animate-spin")}
                />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
              <input
                type="checkbox"
                checked={allKeys}
                onChange={(e) => setAllKeys(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <span className="font-medium">All keys (multi-read)</span>
            </label>
            <ScrollArea className="h-72">
              <div className="space-y-1">
                {keys.map((k) => {
                  const active = selectedKeys.includes(k.key) || allKeys;
                  return (
                    <label
                      key={k.key}
                      className={cn(
                        "flex cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted",
                        active && "bg-primary/10"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={active}
                          disabled={allKeys}
                          onChange={(e) => {
                            setSelectedKeys((prev) =>
                              e.target.checked
                                ? [...prev, k.key]
                                : prev.filter((x) => x !== k.key)
                            );
                          }}
                          className="h-4 w-4 rounded border-input"
                        />
                        <span className="truncate font-mono text-xs">{k.key}</span>
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {k.count.toLocaleString()}
                      </Badge>
                    </label>
                  );
                })}
                {!loadingKeys && keys.length === 0 && (
                  <p className="px-2 py-4 text-center text-xs text-muted-foreground">
                    No keys yet. Write a point below.
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Query panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Query builder</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs">Mode</Label>
                  <Select
                    value={mode}
                    onValueChange={(v) => setMode(v as "last" | "range")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="last">Last N records</SelectItem>
                      <SelectItem value="range">Time range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Aggregation</Label>
                  <Select value={aggregation} onValueChange={setAggregation}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AGGREGATIONS.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {mode === "last" ? (
                <div className="space-y-2">
                  <Label className="text-xs">Number of records</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10000}
                    value={lastN}
                    onChange={(e) => setLastN(Number(e.target.value))}
                  />
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs">Start time</Label>
                    <Input
                      type="datetime-local"
                      value={startInput}
                      onChange={(e) => setStartInput(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">End time</Label>
                    <Input
                      type="datetime-local"
                      value={endInput}
                      onChange={(e) => setEndInput(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="space-y-2 sm:w-48">
                  <Label className="text-xs">Downsampling (sec)</Label>
                  <Input
                    placeholder="e.g. 60"
                    value={downsampling}
                    onChange={(e) => setDownsampling(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={live} onCheckedChange={setLive} />
                    Live (5s)
                  </label>
                  <Button onClick={runQuery} disabled={running}>
                    {running ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="mr-2 h-4 w-4" />
                    )}
                    Run query
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm">
                Results
                {resultCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {resultCount.toLocaleString()} points
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                {live && (
                  <Badge variant="outline" className="gap-1 text-emerald-500">
                    <Activity className="h-3 w-3" /> live
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportCsv}
                  disabled={results.length === 0}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" /> CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {results.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  Run a query to see your data.
                </div>
              ) : (
                <>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartKeys.length > 1 ? (
                        <LineChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis
                            dataKey="t"
                            tickFormatter={(v) => formatAxis(Number(v))}
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis tick={{ fontSize: 11 }} width={48} />
                          <Tooltip
                            labelFormatter={(v) => new Date(Number(v) * 1000).toLocaleString()}
                            formatter={(value, name) => [
                              formatValue(Number(value)),
                              String(name),
                            ]}
                          />
                          <Legend />
                          {chartKeys.map((k, i) => (
                            <Line
                              key={k}
                              type="monotone"
                              dataKey={k}
                              stroke={COLORS[i % COLORS.length]}
                              dot={false}
                              strokeWidth={1.5}
                              isAnimationActive={false}
                            />
                          ))}
                        </LineChart>
                      ) : (
                        <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                          <defs>
                            <linearGradient id="fillMain" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={COLORS[0]} stopOpacity={0.35} />
                              <stop offset="100%" stopColor={COLORS[0]} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis
                            dataKey="t"
                            tickFormatter={(v) => formatAxis(Number(v))}
                            tick={{ fontSize: 11 }}
                          />
                          <YAxis tick={{ fontSize: 11 }} width={48} />
                          <Tooltip
                            labelFormatter={(v) => new Date(Number(v) * 1000).toLocaleString()}
                            formatter={(value) => [formatValue(Number(value)), chartKeys[0]]}
                          />
                          <Area
                            type="monotone"
                            dataKey={chartKeys[0]}
                            stroke={COLORS[0]}
                            strokeWidth={2}
                            fill="url(#fillMain)"
                            dot={false}
                            isAnimationActive={false}
                          />
                        </AreaChart>
                      )}
                    </ResponsiveContainer>
                  </div>

                  <ScrollArea className="mt-4 h-56 rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-40">Timestamp</TableHead>
                          <TableHead>Key</TableHead>
                          <TableHead className="text-right">Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...results]
                          .sort((a, b) => b.timestamp - a.timestamp)
                          .map((p, i) => (
                            <TableRow key={`${p.timestamp}-${p.key}-${i}`}>
                              <TableCell className="font-mono text-xs">
                                {new Date(p.timestamp * 1000).toLocaleString()}
                              </TableCell>
                              <TableCell className="font-mono text-xs">{p.key}</TableCell>
                              <TableCell className="text-right font-mono text-xs">
                                {formatValue(p.value)}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Write + import */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Write data</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="single">
            <TabsList>
              <TabsTrigger value="single">Single point</TabsTrigger>
              <TabsTrigger value="batch">Batch / CSV import</TabsTrigger>
            </TabsList>
            <TabsContent value="single" className="pt-4">
              <form onSubmit={handleWrite} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <div className="space-y-2">
                  <Label className="text-xs">Key</Label>
                  <Input
                    list="keys-list"
                    value={writeKey}
                    onChange={(e) => setWriteKey(e.target.value)}
                    placeholder="sensor-1"
                  />
                  <datalist id="keys-list">
                    {keys.map((k) => (
                      <option key={k.key} value={k.key} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Value</Label>
                  <Input
                    type="number"
                    step="any"
                    value={writeValue}
                    onChange={(e) => setWriteValue(e.target.value)}
                    placeholder="42.5"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Timestamp (optional)</Label>
                  <Input
                    type="datetime-local"
                    value={writeTimestamp}
                    onChange={(e) => setWriteTimestamp(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button type="submit" disabled={writing}>
                    {writing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Write
                  </Button>
                </div>
              </form>
            </TabsContent>
            <TabsContent value="batch" className="pt-4">
              <Dialog open={importOpen} onOpenChange={setImportOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Import CSV
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Import CSV data</DialogTitle>
                    <DialogDescription>
                      One point per line: <code>timestamp,value</code> (epoch
                      seconds). Upserts into key{" "}
                      <b>{writeKey || selectedKeys[0] || keys[0]?.key || "…"}</b>.
                    </DialogDescription>
                  </DialogHeader>
                  <Textarea
                    rows={8}
                    placeholder={"1717965210,42.5\n1717965270,43.1\n1717965330,41.9"}
                    value={importData}
                    onChange={(e) => setImportData(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setImportOpen(false)}
                      disabled={importing}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleImport} disabled={importing || !importData.trim()}>
                      {importing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      Import
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
