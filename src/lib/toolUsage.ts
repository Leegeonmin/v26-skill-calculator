import { getSupabaseClient } from "./supabase";

type ToolUsageEventInput = {
  tool: string;
  mode?: string | null;
  cardType?: string | null;
  targetGrade?: string | null;
  rollCount?: number;
  resultScore?: number | null;
  resultGrade?: string | null;
  metadata?: Record<string, unknown>;
};

type QueuedToolUsageEvent = {
  input: ToolUsageEventInput;
  resolve: () => void;
  reject: (error: Error) => void;
};

type IdleDeadlineLike = {
  didTimeout: boolean;
  timeRemaining: () => number;
};

const queuedEvents: QueuedToolUsageEvent[] = [];
let flushScheduled = false;
let flushInFlight = false;

function requireSupabase() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase 설정이 필요합니다.");
  }

  return supabase;
}

async function sendToolUsageEvent(input: ToolUsageEventInput): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.rpc("log_tool_usage_event", {
    p_tool: input.tool,
    p_mode: input.mode ?? null,
    p_card_type: input.cardType ?? null,
    p_target_grade: input.targetGrade ?? null,
    p_roll_count: input.rollCount ?? 1,
    p_result_score: input.resultScore ?? null,
    p_result_grade: input.resultGrade ?? null,
    p_metadata: input.metadata ?? {},
  });

  if (error) {
    throw new Error(error.message || "tool usage logging failed");
  }
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
        await sendToolUsageEvent(nextEvent.input);
        nextEvent.resolve();
      } catch (error) {
        nextEvent.reject(
          error instanceof Error ? error : new Error("tool usage logging failed")
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

export async function logToolUsageEvent(input: ToolUsageEventInput): Promise<void> {
  return await new Promise<void>((resolve, reject) => {
    queuedEvents.push({ input, resolve, reject });
    scheduleFlush();
  });
}
