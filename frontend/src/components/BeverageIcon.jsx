const WHITE_GRAPES = [
  'chardonnay','sauvignon','riesling','pinot grigio','pinot gris',
  'torrontés','torrontes','viognier','albariño','albarino','verdejo',
  'moscato','muscat','chenin','grüner','gruner','trebbiano','vermentino',
  'gewürztraminer','gewurztraminer','garganega','greco','palomino','godello',
]
const ROSÉ_KEYWORDS = ['rosé','rose','rosado','clarete']
const WHISKY_KEYWORDS = ['whisky','whiskey','scotch','bourbon','malt','rye','single']
const GIN_KEYWORDS = ['gin','ginebra']
const RUM_KEYWORDS = ['rum','ron','rhum']
const TEQUILA_KEYWORDS = ['tequila','mezcal']
const VODKA_KEYWORDS = ['vodka']

function detectVariant(type, grape) {
  const g = (grape || '').toLowerCase()

  if (type === 'wine') {
    if (ROSÉ_KEYWORDS.some(k => g.includes(k))) return 'rosé'
    if (WHITE_GRAPES.some(k => g.includes(k))) return 'white'
    return 'red'
  }

  if (type === 'spirits') {
    if (WHISKY_KEYWORDS.some(k => g.includes(k))) return 'whisky'
    if (GIN_KEYWORDS.some(k => g.includes(k))) return 'gin'
    if (RUM_KEYWORDS.some(k => g.includes(k))) return 'rum'
    if (TEQUILA_KEYWORDS.some(k => g.includes(k))) return 'tequila'
    if (VODKA_KEYWORDS.some(k => g.includes(k))) return 'vodka'
    return 'spirits'
  }

  return type
}

const VARIANTS = {
  red:     { bg: 'bg-red-950',    border: 'border-red-900',    liquid: '#b91c1c', glass: '#fca5a5' },
  white:   { bg: 'bg-amber-950',  border: 'border-amber-900',  liquid: '#d97706', glass: '#fde68a' },
  'rosé':  { bg: 'bg-pink-950',   border: 'border-pink-900',   liquid: '#be185d', glass: '#fbcfe8' },
  beer:    { bg: 'bg-amber-900',  border: 'border-amber-800',  liquid: '#d97706', glass: '#fef3c7' },
  whisky:  { bg: 'bg-stone-900',  border: 'border-stone-700',  liquid: '#b45309', glass: '#fde68a' },
  gin:     { bg: 'bg-teal-950',   border: 'border-teal-900',   liquid: '#0d9488', glass: '#99f6e4' },
  rum:     { bg: 'bg-orange-950', border: 'border-orange-900', liquid: '#c2410c', glass: '#fed7aa' },
  tequila: { bg: 'bg-lime-950',   border: 'border-lime-900',   liquid: '#65a30d', glass: '#d9f99d' },
  vodka:   { bg: 'bg-zinc-800',   border: 'border-zinc-700',   liquid: '#71717a', glass: '#e4e4e7' },
  spirits: { bg: 'bg-zinc-800',   border: 'border-zinc-700',   liquid: '#78716c', glass: '#d6d3d1' },
  other:   { bg: 'bg-zinc-800',   border: 'border-zinc-700',   liquid: '#71717a', glass: '#a1a1aa' },
}

export default function BeverageIcon({ type, grape_variety, image_url, size = 48 }) {
  if (image_url) {
    return (
      <img
        src={image_url}
        alt=""
        className="rounded-xl object-cover shrink-0 border border-border"
        style={{ width: size, height: size }}
      />
    )
  }

  const variant = detectVariant(type, grape_variety)
  const theme = VARIANTS[variant] || VARIANTS.other
  const s = size

  return (
    <div
      className={`${theme.bg} ${theme.border} border rounded-xl shrink-0 flex items-center justify-center`}
      style={{ width: s, height: s }}
    >
      <Icon variant={variant} theme={theme} size={s * 0.58} />
    </div>
  )
}

function Icon({ variant, theme, size }) {
  if (variant === 'red' || variant === 'white' || variant === 'rosé') {
    return <WineGlass color={theme.glass} liquid={theme.liquid} size={size} />
  }
  if (variant === 'beer') {
    return <BeerMug color={theme.glass} liquid={theme.liquid} size={size} />
  }
  if (variant === 'whisky' || variant === 'rum' || variant === 'spirits') {
    return <RocksGlass color={theme.glass} liquid={theme.liquid} size={size} />
  }
  if (variant === 'gin' || variant === 'tequila' || variant === 'vodka') {
    return <TallGlass color={theme.glass} liquid={theme.liquid} size={size} />
  }
  return <Bottle color={theme.glass} size={size} />
}

function WineGlass({ color, liquid, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 3h14l-2.5 8a6 6 0 0 1-9 0L5 3z" fill={liquid} opacity="0.6" />
      <path d="M5 3h14l-2.5 8a6 6 0 0 1-9 0L5 3z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="12" y1="17" x2="12" y2="21" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8.5" y1="21" x2="15.5" y2="21" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function BeerMug({ color, liquid, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="8" width="12" height="13" rx="2" fill={liquid} opacity="0.6" />
      <rect x="3" y="8" width="12" height="13" rx="2" stroke={color} strokeWidth="1.5" />
      <path d="M15 11h3a2 2 0 0 1 0 4h-3" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 8 Q6 5 9 8 Q12 5 15 8" fill="white" opacity="0.5" />
      <path d="M3 8 Q6 5 9 8 Q12 5 15 8" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  )
}

function RocksGlass({ color, liquid, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 4h14l-2 16H7L5 4z" fill={liquid} opacity="0.5" />
      <path d="M5 4h14l-2 16H7L5 4z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="8" y="12" width="3.5" height="3.5" rx="0.8" fill="white" opacity="0.55" />
      <rect x="12.5" y="10" width="3" height="3" rx="0.8" fill="white" opacity="0.4" />
    </svg>
  )
}

function TallGlass({ color, liquid, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M7 3h10l-1.5 18H8.5L7 3z" fill={liquid} opacity="0.5" />
      <path d="M7 3h10l-1.5 18H8.5L7 3z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="6" y1="8" x2="18" y2="8" stroke={color} strokeWidth="1" opacity="0.5" />
      <circle cx="12" cy="4" r="1.5" fill={color} opacity="0.7" />
    </svg>
  )
}

function Bottle({ color, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9.5 3h5v3l2 3v10a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2V9l2-3V3z" fill={color} opacity="0.3" />
      <path d="M9.5 3h5v3l2 3v10a2 2 0 0 1-2 2h-5a2 2 0 0 1-2-2V9l2-3V3z" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="7.5" y1="13" x2="16.5" y2="13" stroke={color} strokeWidth="1" opacity="0.5" />
    </svg>
  )
}
