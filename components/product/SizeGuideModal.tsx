"use client";

import { Modal } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { SizeChart } from "@/types";

type Props = {
  open: boolean;
  onClose: () => void;
  chart: SizeChart | null;
};

/**
 * Size guide modal. Renders the configured size chart with a
 * sample disclaimer when the chart's `isSample` flag is set. The
 * measurement cells are intentionally left as `—` until real data
 * is supplied — the modal never invents body or garment sizes.
 */
export function SizeGuideModal({ open, onClose, chart }: Props) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={chart?.title ?? "Size guide"}
      description={
        chart?.isSample
          ? "Sample chart — final measurements will be published when the product specification is confirmed."
          : chart?.description
      }
      size="lg"
      className="max-w-2xl"
    >
      {chart ? <ChartBody chart={chart} /> : <p className="text-sm text-ink-muted">No size guide is available for this product.</p>}
    </Modal>
  );
}

function ChartBody({ chart }: { chart: SizeChart }) {
  return (
    <div className="flex flex-col gap-4">
      {chart.isSample ? (
        <p
          role="note"
          className="inline-flex items-center gap-2 border border-line bg-paper-warm px-3 py-2 text-xs text-ink-muted"
        >
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 rounded-full bg-warning"
          />
          Sample chart. Final measurements will replace the placeholder cells below.
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-eyebrow uppercase text-ink-muted">
              <th className="py-2 pr-4 font-normal">Measurement</th>
              {chart.sizes.map((size) => (
                <th key={size} className="px-2 py-2 text-center font-normal">
                  {size}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chart.rows.map((row) => (
              <tr key={row.label} className="border-b border-line">
                <th
                  scope="row"
                  className="py-3 pr-4 text-left font-normal text-ink"
                >
                  {row.label}
                </th>
                {chart.sizes.map((size) => {
                  const value = row.values[size] ?? "—";
                  const placeholder = value === "—";
                  return (
                    <td
                      key={`${row.label}-${size}`}
                      className={cn(
                        "px-2 py-3 text-center",
                        placeholder ? "text-ink-subtle" : "text-ink",
                      )}
                    >
                      {value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-muted">
        Need help?{" "}
        <a href="/contact" className="link-underline text-ink">
          Contact our team
        </a>{" "}
        for personal sizing advice.
      </p>
    </div>
  );
}
