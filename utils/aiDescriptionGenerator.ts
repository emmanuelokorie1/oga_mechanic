/**
 * Robust AI Vehicle Description Generator
 * Advanced Natural Language Generation (NLG) engine for automotive retail.
 * 
 * Synthesizes unique, persuasive, and context-aware dealership descriptions
 * tailored specifically for automotive marketplaces. Incorporates brand DNA,
 * mechanical health indicators, local market trust cues (Tokunbo / Nigerian-used,
 * customs clearance, chassis/engine block health), and grouped feature amenities.
 * 
 * Features 6 distinct architectural copywriting archetypes with dynamic sentence
 * permutation, character budgeting (< 500 chars), and millions of distinct variations.
 */

export interface VehicleContext {
  year?: string | number;
  make?: string;
  model?: string;
  name?: string;
  condition?: string;
  transmission?: string;
  fuel_type?: string;
  body_type?: string;
  mileage?: string | number;
  mileage_unit?: string;
  exterior_color?: string;
  interior_color?: string;
  features?: string[];
  price?: string | number;
}

export interface GeneratedDescriptionResult {
  text: string;
  styleName: string;
  characterCount: number;
}

// -------------------------------------------------------------
// Helper Utilities: Grammar & Hashing
// -------------------------------------------------------------

const hashString = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
};

const pick = <T>(arr: T[], seed: number): T => {
  return arr[Math.abs(Math.floor(seed)) % arr.length];
};

/**
 * Prepends the correct indefinite article ('a' vs 'an') based on leading vowel sound.
 */
const withArticle = (phrase: string): string => {
  const clean = phrase.trim();
  if (!clean) return '';
  const firstWord = clean.split(' ')[0].toLowerCase();
  const startsWithVowel = /^[aeiou]/i.test(firstWord);
  return `${startsWithVowel ? 'an' : 'a'} ${clean}`;
};

// -------------------------------------------------------------
// Brand & Model Automotive DNA
// -------------------------------------------------------------

const BRAND_DNA: Record<string, string[]> = {
  toyota: [
    'renowned for legendary reliability and rock-solid resale value',
    'celebrated for low maintenance costs and dependable everyday performance',
    'delivering great fuel conservation with affordable spare parts',
  ],
  lexus: [
    'engineered for whisper-quiet cabin serenity and executive comfort',
    'offering executive luxury prestige with effortless V6/V8 dependability',
    'blending first-class craftsmanship with low maintenance peace of mind',
  ],
  mercedes: [
    'distinguished by precision German engineering and executive road presence',
    'boasting refined ride acoustics, premium interior, and solid road poise',
    'crafted for sophisticated luxury and an unmistakable highway feel',
  ],
  'mercedes-benz': [
    'distinguished by precision German engineering and executive road presence',
    'boasting refined ride acoustics, premium interior, and solid road poise',
    'crafted for sophisticated luxury and an unmistakable highway feel',
  ],
  bmw: [
    'delivering the ultimate driving dynamic with sharp throttle response',
    'fusing German athletic performance with high-end luxury',
    'engineered with balanced chassis dynamics and eager acceleration',
  ],
  honda: [
    'powered by a spirited i-VTEC engine known for high fuel thriftiness',
    'combining responsive handling, generous legroom, and durable engineering',
    'celebrated for smooth everyday agility and low running costs',
  ],
  ford: [
    'built with a muscular powertrain and confident highway cruising composure',
    'combining rugged build quality with spacious, comfortable cabin utility',
  ],
  hyundai: [
    'delivering sleek styling, superb fuel economy, and pocket-friendly upkeep',
    'smartly equipped with modern driving conveniences and proven mechanics',
  ],
  kia: [
    'pairing modern aesthetics with efficient performance and low running costs',
    'delivering reliable city agility and comfortable passenger accommodations',
  ],
  'land rover': [
    'commanding peerless luxury, supreme off-road pedigree, and executive status',
    'delivering all-terrain dominance paired with first-class British cabin refinement',
  ],
  'range rover': [
    'commanding peerless luxury, supreme off-road pedigree, and executive status',
    'delivering all-terrain dominance paired with first-class British cabin refinement',
  ],
  nissan: [
    'providing solid daily dependability, comfortable seating, and great value',
    'engineered for practical everyday commuting with smooth power delivery',
  ],
  peugeot: [
    'renowned for supple suspension comfort over rough terrain and low fuel burn',
    'featuring ergonomic European ride comfort and responsive steering',
  ],
  volkswagen: [
    'featuring solid German build quality, taut road manners, and premium fit',
    'engineered for reassuring high-speed stability and refined cabin acoustics',
  ],
  audi: [
    'showcasing sophisticated German innovation and dynamic road grip',
    'crafted with clean executive styling and responsive performance',
  ],
};

