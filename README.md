# NB Hub Exames

Sistema de gestão de exames e check-ups médicos desenvolvido com React, TypeScript e Supabase.

## 🚀 Configuração Inicial

### 1. Configurar Variáveis de Ambiente

O arquivo `.env` foi criado com configurações baseadas no seu projeto Supabase. **IMPORTANTE**: Você precisa substituir a chave de exemplo pela chave real.

#### Como obter as credenciais corretas:

1. **Acesse o painel do Supabase:** https://app.supabase.com
2. **Selecione seu projeto** (xvoxphvdojuxkmxxjmoj)
3. **Vá em Settings → API**
4. **Copie as seguintes informações:**
   - **Project URL:** `https://xvoxphvdojuxkmxxjmoj.supabase.co` (já configurada)
   - **anon/public key:** Substitua no arquivo `.env`

#### Estrutura do arquivo `.env`:
```env
VITE_SUPABASE_URL=https://xvoxphvdojuxkmxxjmoj.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_real_aqui
```

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