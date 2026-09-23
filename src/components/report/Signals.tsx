"use client";

import { motion } from "framer-motion";
import { LEVEL_LABEL, SIGNAL_META, signalTone, TONE_LABEL } from "@/lib/scoring/signals";
import { cx } from "@/lib/utils";
import { LevelMeter } from "@/components/ui";
import type { Basis, Level, SignalKey } from "@/types";
import { EvidenceLine } from "./Evidence";

interface SignalRow {
  key: SignalKey;
  level: Level;
  rationale: string;
  basis?: Basis;
  sourceIds?: string[];
}

/**
 * Opportunity signals as levels with direction and reasons. No composite
 * score: each dimension stands on its own, with its evidence beside it.
 */
export function SignalList({ signals, firstRead }: { signals: SignalRow[]; firstRead?: SignalRow[] }) {
  return (
    <ul className="border-t border-line">
      {signals.map((s, i) => {
        const meta = SIGNAL_META[s.key];
        const tone = signalTone(s.key, s.level);
        const before = firstRead?.find((f) => f.key === s.key);
        const changed = before && before.level !== s.level;
        return (
          <motion.li
            key={s.key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="grid gap-x-8 gap-y-2 border-b border-line py-5 md:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]"
          >
            <div>
              <p className="text-[15px] text-ink">{meta.label}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-ink-3">{meta.question}</p>
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="inline-flex items-center gap-2.5">
                  <LevelMeter level={s.level} label={`${meta.label}: ${s.level}`} />
                  <span className="text-[14px] text-ink">{LEVEL_LABEL[s.level]}</span>
                </span>
                <span className={cx("mono text-[10.5px] uppercase tracking-[0.1em]", tone === "favourable" ? "text-success" : tone === "unfavourable" ? "text-danger" : "text-ink-3")}>
                  {TONE_LABEL[tone]}
                </span>
                {changed && <span className="mono text-[10.5px] text-ink-3">was {LEVEL_LABEL[before.level].toLowerCase()} before research</span>}
                {s.basis && <EvidenceLine basis={s.basis} ids={s.sourceIds ?? []} className="md:ml-auto" />}
              </div>
              <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-2">{s.rationale}</p>
            </div>
          </motion.li>
        );
      })}
    </ul>
  );
}