const resolveBrandDna = (make?: string, seed = 0): string | null => {
  if (!make) return null;
  const normalized = make.toLowerCase().trim();
  for (const [key, snippets] of Object.entries(BRAND_DNA)) {
    if (normalized.includes(key)) {
      return pick(snippets, seed);
    }
  }
  return null;
};

// -------------------------------------------------------------
// Body Type & Ground Clearance Awareness
// -------------------------------------------------------------

const BODY_TRAITS: Record<string, string[]> = {
  suv: [
    'High ground clearance glides over bumpy roads and flooded terrain with ease.',
    'Elevated ride height delivers commanding visibility and family comfort.',
    'Elevated stance ensures effortless clearance over potholes and speed breakers.',
  ],
  crossover: [
    'Elevated ground clearance offers great pothole damping with car-like fuel thriftiness.',
    'Combines SUV versatility with smooth, nimble city maneuverability.',
  ],
  sedan: [
    'Streamlined aerodynamics ensure smooth highway cruising and effortless parking.',
    'Sleek profile delivers quiet highway efficiency and agile city navigation.',
  ],
  saloon: [
    'Streamlined aerodynamics ensure smooth highway cruising and effortless parking.',
    'Sleek profile delivers quiet highway efficiency and agile city navigation.',
  ],
  truck: [
    'Heavy-duty chassis and durable suspension built for demanding payloads.',
    'Rugged suspension setup delivers untamed workhorse strength and road resilience.',
  ],
  pickup: [
    'Heavy-duty chassis and durable suspension built for demanding payloads.',
    'Rugged suspension setup delivers untamed workhorse strength and road resilience.',
  ],
  hatchback: [
    'Nimble compact footprint makes maneuvering through tight city traffic effortless.',
    'Smart spatial design with flexible cargo utility and fantastic fuel savings.',
  ],
};

const resolveBodyTrait = (bodyType?: string, seed = 0): string | null => {
  if (!bodyType) return null;
  const b = bodyType.toLowerCase().trim();
  for (const [key, list] of Object.entries(BODY_TRAITS)) {
    if (b.includes(key)) {
      return pick(list, seed);
    }
  }
  return null;
};

// -------------------------------------------------------------
// Market Condition & Provenance (African / Nigerian Market Context)
// -------------------------------------------------------------

const CONDITION_DESCRIPTORS: Record<string, string[]> = {
  foreign: [
    'direct foreign-used (Tokunbo)',
    'first-body Tokunbo import',
    'verified Tokunbo grade',
    'fresh foreign-used',
    'clean foreign import',
  ],
  local: [
    'clean Nigerian-used',
    'carefully driven local-used',
    'single-owner Nigerian-used',
    'well-maintained Nigerian-used',
    'sound Nigerian-used',
  ],
  new: [
    'brand-new showroom condition',
    'zero-mileage factory fresh',
    'pristine brand-new',
  ],
  default: [
    'exceptionally clean',
    'first-rate',
    'meticulously maintained',
    'top-grade',
  ],
};

const resolveCondition = (condition?: string, seed = 0): string => {
  if (!condition) return pick(CONDITION_DESCRIPTORS.default, seed);
  const c = condition.toLowerCase();
  if (c.includes('foreign') || c.includes('tokunbo')) return pick(CONDITION_DESCRIPTORS.foreign, seed);
  if (c.includes('local') || c.includes('nigerian')) return pick(CONDITION_DESCRIPTORS.local, seed);
  if (c.includes('new')) return pick(CONDITION_DESCRIPTORS.new, seed);
  return pick(CONDITION_DESCRIPTORS.default, seed);
};

// -------------------------------------------------------------
// Exterior Color Styling
// -------------------------------------------------------------

const formatColor = (color?: string, seed = 0): string => {
  if (!color) return '';
  const c = color.toLowerCase().trim();
  const colorPhrases: Record<string, string[]> = {
    black: ['gleaming obsidian black', 'sleek metallic black', 'clean black finish'],
    white: ['pristine factory white', 'crisp pearl white', 'clean pure white'],
    silver: ['lustrous metallic silver', 'clean silver finish', 'timeless silver'],
    grey: ['gunmetal grey', 'sharp metallic grey', 'clean grey finish'],
    gray: ['gunmetal grey', 'sharp metallic grey', 'clean grey finish'],
    blue: ['deep navy blue', 'royal blue', 'lustrous metallic blue'],
    red: ['radiant crimson red', 'sporty deep red', 'head-turning red'],
    gold: ['rich metallic gold', 'champagne gold finish'],
    wine: ['luxurious wine red', 'deep burgundy finish'],
    brown: ['warm metallic brown', 'earthy bronze-brown'],
  };

  for (const [key, variants] of Object.entries(colorPhrases)) {
    if (c.includes(key)) {
      return pick(variants, seed);
    }
  }
  return `clean ${c} finish`;
};

