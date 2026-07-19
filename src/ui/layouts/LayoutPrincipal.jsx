import { Outlet, Link, useLocation } from "react-router-dom";
import { MENU_CENTRAIS } from "../components/menu/menuCentrais";
import { useAuthStore } from "../../core/auth/authStore";
import { verificarPermissao } from "../../core/auth/perfis";
import { Badge } from "../components/cards/Badge";

export const LayoutPrincipal = () => {
  const location = useLocation();
  const { usuario, perfilChave, perfil, logout } = useAuthStore();

  return (
    <div className="flex h-screen overflow-hidden bg-institucional-fundo">
      <aside className="w-64 bg-white border-r border-institucional-borda flex flex-col shrink-0">
        <div className="p-5 border-b border-institucional-borda bg-gov-500">
          <h1 className="text-white font-bold text-lg leading-tight">AAC v8.0</h1>
          <p className="text-gov-100 text-xs mt-0.5">Gestão Institucional</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {MENU_CENTRAIS.filter(item => verificarPermissao(perfilChave, item.permissao)).map(item => {
            const ativo = location.pathname === item.rota || location.pathname.startsWith(item.rota + "/");
            return (
              <Link
                key={item.id}
                to={item.rota}
                className={
                  "flex items-center gap-3 px-5 py-2.5 text-sm font-medium transition " +
                  (ativo
                    ? "bg-gov-50 text-gov-700 border-r-4 border-gov-500"
                    : "text-institucional-texto hover:bg-gov-50/60")
                }
              >
                <span className="text-lg">{item.icone}</span>
                <span>{item.nome}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-institucional-borda text-xs text-institucional-textoSecundario">
          <p className="font-semibold text-institucional-texto">{usuario?.nome || "Usuário"}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge cor="info">{perfil?.sigla}</Badge>
            <span>{perfil?.nome}</span>
          </div>
          <button onClick={logout} className="mt-2 text-red-600 hover:underline">Sair do sistema</button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-institucional-borda flex items-center px-6 gap-4 shrink-0">
          <div className="flex-1 max-w-xl">
            <input
              placeholder="🔍 Busca Global — Pesquise associados, animais, RGA, documentos, processos..."
              className="w-full px-4 py-2 text-sm bg-institucional-fundo border border-institucional-borda rounded-md focus:border-gov-500 focus:ring-1 focus:ring-gov-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-3 text-sm">
            <button className="relative p-2 hover:bg-institucional-fundo rounded-md" title="Notificações">
              🔔
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full grid place-items-center">3</span>
            </button>
            <Badge cor="sucesso">● Online</Badge>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};