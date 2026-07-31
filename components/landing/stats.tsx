const STATS = [
  { value: "233×", label: "faster writes than InfluxDB 2.9" },
  { value: "<1 ms", label: "reads on recent data" },
  { value: "7.98×", label: "less storage than InfluxDB" },
  { value: "~12 MB", label: "memory footprint" },
];

export function Stats() {
  return (
    <section className="border-y bg-muted/40">
      <div className="container grid grid-cols-2 gap-8 py-12 md:grid-cols-4">
        {STATS.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="text-3xl font-extrabold tracking-tight text-primary sm:text-4xl">
              {stat.value}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
