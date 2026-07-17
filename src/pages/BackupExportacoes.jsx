import { useState } from 'react';
import { Archive, DatabaseBackup, Download, FileJson, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import PageShell from '../components/PageShell';

const EXPORTACOES = [
  { tabela: 'associados', nome: 'Associados' },
  { tabela: 'animais', nome: 'Animais/RGA' },
  { tabela: 'mensalidades', nome: 'Mensalidades' },
  { tabela: 'financeiro', nome: 'Financeiro' },
  { tabela: 'documentos', nome: 'Documentos' },
  { tabela: 'atas', nome: 'Atas' },
  { tabela: 'protocolos', nome: 'Protocolos' },
  { tabela: 'biblioteca_documentos', nome: 'Biblioteca documental' },
  { tabela: 'pareceres_fiscais', nome: 'Pareceres fiscais' },
  { tabela: 'documentos_validacoes', nome: 'Validações de documentos' }
];

function dataArquivo() {
  return new Date().toISOString().slice(0, 19).replaceAll(':', '-');
}

function baixar(nome, conteudo, tipo = 'text/plain;charset=utf-8') {
  const blob = new Blob([conteudo], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function valorCSV(valor) {
  if (valor === null || valor === undefined) return '';
  const texto = typeof valor === 'object' ? JSON.stringify(valor) : String(valor);
  return `"${texto.replaceAll('"', '""')}"`;
}

function paraCSV(lista = []) {
  if (!lista.length) return '';
  const colunas = Array.from(new Set(lista.flatMap(item => Object.keys(item))));
  const linhas = lista.map(item => colunas.map(c => valorCSV(item[c])).join(';'));
  return [colunas.map(valorCSV).join(';'), ...linhas].join('\n');
}

export default function BackupExportacoes() {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  async function buscarTabela(tabela) {
    const { data, error } = await supabase.from(tabela).select('*');
    if (error) throw new Error(`${tabela}: ${error.message}`);
    return data || [];
  }

  async function exportarCSV(item) {
    setLoading(true);
    setStatus(`Exportando ${item.nome}...`);
    try {
      const data = await buscarTabela(item.tabela);
      baixar(`aac-${item.tabela}-${dataArquivo()}.csv`, paraCSV(data), 'text/csv;charset=utf-8');
      setStatus(`${item.nome}: ${data.length} registro(s) exportado(s).`);
    } catch (error) {
      setStatus(`Erro: ${error.message}`);
    } finally { setLoading(false); }
  }

  async function backupJSON() {
    setLoading(true);
    setStatus('Gerando backup administrativo completo...');
    try {
      const backup = { gerado_em: new Date().toISOString(), origem: 'Painel Interno AAC', versao: 'v6.4', tabelas: {} };
      for (const item of EXPORTACOES) {
        try {
          backup.tabelas[item.tabela] = await buscarTabela(item.tabela);
        } catch (error) {
          backup.tabelas[item.tabela] = { erro: error.message };
        }
      }
      baixar(`aac-backup-administrativo-${dataArquivo()}.json`, JSON.stringify(backup, null, 2), 'application/json;charset=utf-8');
      setStatus('Backup JSON gerado com sucesso. Guarde esse arquivo em local seguro.');
    } catch (error) {
      setStatus(`Erro ao gerar backup: ${error.message}`);
    } finally { setLoading(false); }
  }

  async function exportarTodosCSV() {
    setLoading(true);
    setStatus('Exportando todas as tabelas em CSV...');
    try {
      for (const item of EXPORTACOES) {
        try {
          const data = await buscarTabela(item.tabela);
          baixar(`aac-${item.tabela}-${dataArquivo()}.csv`, paraCSV(data), 'text/csv;charset=utf-8');
          await new Promise(resolve => setTimeout(resolve, 250));
        } catch (error) {
          console.warn(error.message);
        }
      }
      setStatus('Exportação CSV concluída. O navegador pode pedir confirmação para múltiplos downloads.');
    } finally { setLoading(false); }
  }

  return (
    <PageShell eyebrow="Segurança administrativa" title="Backup e exportações" description="Exporte os dados principais da AAC para conferência, prestação de contas ou backup externo." action={<button className="btn-secondary" disabled={loading} onClick={backupJSON}><DatabaseBackup size={18}/> Backup completo JSON</button>}>
      <div className="mb-6 rounded-3xl border border-amber-100 bg-amber-50 p-5 text-sm font-bold text-amber-800">
        O backup exporta dados cadastrais e administrativos. Guarde os arquivos com segurança, pois podem conter dados pessoais de associados.
      </div>

      {status && <div className="mb-5 rounded-2xl border border-green-100 bg-green-50 p-4 text-sm font-bold text-green-700">{status}</div>}

      <div className="mb-6 flex flex-wrap gap-3">
        <button className="btn-primary" disabled={loading} onClick={backupJSON}><FileJson size={18}/> Baixar backup completo JSON</button>
        <button className="btn-secondary" disabled={loading} onClick={exportarTodosCSV}><Archive size={18}/> Baixar CSVs principais</button>
        <button className="btn-secondary" disabled={loading} onClick={() => setStatus('')}><RefreshCw size={18}/> Limpar aviso</button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {EXPORTACOES.map(item => (
          <article key={item.tabela} className="card p-5">
            <p className="text-xs font-black uppercase tracking-wider text-terra">Tabela</p>
            <h3 className="mt-1 text-xl font-black text-floresta">{item.nome}</h3>
            <p className="mt-2 text-sm text-slate-500">Exporta os registros de <code>{item.tabela}</code>.</p>
            <button className="btn-secondary mt-4 w-full" disabled={loading} onClick={() => exportarCSV(item)}><Download size={17}/> Exportar CSV</button>
          </article>
        ))}
      </div>
    </PageShell>
  );
}
