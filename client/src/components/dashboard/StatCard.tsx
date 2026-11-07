import { Icon } from '../icons/Icon'
type Props={label:string;value:string;note:string;icon:'book'|'swap'|'users'|'chart'}
export function StatCard({label,value,note,icon}:Props){return <article className="border border-line bg-surface p-5"><div className="flex items-start justify-between"><div><p className="text-sm text-muted">{label}</p><p className="mt-2 font-serif text-3xl text-ink">{value}</p></div><div className="grid size-10 place-items-center bg-forest/8 text-forest"><Icon name={icon}/></div></div><p className="mt-4 border-t border-line pt-3 text-xs text-muted">{note}</p></article>}
