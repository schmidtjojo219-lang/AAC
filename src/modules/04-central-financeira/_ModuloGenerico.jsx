import { Card } from "../../ui/components/cards/Card";
export default function ModuloGenerico({ titulo, descricao }) {
  return (
    <div>
      <button onClick={()=>window.history.back()} className="text-sm text-gov-600 hover:underline mb-2">← Voltar</button>
      <h1 className="titulo-pagina">{titulo}</h1>
      <p className="subtitulo-pagina">{descricao}</p>
      <Card className="p-12 text-center text-institucional-textoSecundario">
        <p className="text-5xl mb-3">⚙️</p>
        <p className="font-semibold text-institucional-texto">Estrutura 100% pronta</p>
        <p className="text-sm mt-1">Módulo em implementação — já integrado ao Store do Financeiro e à Auditoria Universal</p>
      </Card>
    </div>
  );
}