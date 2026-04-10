// Monthly schedule for Rockville, MD tall fescue (Jonathan Green Black Beauty).
// Sources: UMD Extension Lawn Maintenance Calendar + MDA Lawn Fertilizer Law.
window.LAWN_SCHEDULE = [
  { month: 1, name: 'January', headline: 'Blackout. Do nothing.', detail: 'Maryland fertilizer blackout is active (Nov 16 – Mar 1). Plan ahead: order Black Beauty seed, schedule a soil test through UMD HGIC if you haven\'t in the last 3 years, sharpen the mower blade.' },
  { month: 2, name: 'February', headline: 'Still blackout. Prep the mower.', detail: 'Finish blade sharpening. Review last fall\'s soil test. Note any winter damage for April patching.' },
  { month: 3, name: 'March', headline: 'Watch soil temps. Pre-emergent goes down when they hit.', detail: 'Apply Dimension (dithiopyr) pre-emergent when soil temperature at 2" depth reaches 53–55°F for ~5 consecutive days. In Rockville that\'s usually the last week of March. Do NOT use prodiamine — its 4–6 month residual blocks September overseeding.' },
  { month: 4, name: 'April', headline: 'Pre-emergent backup window. Start mowing.', detail: 'Early-to-mid April is the backup pre-emergent window — dithiopyr still catches very young (1–2 leaf) crabgrass seedlings. Begin mowing at 3.5". Optional light spring N by Memorial Day only if the lawn looks thin and wasn\'t fed last fall.' },
  { month: 5, name: 'May', headline: 'Last optional N. Raise the mower.', detail: 'If you\'re going to apply optional spring nitrogen, Memorial Day is the cutoff. Raise mowing height toward 4". Keep clippings on the lawn — they return up to 25% of annual N needs.' },
  { month: 6, name: 'June', headline: 'Hands off. Mow high, scout for brown patch.', detail: 'No fertilizer. Mow at 4" and water only if grass shows drought stress. Watch for brown patch disease (circular tan patches) in humid spells.' },
  { month: 7, name: 'July', headline: 'Let it sleep.', detail: 'UMD stance: let cool-season grass go dormant. If you insist on keeping it green, deep-water once a week. Fertilizing now causes more harm than good.' },
  { month: 8, name: 'August', headline: 'Mid-month: aerate. Prep for the big fall push.', detail: 'Core-aerate compacted areas mid-to-late August. Rake dead thatch. Order Black Beauty seed and Veri-Green 12-18-8 starter. Plan overseeding for September 1.' },
  { month: 9, name: 'September', headline: 'The biggest month. Overseed + first fall fertilizer.', detail: 'Overseed Black Beauty September 1 – October 1 (absolute cutoff Oct 15). Apply Veri-Green Starter 12-18-8 at seeding — the 18% phosphate is legal under MD\'s new-lawn exemption. If not overseeding, apply ~0.9 lb N/1,000 sq ft of slow-release maintenance fertilizer.' },
  { month: 10, name: 'October', headline: 'Second fall fertilizer. Lime if the soil test says so.', detail: 'Second maintenance N application 6–8 weeks after the first (early-to-mid October). If soil test showed acidic pH, lime now. Keep new seedlings moist for the first 2–3 weeks.' },
  { month: 11, name: 'November', headline: 'Last legal fertilizer day is Nov 15. Final mow.', detail: 'If you have one more N application in your annual budget, get it down by November 15. Blackout begins November 16. Clear fallen leaves weekly — buried leaves kill new seedlings. Final mow around 3".' },
  { month: 12, name: 'December', headline: 'Blackout. Mower away.', detail: 'Fertilizer blackout in effect until March 1. Keep leaves cleared. Plan next year.' }
];

// Applied treatments this year — add entries as you do things.
// Each entry: { date: 'YYYY-MM-DD', label, detail, tag, completes? (milestone id) }
window.LAWN_LOG = [
  {
    date: '2026-04-02',
    label: 'Scotts Turf Builder Weed & Feed (2 bags)',
    detail: '22.64 lb total across ~8,000 sq ft. Delivered ~0.79 lb N per 1,000 sq ft + 2,4-D for dandelion and clover. Used the spring nitrogen budget for the year — no more N until September.',
    tag: 'fertilizer broadleaf',
    completes: 'spring-fert'
  },
  {
    date: '2026-04-10',
    label: 'First mow of the season',
    detail: 'Cut to 3.5". Clippings left on the lawn. Grass is actively growing — next mows every 5–7 days, never removing more than 1/3 of the blade.',
    tag: 'mow',
    completes: 'first-mow'
  }
];

// Upcoming milestones (month-day, year-agnostic; rolled forward automatically).
// id ties to LAWN_LOG.completes so finished items drop off.
window.LAWN_MILESTONES = [
  { id: 'pre-emergent', date: '04-17', label: 'Apply Dimension (dithiopyr) pre-emergent', note: 'Late-window this year. Wait at least 2 weeks after the April 2 Scotts app to stack herbicides safely, then apply ASAP — crabgrass is germinating now.' },
  { id: 'spring-fert', date: '05-25', label: 'Spring nitrogen deadline', note: 'Already used your spring N budget (Scotts, Apr 2). Nothing to do here — this milestone will clear once logged.' },
  { id: 'first-mow', date: '04-10', label: 'First mow of the season', note: 'Cut at 3.5", clippings on the lawn.' },
  { id: 'aerate', date: '08-20', label: 'Core-aerate compacted areas', note: 'Rent a power aerator from Home Depot. Prep for September overseed.' },
  { id: 'overseed', date: '09-01', label: 'Overseed Black Beauty + Veri-Green starter', note: 'Primary window Sept 1 – Oct 1. Use 12-18-8 starter — the phosphate is legal at seeding.' },
  { id: 'fall-fert-2', date: '10-15', label: 'Second fall maintenance fertilizer', note: 'About 6–8 weeks after the September application. Slow-release N, no phosphorus.' },
  { id: 'last-fert', date: '11-15', label: 'LAST legal fertilizer day', note: 'MD fertilizer blackout begins Nov 16. No exceptions.' }
];