// -------------------------------------------------------------
// Feature Vocabulary & Semantic Grouping
// -------------------------------------------------------------

const FEATURE_NAMES: Record<string, string[]> = {
  air_conditioning: ['ice-cold factory A/C', 'chilling climate control', 'dual-zone chilling A/C'],
  leather_seats: ['plush leather seats', 'neat leather interior', 'clean leather upholstery'],
  sunroof: ['panoramic sliding sunroof', 'power glass sunroof', 'sunroof'],
  navigation_system: ['touchscreen GPS navigation', 'high-definition display unit', 'integrated digital navigation'],
  bluetooth: ['Bluetooth handsfree & wireless audio', 'crisp Bluetooth audio streaming', 'wireless phone connectivity'],
  reverse_camera: ['high-definition reverse camera', 'wide-angle backup camera with guidelines'],
  parking_sensors: ['proximity parking sensors', 'intelligent parking assist sensors'],
  alloy_wheels: ['stylish factory alloy wheels', 'custom sport alloy rims', 'original alloy wheels'],
  push_start: ['push-button smart start', 'keyless ignition & push start'],
  cruise_control: ['highway cruise control', 'adaptive cruise control'],
  airbags: ['full multi-stage SRS airbags', 'comprehensive safety airbag suite'],
  abs: ['ABS anti-lock braking system', 'advanced 4-wheel ABS brakes'],
  traction_control: ['electronic traction control', 'vehicle stability assist'],
  blind_spot_monitor: ['blind-spot detection monitor', 'active blind-spot alert'],
  lane_assist: ['lane-keep assist system', 'lane departure alert'],
  apple_carplay: ['Apple CarPlay integration', 'smart smartphone mirroring'],
  android_auto: ['Android Auto connectivity', 'smart mobile integration'],
  fog_lights: ['high-visibility fog lamps', 'bright LED fog lights'],
  third_row_seats: ['spacious 3rd-row passenger seating', 'fold-flat 7-seater third row'],
};

const synthesizeFeatures = (features?: string[], seed = 0): string => {
  if (!features || features.length === 0) {
    const defaultCabins = [
      'The cabin is neat, odor-free, and well-preserved.',
      'Inside is an uncluttered, spacious cabin with comfortable seating.',
      'Step into a clean cockpit boasting generous legroom and tidy upholstery.',
      'The interior provides an inviting atmosphere with intact dashboard trim.',
    ];
    return pick(defaultCabins, seed);
  }

  // Pick up to 3 features
  const mapped = features.slice(0, 3).map((f, idx) => {
    const list = FEATURE_NAMES[f.toLowerCase().trim()];
    return list ? pick(list, seed + idx) : f.replace(/_/g, ' ');
  });

  let featurePhrase = '';
  if (mapped.length === 1) {
    featurePhrase = mapped[0];
  } else if (mapped.length === 2) {
    featurePhrase = `${mapped[0]} and ${mapped[1]}`;
  } else {
    featurePhrase = `${mapped[0]}, ${mapped[1]}, and ${mapped[2]}`;
  }

  const variations = [
    `Equipped with ${featurePhrase} for top comfort.`,
    `Cabin highlights include ${featurePhrase}.`,
    `Features ${featurePhrase} ensuring relaxed trips.`,
    `Loaded with convenient amenities including ${featurePhrase}.`,
    `Inside, you enjoy ${featurePhrase} for a premium feel.`,
  ];

  return pick(variations, seed);
};

// -------------------------------------------------------------
// Drivetrain & Mechanical Component Builders
// -------------------------------------------------------------

const getEngineWord = (fuelType?: string, seed = 0): string => {
  const f = (fuelType || 'petrol').toLowerCase();
  if (f.includes('hybrid')) {
    return pick([
      'super-efficient hybrid powertrain',
      'whisper-quiet hybrid synergy engine',
      'economical hybrid motor',
    ], seed);
  }
  if (f.includes('diesel')) {
    return pick([
      'muscular turbo-diesel engine with high torque',
      'heavy-duty, fuel-thrifty diesel engine',
      'robust diesel power plant',
    ], seed);
  }
  return pick([
    'sound, untouched petrol engine block',
    'whisper-quiet petrol engine with zero smoke',
    'healthy, energetic petrol engine',
    'smooth engine operating at optimal factory temperature',
  ], seed);
};

