import { DisputeStage } from "../lib/types";
import { STAGE_LABELS } from "../lib/format";

const STAGE_COLORS: Record<DisputeStage, string> = {
  NOT_DISPUTED: "bg-forest-900/5 text-forest-900/50 border-forest-900/10",
  UNDER_REVIEW: "bg-clay-100 text-clay-600 border-clay-400/30",
  FILING: "bg-forest-50 text-forest-700 border-forest-300/40",
  FILED: "bg-forest-100 text-forest-700 border-forest-300/60",
  RESOLVED: "bg-forest-600 text-white border-forest-700",
};

export function StageBadge({ stage }: { stage: DisputeStage }) {
  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${STAGE_COLORS[stage]}`}
    >
      {STAGE_LABELS[stage] ?? stage}
    </span>
  );
}
