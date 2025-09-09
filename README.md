# NB Hub Exames

Sistema de gestão de exames e check-ups médicos desenvolvido com React, TypeScript e Supabase.

## 🚀 Configuração Inicial

### 1. Configurar Variáveis de Ambiente para Netlify

Configure as seguintes variáveis de ambiente no Netlify (Site settings > Build & deploy > Environment variables):

#### Variáveis obrigatórias:

```env
# URL do projeto Supabase (exposta no frontend)
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co

# Chave anônima (exposta no frontend)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Chave de Service Role (APENAS para Netlify Functions - nunca expor no frontend)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Como obter as credenciais:

1. Acesse https://app.supabase.com
2. Selecione seu projeto
3. Vá em Settings → API
4. Copie as chaves necessárias

### 2. Configurar Banco de Dados

Execute a migration no SQL Editor do Supabase para criar as tabelas:

```sql
-- Execute no SQL Editor do Supabase:
-- supabase/migrations/create_users_table_with_password.sql
```

**IMPORTANTE:** Este sistema usa autenticação via banco de dados próprio, não o Supabase Auth.

Isso criará:
- Tabela `public.users` com sistema de senhas próprio
- Todas as tabelas do sistema (partners, doctors, insurances, etc.)
- Políticas RLS com acesso público para permitir login
- Índices para performance
- Triggers para updated_at automático

### 2. Instalar Dependências

```bash
npm install
```

### 3. Iniciar o Servidor de Desenvolvimento

```bash
npm run dev
```

## 🔧 Ferramentas de Debug

O sistema inclui ferramentas de debug para diagnosticar problemas de autenticação:

### Testando a Netlify Function

Após configurar as variáveis de ambiente, você pode testar a função de criação de usuários:

```javascript
// Exemplo de uso da função create-user
fetch('/.netlify/functions/create-user', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'teste@exemplo.com',
    password: 'senha123',
    name: 'Usuário Teste',
    profile: 'admin'
  })
})
```

### No Console do Navegador (F12):

```javascript
// Validar variáveis de ambiente
envValidator.validate()

// Testar conectividade com Supabase
await envValidator.testConnection()

// Testar conexão de autenticação
debugAuth.testConnection()

// Testar login específico
debugAuth.testLogin('email@exemplo.com', 'senha')

// Monitorar requisições de rede
debugAuth.inspectNetworkRequests()
```

## 🔐 Credenciais de Desenvolvimento

**Sistema de Autenticação via Banco de Dados:**
- Não usa Supabase Auth
- Senhas são criptografadas e armazenadas na tabela `public.users`
- Senha padrão para novos usuários: `nb@123`
- Sessões duram 24 horas no localStorage

## 📋 Funcionalidades

### Sistema de Usuários
- **Autenticação própria:** Sistema independente do Supabase Auth
- **Criptografia:** Senhas são hasheadas antes de serem salvas
- **Sessões:** Gerenciadas via localStorage com expiração
- **Netlify Functions:** Endpoint para criação de usuários (opcional)

### Perfis de Acesso
- **Administrador:** Gestão completa do sistema
- **Parceiro:** Encaminhamento de exames
- **Recepção:** Acompanhamento de pedidos
- **Check-up:** Gestão de baterias e solicitações

## 🛠️ Resolução de Problemas

### Erro de Login "Email ou senha incorretos"

1. Verifique se a migration `create_users_table_with_password.sql` foi executada
2. Confirme que a tabela `users` existe: `SELECT * FROM users LIMIT 1;`
3. Verifique se há usuários cadastrados: `SELECT email, name, profile FROM users;`
4. Para criar o primeiro admin, use o botão "Primeiro acesso? Criar administrador"

### Erro 400 "Failed to load resource"

1. Verifique se `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` estão corretas
2. Confirme que o projeto Supabase está ativo
3. Teste a conectividade: `debugAuth.testConnection()` no console
4. Verifique se as políticas RLS estão configuradas corretamente

### Primeiro Acesso

1. Clique em "Primeiro acesso? Criar administrador"
2. Preencha os dados do primeiro usuário
3. Aguarde a criação (pode demorar alguns segundos)
4. Faça login com as credenciais criadas

## 🔍 Logs e Monitoramento

O sistema inclui logs detalhados no console para facilitar o debug:
- Validação automática de variáveis de ambiente
- Logs de tentativas de login
- Informações sobre criação de usuários
- Feedback detalhado de erros