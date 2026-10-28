/**
 * Vietjet Air Fleet and Aircraft Resolution Service.
 *
 * Provides realistic aircraft mapping (Airbus A321neo, Airbus A321, Airbus A320,
 * Airbus A330-300, Boeing 737 MAX) based on Vietjet's curated flight schedule,
 * routes, and fleet distribution.
 */

import { AIRCRAFT_MODELS, type AircraftModel } from '../constants';

export { AIRCRAFT_MODELS, type AircraftModel };

/**
 * Curated aircraft mapping per flight number based on Vietjet Air operational schedule.
 * Includes primary flights and business wave twins (VJ3001..).
 */
export const SCHEDULE_AIRCRAFT_MAP: Record<string, string> = {
  "VJ121": "Airbus A321neo",
  "VJ3001": "Airbus A321neo",
  "VJ123": "Airbus A321neo",
  "VJ3002": "Airbus A321neo",
  "VJ127": "Airbus A321neo",
  "VJ3003": "Airbus A321neo",
  "VJ131": "Airbus A321neo",
  "VJ3004": "Airbus A321neo",
  "VJ135": "Airbus A330-300",
  "VJ3005": "Airbus A330-300",
  "VJ143": "Airbus A321neo",
  "VJ3006": "Airbus A321neo",
  "VJ151": "Airbus A321neo",
  "VJ3007": "Airbus A321neo",
  "VJ157": "Airbus A330-300",
  "VJ3008": "Airbus A330-300",
  "VJ161": "Airbus A321neo",
  "VJ3009": "Airbus A321neo",
  "VJ120": "Airbus A321neo",
  "VJ3010": "Airbus A321neo",
  "VJ122": "Airbus A321neo",
  "VJ3011": "Airbus A321neo",
  "VJ124": "Airbus A321neo",
  "VJ3012": "Airbus A321neo",
  "VJ126": "Airbus A330-300",
  "VJ3013": "Airbus A330-300",
  "VJ130": "Airbus A321neo",
  "VJ3014": "Airbus A321neo",
  "VJ134": "Airbus A330-300",
  "VJ3015": "Airbus A330-300",
  "VJ142": "Airbus A321neo",
  "VJ3016": "Airbus A321neo",
  "VJ150": "Airbus A321neo",
  "VJ3017": "Airbus A321neo",
  "VJ160": "Airbus A321neo",
  "VJ3018": "Airbus A321neo",
  "VJ501": "Airbus A321neo",
  "VJ3019": "Airbus A321neo",
  "VJ503": "Airbus A321",
  "VJ3020": "Airbus A321",
  "VJ507": "Airbus A321",
  "VJ3021": "Airbus A321",
  "VJ511": "Airbus A321neo",
  "VJ3022": "Airbus A321neo",
  "VJ502": "Airbus A321neo",
  "VJ3023": "Airbus A321neo",
  "VJ504": "Airbus A321",
  "VJ3024": "Airbus A321",
  "VJ508": "Airbus A321",
  "VJ3025": "Airbus A321",
  "VJ512": "Airbus A321neo",
  "VJ3026": "Airbus A321neo",
  "VJ620": "Airbus A321neo",
  "VJ3027": "Airbus A321neo",
  "VJ624": "Airbus A321",
  "VJ3028": "Airbus A321",
  "VJ628": "Airbus A321",
  "VJ3029": "Airbus A321",
  "VJ632": "Airbus A321neo",
  "VJ3030": "Airbus A321neo",
  "VJ621": "Airbus A321neo",
  "VJ3031": "Airbus A321neo",
  "VJ625": "Airbus A321",
  "VJ3032": "Airbus A321",
  "VJ629": "Airbus A321",
  "VJ3033": "Airbus A321",
  "VJ633": "Airbus A321neo",
  "VJ3034": "Airbus A321neo",
  "VJ320": "Airbus A321",
  "VJ3035": "Airbus A321",
  "VJ324": "Airbus A321",
  "VJ3036": "Airbus A321",
  "VJ328": "Airbus A321",
  "VJ3037": "Airbus A321",
  "VJ321": "Airbus A321",
  "VJ3038": "Airbus A321",
  "VJ325": "Airbus A321",
  "VJ3039": "Airbus A321",
  "VJ329": "Airbus A321",
  "VJ3040": "Airbus A321",
  "VJ451": "Airbus A321",
  "VJ3041": "Airbus A321",
  "VJ455": "Airbus A321",
  "VJ3042": "Airbus A321",
  "VJ452": "Airbus A321",
  "VJ3043": "Airbus A321",
  "VJ456": "Airbus A321",
  "VJ3044": "Airbus A321",
  "VJ600": "Airbus A321",
  "VJ3045": "Airbus A321",
  "VJ604": "Airbus A321",
  "VJ3046": "Airbus A321",
  "VJ608": "Airbus A321",
  "VJ3047": "Airbus A321",
  "VJ601": "Airbus A321",
  "VJ3048": "Airbus A321",
  "VJ605": "Airbus A321",
  "VJ3049": "Airbus A321",
  "VJ609": "Airbus A321",
  "VJ3050": "Airbus A321",
  "VJ771": "Airbus A321",
  "VJ3051": "Airbus A321",
  "VJ775": "Airbus A321",
  "VJ3052": "Airbus A321",
  "VJ772": "Airbus A321",
  "VJ3053": "Airbus A321",
  "VJ776": "Airbus A321",
  "VJ3054": "Airbus A321",
  "VJ561": "Airbus A321",
  "VJ3055": "Airbus A321",
  "VJ562": "Airbus A321",
  "VJ3056": "Airbus A321",
  "VJ301": "Airbus A321",
  "VJ3057": "Airbus A321",
  "VJ302": "Airbus A321",
  "VJ3058": "Airbus A321",
  "VJ461": "Airbus A321",
  "VJ3059": "Airbus A321",
  "VJ462": "Airbus A321",
  "VJ3060": "Airbus A321",
  "VJ701": "Airbus A321",
  "VJ3061": "Airbus A321",
  "VJ702": "Airbus A321",
  "VJ3062": "Airbus A321",
  "VJ721": "Airbus A320",
  "VJ3063": "Airbus A320",
  "VJ722": "Airbus A320",
  "VJ3064": "Airbus A320",
  "VJ280": "Airbus A321",
  "VJ3065": "Airbus A321",
  "VJ286": "Airbus A321",
  "VJ3066": "Airbus A321",
  "VJ281": "Airbus A321",
  "VJ3067": "Airbus A321",
  "VJ287": "Airbus A321",
  "VJ3068": "Airbus A321",
  "VJ211": "Airbus A320",
  "VJ3069": "Airbus A320",
  "VJ212": "Airbus A320",
  "VJ3070": "Airbus A320",
  "VJ210": "Airbus A321",
  "VJ3071": "Airbus A321",
  "VJ220": "Airbus A321",
  "VJ3072": "Airbus A321",
  "VJ215": "Airbus A321",
  "VJ3073": "Airbus A321",
  "VJ225": "Airbus A321",
  "VJ3074": "Airbus A321",
  "VJ231": "Airbus A321",
  "VJ3075": "Airbus A321",
  "VJ232": "Airbus A321",
  "VJ3076": "Airbus A321",
  "VJ240": "Airbus A321",
  "VJ3077": "Airbus A321",
  "VJ244": "Airbus A321",
  "VJ3078": "Airbus A321",
  "VJ241": "Airbus A321",
  "VJ3079": "Airbus A321",
  "VJ245": "Airbus A321",
  "VJ3080": "Airbus A321",
  "VJ431": "Airbus A321",
  "VJ3081": "Airbus A321",
  "VJ432": "Airbus A321",
  "VJ3082": "Airbus A321",
  "VJ380": "Airbus A321",
  "VJ3083": "Airbus A321",
  "VJ386": "Airbus A321",
  "VJ3084": "Airbus A321",
  "VJ381": "Airbus A321",
  "VJ3085": "Airbus A321",
  "VJ387": "Airbus A321",
  "VJ3086": "Airbus A321",
  "VJ441": "Airbus A321",
  "VJ3087": "Airbus A321",
  "VJ442": "Airbus A321",
  "VJ3088": "Airbus A321",
  "VJ206": "Airbus A321",
  "VJ3089": "Airbus A321",
  "VJ207": "Airbus A321",
  "VJ3090": "Airbus A321",
  "VJ421": "Airbus A321",
  "VJ3091": "Airbus A321",
  "VJ422": "Airbus A321",
  "VJ3092": "Airbus A321",
  "VJ391": "Airbus A321",
  "VJ3093": "Airbus A321",
  "VJ392": "Airbus A321",
  "VJ3094": "Airbus A321",
  "VJ491": "Airbus A321",
  "VJ3095": "Airbus A321",
  "VJ492": "Airbus A321",
  "VJ3096": "Airbus A321",
  "VJ351": "Airbus A321",
  "VJ3097": "Airbus A321",
  "VJ357": "Airbus A321",
  "VJ3098": "Airbus A321",
  "VJ352": "Airbus A321",
  "VJ3099": "Airbus A321",
  "VJ358": "Airbus A321",
  "VJ3100": "Airbus A321",
  "VJ401": "Airbus A321",
  "VJ3101": "Airbus A321",
  "VJ402": "Airbus A321",
  "VJ3102": "Airbus A321",
  "VJ361": "Airbus A321",
  "VJ3103": "Airbus A321",
  "VJ367": "Airbus A321",
  "VJ3104": "Airbus A321",
  "VJ362": "Airbus A321",
  "VJ3105": "Airbus A321",
  "VJ368": "Airbus A321",
  "VJ3106": "Airbus A321",
  "VJ291": "Airbus A320",
  "VJ3107": "Airbus A320",
  "VJ292": "Airbus A320",
  "VJ3108": "Airbus A320",
  "VJ297": "Airbus A321",
  "VJ3109": "Airbus A321",
  "VJ298": "Airbus A321",
  "VJ3110": "Airbus A321",
  "VJ411": "Airbus A321",
  "VJ3111": "Airbus A321",
  "VJ412": "Airbus A321",
  "VJ3112": "Airbus A321",
  "VJ371": "Airbus A321",
  "VJ3113": "Airbus A321",
  "VJ372": "Airbus A321",
  "VJ3114": "Airbus A321",
  "VJ271": "Airbus A320",
  "VJ3115": "Airbus A320",
  "VJ272": "Airbus A320",
  "VJ3116": "Airbus A320",
  "VJ230": "Airbus A321",
  "VJ3117": "Airbus A321",
  "VJ235": "Airbus A321",
  "VJ3118": "Airbus A321",
  "VJ481": "Airbus A321",
  "VJ3119": "Airbus A321",
  "VJ482": "Airbus A321",
  "VJ3120": "Airbus A321",
  "VJ260": "Airbus A321",
  "VJ3121": "Airbus A321",
  "VJ261": "Airbus A321",
  "VJ3122": "Airbus A321",
  "VJ1031": "Airbus A320",
  "VJ3123": "Airbus A320",
  "VJ1032": "Airbus A320",
  "VJ3124": "Airbus A320",
  "VJ1041": "Airbus A320",
  "VJ3125": "Airbus A320",
  "VJ1042": "Airbus A320",
  "VJ3126": "Airbus A320",
  "VJ811": "Airbus A321neo",
  "VJ3127": "Airbus A321neo",
  "VJ813": "Airbus A321neo",
  "VJ3128": "Airbus A321neo",
  "VJ812": "Airbus A321neo",
  "VJ3129": "Airbus A321neo",
  "VJ814": "Airbus A321neo",
  "VJ3130": "Airbus A321neo",
  "VJ915": "Airbus A321neo",
  "VJ3131": "Airbus A321neo",
  "VJ916": "Airbus A321neo",
  "VJ3132": "Airbus A321neo",
  "VJ801": "Airbus A321",
  "VJ3133": "Airbus A321",
  "VJ803": "Airbus A321",
  "VJ3134": "Airbus A321",
  "VJ805": "Airbus A321",
  "VJ3135": "Airbus A321",
  "VJ802": "Airbus A321",
  "VJ3136": "Airbus A321",
  "VJ804": "Airbus A321",
  "VJ3137": "Airbus A321",
  "VJ806": "Airbus A321",
  "VJ3138": "Airbus A321",
  "VJ901": "Airbus A321",
  "VJ3139": "Airbus A321",
  "VJ903": "Airbus A321",
  "VJ3140": "Airbus A321",
  "VJ902": "Airbus A321",
  "VJ3141": "Airbus A321",
  "VJ904": "Airbus A321",
  "VJ3142": "Airbus A321",
  "VJ961": "Airbus A321neo",
  "VJ3143": "Airbus A321",
  "VJ962": "Airbus A321neo",
  "VJ3144": "Airbus A321",
  "VJ971": "Airbus A321neo",
  "VJ3145": "Airbus A321",
  "VJ972": "Airbus A321neo",
  "VJ3146": "Airbus A321",
  "VJ825": "Airbus A321",
  "VJ3147": "Airbus A321",
  "VJ826": "Airbus A321",
  "VJ3148": "Airbus A321",
  "VJ893": "Airbus A321neo",
  "VJ3149": "Airbus A321neo",
  "VJ894": "Airbus A321neo",
  "VJ3150": "Airbus A321neo",
  "VJ997": "Airbus A321neo",
  "VJ3151": "Airbus A321neo",
  "VJ998": "Airbus A321neo",
  "VJ3152": "Airbus A321neo",
  "VJ851": "Airbus A321",
  "VJ3153": "Airbus A321",
  "VJ852": "Airbus A321",
  "VJ3154": "Airbus A321",
  "VJ862": "Airbus A330-300",
  "VJ3155": "Airbus A330-300",
  "VJ864": "Airbus A330-300",
  "VJ3156": "Airbus A330-300",
  "VJ863": "Airbus A330-300",
  "VJ3157": "Airbus A330-300",
  "VJ865": "Airbus A330-300",
  "VJ3158": "Airbus A330-300",
  "VJ960": "Airbus A321neo",
  "VJ3159": "Airbus A321neo",
  "VJ3160": "Airbus A321neo",
  "VJ3161": "Airbus A321neo",
  "VJ963": "Airbus A321neo",
  "VJ3162": "Airbus A321neo",
  "VJ874": "Airbus A321neo",
  "VJ3163": "Airbus A321neo",
  "VJ875": "Airbus A321neo",
  "VJ3164": "Airbus A321neo",
  "VJ838": "Airbus A321neo",
  "VJ3165": "Airbus A321neo",
  "VJ839": "Airbus A321neo",
  "VJ3166": "Airbus A321neo",
  "VJ974": "Airbus A321neo",
  "VJ3167": "Airbus A321neo",
  "VJ975": "Airbus A321neo",
  "VJ3168": "Airbus A321neo",
  "VJ828": "Airbus A321neo",
  "VJ3169": "Airbus A321neo",
  "VJ829": "Airbus A321neo",
  "VJ3170": "Airbus A321neo",
  "VJ938": "Airbus A321neo",
  "VJ3171": "Airbus A321neo",
  "VJ939": "Airbus A321neo",
  "VJ3172": "Airbus A321neo",
  "VJ822": "Airbus A330-300",
  "VJ3173": "Airbus A330-300",
  "VJ823": "Airbus A330-300",
  "VJ3174": "Airbus A330-300",
  "VJ932": "Airbus A330-300",
  "VJ3175": "Airbus A330-300",
  "VJ933": "Airbus A330-300",
  "VJ3176": "Airbus A330-300",
  "VJ840": "Airbus A321",
  "VJ3177": "Airbus A321",
  "VJ841": "Airbus A321",
  "VJ3178": "Airbus A321",
  "VJ940": "Airbus A321",
  "VJ3179": "Airbus A321",
  "VJ941": "Airbus A321",
  "VJ3180": "Airbus A321",
  "VJ876": "Airbus A321",
  "VJ3181": "Airbus A321",
  "VJ877": "Airbus A321",
  "VJ3182": "Airbus A321",
  "VJ085": "Airbus A330-300",
  "VJ3183": "Airbus A330-300",
  "VJ086": "Airbus A330-300",
  "VJ3184": "Airbus A330-300",
  "VJ063": "Airbus A330-300",
  "VJ3185": "Airbus A330-300",
  "VJ064": "Airbus A330-300",
  "VJ3186": "Airbus A330-300",
  "VJ083": "Airbus A330-300",
  "VJ3187": "Airbus A330-300",
  "VJ084": "Airbus A330-300",
  "VJ3188": "Airbus A330-300",
  "VJ089": "Airbus A321neo",
  "VJ3189": "Airbus A321neo",
  "VJ090": "Airbus A321neo",
  "VJ3190": "Airbus A321neo",
  "VJ895": "Airbus A321neo",
  "VJ3191": "Airbus A321neo",
  "VJ896": "Airbus A321neo",
  "VJ3192": "Airbus A321neo",
  "VJ3193": "Airbus A321neo",
  "VJ3194": "Airbus A321neo",
  "VJ883": "Airbus A321neo",
  "VJ3195": "Airbus A321neo",
  "VJ884": "Airbus A321neo",
  "VJ3196": "Airbus A321neo",
  "VJ983": "Airbus A321neo",
  "VJ3197": "Airbus A321neo",
  "VJ984": "Airbus A321neo",
  "VJ3198": "Airbus A321neo"
};

