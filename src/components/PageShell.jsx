export default function PageShell({ eyebrow, title, description, children, action }) {
  return (
    <div>
      <div className="mb-7 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-terra">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-black text-floresta lg:text-5xl">{title}</h1>
          {description && <p className="mt-2 max-w-3xl text-slate-600">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}
