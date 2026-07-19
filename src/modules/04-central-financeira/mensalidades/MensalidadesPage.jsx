import { useState } from "react";
import { useFinanceiroStore } from "../financeiroStore";
import { Card, CardCabecalho } from "../../../ui/components/cards/Card";
import { Botao } from "../../../ui/components/buttons/Botao";
import { Badge } from "../../../ui/components/cards/Badge";
import { Input } from "../../../ui/components/forms/Input";

const statusCor = { PAGO:"sucesso", PENDENTE:"info", ATRASADO:"perigo" };
const statusTxt = { PAGO:"Pago", PENDENTE:"Pendente", ATRASADO:"Atrasado" };

export default function MensalidadesPage() {
  const { mensalidades, pagarMensalidade } = useFinanceiroStore();
  const [filtro, setFiltro] = useState("TODOS");
  const [toast, setToast] = useState(null);

  const lista = filtro === "TODOS" ? mensalidades : mensalidades.filter(m => m.status === filtro);

  const pagar = (id, nome) => {
    const r = pagarMensalidade(id);
    if (r?.sucesso) {
      setToast({ tipo: "sucesso", msg: `✅ Mensalidade de ${nome} paga! Automação executada: taxa descontada, saldos atualizados, valores distribuídos em ${4} fundos, auditoria registrada. HASH: ${r.hash.substring(0,16)}...` });
      setTimeout(()=>setToast(null), 7000);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <button onClick={()=>window.history.back()} className="text-sm text-gov-600 hover:underline mb-2">← Voltar</button>
        <h1 className="titulo-pagina">💳 Mensalidades</h1>
        <p className="subtitulo-pagina !mb-0">Clique em PAGAR para testar a automação completa da Especificação v8.0</p>
      </div>

      {toast && (
        <div className={`mb-4 p-4 rounded-lg border ${toast.tipo==="sucesso"?"bg-green-50 border-green-200 text-green-800":"bg-red-50 border-red-200 text-red-800"}`}>
          <p className="text-sm font-semibold">{toast.msg}</p>
        </div>
      )}

      <Card className="!p-0 overflow-hidden">
        <div className="p-4 border-b border-institucional-borda flex gap-2 flex-wrap">
          {["TODOS","PENDENTE","ATRASADO","PAGO"].map(s => (
            <button key={s} onClick={()=>setFiltro(s)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${filtro===s?"bg-gov-500 text-white":"bg-white border border-institucional-borda hover:bg-gov-50"}`}>
              {s} ({mensalidades.filter(m=>s==="TODOS"||m.status===s).length})
            </button>
          ))}
          <div className="ml-auto w-64"><Input placeholder="🔍 Pesquisar associado..." /></div>
        </div>
        <table className="tabela-oficial">
          <thead><tr><th>#</th><th>Associado</th><th>Valor</th><th>Vencimento</th><th>Pago em</th><th>Taxa Asaas</th><th>Status</th><th className="text-right">Ação</th></tr></thead>
          <tbody>
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
                    ? <Botao tamanho="sm" variante="sucesso" onClick={()=>pagar(m.id, m.associado)}>💸 Pagar (simular Asaas)</Botao>
                    : <Badge cor="sucesso">OK</Badge>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card className="mt-4 !bg-gov-50/40">
        <p className="text-xs text-institucional-textoSecundario">
          <strong>⚙️ O que acontece quando você clica em PAGAR?</strong><br/>
          1. Calcula e desconta automaticamente a taxa do Asaas &nbsp;·&nbsp;
          2. Calcula valor líquido &nbsp;·&nbsp;
          3. <strong>Divide o valor líquido entre os 4 Fundos conforme percentuais configurados</strong> &nbsp;·&nbsp;
          4. Atualiza saldo do Banco do Brasil &nbsp;·&nbsp;
          5. Atualiza saldo de CADA Fundo individualmente &nbsp;·&nbsp;
          6. Registra receita &nbsp;·&nbsp;
          7. Gera <strong>Hash SHA-256</strong> da operação &nbsp;·&nbsp;
          8. Registra na <strong>Auditoria Universal</strong> &nbsp;·&nbsp;
          9. Envia notificação na Central &nbsp;·&nbsp;
          <strong className="text-gov-700"> Tudo em 1 clique — ZERO trabalho manual.</strong>
        </p>
      </Card>
    </div>
  );
}