/**
 * Normalise any raw aircraft string (e.g. from DB or API) into a user-facing aircraft model name.
 */
export function normalizeAircraftName(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return AIRCRAFT_MODELS.A321;
  const trimmed = raw.trim();
  const upper = trimmed.toUpperCase();

  if (upper === 'A321NEO' || upper === 'AIRBUS A321NEO') return AIRCRAFT_MODELS.A321NEO;
  if (upper === 'A321' || upper === 'AIRBUS A321') return AIRCRAFT_MODELS.A321;
  if (upper === 'A320' || upper === 'AIRBUS A320') return AIRCRAFT_MODELS.A320;
  if (upper.includes('330') || upper === 'A330' || upper === 'A330-300') return AIRCRAFT_MODELS.A330;
  if (upper.includes('737') || upper === 'B737' || upper === 'BOEING 737') return AIRCRAFT_MODELS.B737_MAX;
  if (upper.includes('787') || upper === 'B787') return AIRCRAFT_MODELS.B787;

  return trimmed;
}

/** Airports primarily served by wide-body aircraft (Airbus A330-300). */
const WIDEBODY_AIRPORTS = new Set(['SYD', 'MEL', 'BNE', 'PER', 'DEL', 'BOM']);

/** Regional airports with shorter runways often served by Airbus A320. */
const REGIONAL_A320_AIRPORTS = new Set(['DIN', 'VCS', 'VKG', 'VDO', 'VII', 'HPH']);

