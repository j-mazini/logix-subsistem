import { DeliveryStop } from './types';

export function subpostcodeOf(postcode: string): string {
  return postcode.split(' ')[0];
}

export interface StopGroup {
  code: string;
  items: DeliveryStop[];
}

/**
 * Buckets stops by subpostcode. This is a real key→items grouping, not a
 * scan for consecutive same-code runs — "same subpostcode" is always one
 * group regardless of where its stops sit in the input, so callers don't
 * need to keep a group's stops physically contiguous to stay correct.
 */
export function buildGroups(stops: DeliveryStop[]): StopGroup[] {
  const byCode = new Map<string, DeliveryStop[]>();
  const order: string[] = [];
  for (const stop of stops) {
    const code = subpostcodeOf(stop.postcode);
    let bucket = byCode.get(code);
    if (!bucket) {
      bucket = [];
      byCode.set(code, bucket);
      order.push(code);
    }
    bucket.push(stop);
  }
  return order.map((code) => ({ code, items: byCode.get(code)! }));
}

export interface DisplayStopGroup extends StopGroup {
  /** Running sequence-number offset for StopCard numbering — display-only, never used for reordering. */
  startIndex: number;
}

export function withStartIndexes(groups: StopGroup[]): DisplayStopGroup[] {
  let offset = 0;
  return groups.map((group) => {
    const withOffset: DisplayStopGroup = { ...group, startIndex: offset };
    offset += group.items.length;
    return withOffset;
  });
}
