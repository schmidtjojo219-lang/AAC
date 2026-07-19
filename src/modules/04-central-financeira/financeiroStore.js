import { create } from "zustand";
import SHA256 from "crypto-js/sha256";
import { auditoria } from "../../core/audit/useAuditoria";
import { useNotificacoes } from "../../core/notifications/notificacoesStore";

const num = (v, padrao = 0) => { const n = Number(v); return isNaN(n) ? padrao : n; };
const reais = (v) => +num(v).toFixed(2);

const CONTAS_INICIAIS = [
  { id: "CAIXA", nome: "Caixa", tipo: "CAIXA", saldo: 4250.00, banco: "Espécie" },
  { id: "BB", nome: "Banco do Brasil", tipo: "BANCO", saldo: 58741.12, banco: "Banco do Brasil", agencia: "1234-5", conta: "67890-1" },
];

const FUNDOS_INICIAIS = [
  { id: "SOCIAL", nome: "Fundo Social", percentual: 40, saldo: 12500.00, cor: "#6366f1" },
  { id: "VETERINARIO", nome: "Fundo Veterinário", percentual: 35, saldo: 8836.00, cor: "#f59e0b" },
  { id: "ADMINISTRATIVO", nome: "Fundo Administrativo", percentual: 15, saldo: 4200.00, cor: "#0ea5e9" },
  { id: "RESERVA", nome: "Reserva Financeira", percentual: 10, saldo: 3200.00, cor: "#10b981" },
];

const MENSALIDADES_INICIAIS = [
  { id: 1240, associado: "João da Silva", valor: 80.00, vencimento: "2026-07-10", status: "PAGO", pagoEm: "2026-07-08", taxaAsaas: 2.99 },
  { id: 1241, associado: "Maria Souza", valor: 80.00, vencimento: "2026-07-10", status: "PAGO", pagoEm: "2026-07-09", taxaAsaas: 2.99 },
  { id: 1242, associado: "José Pereira", valor: 80.00, vencimento: "2026-07-10", status: "ATRASADO" },
  { id: 1243, associado: "Ana Lima", valor: 80.00, vencimento: "2026-07-15", status: "PENDENTE" },
  { id: 1244, associado: "Carlos Mendes", valor: 80.00, vencimento: "2026-07-15", status: "ATRASADO" },
];

