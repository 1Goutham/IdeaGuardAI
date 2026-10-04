import { ImageResponse } from "next/og";
import { getShare, isShareId } from "@/lib/server/shares";
import { STANCE_LABEL } from "@/components/report/StanceTag";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "IdeaGuard shared report";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = isShareId(id) ? await getShare(id).catch(() => null) : null;
  const a = report?.version.analysis;
  const title = report?.title ?? "IdeaGuard";
  const line = a?.strategy?.headline ?? a?.understand?.oneLiner ?? "Turn an idea into evidence.";
  const stance = a?.strategy ? STANCE_LABEL[a.strategy.stance] : null;
  const sources = a?.sources?.items.length ?? a?.research?.sources.length ?? 0;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#f2f1ed", color: "#141413", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 24, color: "#6b6a65" }}>
          <div style={{ width: 14, height: 14, borderRadius: 999, background: "#141413" }} />
          IdeaGuard · shared report
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 68, lineHeight: 1.05, letterSpacing: -2, maxWidth: 1000 }}>{title.slice(0, 80)}</div>
          <div style={{ fontSize: 30, lineHeight: 1.3, color: "#46453f", maxWidth: 1000 }}>{line.slice(0, 160)}</div>
        </div>
        <div style={{ display: "flex", gap: 36, fontSize: 22, color: "#6b6a65", borderTop: "1px solid #d8d6cf", paddingTop: 24 }}>
          {stance && <span style={{ color: "#141413" }}>{stance}</span>}
          {sources > 0 && <span>{sources} sources</span>}
          <span>Evidence and inference, labelled</span>
        </div>
      </div>
    ),
    size,
  );
}
