import { useFinanceiroStore } from "./financeiroStore";
import { Card, CardCabecalho } from "../../ui/components/cards/Card";
import { Badge } from "../../ui/components/cards/Badge";
import { Botao } from "../../ui/components/buttons/Botao";
import { Link } from "react-router-dom";

const KPI = ({ titulo, valor, icone, cor }) => (
  <Card className="!p-4">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs uppercase tracking-wide text-institucional-textoSecundario font-semibold">{titulo}</p>
        <p className={`text-2xl font-bold mt-1 ${cor||"text-gov-700"}`}>{valor}</p>
      </div>
      <div className="w-10 h-10 rounded-lg grid place-items-center text-xl bg-gov-100 text-gov-600">{icone}</div>
    </div>
  </Card>
);

export default function FinanceiroPage() {
  const { contas, fundos, mensalidades, saldoGeral } = useFinanceiroStore();
  const receitasMes = 12480;
  const despesasMes = 6912.45;
  const qtdAtrasadas = mensalidades.filter(m=>m.status==="ATRASADO").length;
  const totalAtrasado = mensalidades.filter(m=>m.status==="ATRASADO").reduce((s,m)=>s+m.valor,0);

  return (
    <div>
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="titulo-pagina">💰 Central Financeira</h1>
          <p className="subtitulo-pagina !mb-0">Integração, automação e prestação de contas</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/financeiro/mensalidades"><Botao variante="primario">Mensalidades</Botao></Link>
          <Link to="/financeiro/prestacao"><Botao variante="secundario">Prestação de Contas</Botao></Link>
          <Link to="/financeiro/planejamento"><Botao variante="secundario">Planejamento</Botao></Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI titulo="Saldo Geral" valor={`R$ ${saldoGeral().toLocaleString("pt-BR",{minimumFractionDigits:2})}`} icone="💰" />
        <KPI titulo="Receitas Mês" valor={`R$ ${receitasMes.toFixed(2)}`} icone="📈" cor="text-green-600" />
        <KPI titulo="Despesas Mês" valor={`R$ ${despesasMes.toFixed(2)}`} icone="📉" cor="text-red-600" />
        <KPI titulo="Mensalidades Atrasadas" valor={`${qtdAtrasadas} (R$ ${totalAtrasado.toFixed(2)})`} icone="⚠️" cor="text-orange-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardCabecalho titulo="Saldos por Conta" subtitulo="Caixa e Bancos" />
          <table className="tabela-oficial">
            <thead><tr><th>Conta</th><th>Tipo</th><th className="text-right">Saldo</th></tr></thead>
            <tbody>
              {contas.map(c => (
                <tr key={c.id}>
                  <td className="font-semibold">{c.nome}</td>
                  <td><Badge cor={c.tipo==="CAIXA"?"alerta":"info"}>{c.tipo}</Badge></td>
                  <td className="text-right font-bold">R$ {c.saldo.toLocaleString("pt-BR",{minimumFractionDigits:2})}</td>
                </tr>
              ))}
              <tr className="bg-gov-50/60">
                <td colSpan={2} className="font-bold">TOTAL</td>
                <td className="text-right font-bold text-gov-700">R$ {saldoGeral().toLocaleString("pt-BR",{minimumFractionDigits:2})}</td>
              </tr>
            </tbody>
          </table>
        </Card>

        <Card>
          <CardCabecalho titulo="Fundos Constituídos" subtitulo="Distribuição automática por percentual" />
          <div className="space-y-3">
            {fundos.map(f => (
              <div key={f.id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-semibold">{f.nome}</span>
                  <span className="text-institucional-textoSecundario">{f.percentual}% · R$ {f.saldo.toFixed(2)}</span>
                </div>
                <div className="w-full h-2.5 bg-institucional-borda rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{width:`${f.percentual}%`, background:f.cor}}></div>
                </div>
              </div>
            ))}
            <p className="text-xs text-institucional-textoSecundario mt-2">
              Total: <span className="font-bold">{fundos.reduce((s,f)=>s+f.percentual,0)}%</span> — Ao pagar uma mensalidade, o valor é dividido automaticamente conforme acima.
            </p>
          </div>
        </Card>
      </div>

      <Card>
        <CardCabecalho titulo="Acesso Rápido aos Módulos" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {n:"Caixa", i:"💵", r:"/financeiro/caixa"},{n:"Bancos", i:"🏦", r:"/financeiro/bancos"},
            {n:"Receitas", i:"📥", r:"/financeiro/receitas"},{n:"Despesas", i:"📤", r:"/financeiro/despesas"},
            {n:"Fundos", i:"🗃️", r:"/financeiro/fundos"},{n:"Fluxo de Caixa", i:"🌊", r:"/financeiro/fluxo"},
            {n:"Centro de Custos", i:"🏷️", r:"/financeiro/custos"},{n:"Conciliação", i:"🔗", r:"/financeiro/conciliacao"},
          ].map(x => (
            <Link key={x.n} to={x.r} className="card-oficial !p-4 text-center hover:!border-gov-400 hover:!translate-y-[-2px] transition">
              <div className="text-2xl mb-1">{x.i}</div>
              <div className="text-sm font-semibold text-gov-700">{x.n}</div>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}