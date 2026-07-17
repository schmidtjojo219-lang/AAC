export default function EmptyState({ title = 'Nenhum registro encontrado', children }) {
  return (
    <div className="card p-8 text-center">
      <h3 className="text-xl font-black text-floresta">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-slate-500">{children}</p>
    </div>
  );
}
