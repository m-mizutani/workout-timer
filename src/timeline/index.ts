import type { Timeline } from "./schema";
import { defaultTimeline } from "./timelines/default";

// Registry of selectable timelines. New timelines (imported or built-in) are
// added here and become available in the UI selector automatically.
export const timelines: Timeline[] = [defaultTimeline];

export function findTimeline(id: string): Timeline | undefined {
  return timelines.find((t) => t.id === id);
}

export { defaultTimeline };
export type { Timeline } from "./schema";
