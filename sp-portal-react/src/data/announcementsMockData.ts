/**
 * Demo seed for the shared aviso store (see announcementsData.ts). The store
 * is localStorage-backed and starts empty, so a fresh browser shows an empty
 * Announcements page, an empty header bell and an empty dashboard box. This
 * module supplies a realistic starting set so those surfaces have something
 * to render.
 *
 * Two independent batches, seeded at most once each:
 *  - DHL broadcasts (source 'DHL'), global — every SP portal sees them;
 *  - the SP's own announcements (source 'SP'), seeded per SP name so whoever
 *    is signed in gets a few editable/deletable rows of their own.
 *
 * Dates are day offsets resolved against the moment of seeding rather than
 * fixed calendar dates, so the set always spans Expired / Active / Scheduled
 * instead of decaying to "everything expired" as the demo ages. Depot, loop
 * and route names match dhl-mock-data.js (MSE / LCY / LSE, routes MD7A-MD7F).
 */

import type { AvisoRecord } from './announcementsData';

interface AvisoSeed {
  key: string;
  title: string;
  message: string;
  type: 'Announcement' | 'Delay' | 'Warning';
  urgency: 'Low' | 'Normal' | 'High' | 'Critical';
  audience: string[];
  /** Days from today; negative = already published, positive = scheduled. */
  publishOffset: number;
  expireOffset: number;
}

const DAY_MS = 86400000;

