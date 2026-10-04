import type { ErrorEvent } from "@sentry/nextjs";
/** Never include code, prompts, attachments, auth headers or user email. */
export function redactEvent(event: ErrorEvent) {
  delete event.request;
  delete event.extra;
  event.breadcrumbs = [];
  if (event.user) event.user = { id: event.user.id };
  return event;
}
export function logAction(
  action: string,
  userId: string,
  fields: Record<string, unknown>,
) {
  const ids = Object.fromEntries(
    ["projectId", "threadId"].flatMap((key) =>
      typeof fields[key] === "string" &&
      /^[a-f0-9-]{36}$/.test(fields[key] as string)
        ? [[key, fields[key]]]
        : [],
    ),
  );
  console.info(
    JSON.stringify({
      scope: "editor",
      action,
      user_id: userId,
      project_id: ids.projectId,
      thread_id: ids.threadId,
      time: new Date().toISOString(),
    }),
  );
}
