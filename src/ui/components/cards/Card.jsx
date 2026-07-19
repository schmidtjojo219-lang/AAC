export const Card = ({ children, className = "", ...props }) => (
  <div className={card-oficial p-5 } {...props}>{children}</div>
);

export const CardCabecalho = ({ titulo, subtitulo, acao }) => (
  <div className="flex items-start justify-between mb-4 pb-3 border-b border-institucional-borda">
    <div>
      <h3 className="text-base font-bold text-gov-700">{titulo}</h3>
      {subtitulo && <p className="text-xs text-institucional-textoSecundario mt-0.5">{subtitulo}</p>}
    </div>
    {acao && <div>{acao}</div>}
  </div>
);