const getTransmissionWord = (transmission?: string, seed = 0): string => {
  const t = (transmission || 'automatic').toLowerCase();
  if (t.includes('manual')) {
    return pick([
      'crisp manual gearbox with firm clutch bite',
      'responsive manual transmission',
      'smooth-engaging manual gear',
    ], seed);
  }
  return pick([
    'silky-smooth automatic transmission',
    'butter-smooth automatic gearbox',
    'seamless shifting automatic transmission',
    'ultra-responsive automatic transmission',
  ], seed);
};

// -------------------------------------------------------------
// 6 Distinct Copywriting Archetypes (Styles)
// -------------------------------------------------------------

export interface ArchetypeDefinition {
  id: string;
  name: string;
  build: (params: {
    title: string;
    conditionStr: string;
    colorStr: string;
    brandDna: string | null;
    bodyTrait: string | null;
    engine: string;
    trans: string;
    featuresText: string;
    features: string[];
    mileageText: string;
    seed: number;
  }) => string;
}

const ARCHETYPES: ArchetypeDefinition[] = [
  // -----------------------------------------------------------
  // Style 0: Executive & Prestige Showcase
  // -----------------------------------------------------------
  {
    id: 'executive',
    name: 'Executive & Prestige Showcase',
    build: ({ title, conditionStr, colorStr, brandDna, engine, trans, featuresText, seed }) => {
      const openers = [
        `Experience refined prestige in this ${conditionStr} ${title}${colorStr ? ` presented in ${colorStr}` : ''}.`,
        `Presenting this exceptionally kept ${conditionStr} ${title}${colorStr ? ` in stunning ${colorStr}` : ''}.`,
        `A true standout: this ${conditionStr} ${title} combines road elegance with peace of mind.`,
        `Elevate your executive drive with this pristine ${conditionStr} ${title}.`,
      ];

      const middle = brandDna 
        ? `Built by a brand ${brandDna}, it combines ${withArticle(engine)} with ${withArticle(trans)}.`
        : `Powered by ${withArticle(engine)} mated to ${withArticle(trans)} for effortless cruising.`;

      const closers = [
        '100% buy and drive with verified paperwork. Pre-purchase inspection welcome!',
        'Accident-free vehicle with complete original customs papers. Contact now to schedule a viewing.',
        'Impeccable first-body condition with clear title. Serious buyers are welcome for a physical test drive.',
        'Priced competitively for swift ownership transfer. Call today to inspect in person.',
      ];

      return `${pick(openers, seed)} ${middle} ${featuresText} ${pick(closers, seed + 1)}`;
    },
  },

  // -----------------------------------------------------------
  // Style 1: Mechanical & Dealership Trust Deep-Dive
  // -----------------------------------------------------------
  {
    id: 'mechanical_trust',
    name: 'Mechanical & Trust Deep-Dive',
    build: ({ title, conditionStr, engine, trans, featuresText, seed }) => {
      const openers = [
        `Mechanically verified and road-tested: sound ${conditionStr} ${title}.`,
        `Certified road-worthy: this ${conditionStr} ${title} passes all dealer health checks with ease.`,
        `Peace of mind guaranteed with this meticulously serviced ${conditionStr} ${title}.`,
        `Inspected and certified: here is a solid ${conditionStr} ${title} ready for instant delivery.`,
      ];

      const mechanicals = [
        `Features ${withArticle(engine)}; the transmission shifts with zero lag or hesitation. Firm suspension over uneven roads.`,
        `Engine block is untouched with factory compression and no abnormal sounds. The gearbox is razor sharp and undercarriage is solid.`,
        `Engine idles silently without smoke or oil leaks, matched with ${withArticle(trans)}. Shock absorbers are 100% intact.`,
        `Runs at normal operating temperature, coupled with ${withArticle(trans)}. Drives straight with zero alignment pull.`,
      ];

      const closers = [
        'Clean diagnostic scan with zero dashboard check lights. Bring your mechanic along for inspection!',
        'Complete documentation available for verification. Nothing to fix—pure buy and drive.',
        'Turn-key condition with original papers intact. Physical test drive warmly encouraged.',
        'Honest, transparent deal with zero hidden faults. Call directly to book an inspection today.',
      ];

      return `${pick(openers, seed)} ${pick(mechanicals, seed + 2)} ${featuresText} ${pick(closers, seed + 3)}`;
    },
  },

  // -----------------------------------------------------------
  // Style 2: High-Impact Fast-Pitch / Quick Clauses
  // -----------------------------------------------------------
  {
    id: 'fast_pitch',
    name: 'Fast-Pitch / Quick Breakdown',
    build: ({ title, conditionStr, colorStr, features, mileageText, seed }) => {
      const headlines = [
        `Top-grade ${conditionStr} ${title}${colorStr ? ` (${colorStr})` : ''}—turn-key ready!`,
        `Hot deal: pristine ${conditionStr} ${title}${colorStr ? ` in ${colorStr}` : ''} ready for handover.`,
        `Clean, verified ${conditionStr} ${title} looking for its next proud owner.`,
        `Spotless ${conditionStr} ${title}—first to inspect will buy!`,
      ];

      const clause1 = pick(['Engine: Untouched & sound', 'Engine: Healthy compression, zero smoke', 'Engine: 100% healthy block'], seed);
      const clause2 = pick(['Gearbox: Seamless shift', 'Transmission: Smooth gear selection', 'Gear: Shifts smoothly, no lag'], seed + 1);
      const clause3 = pick(['A/C: Factory chilling cold', 'Climate: Chills within seconds', 'A/C: Rapid cabin cooling'], seed + 2);
      
      const featurePill = features && features.length > 0 
        ? `Cabin: Neat with ${features.slice(0, 2).map(f => f.replace(/_/g, ' ')).join(' & ')}.`
        : 'Cabin: Very neat, odor-free and well-kept.';

      const closers = [
        'Accident-free with complete customs papers. Call now to inspect!',
        '100% buy and drive. Bring your technician for on-the-spot verification!',
        'Clear title, verified papers, and zero faults. Arrange an immediate viewing.',
        'A genuine bargain in prime condition. Contact today for a swift test drive!',
      ];

      const mileageSnippet = mileageText ? `${mileageText} ` : '';
      return `${pick(headlines, seed)} ${mileageSnippet}Highlights: ${clause1} | ${clause2} | ${clause3}. ${featurePill} ${pick(closers, seed + 4)}`;
    },
  },

  // -----------------------------------------------------------
  // Style 3: Daily Commuter & Fuel Economy Champion
  // -----------------------------------------------------------
  {
    id: 'commuter_value',
    name: 'Commuter & Fuel Economy Champion',
    build: ({ title, conditionStr, brandDna, engine, trans, featuresText, bodyTrait, seed }) => {
      const openers = [
        `Looking for the ultimate dependable commuter? This ${conditionStr} ${title} is your best bet.`,
        `Smart daily commuting made easy with this economical, clean ${conditionStr} ${title}.`,
        `Say goodbye to fuel worries and high maintenance with this sound ${conditionStr} ${title}.`,
        `An ideal daily workhorse: this ${conditionStr} ${title} combines low upkeep with lasting comfort.`,
      ];

      const bodyOrDna = bodyTrait 
        ? bodyTrait 
        : (brandDna ? `Engineered with brand heritage that is ${brandDna}.` : `Combines durable mechanical components with low fuel burn.`);

      const powertrain = `Fitted with ${withArticle(engine)} and ${withArticle(trans)} for effortless navigation in city traffic.`;

      const closers = [
        'Low running costs, readily available parts, and complete papers. Contact today to inspect!',
        'Perfect for everyday family trips or office runs. Call now to arrange a test drive.',
        'Pocket-friendly maintenance and dependable road manners. Available for immediate handover!',
        'Nothing to fix or service. Buy, drive, and enjoy hassle-free commuting right away.',
      ];

      return `${pick(openers, seed)} ${bodyOrDna} ${powertrain} ${featuresText} ${pick(closers, seed + 2)}`;
    },
  },

  // -----------------------------------------------------------
  // Style 4: Tokunbo / First-Body Showcase
  // -----------------------------------------------------------
  {
    id: 'first_body_showcase',
    name: 'Tokunbo / First-Body Showcase',
    build: ({ title, conditionStr, colorStr, engine, trans, featuresText, seed }) => {
      const openers = [
        `First-body ${conditionStr} ${title}${colorStr ? ` sporting a pristine ${colorStr}` : ''}.`,
        `Direct import quality: immaculate ${conditionStr} ${title}${colorStr ? ` in ${colorStr}` : ''}.`,
        `Pristine unpainted first-body ${conditionStr} ${title} with original factory stickers intact.`,
        `Fresh arrival! Handpicked ${conditionStr} ${title} in flawless physical condition.`,
      ];

      const bodyNotes = [
        'Zero accident history, rust-free undercarriage, and straight body lines throughout.',
        'Never suffered frame damage; all glass and panels are authentic factory units.',
        'Chassis and structural pillars are 100% factory original with unblemished undercarriage.',
      ];

      const powertrain = `Engine compartment is clean with ${withArticle(engine)} mated to ${withArticle(trans)}.`;

      const closers = [
        'Complete authentic customs duty documentation on hand. Bring your technician for verification!',
        'Clean title with verified import papers. Buy and drive with absolute confidence—call now!',
        'Original paperwork ready for transfer. Serious buyers are invited to conduct a pre-purchase scan.',
        'A rare find in this prime condition. Contact immediately to book an on-site inspection.',
      ];

      return `${pick(openers, seed)} ${pick(bodyNotes, seed + 1)} ${powertrain} ${featuresText} ${pick(closers, seed + 3)}`;
    },
  },

  // -----------------------------------------------------------
  // Style 5: Road Composure & Dynamics
  // -----------------------------------------------------------
  {
    id: 'road_dynamics',
    name: 'Road Composure & Driving Dynamics',
    build: ({ title, conditionStr, bodyTrait, engine, trans, featuresText, seed }) => {
      const openers = [
        `Command the road with poise and confidence in this ${conditionStr} ${title}.`,
        `Solid road presence meets mechanical excellence in this ${conditionStr} ${title}.`,
        `Ready for city sprints and long-distance highway hauls: this ${conditionStr} ${title}.`,
        `Discover exceptional ride stability in this beautifully maintained ${conditionStr} ${title}.`,
      ];

      const dynamics = bodyTrait 
        ? bodyTrait 
        : `Drives planted on the asphalt with responsive steering and firm road damping.`;

      const mechanicals = `Delivers energetic power from ${withArticle(engine)}, while the ${trans} ensures smooth throttle response.`;

      const closers = [
        'Tested and proven on highway and city terrain. Schedule a test drive today to experience the ride!',
        'Zero mechanical faults, firm braking, and peaceful ownership. Call now to arrange an inspection.',
        'Turn-key ready with complete valid documentation. Reach out promptly to secure this unit.',
        'Exceptional road manners and solid peace of mind. First serious caller takes it home!',
      ];

      return `${pick(openers, seed)} ${dynamics} ${mechanicals} ${featuresText} ${pick(closers, seed + 2)}`;
    },
  },
];

