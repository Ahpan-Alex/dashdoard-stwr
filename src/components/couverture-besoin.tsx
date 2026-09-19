import { formatNumber } from "@/lib/format";

export function CouvertureBarre({
  commandee,
  necessaire,
  unite,
}: {
  commandee: number;
  necessaire: number;
  unite: string;
}) {
  const pct = necessaire > 0 ? Math.min(100, (commandee / necessaire) * 100) : 0;
  return (
    <div className="min-w-[10rem]">
      <p className="text-sm font-medium">
        {formatNumber(commandee)} / {formatNumber(necessaire)} {unite}
      </p>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
        <div
          className={`h-full ${pct >= 100 ? "bg-emerald-600" : "bg-sea-600"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
