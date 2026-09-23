import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";

export default async function ProjectLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkspaceShell projectId={id}>{children}</WorkspaceShell>;
}