// -------------------------------------------------------------
// Length Budgeting & Polish Sanitizer
// -------------------------------------------------------------

const sanitizeAndBudget = (text: string, maxLen = 485): string => {
  // Normalize whitespace
  let clean = text.replace(/\s+/g, ' ').trim();

  // If comfortably under budget, return
  if (clean.length <= maxLen) {
    return clean;
  }

  // Find the last complete sentence within maxLen
  const truncatedSlice = clean.slice(0, maxLen);
  const lastSentenceBreak = Math.max(
    truncatedSlice.lastIndexOf('. '),
    truncatedSlice.lastIndexOf('! '),
    truncatedSlice.lastIndexOf('? ')
  );

  if (lastSentenceBreak > 260) {
    clean = clean.slice(0, lastSentenceBreak + 1).trim();
  } else {
    // Fallback: search for last full stop before maxLen
    const lastPunctuation = Math.max(
      truncatedSlice.lastIndexOf('.'),
      truncatedSlice.lastIndexOf('!')
    );
    if (lastPunctuation > 260) {
      clean = clean.slice(0, lastPunctuation + 1).trim();
    } else {
      // Hard fallback if no punctuation found: cut at last space and add a full stop
      const lastSpace = truncatedSlice.lastIndexOf(' ');
      clean = clean.slice(0, lastSpace).trim() + '.';
    }
  }

  return clean;
};

