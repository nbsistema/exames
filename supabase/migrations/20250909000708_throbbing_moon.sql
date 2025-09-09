/*
  # Função e Trigger para sincronização automática de usuários

  1. Função handle_new_user
    - Insere automaticamente registros em public.users quando um usuário é criado em auth.users
    - Extrai name e profile dos metadados do usuário
    - Define valores padrão caso os metadados não existam

  2. Trigger on_auth_user_created
    - Executa automaticamente após INSERT em auth.users
    - Chama a função handle_new_user para cada novo usuário
*/

-- Criar ou substituir a função handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, name, profile, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Sem nome'),
    COALESCE(NEW.raw_user_meta_data->>'profile', 'checkup'),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger existente se houver
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Criar trigger que executa após INSERT em auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Garantir que a função seja executável
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;