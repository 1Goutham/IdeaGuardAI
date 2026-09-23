import type { StrategyOutput } from "@/types";
import { Tag } from "@/components/ui";

const LABEL: Record<StrategyOutput["stance"], string> = { pursue: "Pursue", refine: "Refine first", rethink: "Rethink" };

export function StanceTag({ stance }: { stance: StrategyOutput["stance"] }) {
  return <Tag tone={stance === "pursue" ? "strong" : stance === "rethink" ? "danger" : "default"}>{LABEL[stance]}</Tag>;
}

export const STANCE_LABEL = LABEL;
