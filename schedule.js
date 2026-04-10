// Monthly schedule for Rockville, MD tall fescue (Jonathan Green Black Beauty).
// Sources: UMD Extension Lawn Maintenance Calendar + MDA Lawn Fertilizer Law.
window.LAWN_SCHEDULE = [
  {
    month: 1, name: 'January',
    headline: 'Blackout. Do nothing.',
    detail: 'Maryland fertilizer blackout is active (Nov 16 – Mar 1). Plan ahead: order Black Beauty seed, schedule a soil test through UMD HGIC if you haven\'t in the last 3 years, and keep mower blade sharp.',
    tags: ['blackout']
  },
  {
    month: 2, name: 'February',
    headline: 'Still blackout. Prep the mower.',
    detail: 'Sharpen or replace the mower blade. Review last fall\'s soil test. If you see voles or winter damage, note it for April patching.',
    tags: ['blackout']
  },
  {
    month: 3, name: 'March',
    headline: 'Watch soil temps. Pre-emergent goes down when conditions hit.',
    detail: 'Apply Dimension (dithiopyr) pre-emergent when soil temperature at 2 inch depth reaches 53–55°F for ~5 consecutive days. In Rockville that is usually the last week of March. Do NOT use prodiamine — its 4–6 month residual will block September overseeding.',
    tags: ['pre-emergent', 'watch-soil-temp']
  },
  {
    month: 4, name: 'April',
    headline: 'Backup pre-emergent window. Start mowing.',
    detail: 'If you missed late March, early-to-mid April is the backup window — dithiopyr will still catch very young (pre-tiller) crabgrass seedlings. Begin mowing at 3.5". Spot-treat broadleaf weeds on a warm day. Light spring fertilizer (0.5 lb N / 1,000 sq ft) is optional and only if the lawn looks thin or wasn\'t fed last fall.',
    tags: ['pre-emergent', 'mow', 'optional-fert']
  },
  {
    month: 5, name: 'May',
    headline: 'Last chance for optional spring fert. Raise the mower.',
    detail: 'Optional light nitrogen by Memorial Day at the latest. Raise mowing height toward 4". Keep clippings on the lawn — they return up to 25% of annual N needs.',
    tags: ['optional-fert', 'mow']
  },
  {
    month: 6, name: 'June',
    headline: 'Hands off. Mow high, scout for brown patch.',
    detail: 'No fertilizer. Mow at 4" and water only if grass shows drought stress. Watch for brown patch disease (circular tan patches) in humid spells — it thrives when leaves stay wet overnight.',
    tags: ['mow', 'disease-watch']
  },
  {
    month: 7, name: 'July',
    headline: 'Summer dormancy is fine. Less is more.',
    detail: 'UMD stance: let cool-season grass go dormant. If you insist on keeping it green, water deeply once a week — but know fertilizing now causes more harm than good.',
    tags: ['dormant']
  },
  {
    month: 8, name: 'August',
    headline: 'Mid-month: aerate and prep for the big fall push.',
    detail: 'Core-aerate compacted areas mid-to-late August. Rake up dead thatch. Source your Black Beauty seed and starter fertilizer (Veri-Green 12-18-8). Plan overseeding for September 1.',
    tags: ['aerate', 'prep']
  },
  {
    month: 9, name: 'September',
    headline: 'THE big month. Overseed + first fall fertilizer.',
    detail: 'Overseed Black Beauty September 1 – October 1 (absolute cutoff Oct 15). Apply Veri-Green Starter 12-18-8 at seeding — the 18% phosphate is legal under MD\'s new-lawn exemption. If not overseeding, apply ~0.9 lb N / 1,000 sq ft of slow-release maintenance fertilizer.',
    tags: ['overseed', 'fertilize', 'starter']
  },
  {
    month: 10, name: 'October',
    headline: 'Second fall fertilizer + lime if soil test called for it.',
    detail: 'Second maintenance N app 6–8 weeks after the first (early-to-mid October). If soil test showed acidic pH, apply lime now. Keep new seedlings moist for the first 2–3 weeks.',
    tags: ['fertilize', 'lime']
  },
  {
    month: 11, name: 'November',
    headline: 'Last legal fertilizer day is Nov 15. Final mow.',
    detail: 'If you have one more N application in your annual budget, get it down before November 15. Blackout begins November 16. Clear fallen leaves weekly; buried leaves kill new seedlings. Final mow around 3" going into winter.',
    tags: ['fertilize', 'blackout-imminent']
  },
  {
    month: 12, name: 'December',
    headline: 'Blackout. Mower away.',
    detail: 'Fertilizer blackout in effect until March 1. Keep leaves cleared. Plan next year.',
    tags: ['blackout']
  }
];
