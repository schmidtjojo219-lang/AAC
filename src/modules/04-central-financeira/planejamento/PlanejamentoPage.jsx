import { useFinanceiroStore } from "../financeiroStore";
import { Card, CardCabecalho } from "../../../ui/components/cards/Card";
import { Botao } from "../../../ui/components/buttons/Botao";
import { Input } from "../../../ui/components/forms/Input";

export default function PlanejamentoPage() {
  const { planejamento, fundos } = useFinanceiroStore();
  const totalReceitas = planejamento.receitasRecorrentes + planejamento.receitasEsporadicas + planejamento.receitasExtraordinarias;

  return (
    <div>
      <button onClick={()=>window.history.back()} className="text-sm text-gov-600 hover:underline mb-2">← Voltar</button>
      <h1 className="titulo-pagina">🎯 Planejamento Financeiro</h1>
      <p className="subtitulo-pagina">Receitas recorrentes, esporádicas, extraordinárias, simulações e projeções</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card>
          <CardCabecalho titulo="Período" />
          <Input label="Mês / Ano" type="month" defaultValue={planejamento.periodo} />
        </Card>
        <Card>
          <CardCabecalho titulo="Projeção de Receitas" />
          <div className="space-y-2">
            <Input label="Recorrentes (R$)" type="number" defaultValue={planejamento.receitasRecorrentes} />
            <Input label="Esporádicas (R$)" type="number" defaultValue={planejamento.receitasEsporadicas} />
            <Input label="Extraordinárias (R$)" type="number" defaultValue={planejamento.receitasExtraordinarias} />
          </div>
        </Card>
        <Card className="!bg-gov-500 !text-white !border-gov-600">
          <p className="text-xs uppercase tracking-wide opacity-80 font-semibold">Total Projetado</p>
          <p className="text-4xl font-bold mt-1">R$ {totalReceitas.toLocaleString("pt-BR",{minimumFractionDigits:2})}</p>
          <p className="text-xs opacity-80 mt-2">Simulação por Fundo abaixo</p>
        </Card>
      </div>

      <Card>
        <CardCabecalho titulo="Simulação: como esse valor será distribuído" acao={<Botao tamanho="sm" variante="secundario">⬇ Gerar PDF com QR</Botao>} />
        <table className="tabela-oficial">
          <thead><tr><th>Fundo</th><th>%</th><th className="text-right">Valor Projetado</th><th>Saldo Atual</th><th>Saldo Projetado</th></tr></thead>
          <tbody>
            {fundos.map(f => {
              const proj = +(totalReceitas * f.percentual / 100).toFixed(2);
              return (
                <tr key={f.id}>
                  <td className="font-semibold"><span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{background:f.cor}}></span>{f.nome}</td>
                  <td>{f.percentual}%</td>
                  <td className="text-right font-bold">R$ {proj.toFixed(2)}</td>
                  <td className="text-right">R$ {f.saldo.toFixed(2)}</td>
                  <td className="text-right font-bold text-gov-700">R$ {(f.saldo + proj).toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}