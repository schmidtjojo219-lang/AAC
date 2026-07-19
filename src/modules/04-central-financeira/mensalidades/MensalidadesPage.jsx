import { useState, useMemo } from "react";
import { useFinanceiroStore } from "../financeiroStore";
import { Card, CardCabecalho } from "../../../ui/components/cards/Card";
import { Botao } from "../../../ui/components/buttons/Botao";
import { Badge } from "../../../ui/components/cards/Badge";
import { Input } from "../../../ui/components/forms/Input";

const statusCor = { PAGO:"sucesso", PENDENTE:"info", ATRASADO:"perigo" };
const statusTxt = { PAGO:"Pago", PENDENTE:"Pendente", ATRASADO:"Atrasado" };

export default function MensalidadesPage() {
  const { mensalidades, pagarMensalidade } = useFinanceiroStore();
  const [filtroStatus, setFiltroStatus] = useState("TODOS");
  const [busca, setBusca] = useState("");
  const [processando, setProcessando] = useState(null); // evita clique duplo
  const [toast, setToast] = useState(null);

  // 🟡 BUSCA AGORA É FUNCIONAL
  const lista = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return mensalidades
      .filter(m => filtroStatus === "TODOS" || m.status === filtroStatus)
      .filter(m => !b || m.associado.toLowerCase().includes(b) || String(m.id).includes(b));
  }, [mensalidades, filtroStatus, busca]);

  const pagar = async (id, nome) => {
    if (processando) return;
    setProcessando(id);
    const r = pagarMensalidade(id);
    setProcessando(null);
    if (!r) { setToast({ tipo:"erro", msg:"Erro ao processar." }); setTimeout(()=>setToast(null),4000); return; }
    if (r.sucesso) {
      setToast({ tipo:"sucesso", msg:`✅ SUCESSO! ${nome}: Bruto R$${r.receita.valorBruto.toFixed(2)} − Taxa R$${r.taxa.toFixed(2)} = Líquido R$${r.valorLiquido.toFixed(2)} → Distribuído em 4 Fundos. HASH: ${r.hash.substring(0,20)}...` });
      setTimeout(()=>setToast(null), 10000);
    } else {
      setToast({ tipo:"erro", msg:`❌ ${r.erro}` });
      setTimeout(()=>setToast(null), 4000);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <button onClick={()=>window.history.back()} className="text-sm text-gov-600 hover:underline mb-2">← Voltar</button>
        <h1 className="titulo-pagina">💳 Mensalidades</h1>
        <p className="subtitulo-pagina !mb-0">Clique em PAGAR para testar a AUTOMAÇÃO COMPLETA</p>
      </div>

      {toast && (
        <div className={`mb-4 p-4 rounded-lg border text-sm ${toast.tipo==="sucesso"?"bg-green-50 border-green-300 text-green-900":"bg-red-50 border-red-300 text-red-900"}`}>
          <p className="font-semibold">{toast.msg}</p>
        </div>
      )}

      <Card className="!p-0 overflow-hidden">
        <div className="p-4 border-b border-institucional-borda flex gap-2 flex-wrap items-center">
          {["TODOS","PENDENTE","ATRASADO","PAGO"].map(s => (
            <button key={s} onClick={()=>setFiltroStatus(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${filtroStatus===s?"bg-gov-500 text-white":"bg-white border border-institucional-borda hover:bg-gov-50"}`}>
              {s} ({mensalidades.filter(m=>s==="TODOS"||m.status===s).length})
            </button>
          ))}
          <div className="ml-auto w-64"><Input placeholder="🔍 Nome ou #" value={busca} onChange={e=>setBusca(e.target.value)} /></div>
        </div>
        <table className="tabela-oficial">
          <thead><tr><th>#</th><th>Associado</th><th>Valor</th><th>Vencimento</th><th>Pago em</th><th>Taxa Asaas</th><th>Status</th><th className="text-right">Ação</th></tr></thead>
          <tbody>
            {lista.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-institucional-textoSecundario">Nenhum registro encontrado</td></tr>}
            {lista.map(m => (
              <tr key={m.id}>
                <td className="font-mono text-xs">#{m.id}</td>
                <td className="font-semibold">{m.associado}</td>
                <td>R$ {m.valor.toFixed(2)}</td>
                <td>{m.vencimento.split("-").reverse().join("/")}</td>
                <td>{m.pagoEm ? m.pagoEm.split("-").reverse().join("/") : "—"}</td>
                <td>{m.taxaAsaas ? `R$ ${m.taxaAsaas.toFixed(2)}` : "—"}</td>
                <td><Badge cor={statusCor[m.status]}>{statusTxt[m.status]}</Badge></td>
                <td className="text-right">
                  {m.status !== "PAGO"
                    ? <Botao tamanho="sm" variante="sucesso" disabled={processando === m.id} onClick={()=>pagar(m.id, m.associado)}>
                        {processando === m.id ? "⏳ Processando..." : "💸 Pagar (simular Asaas)"}
                      </Botao>
                    : <Badge cor="sucesso">OK</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="mt-4 !bg-gov-50/40">
        <p className="text-xs text-institucional-textoSecundario leading-relaxed">
          <strong>⚙️ Automação executada em 1 clique:</strong>
          Bruto → Taxa Asaas → Líquido → <strong>Distribuição automática pelos Fundos (%)</strong> → Atualiza saldos → Receita → <strong>Hash SHA-256</strong> → Auditoria → Notificação.
        </p>
      </Card>
    </div>
  );
}