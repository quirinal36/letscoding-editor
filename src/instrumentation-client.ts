import * as Sentry from "@sentry/nextjs";
import { redactEvent } from "./lib/observability";
if (process.env.NEXT_PUBLIC_SENTRY_DSN)
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    beforeSend: redactEvent,
    defaultIntegrations: false,
  });
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
