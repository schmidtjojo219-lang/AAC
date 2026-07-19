import { Navigate } from "react-router-dom";
import { useAuthStore } from "./authStore";
import { verificarPermissao } from "./perfis";

export const RotaProtegida = ({ children, permissao }) => {
  const { autenticado, perfilChave, carregando } = useAuthStore();

  // 🔴 SEGURA A ROTA ENQUANTO CARREGA A SESSÃO — evita expulsar usuário logado
  if (carregando) {
    return (
      <div className="h-screen w-screen grid place-items-center bg-institucional-fundo">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gov-200 border-t-gov-500 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-institucional-textoSecundario">Carregando sistema...</p>
        </div>
      </div>
    );
  }

  if (!autenticado) return <Navigate to="/login" replace />;
  if (permissao && !verificarPermissao(perfilChave, permissao)) {
    return <Navigate to="/403" replace />;
  }
  return children;
};