export const useFinanceiroStore = create((set, get) => ({
  contas: CONTAS_INICIAIS,
  fundos: FUNDOS_INICIAIS,
  mensalidades: MENSALIDADES_INICIAIS,
  receitas: [],
  despesas: [],
  planejamento: { periodo: "2026-07", receitasRecorrentes: 9600, receitasEsporadicas: 1500, receitasExtraordinarias: 0 },
  prestacoes: [],

  // ==============================================
  // REGRA DE OURO v8.0 — TUDO AUTOMÁTICO
  // ==============================================
  pagarMensalidade: (mensalidadeId, contaDestino = "BB") => {
    const m = get().mensalidades.find(x => x.id === mensalidadeId);
    if (!m) return { sucesso: false, erro: "Mensalidade não encontrada" };
    if (m.status === "PAGO") return { sucesso: false, erro: "Essa mensalidade já está paga" };

    const valorBruto = reais(m.valor);
    const taxa = m.taxaAsaas ? reais(m.taxaAsaas) : reais(valorBruto * 0.0374);
    const valorLiquido = reais(valorBruto - taxa);
    const agora = new Date().toISOString().split("T")[0];

    if (valorLiquido < 0) return { sucesso: false, erro: "Valor líquido negativo" };

    const contas = get().contas.map(c => c.id === contaDestino ? { ...c, saldo: reais(c.saldo + valorLiquido) } : c);
    const fundos = get().fundos.map(f => ({ ...f, saldo: reais(f.saldo + (valorLiquido * f.percentual / 100)) }));

    const receita = {
      id: crypto.randomUUID(),
      tipo: "MENSALIDADE",
      origem: `Mensalidade #${m.id} - ${m.associado}`,
      valorBruto, taxa, valorLiquido,
      data: agora, conta: contaDestino,
      distribuicaoFundos: fundos.map(f => ({ id: f.id, nome: f.nome, percentual: f.percentual, valor: reais(valorLiquido * f.percentual / 100) })),
    };

    const mensalidades = get().mensalidades.map(x => x.id === mensalidadeId ? { ...x, status: "PAGO", pagoEm: agora, taxaAsaas: taxa } : x);
    const hash = SHA256(`${receita.id}${agora}${valorLiquido}${JSON.stringify(fundos.map(f=>f.saldo))}`).toString();

    set({ contas, fundos, mensalidades, receitas: [receita, ...get().receitas] });

    auditoria.registrar({ modulo: "Financeiro", acao: "PAGAR_MENSALIDADE", objetoId: m.id, valorAntigo: m, valorNovo: { ...m, status: "PAGO", receita, hash } });
    useNotificacoes.getState().adicionar({
      titulo: "Mensalidade recebida",
      mensagem: `R$ ${valorLiquido.toFixed(2)} de ${m.associado} → ${fundos.length} fundos`,
      modulo: "Financeiro", tipo: "sucesso"
    });

    return { sucesso: true, receita, hash, valorLiquido, taxa };
  },

  atualizarPercentualFundo: (id, novoPct) => {
    const pct = Math.max(0, Math.min(100, num(novoPct)));
    const fundos = get().fundos.map(f => f.id === id ? { ...f, percentual: pct } : f);
    set({ fundos });
    return { total: fundos.reduce((s,f)=>s+f.percentual,0) };
  },

  registrarDespesa: (d) => {
    const valor = reais(d.valor);
    const despesa = { id: crypto.randomUUID(), data: new Date().toISOString().split("T")[0], ...d, valor };
    const contas = get().contas.map(c => c.id === despesa.conta ? { ...c, saldo: reais(c.saldo - valor) } : c);
    set({ despesas: [despesa, ...get().despesas], contas });
    auditoria.registrar({ modulo: "Financeiro", acao: "REGISTRAR_DESPESA", valorNovo: despesa });
  },

  gerarPrestacao: (mesAno) => {
    const receitas = get().receitas.filter(r => r.data.startsWith(mesAno));
    const despesas = get().despesas.filter(d => d.data.startsWith(mesAno));
    const totalReceitas = reais(receitas.reduce((s,r)=>s+r.valorLiquido,0));
    const totalDespesas = reais(despesas.reduce((s,d)=>s+d.valor,0));
    const saldoFinal = reais(totalReceitas - totalDespesas);

    const prestacao = {
      id: crypto.randomUUID(), periodo: mesAno, geradaEm: new Date().toISOString(),
      receitas, despesas, totalReceitas, totalDespesas, saldoFinal,
      distribuicaoFundos: get().fundos.map(f => ({ ...f })),
      hash: "", publicada: false,
    };
    prestacao.hash = SHA256(JSON.stringify(prestacao)).toString();

    set({ prestacoes: [prestacao, ...get().prestacoes] });
    auditoria.registrar({ modulo: "Financeiro", acao: "GERAR_PRESTACAO", objetoId: prestacao.id, valorNovo: prestacao });
    useNotificacoes.getState().adicionar({
      titulo: "Prestação gerada", mensagem: `${mesAno} — Saldo: R$ ${saldoFinal.toFixed(2)}`,
      modulo: "Financeiro", tipo: "info"
    });
    return prestacao;
  },

  publicarPrestacao: (id) => {
    set({ prestacoes: get().prestacoes.map(p => p.id === id ? { ...p, publicada: true } : p) });
    auditoria.registrar({ modulo: "Financeiro", acao: "PUBLICAR_PRESTACAO", objetoId: id });
  },

  saldoGeral: () => reais(get().contas.reduce((s,c)=>s+c.saldo,0)),
}));