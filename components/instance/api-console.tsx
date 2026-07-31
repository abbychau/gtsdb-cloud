"use client";

import * as React from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";
import type { PlatformInstance } from "@/lib/types";
import { maskToken } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

function Snippet({ code }: { code: string }) {
  const [copied, setCopied] = React.useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  }
  return (
    <div className="relative rounded-lg border bg-muted/40">
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-2 top-2 h-7 w-7"
        onClick={copy}
        aria-label="Copy snippet"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function ApiConsole({ instance }: { instance: PlatformInstance }) {
  const endpoint = instance.connectionString || "https://gtsdb-http-5556.abby.md";
  const token = instance.token || "<your-token>";

  // TCP endpoint (JSON-lines protocol), e.g. tcp://gtsdb-tcp-5555.abby.md:5555
  const tcpUrl = instance.tcpConnectionString || "tcp://gtsdb-tcp-5555.abby.md:5555";
  const tcpHost = tcpUrl.replace(/^tcp:\/\//, ""); // host:port
  const [tcpHostname, tcpPort] = tcpHost.split(":");

  const snippets: Record<string, { write: string; read: string; subscribe: string }> = {
    curl: {
      write: `curl -X POST ${endpoint}/ \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${token}" \\
  -d '{"operation":"write","key":"sensor-1","write":{"value":42.5}}'`,
      read: `curl -X POST ${endpoint}/ \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${token}" \\
  -d '{"operation":"read","key":"sensor-1","read":{"lastx":10}}'`,
      subscribe: `curl -N -X POST ${endpoint}/ \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${token}" \\
  -d '{"operation":"subscribe","key":"sensor-1"}'`,
    },
    node: {
      write: `const res = await fetch("${endpoint}/", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer ${token}",
  },
  body: JSON.stringify({
    operation: "write",
    key: "sensor-1",
    write: { value: 42.5 },
  }),
});
console.log(await res.json());`,
      read: `const res = await fetch("${endpoint}/", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: "Bearer ${token}",
  },
  body: JSON.stringify({
    operation: "read",
    key: "sensor-1",
    read: { start_timestamp: 1717965210, end_timestamp: 1717965310, downsampling: 60, aggregation: "avg" },
  }),
});
const { data } = await res.json();
console.table(data);`,
      subscribe: `import { EventSource } from "eventsource";

const es = new EventSource("${endpoint}/subscribe?token=${token}&key=sensor-1");
es.onmessage = (e) => console.log(JSON.parse(e.data));`,
    },
    python: {
      write: `import requests

resp = requests.post(
    "${endpoint}/",
    headers={"Authorization": "Bearer ${token}"},
    json={"operation": "write", "key": "sensor-1", "write": {"value": 42.5}},
)
print(resp.json())`,
      read: `import requests

resp = requests.post(
    "${endpoint}/",
    headers={"Authorization": "Bearer ${token}"},
    json={
        "operation": "read",
        "key": "sensor-1",
        "read": {
            "start_timestamp": 1717965210,
            "end_timestamp": 1717965310,
            "downsampling": 60,
            "aggregation": "avg",
        },
    },
)
for point in resp.json()["data"]:
    print(point["timestamp"], point["value"])`,
      subscribe: `import requests

resp = requests.post(
    "${endpoint}/",
    headers={"Authorization": "Bearer ${token}"},
    json={"operation": "subscribe", "key": "sensor-1"},
    stream=True,
)
for line in resp.iter_lines():
    if line:
        print(line)`,
    },
    go: {
      write: `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
)

func main() {
    body, _ := json.Marshal(map[string]any{
        "operation": "write",
        "key":       "sensor-1",
        "write":     map[string]any{"value": 42.5},
    })
    req, _ := http.NewRequest("POST", "${endpoint}/", bytes.NewReader(body))
    req.Header.Set("Authorization", "Bearer ${token}")
    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()
    fmt.Println(resp.Status)
}`,
      read: `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
)

func main() {
    body, _ := json.Marshal(map[string]any{
        "operation": "read",
        "key":       "sensor-1",
        "read": map[string]any{
            "start_timestamp": 1717965210,
            "end_timestamp":   1717965310,
            "downsampling":    60,
            "aggregation":     "avg",
        },
    })
    req, _ := http.NewRequest("POST", "${endpoint}/", bytes.NewReader(body))
    req.Header.Set("Authorization", "Bearer ${token}")
    resp, _ := http.DefaultClient.Do(req)
    defer resp.Body.Close()
    fmt.Println(resp.Status)
}`,
      subscribe: `// Subscribe over the TCP protocol (port 5555).
// See: https://github.com/abbychau/gtsdb/blob/main/docs/tcp-protocol.md`,
    },
    tcp: {
      write: `# GTSDB speaks JSON-lines over TCP. Open a connection, authenticate,
# then send each operation as its own line (same ops as the HTTP API).
nc ${tcpHostname} ${tcpPort} <<'EOF'
{"operation":"auth","key":"${token}"}
{"operation":"write","key":"sensor-1","write":{"value":42.5}}
EOF`,
      read: `nc ${tcpHostname} ${tcpPort} <<'EOF'
{"operation":"auth","key":"${token}"}
{"operation":"read","key":"sensor-1","read":{"start_timestamp":1717965210,"end_timestamp":1717965310,"downsampling":60,"aggregation":"avg"}}
EOF`,
      subscribe: `nc ${tcpHostname} ${tcpPort} <<'EOF'
{"operation":"auth","key":"${token}"}
{"operation":"subscribe","key":"sensor-1"}
EOF`,
    },
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <KeyRound className="h-4 w-4" /> Connection details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">HTTP Endpoint</div>
              <div className="mt-1 truncate font-mono text-sm">{endpoint}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Connection token</span>
                <Badge variant="secondary">{token === "<your-token>" ? "not set" : "set"}</Badge>
              </div>
              <div className="mt-1 truncate font-mono text-sm">
                {maskToken(instance.token)}
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            This is your auto-generated connection endpoint and credential. Rotate
            or revoke the token anytime from the{" "}
            <a href="#connection" className="text-primary underline underline-offset-2">
              Connection
            </a>{" "}
            tab.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Code samples</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="curl">
            <TabsList className="mb-4">
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="node">Node.js</TabsTrigger>
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="go">Go</TabsTrigger>
              <TabsTrigger value="tcp">TCP</TabsTrigger>
            </TabsList>
            {Object.entries(snippets).map(([lang, snips]) => (
              <TabsContent key={lang} value={lang} className="space-y-4">
                {lang === "tcp" ? (
                  <p className="rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    GTSDB also speaks <strong>JSON-lines over TCP</strong> on port{" "}
                    <code className="font-mono">{tcpPort}</code>. Authenticate first, then send
                    each operation as its own line — the same operations as the HTTP API. See the{" "}
                    <a
                      href="https://github.com/abbychau/gtsdb/blob/main/docs/tcp-protocol.md"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline underline-offset-2"
                    >
                      TCP protocol
                    </a>{" "}
                    guide for details.
                  </p>
                ) : null}
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Write a point
                  </h4>
                  <Snippet code={snips.write} />
                </div>
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Read with time range + downsampling
                  </h4>
                  <Snippet code={snips.read} />
                </div>
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Real-time subscribe
                  </h4>
                  <Snippet code={snips.subscribe} />
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <Separator />
      <p className="text-xs text-muted-foreground">
        Full reference:{" "}
        <a
          href="https://github.com/abbychau/gtsdb/blob/main/docs/operations.md"
          target="_blank"
          rel="noreferrer"
          className="text-primary underline underline-offset-2"
        >
          GTSDB Operations Guide
        </a>{" "}
        ·{" "}
        <a
          href="https://github.com/abbychau/gtsdb/blob/main/docs/tcp-protocol.md"
          target="_blank"
          rel="noreferrer"
          className="text-primary underline underline-offset-2"
        >
          TCP protocol
        </a>
      </p>
    </div>
  );
}
