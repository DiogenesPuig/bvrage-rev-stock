import { Link } from 'react-router-dom'
import BeverageIcon from './BeverageIcon'

const TYPE_LABELS = {
  wine:    'Vino',
  beer:    'Cerveza',
  spirits: 'Destilado',
  other:   'Otro',
}

export default function BeverageCard({ beverage }) {
  const { id, name, producer, country, vintage, type, grape_variety, image_url, total_stock } = beverage

  return (
    <Link
      to={`/beverages/${id}`}
      className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-900 transition-colors border-b border-zinc-800/60 last:border-0"
    >
      <BeverageIcon type={type} grape_variety={grape_variety} image_url={image_url} size={48} />

      <div className="flex-1 min-w-0">
        <p className="font-medium text-zinc-100 truncate">{name}</p>
        <p className="text-sm text-zinc-500 truncate mt-0.5">
          {[producer, country, vintage].filter(Boolean).join(' · ')}
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
          {TYPE_LABELS[type] ?? type}
        </span>
        <div className="text-right min-w-[2rem]">
          <span className="text-lg font-semibold text-zinc-100">{total_stock}</span>
          <span className="text-xs text-zinc-600 ml-1">u.</span>
        </div>
      </div>
    </Link>
  )
}
