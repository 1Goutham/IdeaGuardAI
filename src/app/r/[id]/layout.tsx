import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getShare, isShareId } from "@/lib/server/shares";
import { ReportShell } from "@/components/workspace/ReportShell";

async function load(id: string) {
  if (!isShareId(id)) return null;
  return getShare(id).catch(() => null);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const report = await load(id);
  if (!report) return { title: "Report not found", robots: { index: false } };
  const u = report.version.analysis.understand;
  const s = report.version.analysis.strategy;
  const description = s?.headline ?? u?.oneLiner ?? "An IdeaGuard product analysis.";
  return {
    title: report.title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title: `${report.title} · IdeaGuard`, description, type: "article" },
    twitter: { card: "summary_large_image", title: report.title, description },
  };
}

export default async function SharedReportLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await load(id);
  if (!report) notFound();
  return (
    <ReportShell id={id} report={report}>
      {children}
    </ReportShell>
  );
}
