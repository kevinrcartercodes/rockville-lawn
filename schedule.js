// Monthly schedule for Rockville, MD tall fescue (Jonathan Green Black Beauty).
// Sources: UMD Extension Lawn Maintenance Calendar + MDA Lawn Fertilizer Law.
window.LAWN_SCHEDULE = [
  { month: 1,  name: 'Jan', icon: '❄️', short: 'Rest',           detail: 'Blackout. Sharpen the mower blade. Order seed.' },
  { month: 2,  name: 'Feb', icon: '🔧', short: 'Prep',           detail: 'Still blackout. Finish blade sharpening. Review last soil test.' },
  { month: 3,  name: 'Mar', icon: '🌡️', short: 'Pre-emergent',   detail: 'Watch soil temps. Apply Dimension (dithiopyr) at 53–55°F sustained. NOT prodiamine — it blocks fall overseeding.' },
  { month: 4,  name: 'Apr', icon: '✂️', short: 'First mow',      detail: 'Pre-emergent backup window. Start mowing at 3.5". Optional light N only if lawn is thin AND wasn\'t fed last fall.' },
  { month: 5,  name: 'May', icon: '📏', short: 'Raise mower',    detail: 'No fertilizer. Raise mowing height toward 4". Leave clippings — free nitrogen.' },
  { month: 6,  name: 'Jun', icon: '👀', short: 'Watch',          detail: 'Mow high. No fert. Scout for brown patch in humid spells.' },
  { month: 7,  name: 'Jul', icon: '😴', short: 'Dormant',        detail: 'Let it sleep. UMD stance: dormancy is OK. No fertilizer ever in summer.' },
  { month: 8,  name: 'Aug', icon: '🕳️', short: 'Aerate',         detail: 'Mid-late Aug: core-aerate compacted areas. Order Black Beauty seed and Veri-Green 12-18-8 starter.' },
  { month: 9,  name: 'Sep', icon: '🌱', short: 'Overseed',       detail: 'THE big month. Overseed Black Beauty Sep 1–Oct 1. Apply Veri-Green Starter 12-18-8 at seeding.' },
  { month: 10, name: 'Oct', icon: '💊', short: 'Fert #2',        detail: 'Second maintenance N application 6–8 weeks after the first. Lime if soil test called for it.' },
  { month: 11, name: 'Nov', icon: '⏰', short: 'Last legal day', detail: 'Final fertilizer BEFORE Nov 15. Clear leaves weekly. Final mow around 3".' },
  { month: 12, name: 'Dec', icon: '❄️', short: 'Rest',           detail: 'Blackout. Mower away. Plan next year.' }
];

// Applied treatments this year — add entries as you do things.
window.LAWN_LOG = [
  { date: '2026-04-02', icon: '💊', label: 'Scotts Weed & Feed', detail: '2 bags · 0.79 lb N / 1,000 sq ft · broadleaf killed', completes: 'spring-fert' },
  { date: '2026-04-10', icon: '✂️', label: 'First mow',          detail: 'Cut to 3.5" · clippings left on',                    completes: 'first-mow' }
];

// Upcoming milestones (month-day, year-agnostic; rolled forward automatically).
// id ties to LAWN_LOG.completes so finished items drop off.
window.LAWN_MILESTONES = [
  { id: 'pre-emergent', icon: '🎯', date: '04-17', label: 'Pre-emergent',  note: 'Dimension (dithiopyr). Wait 2+ weeks after Scotts.' },
  { id: 'spring-fert',  icon: '💊', date: '05-25', label: 'Spring N done', note: 'Already used — clears on log entry.' },
  { id: 'first-mow',    icon: '✂️', date: '04-10', label: 'First mow',     note: 'Cut at 3.5", clippings on the lawn.' },
  { id: 'aerate',       icon: '🕳️', date: '08-20', label: 'Aerate',        note: 'Rent power aerator. Prep for Sep overseed.' },
  { id: 'overseed',     icon: '🌱', date: '09-01', label: 'Overseed',      note: 'Black Beauty + Veri-Green 12-18-8 starter.' },
  { id: 'fall-fert-2',  icon: '💊', date: '10-15', label: 'Fert #2',       note: '~6–8 weeks after Sep app. Slow-release, no P.' },
  { id: 'last-fert',    icon: '⏰', date: '11-15', label: 'LAST fert day', note: 'MD blackout starts Nov 16.' }
];
