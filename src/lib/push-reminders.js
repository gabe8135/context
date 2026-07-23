export const REMINDER_LOOKBACK_MS = 10 * 60 * 1000;
export const REMINDER_LOOKAHEAD_MS = 90 * 1000;

export function reminderWindow(now = new Date()) {
  return {
    start: new Date(now.getTime() - REMINDER_LOOKBACK_MS),
    end: new Date(now.getTime() + REMINDER_LOOKAHEAD_MS),
  };
}

function isInside(date, start, end) {
  return Number.isFinite(date.getTime()) && date >= start && date < end;
}

export function collectDueReminders({ events = [], tasks = [], meetings = [] }, now = new Date()) {
  const { start, end } = reminderWindow(now);
  const eventReminders = events.flatMap((event) =>
    (event.reminder_minutes || []).map((minutes) => ({
      ...event,
      type: "event",
      at: event.starts_at,
      scheduled: new Date(new Date(event.starts_at).getTime() - Number(minutes) * 60_000),
    }))
  );

  return [
    ...eventReminders,
    ...tasks.map((task) => ({ ...task, type: "task", at: task.due_at, scheduled: new Date(task.reminder_at) })),
    ...meetings.map((meeting) => ({ ...meeting, type: "meeting", at: meeting.scheduled_at, scheduled: new Date(meeting.reminder_at) })),
  ].filter((item) => isInside(item.scheduled, start, end));
}

export function notificationTarget(item) {
  return item.project_slug ? `/app/projetos/${item.project_slug}` : "/app/agenda";
}