function offsetDateStr(days: number): string {
  const d = new Date(Date.now() + days * DAY_MS);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const DHL_SEEDS: AvisoSeed[] = [
  {
    key: 'dhl-01',
    title: 'M25 J15–J17 overnight closure this week',
    message:
      'The M25 anticlockwise carriageway between junctions 15 and 17 is closed from 22:00 to 05:00 until Friday. Routes running through Heathrow should use the A40 diversion and add roughly 25 minutes to the first drop.',
    type: 'Delay',
    urgency: 'Critical',
    audience: ['Route'],
    publishOffset: -1,
    expireOffset: 4,
  },
  {
    key: 'dhl-02',
    title: 'Dangerous goods handling refresher is now mandatory',
    message:
      'All couriers carrying ADR-classified shipments must complete the refresher module before the end of the month. Drivers without a valid certificate on file will be blocked from loading at the depot gate.',
    type: 'Warning',
    urgency: 'High',
    audience: ['Depot', 'Loop', 'Route'],
    publishOffset: -6,
    expireOffset: 21,
  },
  {
    key: 'dhl-03',
    title: 'Peak volume plan – MSE and LCY',
    message:
      'Forecast volumes are up 18% for the next two weeks. Both depots move to an extended second sort; loop start times are pulled forward by 45 minutes. Confirm your driver availability with your depot coordinator.',
    type: 'Announcement',
    urgency: 'High',
    audience: ['Depot', 'Loop'],
    publishOffset: -2,
    expireOffset: 13,
  },
  {
    key: 'dhl-04',
    title: 'Scanner firmware 4.2 rollout',
    message:
      'Handheld scanners will update automatically when docked overnight. The new build fixes the duplicate-scan issue reported on multi-piece shipments. Report any device that fails to boot after the update to depot IT.',
    type: 'Announcement',
    urgency: 'Normal',
    audience: ['Depot'],
    publishOffset: -10,
    expireOffset: 6,
  },
  {
    key: 'dhl-05',
    title: 'Fuel card provider migration',
    message:
      'The current fuel cards stop working at the end of next month. Replacement cards are being posted to each service provider address on file — check yours is up to date in the portal profile.',
    type: 'Announcement',
    urgency: 'Normal',
    audience: ['Depot', 'Loop'],
    publishOffset: -4,
    expireOffset: 19,
  },
  {
    key: 'dhl-06',
    title: 'LSE depot gate access change',
    message:
      'From the start of next week the LSE yard uses badge-only entry. Drivers must collect a proximity badge from reception on their first visit; the old keypad code is retired the same day.',
    type: 'Announcement',
    urgency: 'Normal',
    audience: ['Depot'],
    publishOffset: 3,
    expireOffset: 31,
  },
  {
    key: 'dhl-07',
    title: 'Sorting belt maintenance – LCY, Sunday night',
    message:
      'Belt 3 at LCY is offline for planned maintenance from Sunday 20:00. Expect the first wave to be released around 40 minutes late; loops 2 and 5 are the most affected.',
    type: 'Delay',
    urgency: 'Normal',
    audience: ['Depot', 'Loop'],
    publishOffset: 5,
    expireOffset: 10,
  },
  {
    key: 'dhl-08',
    title: 'Severe weather – named storm crossing the South East',
    message:
      'High winds were forecast across the South East. Curtain-sided and high-sided vehicles were advised to avoid exposed sections of the A2 and Dartford Crossing.',
    type: 'Warning',
    urgency: 'Critical',
    audience: ['Route'],
    publishOffset: -21,
    expireOffset: -14,
  },
  {
    key: 'dhl-09',
    title: 'Quarterly SLA performance review published',
    message:
      'The quarterly service level report is available in the portal. Network-wide on-time delivery finished at 96.4%; individual service provider breakdowns are in the Vendor Performance page.',
    type: 'Announcement',
    urgency: 'Low',
    audience: ['Depot', 'Loop', 'Route'],
    publishOffset: -32,
    expireOffset: -9,
  },
];

const SP_SEEDS: AvisoSeed[] = [
  {
    key: 'sp-01',
    title: 'Van swap for MD7C – collect from the yard',
    message:
      'The regular van for MD7C is off the road pending a brake inspection. A replacement is parked in bay 4 with the keys at reception. Take a walkaround photo before you leave.',
    type: 'Delay',
    urgency: 'High',
    audience: ['Route'],
    publishOffset: 0,
    expireOffset: 3,
  },
  {
    key: 'sp-02',
    title: 'Payroll cut-off moved to Thursday',
    message:
      'Timesheets and any ad-hoc claims must be submitted by Thursday 17:00 this month instead of Friday. Anything received after that rolls into the following pay run.',
    type: 'Announcement',
    urgency: 'High',
    audience: ['Depot', 'Loop', 'Route'],
    publishOffset: -3,
    expireOffset: 11,
  },
  {
    key: 'sp-03',
    title: 'Driver briefing – Monday 06:30, MSE canteen',
    message:
      'Short briefing before the first wave covering the new loading sequence and last week’s missed-scan figures. Attendance counts towards your monthly compliance record.',
    type: 'Announcement',
    urgency: 'Normal',
    audience: ['Route'],
    publishOffset: -1,
    expireOffset: 7,
  },
  {
    key: 'sp-04',
    title: 'PPE stock check next week',
    message:
      'We are auditing hi-vis vests, safety boots and gloves across the fleet. Let your coordinator know now if anything you were issued is worn or the wrong size — replacements are ordered in one batch.',
    type: 'Warning',
    urgency: 'Low',
    audience: ['Depot'],
    publishOffset: 2,
    expireOffset: 17,
  },
  {
    key: 'sp-05',
    title: 'Summer holiday rota – requests closed',
    message:
      'Thanks to everyone who submitted holiday requests. The confirmed rota has been shared individually; changes from here need a swap agreed with another driver first.',
    type: 'Announcement',
    urgency: 'Normal',
    audience: ['Depot', 'Loop', 'Route'],
    publishOffset: -40,
    expireOffset: -12,
  },
];

function toRecord(seed: AvisoSeed, idPrefix: string, source: 'DHL' | 'SP', spName?: string): AvisoRecord {
  const record: AvisoRecord = {
    id: `${idPrefix}${seed.key}`,
    title: seed.title,
    message: seed.message,
    publishDate: offsetDateStr(seed.publishOffset),
    expireDate: offsetDateStr(seed.expireOffset),
    createdAt: new Date(Date.now() + seed.publishOffset * DAY_MS).toISOString(),
    deleted: false,
    source,
    type: seed.type,
    urgency: seed.urgency,
    audience: seed.audience,
  };
  if (source === 'SP') record.spName = spName || '';
  return record;
}

/** Global DHL broadcasts — visible in every SP's portal. */
export function buildDhlSeedAvisos(): AvisoRecord[] {
  return DHL_SEEDS.map((s) => toRecord(s, 'seed-', 'DHL'));
}

/** The signed-in SP's own announcements — editable and deletable on the page. */
export function buildSpSeedAvisos(sp: string): AvisoRecord[] {
  const slug = sp.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return SP_SEEDS.map((s) => toRecord(s, `seed-${slug}-`, 'SP', sp));
}
