import { create } from "zustand";
import SHA256 from "crypto-js/sha256";
import { useAuditoria } from "../../core/audit/useAuditoria";
import { useNotificacoes } from "../../core/notifications/notificacoesStore";

// DADOS INICIAIS DEMO
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
  // REGRA DE OURO DA ESPECIFICAÇÃO v8.0
  // PAGAR MENSALIDADE = TUDO AUTOMÁTICO
  // ==============================================
  pagarMensalidade: (mensalidadeId, contaDestino = "BB") => {
    const { registrar } = useAuditoria.getState();
    const { adicionar } = useNotificacoes.getState();
    const m = get().mensalidades.find(x => x.id === mensalidadeId);
    if (!m || m.status === "PAGO") return;

    const valorBruto = m.valor;
    const taxa = m.taxaAsaas || (valorBruto * 0.0374); // ~3,74% taxa Asaas
    const valorLiquido = +(valorBruto - taxa).toFixed(2);
    const agora = new Date().toISOString().split("T")[0];

    // 1. Atualiza saldo da CONTA destino
    const contas = get().contas.map(c => c.id === contaDestino ? { ...c, saldo: +(c.saldo + valorLiquido).toFixed(2) } : c);

    // 2. DISTRIBUIÇÃO AUTOMÁTICA PELOS FUNDOS (conforme % configurado)
    const fundos = get().fundos.map(f => ({
      ...f,
      saldo: +(f.saldo + (valorLiquido * f.percentual / 100)).toFixed(2)
    }));

    // 3. Registra RECEITA
    const receita = {
      id: crypto.randomUUID(),
      tipo: "MENSALIDADE",
      origem: `Mensalidade #${m.id} - ${m.associado}`,
      valorBruto, taxa, valorLiquido,
      data: agora,
      conta: contaDestino,
      distribuicaoFundos: fundos.map(f => ({ id: f.id, nome: f.nome, percentual: f.percentual, valor: +(valorLiquido * f.percentual / 100).toFixed(2) })),
    };

    // 4. Atualiza status da mensalidade
    const mensalidades = get().mensalidades.map(x => x.id === mensalidadeId ? { ...x, status: "PAGO", pagoEm: agora, taxaAsaas: +taxa.toFixed(2) } : x);

    // 5. Hash SHA-256 da operação (princípio de auditoria)
    const hash = SHA256(`${receita.id}${agora}${valorLiquido}${JSON.stringify(fundos.map(f=>f.saldo))}`).toString();

    // 6. Salva tudo
    set({ contas, fundos, mensalidades, receitas: [receita, ...get().receitas] });

    // 7. Auditoria Universal
    registrar({ modulo: "Financeiro", acao: "PAGAR_MENSALIDADE", objetoId: m.id, valorAntigo: m, valorNovo: { ...m, status: "PAGO", receita, hash } });

    // 8. Notificação
    adicionar({ titulo: "Mensalidade recebida", mensagem: `R$ ${valorLiquido.toFixed(2)} de ${m.associado} distribuído em ${get().fundos.length} fundos`, modulo: "Financeiro", tipo: "sucesso" });

    return { sucesso: true, receita, hash };
  },

  // Outras ações
  atualizarPercentualFundo: (id, novoPct) => {
    const fundos = get().fundos.map(f => f.id === id ? { ...f, percentual: Math.max(0, Math.min(100, +novoPct)) } : f);
    const total = fundos.reduce((s,f)=>s+f.percentual,0);
    set({ fundos });
    return { total };
  },

  registrarDespesa: (d) => {
    const despesa = { id: crypto.randomUUID(), data: new Date().toISOString().split("T")[0], ...d };
    const contas = get().contas.map(c => c.id === despesa.conta ? { ...c, saldo: +(c.saldo - despesa.valor).toFixed(2) } : c);
    set({ despesas: [despesa, ...get().despesas], contas });
    useAuditoria.getState().registrar({ modulo: "Financeiro", acao: "REGISTRAR_DESPESA", valorNovo: despesa });
  },

  // PRESTAÇÃO DE CONTAS AUTOMÁTICA
  gerarPrestacao: (mesAno) => {
    const [ano, mes] = mesAno.split("-");
    const receitas = get().receitas.filter(r => r.data.startsWith(mesAno));
    const despesas = get().despesas.filter(d => d.data.startsWith(mesAno));
    const totalReceitas = +receitas.reduce((s,r)=>s+r.valorLiquido,0).toFixed(2);
    const totalDespesas = +despesas.reduce((s,d)=>s+d.valor,0).toFixed(2);
    const saldoFinal = +(totalReceitas - totalDespesas).toFixed(2);

    const prestacao = {
      id: crypto.randomUUID(),
      periodo: mesAno,
      geradaEm: new Date().toISOString(),
      receitas, despesas,
      totalReceitas, totalDespesas, saldoFinal,
      distribuicaoFundos: get().fundos.map(f => ({ ...f })),
      hash: "",
      publicada: false,
    };
    prestacao.hash = SHA256(JSON.stringify(prestacao)).toString();

    set({ prestacoes: [prestacao, ...get().prestacoes] });
    useAuditoria.getState().registrar({ modulo: "Financeiro", acao: "GERAR_PRESTACAO", objetoId: prestacao.id, valorNovo: prestacao });
    useNotificacoes.getState().adicionar({ titulo: "Prestação de Contas gerada", mensagem: `Período ${mesAno} — Saldo: R$ ${saldoFinal}`, modulo: "Financeiro", tipo: "info" });
    return prestacao;
  },

  publicarPrestacao: (id) => set({ prestacoes: get().prestacoes.map(p => p.id === id ? { ...p, publicada: true } : p) }),

  saldoGeral: () => +get().contas.reduce((s,c)=>s+c.saldo,0).toFixed(2),
}));