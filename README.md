# NB Hub Exames

Sistema de gestão de exames e check-ups médicos desenvolvido com React, TypeScript e Supabase.

## 🚀 Configuração Inicial

### 1. Configurar Variáveis de Ambiente para Netlify

Configure as seguintes variáveis de ambiente no Netlify (Site settings > Environment variables):

#### Variáveis obrigatórias:

```env
# URL do projeto Supabase (para frontend e backend)
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co

# Chave anônima (para frontend)
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

Execute a migration para criar a função e trigger automáticas:

```sql
-- No SQL Editor do Supabase, execute o conteúdo do arquivo:
-- supabase/migrations/create_handle_new_user_function.sql
```

Isso criará:
- Função `handle_new_user()` que sincroniza auth.users com public.users
- Trigger `on_auth_user_created` que executa automaticamente

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

Para testes rápidos, o sistema inclui credenciais de desenvolvimento:
- **Email:** admin@nb.com
- **Senha:** admin123

## 📋 Funcionalidades

- **Administrador:** Gestão completa do sistema
- **Parceiro:** Encaminhamento de exames
- **Recepção:** Acompanhamento de pedidos
- **Check-up:** Gestão de baterias e solicitações

## 🛠️ Resolução de Problemas

### Erro 400 no Login

1. Verifique se as variáveis de ambiente estão corretas
2. Use as ferramentas de debug no console
3. Verifique se o projeto Supabase está ativo
4. Confirme se não há limites de taxa atingidos

### Primeiro Acesso

1. Clique em "Primeiro acesso? Criar administrador"
2. Preencha os dados do primeiro usuário
3. Aguarde a criação e faça login

## 🔍 Logs e Monitoramento

O sistema inclui logs detalhados no console para facilitar o debug:
- Validação automática de variáveis de ambiente
- Testes de conectividade
- Monitoramento de requisições de autenticação
- Feedback detalhado de erros