// -------------------------------------------------------------
// Public Generator API
// -------------------------------------------------------------

/**
 * Returns structured description metadata including the text, active style archetype name,
 * and character count.
 */
export const generateCarDescriptionDetails = (
  ctx: VehicleContext,
  variationIndex = 0
): GeneratedDescriptionResult => {
  const year = ctx.year ? String(ctx.year).trim() : '';
  const make = ctx.make ? ctx.make.trim() : '';
  const model = ctx.model ? ctx.model.trim() : '';
  const title = [year, make, model].filter(Boolean).join(' ') || ctx.name || 'Vehicle';

  // Seed calculation combines car attributes with variation counter
  const seedString = `${title}-${ctx.condition}-${ctx.transmission}-${ctx.fuel_type}-${variationIndex}`;
  const seed = hashString(seedString) + variationIndex;

  // Resolve archetype dynamically: cycling through the 6 distinct styles
  const archetypeIndex = Math.abs(variationIndex) % ARCHETYPES.length;
  const archetype = ARCHETYPES[archetypeIndex];

  // Resolve contextual semantic tokens
  const conditionStr = resolveCondition(ctx.condition, seed);
  const colorStr = formatColor(ctx.exterior_color, seed);
  const brandDna = resolveBrandDna(ctx.make || title, seed);
  const bodyTrait = resolveBodyTrait(ctx.body_type, seed);
  const engine = getEngineWord(ctx.fuel_type, seed);
  const trans = getTransmissionWord(ctx.transmission, seed);
  const featuresText = synthesizeFeatures(ctx.features, seed);

  // Mileage phrasing if provided
  let mileageText = '';
  if (ctx.mileage) {
    const unit = ctx.mileage_unit || 'km';
    const num = Number(String(ctx.mileage).replace(/[^0-9]/g, ''));
    if (!isNaN(num) && num > 0) {
      if (num < 65000) {
        mileageText = `Low verified mileage (${ctx.mileage.toLocaleString()} ${unit}).`;
      } else {
        mileageText = `Driven ${ctx.mileage.toLocaleString()} ${unit} with regular maintenance.`;
      }
    } else {
      mileageText = `Driven only ${ctx.mileage} ${unit}.`;
    }
  }

  // Synthesize text using selected archetype builder
  const rawText = archetype.build({
    title,
    conditionStr,
    colorStr,
    brandDna,
    bodyTrait,
    engine,
    trans,
    featuresText,
    features: ctx.features || [],
    mileageText,
    seed,
  });

  // Guarantee strict character budget (< 485 chars, Formik max is 500)
  const finalDescription = sanitizeAndBudget(rawText, 485);

  return {
    text: finalDescription,
    styleName: archetype.name,
    characterCount: finalDescription.length,
  };
};

