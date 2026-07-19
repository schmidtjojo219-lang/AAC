import { Card, CardCabecalho } from "../../../ui/components/cards/Card";
import { Badge } from "../../../ui/components/cards/Badge";
import { Botao } from "../../../ui/components/buttons/Botao";

const KPI = ({ titulo, valor, variacao, cor = "info", icone }) => (
  <Card className="!p-4">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-xs uppercase tracking-wide text-institucional-textoSecundario font-semibold">{titulo}</p>
        <p className="text-2xl font-bold text-gov-700 mt-1">{valor}</p>
        {variacao && <p className={`text-xs mt-1 font-semibold ${variacao.pos ? "text-green-600" : "text-red-600"}`}>
          {variacao.pos ? "▲" : "▼"} {variacao.valor}
        </p>}
      </div>
      <div className={`w-10 h-10 rounded-lg grid place-items-center text-xl bg-gov-100 text-gov-600`}>{icone}</div>
    </div>
  </Card>
);

export default function MesaAdministrativaPage() {
  const atividades = [
    { id:1, texto:"Mensalidade #1245 paga por João Silva", hora:"há 12 min", modulo:"Financeiro", cor:"sucesso"},
    { id:2, texto:"Novo associado cadastrado: Maria Souza", hora:"há 1h", modulo:"Pessoas", cor:"info"},
    { id:3, texto:"Ata de assembleia assinada por 3 diretores", hora:"há 3h", modulo:"Documentos", cor:"info"},
    { id:4, texto:"Vacina aplicada em Cavalo 'Pérola'", hora:"há 5h", modulo:"Animal", cor:"sucesso"},
    { id:5, texto:"Processo #001/2026 arquivado", hora:"ontem", modulo:"Processos", cor:"neutro"},
  ];

  const agenda = [
    { data:"19/07", horario:"19:00", titulo:"Reunião de Diretoria", local:"Sede da AAC", cor:"info"},
    { data:"22/07", horario:"08:00", titulo:"Atendimento Veterinário", local:"Sede", cor:"sucesso"},
    { data:"25/07", horario:"14:00", titulo:"Assembleia Geral", local:"Salão de Eventos", cor:"alerta"},
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="titulo-pagina">🏛️ Mesa Administrativa</h1>
        <p className="subtitulo-pagina">Painel institucional com todos os indicadores em tempo real</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI titulo="Saldo Geral" valor="R$ 84.327,12" icone="💰" variacao={{pos:true, valor:"+2,4% este mês"}} />
        <KPI titulo="Receita do Mês" valor="R$ 12.480,00" icone="📈" variacao={{pos:true, valor:"+8,1%"}} />
        <KPI titulo="Despesas do Mês" valor="R$ 6.912,45" icone="📉" variacao={{pos:false, valor:"-1,2%"}} />
        <KPI titulo="Mensalidades em Atraso" valor="37" icone="⚠️" variacao={{pos:false, valor:"R$ 8.240,00"}} />
      </div>

      {/* Saldos + Fluxo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardCabecalho titulo="Saldos por Conta" subtitulo="Caixa e Bancos" />
          <div className="space-y-3">
            {[
              {n:"Caixa", v:"R$ 4.250,00", c:"bg-green-500"},
              {n:"Banco do Brasil", v:"R$ 58.741,12", c:"bg-gov-500"},
              {n:"Fundo Social", v:"R$ 12.500,00", c:"bg-purple-500"},
              {n:"Fundo Veterinário", v:"R$ 8.836,00", c:"bg-orange-500"},
            ].map(x => (
              <div key={x.n} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2"><span className={`w-2.5 h-2.5 rounded-full ${x.c}`}></span><span className="text-sm">{x.n}</span></div>
                <span className="text-sm font-bold">{x.v}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardCabecalho titulo="Fluxo Financeiro (Últimos 6 meses)" subtitulo="Receitas vs Despesas" />
          <div className="h-56 flex items-end gap-3 px-2">
            {[
              {m:"Fev", r:9800, d:7200},{m:"Mar", r:11200, d:6800},{m:"Abr", r:10500, d:8100},
              {m:"Mai", r:13100, d:7400},{m:"Jun", r:11800, d:6900},{m:"Jul", r:12480, d:6912},
            ].map(x => {
              const max = 14000;
              return (
                <div key={x.m} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex gap-1 items-end h-44">
                    <div className="flex-1 bg-gov-500 rounded-t-sm" style={{height:`${(x.r/max)*100}%`}} title={`Receita R$${x.r}`}></div>
                    <div className="flex-1 bg-red-400 rounded-t-sm" style={{height:`${(x.d/max)*100}%`}} title={`Despesa R$${x.d}`}></div>
                  </div>
                  <span className="text-xs text-institucional-textoSecundario">{x.m}</span>
                </div>
              )
            })}
          </div>
          <div className="flex gap-4 mt-3 text-xs text-institucional-textoSecundario justify-center">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-gov-500 inline-block"></span> Receita</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 inline-block"></span> Despesa</span>
          </div>
        </Card>
      </div>

      {/* Atividades + Agenda */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardCabecalho titulo="Últimas Atividades" subtitulo="Timeline institucional" acao={<Botao tamanho="sm" variante="secundario">Ver tudo</Botao>} />
          <div className="space-y-4">
            {atividades.map(a => (
              <div key={a.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-gov-500 mt-1.5"></div>
                  <div className="w-px flex-1 bg-institucional-borda my-1"></div>
                </div>
                <div className="flex-1 pb-3">
                  <div className="flex items-center gap-2 text-xs">
                    <Badge cor={a.cor}>{a.modulo}</Badge>
                    <span className="text-institucional-textoSecundario">{a.hora}</span>
                  </div>
                  <p className="text-sm mt-0.5">{a.texto}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardCabecalho titulo="Agenda" subtitulo="Próximos compromissos" />
          <div className="space-y-3">
            {agenda.map((a,i) => (
              <div key={i} className="flex gap-3 p-2.5 rounded-md hover:bg-gov-50/60 transition">
                <div className="text-center min-w-[48px]">
                  <div className="text-xs text-institucional-textoSecundario">{a.data.split("/")[1]}</div>
                  <div className="text-xl font-bold text-gov-600 leading-none">{a.data.split("/")[0]}</div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{a.titulo}</p>
                  <p className="text-xs text-institucional-textoSecundario mt-0.5">🕐 {a.horario} · 📍 {a.local}</p>
                </div>
              </div>
            ))}
          </div>
          <Botao tamanho="sm" variante="secundario" className="w-full mt-4">+ Novo compromisso</Botao>
        </Card>
      </div>
    </div>
  );
}