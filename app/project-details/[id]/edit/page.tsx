import { requireSession } from "@/lib/require-session";
import ProjectEditorClient from "@/app/ProjectEditorClient";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditProjectPage({ params }: Props) {
  const session = await requireSession();
  const { id } = await params;
  return <ProjectEditorClient currentUser={session} mode="edit" projectId={id} activePage="project-edit" />;
}
