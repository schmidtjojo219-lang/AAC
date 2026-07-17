-- Painel Interno AAC - Atualização V6.2
-- Correções: anexos em documentos/protocolos, storage, datas opcionais e recarregamento da API.
-- Execute uma vez no Supabase: SQL Editor > New query > Run.

create extension if not exists "pgcrypto";

-- 1) Garante que a tela antiga Documentos aceite arquivo interno, além de URL externa.
alter table public.documentos add column if not exists arquivo_path text;

-- 2) Garante buckets de arquivos usados pelo painel.
insert into storage.buckets (id, name, public)
values ('aac-arquivos', 'aac-arquivos', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('aac-publico', 'aac-publico', true)
on conflict (id) do nothing;

-- 3) Recria policies do Storage de forma segura.
drop policy if exists "aac_arquivos_select_auth" on storage.objects;
drop policy if exists "aac_arquivos_insert_auth" on storage.objects;
drop policy if exists "aac_arquivos_update_auth" on storage.objects;
drop policy if exists "aac_arquivos_delete_admin" on storage.objects;
drop policy if exists "aac_publico_select_public" on storage.objects;
drop policy if exists "aac_publico_insert_auth" on storage.objects;
drop policy if exists "aac_publico_update_auth" on storage.objects;
drop policy if exists "aac_publico_delete_admin" on storage.objects;

create policy "aac_arquivos_select_auth" on storage.objects
for select using (bucket_id = 'aac-arquivos' and public.get_perfil() is not null);

create policy "aac_arquivos_insert_auth" on storage.objects
for insert with check (
  bucket_id = 'aac-arquivos'
  and public.get_perfil() in ('admin','presidencia','secretaria','tesouraria','bem_estar_animal','conselho_fiscal')
);

create policy "aac_arquivos_update_auth" on storage.objects
for update using (
  bucket_id = 'aac-arquivos'
  and public.get_perfil() in ('admin','presidencia','secretaria','tesouraria','bem_estar_animal','conselho_fiscal')
)
with check (
  bucket_id = 'aac-arquivos'
  and public.get_perfil() in ('admin','presidencia','secretaria','tesouraria','bem_estar_animal','conselho_fiscal')
);

create policy "aac_arquivos_delete_admin" on storage.objects
for delete using (bucket_id = 'aac-arquivos' and public.get_perfil() in ('admin','presidencia'));

create policy "aac_publico_select_public" on storage.objects
for select using (bucket_id = 'aac-publico');

create policy "aac_publico_insert_auth" on storage.objects
for insert with check (bucket_id = 'aac-publico' and public.get_perfil() in ('admin','presidencia','secretaria'));

create policy "aac_publico_update_auth" on storage.objects
for update using (bucket_id = 'aac-publico' and public.get_perfil() in ('admin','presidencia','secretaria'))
with check (bucket_id = 'aac-publico' and public.get_perfil() in ('admin','presidencia','secretaria'));

create policy "aac_publico_delete_admin" on storage.objects
for delete using (bucket_id = 'aac-publico' and public.get_perfil() in ('admin','presidencia'));

-- 4) Grants/reload para PostgREST reconhecer campos e tabelas.
grant select, insert, update, delete on public.documentos to authenticated;
grant select, insert, update, delete on public.atas to authenticated;
grant select, insert, update, delete on public.protocolos to authenticated;
grant select, insert, update, delete on public.biblioteca_documentos to authenticated;

notify pgrst, 'reload schema';