/**
 * Standard generator returning the description text string directly.
 * Backwards compatible with all existing callers.
 */
export const generateCarDescription = (
  ctx: VehicleContext,
  variationIndex = 0
): string => {
  return generateCarDescriptionDetails(ctx, variationIndex).text;
};

/**
 * Returns the list of all available style archetypes for UI pickers or indicators.
 */
export const getCarDescriptionArchetypes = (): { id: string; name: string }[] => {
  return ARCHETYPES.map(a => ({ id: a.id, name: a.name }));
};

// =============================================================
// Rental Car Description Generator
// =============================================================

export interface RentalContext {
  year?: string | number;
  make?: string;
  model?: string;
  name?: string;
  body_type?: string;
  transmission?: string;
  fuel_type?: string;
  seats?: string | number;
  exterior_color?: string;
  features?: string[];
  price?: string | number;
}

export const generateRentalCarDescription = (
  ctx: RentalContext,
  variationIndex = 0
): string => {
  const year = ctx.year ? String(ctx.year).trim() : '';
  const make = ctx.make ? ctx.make.trim() : '';
  const model = ctx.model ? ctx.model.trim() : '';
  const title = [year, make, model].filter(Boolean).join(' ') || ctx.name || 'Rental Vehicle';

  const seed = hashString(`${title}-${ctx.body_type}-${ctx.transmission}-${variationIndex}`) + variationIndex;
  const isUtility = (ctx.body_type || '').toLowerCase().includes('van') || (ctx.body_type || '').toLowerCase().includes('truck');
  const seatsText = ctx.seats ? `comfortable ${ctx.seats}-seater capacity` : 'generous passenger seating';
  const colorStr = formatColor(ctx.exterior_color, seed);

  // Synthesize key amenities for rentals
  const featureHighlight = (ctx.features && ctx.features.length > 0)
    ? `Appointed with ${ctx.features.slice(0, 3).map(f => f.replace(/_/g, ' ')).join(', ')}.`
    : 'Featuring ice-cold factory A/C, plush seating, and a quiet cabin.';

  if (isUtility) {
    const utilityVariants = [
      `Heavy-duty ${title} built for seamless logistics and cargo transport. Offers generous payload capacity, high ground clearance, and reliable suspension for safe transit across town and interstate. Available with an experienced driver. Book now for prompt, hassle-free haulage!`,
      `Dependable ${title} ready for your commercial errands and equipment moving. Features a spacious cargo bay, robust engine performance, and secure tie-down space. Clean, road-ready, and fuel-thrifty. Flexible daily and weekly rental packages available.`,
      `Commercial-grade ${title} offering untamed workhorse strength. Designed for smooth loading, durable road composure over rough roads, and timely delivery. Professional, punctual service guaranteed. Contact now to secure your booking date!`,
    ];
    return sanitizeAndBudget(pick(utilityVariants, seed), 485);
  }

  // Passenger rental styles (Executive, Airport/City, Interstate, Events)
  const styles = [
    // 0: Executive Chauffeur & Business
    `Experience first-class comfort in this executive ${title}${colorStr ? ` in ${colorStr}` : ''}. Tailored for corporate transfers, VIP protocol, and city transit with ${seatsText}. ${featureHighlight} Driven by a courteous, professional chauffeur. Reserve today for a prestigious journey!`,
    // 1: Interstate & Family Travel
    `Travel with complete peace of mind in this sound ${title}. Perfect for interstate family journeys and long-distance road trips with ${seatsText} and ample luggage room. Mechanically tested with healthy tires, smooth transmission, and powerful A/C. Book now for a safe trip!`,
    // 2: Events & Wedding Escort
    `Make an elegant statement on your special day with this spotless ${title}${colorStr ? ` (${colorStr})` : ''}. Ideal for wedding convoys, anniversary celebrations, and VIP airport receptions. Arrives immaculately clean with chilling climate control. Flexible daily rates available!`,
    // 3: Daily City Commute & Convenience
    `Smooth, stress-free urban mobility with this pristine ${title}. Offers effortless automatic handling, exceptional fuel thriftiness, and ${seatsText}. ${featureHighlight} Perfect for daily business runs and weekend leisure. Contact now to lock in your rental!`,
  ];

  return sanitizeAndBudget(pick(styles, seed), 485);
};

