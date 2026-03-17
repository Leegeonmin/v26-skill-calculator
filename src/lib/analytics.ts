import posthog from "posthog-js";

type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

const posthogKey = import.meta.env.VITE_POSTHOG_KEY;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

let isInitialized = false;

export function initAnalytics() {
  if (isInitialized || !posthogKey) {
    return;
  }

  posthog.init(posthogKey, {
    api_host: posthogHost,
    capture_pageview: false,
    capture_pageleave: false,
    autocapture: false,
  });

  isInitialized = true;
}

export function trackEvent(eventName: string, properties?: AnalyticsProperties) {
  if (!isInitialized) {
    return;
  }

  posthog.capture(eventName, properties);
}

export function isAnalyticsReady() {
  return isInitialized;
}
