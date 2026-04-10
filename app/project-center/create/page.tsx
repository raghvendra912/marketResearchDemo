import { requireSession } from "@/lib/require-session";
import ProjectEditorClient from "@/app/ProjectEditorClient";

export default async function CreateProjectPage() {
  const session = await requireSession();
  return <ProjectEditorClient currentUser={session} mode="create" activePage="project-create" />;
}
