import type { Timeline } from "./schema";
import { defaultTimeline } from "./timelines/default";
import { squat333Timeline } from "./timelines/squat333";

// Registry of selectable timelines. New timelines (imported or built-in) are
// added here and become available in the UI selector automatically.
export const timelines: Timeline[] = [defaultTimeline, squat333Timeline];

export function findTimeline(id: string): Timeline | undefined {
  return timelines.find((t) => t.id === id);
}

export { defaultTimeline };
export type { Timeline } from "./schema";
