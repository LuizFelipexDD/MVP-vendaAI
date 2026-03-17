<div align="center">

# 🤖 VendAI

**Assistente inteligente de vendas com IA conversacional e busca vetorial**

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![n8n](https://img.shields.io/badge/n8n-Workflow_Automation-FF6D5A?logo=n8n&logoColor=white)](https://n8n.io)
[![License](https://img.shields.io/badge/License-Apache_2.0-green.svg)](LICENSE)

[Funcionalidades](#-funcionalidades) •
[Arquitetura](#-arquitetura) •
[Instalação](#-instalação) •
[Configuração](#%EF%B8%8F-configuração) •
[Uso](#-uso) •
[Estrutura do Projeto](#-estrutura-do-projeto) •
[Contribuindo](#-contribuindo)

</div>

---

## 📋 Sobre

O **VendAI** é um MVP de assistente de vendas conversacional para pastilhas de freio automotivas. Ele combina uma interface de chat moderna em React com um fluxo agêntico de IA no **n8n**, utilizando **RAG (Retrieval-Augmented Generation)** com busca vetorial para encontrar produtos relevantes no banco de dados.

O agente interpreta a linguagem natural do cliente — incluindo aplicações por veículo, marcas, posição (dianteira/traseira) e até erros de digitação — e retorna informações precisas sobre as pastilhas disponíveis, preços e especificações técnicas.

## ✨ Funcionalidades

- 💬 **Chat em tempo real** com interface responsiva e animações fluidas
- 🧠 **Agente IA** com prompt especializado em consultoria de pastilhas de freio
- 🔍 **Busca vetorial (RAG)** via PGVector para encontrar produtos por similaridade semântica
- 📝 **Histórico de conversas** persistido localmente via IndexedDB (Dexie)
- 🔄 **Memória de sessão** — o agente mantém contexto durante a conversa (via Postgres)
- ⚡ **Auto-retentativas** com backoff exponencial em caso de falha de conexão
- 🛡️ **Rate limiting** e validação de input no frontend
- 📱 **Design responsivo** — funciona em desktop e mobile
- ✅ **Feedback visual** — indicador de digitação, thumbs up/down, copiar resposta
- 🎨 **Markdown rendering** — respostas da IA formatadas com suporte a Markdown

## 🏗 Arquitetura

```
┌──────────────────────────────────────────────────────────────┐
│  Frontend (React + Vite + TypeScript)                        │
│  ┌─────────────┐  ┌───────────────┐  ┌───────────────────┐  │
│  │  ChatInput   │→│  useChat Hook  │→│  Zustand Store     │  │
│  │  (textarea)  │  │  (fetch + retry)│ │  (estado global)  │  │
│  └─────────────┘  └───────┬───────┘  └──────────┬────────┘  │
│                           │                      │           │
│                           ▼                      ▼           │
│                    POST /webhook          Dexie (IndexedDB)  │
│                    {chatInput,            Persistência local  │
│                     sessionId}                               │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  n8n (Workflow Automation)                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Chat Trigger  │→│ Agente IA    │→│ Busca Vetorial    │  │
│  │ (webhook)     │  │ (Gemini LLM) │  │ (PGVector RAG)   │  │
│  └──────────────┘  └──────┬───────┘  └────────┬─────────┘  │
│                           │                    │             │
│                    ┌──────┴───────┐    ┌───────┴──────────┐ │
│                    │ Memória Chat │    │ Embeddings       │ │
│                    │ (Postgres)   │    │ (Gemini)         │ │
│                    └──────────────┘    └──────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│  PostgreSQL + pgvector                                       │
│  Tabela: produtos (nome, marca, aplicacao, posicao, preco,   │
│          tecnologia, observações, conteudo_para_embedding)    │
└──────────────────────────────────────────────────────────────┘
```

## 🚀 Instalação

### Pré-requisitos

- **Node.js** ≥ 18
- **npm** ≥ 9
- **n8n** rodando (local ou cloud) com o workflow configurado
- **PostgreSQL** com extensão **pgvector** e dados de produtos vetorizados

### Passos

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/MVP-VendAI.git
cd MVP-VendAI

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas configurações (veja seção abaixo)

# 4. Inicie o servidor proxy e o frontend
npm run server
npm run dev
```

O app estará disponível em **http://localhost:3000**.

## ⚙️ Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto (ou copie de `.env.example`):

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `WEBHOOK_URL` | URL do Chat Trigger do n8n (proxy) | `http://localhost:5678/webhook/<ID>/chat` |
| `VITE_PROXY_API_URL` | URL base do servidor proxy | `http://localhost:8787` |
| `PROXY_PORT` | Porta do servidor proxy | `8787` |
| `PROXY_ALLOWED_ORIGIN` | Origem permitida no proxy | `http://localhost:3000` |
| `PROXY_TARGET` | Alvo do proxy do Vite (dev) | `http://localhost:8787` |

> **Como encontrar o Webhook ID:** Abra o workflow no n8n → clique no nó "Chat Trigger" → o ID está na URL do webhook.

### Workflow n8n

O workflow deve conter:

1. **Chat Trigger** — com `public: true` e `loadPreviousSession: memory`
2. **Agente IA** — conectado ao LLM (Gemini) e à memória
3. **Memória do Chat** — Postgres (para persistir contexto por sessão)
4. **Busca Vetorial** — PGVector com embeddings para busca semântica de produtos

## 📖 Uso

1. Acesse `http://localhost:3000`
2. Clique em **"Nova Conversa"** na barra lateral
3. Digite sua mensagem (ex: *"Quais pastilhas de freio para o meu HB20 vocês têm?"*)
4. O agente buscará no banco de dados e responderá com os produtos encontrados

### Exemplos de perguntas

- `"Tem pastilha dianteira para Corolla 2020?"`
- `"Quanto custa a pastilha Bosch para Onix?"`
- `"Quais pastilhas cerâmicas vocês trabalham?"`
- `"Preciso de pastilha traseira para meu Jeep Renegade 2022"`

## 📁 Estrutura do Projeto

```
MVP-VendAI/
├── index.html                 # Entry point HTML
├── package.json               # Dependências e scripts
├── vite.config.ts             # Configuração do Vite
├── tsconfig.json              # Configuração do TypeScript
├── .env                       # Variáveis de ambiente (não versionado)
├── .env.example               # Template de variáveis de ambiente
└── src/
    ├── main.tsx               # Bootstrap da aplicação React
    ├── App.tsx                # Componente raiz (layout)
    ├── index.css              # Estilos globais (Tailwind + Inter font)
    ├── components/
    │   ├── ChatWindow.tsx     # Janela principal do chat (mensagens + input)
    │   ├── ChatInput.tsx      # Campo de input com auto-resize
    │   ├── MessageBubble.tsx  # Bolha de mensagem (Markdown, copy, feedback)
    │   ├── Sidebar.tsx        # Barra lateral de conversas
    │   └── QuickReply.tsx     # Botões de resposta rápida
    ├── hooks/
    │   └── useChat.ts         # Hook de integração com n8n (fetch, retry, etc.)
    ├── stores/
    │   └── chatStore.ts       # Estado global via Zustand
    └── db/
        └── database.ts        # Persistência local via Dexie (IndexedDB)
```

## 🛠️ Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Inicia o servidor de desenvolvimento (porta 3000) |
| `npm run build` | Gera o build de produção em `dist/` |
| `npm run preview` | Visualiza o build de produção localmente |
| `npm run clean` | Remove a pasta `dist/` |

## 🔧 Stack Tecnológica

| Camada | Tecnologia | Propósito |
|--------|-----------|-----------|
| **Frontend** | React 19, TypeScript 5.8 | Interface de usuário |
| **Bundler** | Vite 6 | Build e dev server |
| **Estilização** | Tailwind CSS 4 | Utilitários CSS |
| **Estado** | Zustand | Gerenciamento de estado global |
| **Persistência** | Dexie (IndexedDB) | Histórico local de conversas |
| **Animações** | Motion (Framer Motion) | Transições e micro-interações |
| **Automação** | n8n | Orquestração do fluxo agêntico |
| **LLM** | Google Gemini | Modelo de linguagem |
| **Banco de Dados** | PostgreSQL + pgvector | Armazenamento e busca vetorial |
| **Embeddings** | Gemini Embedding 001 | Vetorização de produtos |