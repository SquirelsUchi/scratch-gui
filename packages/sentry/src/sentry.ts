import * as Sentry from '@sentry/browser';

export interface InitSentryConfig {
  dsn?: string;
  release?: string;
  environment?: string;
  enabled?: boolean;
}

const isBreadcrumbResponse = (breadCrumb: Sentry.Breadcrumb) => (breadCrumb.message as any) instanceof Response;

const isBreadcrumbPromiseRejectedResponse = (breadCrumb: Sentry.Breadcrumb) =>
  (breadCrumb.message as any) instanceof PromiseRejectionEvent &&
  (breadCrumb.message as any).reason instanceof Response;

const handleBeforeBreadCrumb = (breadCrumb: Sentry.Breadcrumb) => {
  if (isBreadcrumbResponse(breadCrumb)) {
    breadCrumb.message = `Uncaught (in promise). Response: ${(breadCrumb.message as any).status} ${(breadCrumb.message as any).statusText} at ${(breadCrumb.message as any).url}`;
  }

  if (isBreadcrumbPromiseRejectedResponse(breadCrumb)) {
    breadCrumb.message = `Uncaught (in promise). Response: ${(breadCrumb.message as any).reason.status} ${(breadCrumb.message as any).reason.statusText} at ${(breadCrumb.message as any).reason.url} `;
  }

  return breadCrumb;
};

export const initSentry = (config: InitSentryConfig = {}) => {
  const { dsn, release, environment, enabled } = config;

  Sentry.init({
    tracesSampleRate: 0,
    release,
    environment,
    enabled,
    ignoreErrors: ['WHEN_CANCELLED', 'CANCELLED'],
    dsn,
    beforeBreadcrumb: handleBeforeBreadCrumb
  });
};

export { Sentry };