// =============================================================
// Auto Spare Part Description Generator
// =============================================================

export interface SparePartContext {
  name?: string;
  category?: string;
  condition?: string;
  compatibleMakes?: string[];
  compatibleModels?: string[];
  brand?: string;
  price?: string | number;
}

export const generateSparePartDescription = (
  ctx: SparePartContext,
  variationIndex = 0
): string => {
  const partName = ctx.name?.trim() || 'Auto Spare Part';
  const condition = (ctx.condition || 'new').toLowerCase();
  const isTokunbo = condition.includes('foreign') || condition.includes('tokunbo') || condition.includes('used');

  const seed = hashString(`${partName}-${condition}-${variationIndex}`) + variationIndex;

  // Build compatibility text
  let compatText = '';
  if (ctx.compatibleMakes && ctx.compatibleMakes.length > 0) {
    const makeList = ctx.compatibleMakes.slice(0, 3).join(', ');
    compatText = `compatible with ${makeList} models`;
  } else if (ctx.compatibleModels && ctx.compatibleModels.length > 0) {
    compatText = `fits ${ctx.compatibleModels.slice(0, 3).join(', ')}`;
  } else {
    compatText = 'engineered for wide vehicle compatibility';
  }

  const conditionDesc = isTokunbo
    ? 'thoroughly tested foreign-used (Tokunbo) grade'
    : 'brand-new OEM standard';

  const styles = [
    // 0: OEM Direct Fit & Precision
    `High-grade ${partName} in ${conditionDesc}, ${compatText}. Built to exact factory specifications for a flawless direct drop-in fitment. Restores original vehicle safety, responsiveness, and performance with zero modification required. Fast nationwide dispatch guaranteed!`,
    // 1: Tested Working & Peace of Mind
    `Certified quality ${partName} (${conditionDesc}), ${compatText}. Inspected and confirmed 100% functional with zero defects, cracks, or wear issues. High durability guaranteed under rigorous driving conditions. Order now for prompt delivery directly to your workshop!`,
    // 2: Mechanic Approved Heavy-Duty
    `Mechanic-recommended ${partName} offering superior durability and heat resistance. Specifically ${compatText} to ensure seamless replacement and prolonged component lifespan. Built to withstand rough road conditions with reliable performance. In stock and ready to ship!`,
    // 3: Fast Replacement & Reliable Performance
    `Premium replacement ${partName} in prime ${conditionDesc}. Direct fit for ${compatText}, delivering factory-level efficiency and dependable performance from day one. Backed by inspection assurance with fast dispatch across Nigeria. Contact now to order!`,
  ];

  return sanitizeAndBudget(pick(styles, seed), 485);
};

