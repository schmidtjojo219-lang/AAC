import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { supabase, supabaseConfigured } from './lib/supabase';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Associados from './pages/Associados';
import Animais from './pages/Animais';
import Financeiro from './pages/Financeiro';
import Mensalidades from './pages/Mensalidades';
import DocumentosProcessos from './pages/DocumentosProcessos';
import Noticias from './pages/Noticias';
import ConselhoFiscal from './pages/ConselhoFiscal';
import Relatorios from './pages/Relatorios';
import Usuarios from './pages/Usuarios';
import ConsultaPublica from './pages/ConsultaPublica';
import ValidarDocumento from './pages/ValidarDocumento';
import AssinarDocumento from './pages/AssinarDocumento';
import BackupExportacoes from './pages/BackupExportacoes';
import FormulariosSite from './pages/FormulariosSite';
import PlanejamentoFinanceiro from './pages/PlanejamentoFinanceiro';
import PrestacaoContas from './pages/PrestacaoContas';

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function loadProfile() {
      if (!session?.user?.id || !supabaseConfigured) {
        setProfile(null);
        return;
      }

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      setProfile(data || {
        id: session.user.id,
        email: session.user.email,
        nome: session.user.email,
        perfil: 'consulta',
        ativo: true
      });
    }

    loadProfile();
  }, [session]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-xl font-black text-floresta">Carregando painel...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login session={session} />} />
        <Route path="/consulta" element={<ConsultaPublica />} />
        <Route path="/consulta/:tipo/:codigo" element={<ConsultaPublica />} />
        <Route path="/validar" element={<ValidarDocumento />} />
        <Route path="/validar/:codigo" element={<ValidarDocumento />} />
        <Route path="/assinar/:token" element={<AssinarDocumento />} />
        <Route
          path="/"
          element={
            <ProtectedRoute session={session}>
              <Layout session={session} profile={profile} />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard profile={profile} />} />
          <Route path="associados" element={<Associados profile={profile} />} />
          <Route path="animais" element={<Animais profile={profile} />} />
          <Route path="financeiro" element={<Financeiro profile={profile} />} />
          <Route path="planejamento-financeiro" element={<PlanejamentoFinanceiro profile={profile} />} />
          <Route path="prestacao-contas" element={<PrestacaoContas profile={profile} />} />
          <Route path="mensalidades" element={<Mensalidades profile={profile} />} />
          <Route path="documentos" element={<DocumentosProcessos profile={profile} />} />
          <Route path="atas-protocolos" element={<DocumentosProcessos profile={profile} />} />
          <Route path="noticias" element={<Noticias profile={profile} />} />
          <Route path="conselho-fiscal" element={<ConselhoFiscal profile={profile} />} />
          <Route path="relatorios" element={<Relatorios profile={profile} />} />
          <Route path="usuarios" element={<Usuarios profile={profile} />} />
          <Route path="backup" element={<BackupExportacoes profile={profile} />} />
          <Route path="formularios-site" element={<FormulariosSite profile={profile} />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
