import { AppShell } from "@/components/app-shell";
import { ProjectDashboard } from "@/components/project-dashboard";
import { getProjectDashboard } from "@/services/project-dashboard";

export async function generateMetadata() {
  return { title: "Projeto" };
}

export default async function ProjectPage({ params }) {
  const { slug } = await params;
  const { project, preview } = await getProjectDashboard(slug);
  return <AppShell preview={preview} context={{ type: "project", ...project }}>
    <ProjectDashboard project={project}/>
  </AppShell>;
}
