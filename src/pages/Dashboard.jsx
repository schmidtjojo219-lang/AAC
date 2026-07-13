import { useEffect, useState } from 'react';
import { BadgeDollarSign, CalendarDays, FileCheck2, FileText, FolderKanban, PawPrint, Scale, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { money } from '../lib/format';
import StatCard from '../components/StatCard';

export default function Dashboard() {
  const [stats, setStats] = useState({ associados: 0, animais: 0, documentos: 0, processos: 0, assinaturasPendentes: 0, saldo: 0, pareceres: 0, mensalidadesAtrasadas: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { carregar(); }, []);

  async function countTable(table) {
    try {
      const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
      return count || 0;
    } catch {
      return 0;
    }
  }

  async function countWhere(table, column, value) {
    try {
      const { count } = await supabase.from(table).select('*', { count: 'exact', head: true }).eq(column, value);
      return count || 0;
    } catch {
      return 0;
    }
  }

  async function carregar() {
    setLoading(true);
    const hoje = new Date().toISOString().slice(0, 10);
    const [associados, animais, documentosAntigos, documentosNovos, processos, assinaturasPendentes, pareceres, financeiro, mensalidades] = await Promise.all([
      countTable('associados'),
      countTable('animais'),
      countTable('documentos'),
      countTable('documentos_processos'),
      countWhere('processos_administrativos', 'status', 'aberto'),
      countWhere('documento_assinantes', 'status', 'pendente'),
      countTable('pareceres_fiscais'),
      supabase.from('financeiro').select('tipo, valor, origem, categoria'),
      supabase.from('mensalidades').select('status, data_vencimento, valor, juros')
    ]);

    const saldo = (financeiro.data || []).reduce((acc, item) => {
      const valor = Number(item.valor || 0);
      const taxaBoletoJaDeduzida = item.origem === 'taxa_boleto_mensalidade' || String(item.categoria || '').toLowerCase().includes('taxa boleto');
      if (taxaBoletoJaDeduzida) return acc;
      return item.tipo === 'entrada' ? acc + valor : acc - valor;
    }, 0);

    const mensalidadesAtrasadas = (mensalidades.data || []).filter(m => m.status !== 'pago' && m.status !== 'cancelado' && m.status !== 'isento' && m.data_vencimento < hoje).reduce((acc, m) => acc + Number(m.valor || 0) + Number(m.juros || 0), 0);

    setStats({ associados, animais, documentos: documentosNovos || documentosAntigos, processos, assinaturasPendentes, pareceres, saldo, mensalidadesAtrasadas });
    setLoading(false);
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-terra">Visão geral</p>
          <h1 className="mt-2 text-3xl font-black text-floresta lg:text-5xl">Dashboard da AAC</h1>
          <p className="mt-2 text-slate-600">Acompanhe associados, RGA, mensalidades, documentos, finanças e Conselho Fiscal.</p>
        </div>
        <button className="btn-secondary" onClick={carregar} disabled={loading}>{loading ? 'Atualizando...' : 'Atualizar dados'}</button>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4 min-[1900px]:grid-cols-8">
        <StatCard title="Associados" value={stats.associados} subtitle="cadastros registrados" icon={Users} />
        <StatCard title="Animais/RGA" value={stats.animais} subtitle="equinos cadastrados" icon={PawPrint} />
        <StatCard title="Saldo" value={money(stats.saldo)} subtitle="entradas - saídas" icon={BadgeDollarSign} />
        <StatCard title="Mensalidades atrasadas" value={money(stats.mensalidadesAtrasadas)} subtitle="em aberto vencidas" icon={CalendarDays} />
        <StatCard title="Documentos" value={stats.documentos} subtitle="gerados na mesa administrativa" icon={FileText} />
        <StatCard title="Processos abertos" value={stats.processos} subtitle="em andamento interno" icon={FolderKanban} />
        <StatCard title="Assinaturas pendentes" value={stats.assinaturasPendentes} subtitle="links enviados ou aguardando" icon={FileCheck2} />
        <StatCard title="Pareceres" value={stats.pareceres} subtitle="Conselho Fiscal" icon={Scale} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-2xl font-black text-floresta">Rotina recomendada</h2>
          <ul className="mt-4 space-y-3 text-slate-700">
            <li>• Secretaria confere solicitações, edita dados e anexa fichas assinadas.</li>
            <li>• Bem-Estar Animal mantém o RGA, vistorias e fichas dos equinos em dia.</li>
            <li>• Tesouraria gera mensalidades, registra pagamentos e lança entradas/saídas.</li>
            <li>• Conselho Fiscal acompanha relatórios e emite pareceres.</li>
          </ul>
        </div>
        <div className="card p-6">
          <h2 className="text-2xl font-black text-floresta">Documentos geráveis</h2>
          <p className="mt-3 text-slate-700">A Mesa Administrativa gera documentos oficiais, vincula processos, controla assinaturas por WhatsApp e emite QR Code/hash de validacao.</p>
        </div>
      </div>
    </div>
  );
}
