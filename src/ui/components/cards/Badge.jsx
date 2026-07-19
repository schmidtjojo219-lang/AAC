export const Badge = ({ children, cor = "info" }) => {
  const cores = {
    info: "bg-gov-100 text-gov-700",
    sucesso: "bg-green-100 text-green-700",
    alerta: "bg-yellow-100 text-yellow-800",
    perigo: "bg-red-100 text-red-700",
    neutro: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold }>
      {children}
    </span>
  );
};
