export function calculateProjectProgress(tasks = [], projectStatus = "active") {
  const relevantTasks = tasks.filter((task) => !["cancelled", "archived"].includes(task.status));
  if (!relevantTasks.length) return projectStatus === "completed" ? 100 : 0;
  const completed = relevantTasks.filter((task) => task.status === "completed").length;
  return Math.round((completed / relevantTasks.length) * 100);
}
