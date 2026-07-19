import { twMerge } from "tailwind-merge";
import { clsx } from "clsx";

export const Botao = ({
  children,
  variante = "primario",
  tamanho = "md",
  className = "",
  ...props
}) => {
  const base = "inline-flex items-center justify-center gap-2 font-medium rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";
  const variantes = {
    primario: "bg-gov-500 text-white hover:bg-gov-600 focus:ring-gov-500 shadow-sm",
    secundario: "bg-white text-gov-700 border border-gov-200 hover:bg-gov-50 focus:ring-gov-300",
    sucesso: "bg-institucional-sucesso text-white hover:opacity-90",
    perigo: "bg-institucional-perigo text-white hover:opacity-90",
    fantasma: "text-institucional-texto hover:bg-institucional-borda/40",
  };
  const tamanhos = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-2.5 text-base",
  };
  return (
    <button className={twMerge(clsx(base, variantes[variante], tamanhos[tamanho], className))} {...props}>
      {children}
    </button>
  );
};
