import { supabase } from './supabase';

export const BUCKET_ARQUIVOS = 'aac-arquivos';
export const BUCKET_PUBLICO = 'aac-publico';

export function sanitizeFileName(name = 'arquivo.pdf') {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

export async function uploadArquivo(file, pasta = 'documentos', bucket = BUCKET_ARQUIVOS) {
  if (!file) return { path: '', error: null };
  const ext = file.name?.split('.').pop() || 'pdf';
  const nomeLimpo = sanitizeFileName(file.name || `arquivo.${ext}`);
  const path = `${pasta}/${crypto.randomUUID()}-${nomeLimpo}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '3600',
    upsert: false
  });
  if (error) return { path: '', error };
  return { path, error: null };
}

export async function obterUrlPrivada(path, expiresIn = 60 * 60) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const { data, error } = await supabase.storage.from(BUCKET_ARQUIVOS).createSignedUrl(path, expiresIn);
  if (error) {
    console.error('Erro ao gerar URL assinada:', error.message);
    return '';
  }
  return data?.signedUrl || '';
}

export async function obterUrlsPrivadas(paths = {}, expiresIn = 60 * 60) {
  const entradas = Object.entries(paths).filter(([, path]) => Boolean(path));
  const resultado = {};
  await Promise.all(entradas.map(async ([key, path]) => {
    resultado[key] = await obterUrlPrivada(path, expiresIn);
  }));
  return resultado;
}

export async function abrirArquivoPrivado(path) {
  if (!path) return;
  if (/^https?:\/\//i.test(path)) {
    window.open(path, '_blank', 'noopener,noreferrer');
    return;
  }
  const { data, error } = await supabase.storage.from(BUCKET_ARQUIVOS).createSignedUrl(path, 60 * 60);
  if (error) {
    alert('Não foi possível abrir o arquivo: ' + error.message);
    return;
  }
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
}
