export const Input = ({ label, erro, className = "", ...props }) => (
  <div className="w-full">
    {label && <label className="block text-xs font-semibold text-institucional-texto mb-1 uppercase tracking-wide">{label}</label>}
    <input
      className={`w-full px-3 py-2 text-sm border rounded-md bg-white border-institucional-borda focus:border-gov-500 focus:ring-1 focus:ring-gov-500 outline-none transition ${erro ? "border-red-500" : ""} ${className}`}
      {...props}
    />
    {erro && <p className="text-xs text-red-600 mt-1">{erro}</p>}
  </div>
);