import { useFinanceiroStore } from "../financeiroStore";
import { Card, CardCabecalho } from "../../../ui/components/cards/Card";
import { Botao } from "../../../ui/components/buttons/Botao";
import { Input } from "../../../ui/components/forms/Input";

export default function FundosPage() {
  const { fundos, atualizarPercentualFundo } = useFinanceiroStore();
  const total = fundos.reduce((s,f)=>s+f.percentual,0);

  return (
    <div>
      <button onClick={()=>window.history.back()} className="text-sm text-gov-600 hover:underline mb-2">← Voltar</button>
      <h1 className="titulo-pagina">🗃️ Fundos e Percentuais</h1>
      <p className="subtitulo-pagina">Configure aqui como cada real recebido é dividido automaticamente</p>

      <Card>
        <CardCabecalho
          titulo="Distribuição Automática"
          subtitulo={`Total atual: ${total}% ${total===100?"✅ Fechado":"⚠️ Ajuste para chegar em 100%"}`}
          acao={<Botao variante="secundario" tamanho="sm">+ Novo Fundo</Botao>}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fundos.map(f => (
            <div key={f.id} className="p-4 border border-institucional-borda rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-3 h-3 rounded-full" style={{background:f.cor}}></span>
                <span className="font-bold">{f.nome}</span>
                <span className="ml-auto text-sm text-institucional-textoSecundario">Saldo: R$ {f.saldo.toFixed(2)}</span>
              </div>
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <Input label="Percentual (%)" type="number" min="0" max="100"
                    defaultValue={f.percentual}
                    onChange={e => atualizarPercentualFundo(f.id, e.target.value)} />
                </div>
                <Botao variante="secundario" tamanho="sm">Editar</Botao>
              </div>
              <div className="w-full h-2 bg-institucional-borda rounded-full mt-3 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{width:`${f.percentual}%`, background:f.cor}}></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}