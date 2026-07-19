import { useState } from "react";
import { useFinanceiroStore } from "../financeiroStore";
import { Card, CardCabecalho } from "../../../ui/components/cards/Card";
import { Botao } from "../../../ui/components/buttons/Botao";
import { Badge } from "../../../ui/components/cards/Badge";
import { Input } from "../../../ui/components/forms/Input";

export default function PrestacaoPage() {
  const { prestacoes, gerarPrestacao, publicarPrestacao } = useFinanceiroStore();
  const [periodo, setPeriodo] = useState("2026-07");

  const gerar = () => {
    const p = gerarPrestacao(periodo);
    alert(`✅ Prestação gerada!\nPeríodo: ${p.periodo}\nReceitas: R$ ${p.totalReceitas.toFixed(2)}\nDespesas: R$ ${p.totalDespesas.toFixed(2)}\nSaldo: R$ ${p.saldoFinal.toFixed(2)}\nHASH: ${p.hash.substring(0,24)}...`);
  };

  return (
    <div>
      <button onClick={()=>window.history.back()} className="text-sm text-gov-600 hover:underline mb-2">← Voltar</button>
      <h1 className="titulo-pagina">📊 Prestação de Contas</h1>
      <p className="subtitulo-pagina">Gerada automaticamente — com Hash SHA-256, QR Code e publicação no Portal da Transparência</p>

      <Card className="mb-4">
        <CardCabecalho titulo="Gerar Nova Prestação" />
        <div className="flex gap-3 items-end flex-wrap">
          <div className="w-48"><Input label="Período (Mês/Ano)" type="month" value={periodo} onChange={e=>setPeriodo(e.target.value)} /></div>
          <Botao onClick={gerar}>⚙️ Gerar Prestação Automaticamente</Botao>
        </div>
      </Card>

      {prestacoes.length === 0 && (
        <Card className="p-12 text-center text-institucional-textoSecundario">
          <p className="text-5xl mb-3">📋</p>
          <p className="font-semibold">Nenhuma prestação gerada ainda</p>
          <p className="text-sm mt-1">Clique em "Gerar Prestação Automaticamente" acima</p>
        </Card>
      )}

      {prestacoes.map(p => (
        <Card key={p.id} className="mb-4">
          <CardCabecalho
            titulo={`Prestação — ${p.periodo.split("-").reverse().join("/")}`}
            subtitulo={`Gerada em ${new Date(p.geradaEm).toLocaleString("pt-BR")}`}
            acao={
              <div className="flex gap-2">
                <Botao tamanho="sm" variante="secundario">⬇ PDF</Botao>
                {!p.publicada
                  ? <Botao tamanho="sm" onClick={()=>publicarPrestacao(p.id)}>🌐 Publicar no Portal</Botao>
                  : <Badge cor="sucesso">● Publicada</Badge>}
              </div>
            }
          />
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="p-3 bg-green-50 rounded text-center"><p className="text-xs uppercase text-green-700 font-semibold">Receitas</p><p className="text-xl font-bold text-green-700">R$ {p.totalReceitas.toFixed(2)}</p></div>
            <div className="p-3 bg-red-50 rounded text-center"><p className="text-xs uppercase text-red-700 font-semibold">Despesas</p><p className="text-xl font-bold text-red-700">R$ {p.totalDespesas.toFixed(2)}</p></div>
            <div className={`p-3 rounded text-center ${p.saldoFinal>=0?"bg-gov-50":"bg-orange-50"}`}><p className="text-xs uppercase font-semibold">Saldo</p><p className={`text-xl font-bold ${p.saldoFinal>=0?"text-gov-700":"text-orange-700"}`}>R$ {p.saldoFinal.toFixed(2)}</p></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-institucional-fundo rounded-lg">
            <div>
              <p className="text-xs uppercase font-semibold text-institucional-textoSecundario mb-1">Distribuição por Fundo</p>
              {p.distribuicaoFundos.map(f => (
                <div key={f.id} className="text-xs flex justify-between py-0.5"><span>{f.nome} ({f.percentual}%)</span><span className="font-semibold">R$ {f.saldo.toFixed(2)}</span></div>
              ))}
            </div>
            <div>
              <p className="text-xs uppercase font-semibold text-institucional-textoSecundario mb-1">Validação Pública</p>
              <div className="w-24 h-24 bg-white border-2 border-dashed border-gov-300 rounded grid place-items-center text-3xl">▦</div>
              <p className="text-[10px] mt-1 text-center text-institucional-textoSecundario">QR Code de validação</p>
            </div>
            <div>
              <p className="text-xs uppercase font-semibold text-institucional-textoSecundario mb-1">Hash SHA-256</p>
              <p className="font-mono text-[11px] break-all bg-white p-2 rounded border border-institucional-borda">{p.hash}</p>
              <p className="text-[10px] text-institucional-textoSecundario mt-1">Qualquer alteração no documento altera o hash — princípio do não repúdio.</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}