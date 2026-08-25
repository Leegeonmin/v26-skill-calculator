import { getSupabaseClient } from "./supabase";

type RevenueEventType = "page_view" | "ad_viewable";

type RevenueEventInput = {
  eventType: RevenueEventType;
  sessionId?: string | null;
  pagePath?: string | null;
  pageView?: string | null;
  adSlot?: string | null;
  adUnit?: string | null;
  adWidth?: number | null;
  adHeight?: number | null;
  metadata?: Record<string, unknown>;
};

type QueuedRevenueEvent = {
  input: RevenueEventInput;
  resolve: () => void;
  reject: (error: Error) => void;
};

type IdleDeadlineLike = {
  didTimeout: boolean;
  timeRemaining: () => number;
};

const REVENUE_SESSION_KEY = "v26-revenue-session";
const REVENUE_LOGGING_ENABLED = import.meta.env.VITE_REVENUE_LOGGING_ENABLED === "true";
const queuedEvents: QueuedRevenueEvent[] = [];
let flushScheduled = false;
let flushInFlight = false;

function requireSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase 설정이 필요합니다.");
  }

  return supabase;
}

function getDeviceType() {
  if (typeof window === "undefined") return "server";
  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

export function getOrCreateRevenueSessionId(): string {
  if (typeof window === "undefined") {
    return "server";
  }

  const stored = window.sessionStorage.getItem(REVENUE_SESSION_KEY);
  if (stored) {
    return stored;
  }

  const nextId =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `revenue-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  window.sessionStorage.setItem(REVENUE_SESSION_KEY, nextId);
  return nextId;
}

function runFlushWhenIdle(callback: () => void) {
  if (typeof window === "undefined") {
    queueMicrotask(callback);
    return;
  }

  const nextWindow = window as Window & {
    requestIdleCallback?: (
      cb: (deadline: IdleDeadlineLike) => void,
      options?: { timeout: number }
    ) => number;
  };

  if (typeof nextWindow.requestIdleCallback === "function") {
    nextWindow.requestIdleCallback(() => callback(), { timeout: 1200 });
    return;
  }

  window.setTimeout(callback, 180);
}

async function sendRevenueEvent(input: RevenueEventInput): Promise<void> {
  const supabase = requireSupabase();
  const pagePath =
    input.pagePath ?? (typeof window === "undefined" ? null : window.location.pathname);

  const { error } = await supabase.rpc("log_revenue_event", {
    p_event_type: input.eventType,
    p_session_id: input.sessionId ?? getOrCreateRevenueSessionId(),
    p_page_path: pagePath,
    p_page_view: input.pageView ?? null,
    p_device_type: getDeviceType(),
    p_viewport_width: typeof window === "undefined" ? null : window.innerWidth,
    p_viewport_height: typeof window === "undefined" ? null : window.innerHeight,
    p_ad_slot: input.adSlot ?? null,
    p_ad_unit: input.adUnit ?? null,
    p_ad_width: input.adWidth ?? null,
    p_ad_height: input.adHeight ?? null,
    p_metadata: input.metadata ?? {},
  });

  if (error) {
    throw new Error(error.message || "revenue event logging failed");
  }
}

async function flushQueuedEvents() {
  if (flushInFlight) {
    return;
  }

  flushInFlight = true;

  try {
    while (queuedEvents.length > 0) {
      const nextEvent = queuedEvents.shift();
      if (!nextEvent) {
        continue;
      }

      try {
        await sendRevenueEvent(nextEvent.input);
        nextEvent.resolve();
      } catch (error) {
        nextEvent.reject(
          error instanceof Error ? error : new Error("revenue event logging failed")
        );
      }
    }
  } finally {
    flushInFlight = false;
  }
}

function scheduleFlush() {
  if (flushScheduled) {
    return;
  }

  flushScheduled = true;

  runFlushWhenIdle(() => {
    flushScheduled = false;
    void flushQueuedEvents();
  });
}

export async function logRevenueEvent(input: RevenueEventInput): Promise<void> {
  if (!REVENUE_LOGGING_ENABLED) {
    return;
  }

  return await new Promise<void>((resolve, reject) => {
    queuedEvents.push({ input, resolve, reject });
    scheduleFlush();
  });
}