/**
 * Deterministic pseudo-hash from a flight number string to distribute unknown flights
 * naturally across Vietjet fleet variants.
 */
function hashFlightNo(flightNo: string): number {
  let hash = 0;
  for (let i = 0; i < flightNo.length; i++) {
    hash = (hash * 31 + flightNo.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Resolve the realistic aircraft model for a flight given its flight number and optional route.
 */
export function resolveAircraft(
  flightNo?: string | null,
  fromCode?: string | null,
  toCode?: string | null,
  rawAircraft?: string | null
): string {
  // 1. If explicit aircraft code is present, normalise and return it
  if (rawAircraft && rawAircraft.trim()) {
    return normalizeAircraftName(rawAircraft);
  }

  const cleanNo = (flightNo || '').toUpperCase().replace(/\s+/g, '');

  // 2. Look up in curated flight schedule
  if (cleanNo && SCHEDULE_AIRCRAFT_MAP[cleanNo]) {
    return SCHEDULE_AIRCRAFT_MAP[cleanNo];
  }

  // 3. Airline prefix heuristics
  if (cleanNo.startsWith('VZ')) {
    // Thai Vietjet operates Boeing 737 MAX and A320
    return (hashFlightNo(cleanNo) % 2 === 0) ? AIRCRAFT_MODELS.B737_MAX : AIRCRAFT_MODELS.A320;
  }
  if (cleanNo.startsWith('VN') || cleanNo.startsWith('VNA')) {
    return 'Boeing 787-9 Dreamliner';
  }
  if (cleanNo.startsWith('QH') || cleanNo.startsWith('BL')) {
    return 'Airbus A321';
  }

  // 4. Route-based heuristics
  const from = (fromCode || '').toUpperCase().trim();
  const to = (toCode || '').toUpperCase().trim();

  if (WIDEBODY_AIRPORTS.has(from) || WIDEBODY_AIRPORTS.has(to)) {
    return AIRCRAFT_MODELS.A330;
  }

  if (REGIONAL_A320_AIRPORTS.has(from) || REGIONAL_A320_AIRPORTS.has(to)) {
    return AIRCRAFT_MODELS.A320;
  }

  // 5. Deterministic fleet distribution for Vietjet:
  // - 50% Airbus A321neo
  // - 25% Airbus A321
  // - 15% Airbus A320
  // - 10% Boeing 737 MAX
  const bucket = hashFlightNo(cleanNo || 'VJ000') % 100;
  if (bucket < 50) return AIRCRAFT_MODELS.A321NEO;
  if (bucket < 75) return AIRCRAFT_MODELS.A321;
  if (bucket < 90) return AIRCRAFT_MODELS.A320;
  return AIRCRAFT_MODELS.B737_MAX;
}
