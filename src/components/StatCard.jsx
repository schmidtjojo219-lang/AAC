export default function StatCard({ title, value, subtitle, icon: Icon }) {
  return (
    <div className="card min-w-0 p-5 min-h-[150px]">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-snug text-slate-500">{title}</p>
          <p className="mt-3 whitespace-nowrap text-2xl font-black leading-none tracking-tight text-floresta xl:text-[1.75rem]">
            {value}
          </p>
          {subtitle && <p className="mt-2 text-sm leading-snug text-slate-500">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="shrink-0 rounded-2xl bg-creme p-3 text-floresta">
            <Icon size={22} />
          </div>
        )}
      </div>
    </div>
  );
}
