import { Navigate } from "react-router-dom";
import { useAuthStore } from "./authStore";
import { verificarPermissao } from "./perfis";

export const RotaProtegida = ({ children, permissao }) => {
  const { autenticado, perfil } = useAuthStore();

  if (!autenticado) return <Navigate to="/login" replace />;
  if (permissao && !verificarPermissao(perfil?.id, permissao)) {
    return <Navigate to="/403" replace />;
  }
  return children;
};
