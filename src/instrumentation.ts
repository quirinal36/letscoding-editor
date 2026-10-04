import * as Sentry from "@sentry/nextjs";
import { redactEvent } from "./lib/observability";
export async function register() {
  if (process.env.SENTRY_DSN)
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      sendDefaultPii: false,
      tracesSampleRate: 0,
      beforeSend: redactEvent,
      defaultIntegrations: false,
    });
}
export const onRequestError = Sentry.captureRequestError;
