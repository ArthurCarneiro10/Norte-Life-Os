-- Seed de exemplo. Rode DEPOIS de criar seu usuário (troque :uid pelo seu auth user id).
-- No Supabase: Authentication -> Users -> copie o UUID.
-- Uso: psql / SQL Editor, defina o uid abaixo.

do $$
declare
  uid uuid := 'ecff572f-fbaf-479e-a519-f35e93895e18';
  t_id uuid;
  s1 uuid; s2 uuid; s3 uuid;
begin
  insert into tasks (user_id, sphere, title, emoji, category, status, priority, due_at, estimated_minutes, snapshot)
  values (uid, 'profissional', 'Parecer sobre a cláusula de responsabilidade', '📄', 'Cliente Y',
          'em_andamento', 'alta', now() + interval '3 days', 300,
          'Na cláusula 4.2, comparando o teto de responsabilidade com a minuta do cliente. Faltava confirmar o limite.')
  returning id into t_id;

  insert into subtasks (task_id, title, position, done) values (t_id, 'Levantar documentos e contrato-mãe', 0, true) returning id into s1;
  insert into subtasks (task_id, title, position, done) values (t_id, 'Revisar cláusula 4.2', 1, false) returning id into s2;
  insert into subtasks (task_id, title, position, done, depends_on) values (t_id, 'Confrontar com a minuta do cliente', 2, false, s2) returning id into s3;
  insert into subtasks (task_id, title, position, done, depends_on) values (t_id, 'Redigir parecer final', 3, false, s3);

  insert into tasks (user_id, sphere, title, emoji, category, status, priority, due_at)
  values (uid, 'profissional', 'Fechar relatório mensal de vendas', '📊', 'Interno', 'em_andamento', 'media', now() + interval '4 days'),
         (uid, 'pessoal', 'Marcar consulta e exames', '🏃', 'Saúde', 'a_fazer', 'baixa', null),
         (uid, 'pessoal', 'Estudar arquitetura de sistemas', '📚', 'Estudos', 'a_fazer', 'media', now() + interval '2 days');
end $$;
