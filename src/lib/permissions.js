export const PERFIS = {
  admin: 'Administrador Geral',
  presidencia: 'Presidência',
  secretaria: 'Secretaria',
  tesouraria: 'Tesouraria',
  bem_estar_animal: 'Bem-Estar Animal',
  conselho_fiscal: 'Conselho Fiscal',
  consulta: 'Consulta'
};

export function canEdit(profile, area) {
  const perfil = profile?.perfil;
  if (perfil === 'admin' || perfil === 'presidencia') return true;
  if (area === 'associados') return ['secretaria'].includes(perfil);
  if (area === 'animais') return ['secretaria', 'bem_estar_animal'].includes(perfil);
  if (area === 'financeiro') return ['tesouraria'].includes(perfil);
  if (area === 'documentos') return ['secretaria', 'tesouraria', 'conselho_fiscal'].includes(perfil);
  if (area === 'atas') return ['secretaria', 'conselho_fiscal'].includes(perfil);
  if (area === 'noticias') return ['secretaria'].includes(perfil);
  if (area === 'pareceres') return ['conselho_fiscal'].includes(perfil);
  return false;
}
