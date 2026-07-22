---
name: reorganization-plan
description: Plano de faxina estrutural com mapeamento de cada arquivo
metadata:
  type: plan
  created: 2026-07-22
  phase_weights:
    define: 20
    develop: 60
    deliver: 20
---

# 🗂️ Plano de Reorganização — logix-subsistem

**Objetivo:** Faxinar a raiz (~35 arquivos soltos) e reorganizar em arquitetura clara  
**Restrições:** Histórico git intacto, URLs funcionando, execução imediata  
**Tempo estimado:** 2-3 horas (análise + execução + validação)

---

## O Que Você Vai Conseguir

Uma estrutura limpa e lógica:
- ✅ Todos os arquivos soltos organizados em pastas temáticas
- ✅ Separação clara entre DHL Admin e Service Provider Portal
- ✅ Assets, estilos, dados mock, scripts em locais predizíveis
- ✅ Redirects mantidos para compatibilidade com URLs existentes
- ✅ Documentação atualizada (ARCHITECTURE.md, README.md)
- ✅ Preparação pronta para migração React

---

## Como Vamos Chegar Lá

### DEFINE (20%)
Análise estruturada de cada arquivo solto
- Classificação: redirect vs. style vs. data vs. utility
- Mapeamento para novo destino
- Identificação de dependências

### DEVELOP (60%)
Reorganização segura
- Criar nova estrutura de pastas
- Mover arquivos com `mv`
- Atualizar referências internas
- Validar que nada quebrou

### DELIVER (20%)
Validação e documentação
- Testar funcionamento das páginas
- Atualizar ARCHITECTURE.md
- Criar script reutilizável para referência
- Commit com histórico limpo

---

## Análise Detalhada: Arquivos Soltos na Raiz

### 📄 REDIRECTS (Compatibilidade) — MANTER NA RAIZ

Estes são aliases que redirecionam para versões canônicas. Devem **permanecer na raiz** para compatibilidade:

```
index.html → dhl/access-select/index.html (redirect)
login.html → dhl/login/index.html (redirect)
dashboard.html → dhl/dashboard/index.html (redirect)
access-select.html → dhl/access-select/index.html (redirect)
contract-management-admin-view.html → dhl/contract-management/index.html (redirect)
vendor-admin-view.html → dhl/vendor-admin-view/index.html (redirect)
vehicles-admin-view.html → dhl/vehicles-admin-view/index.html (redirect)
standard-operating-procedures.html → dhl/standard-operating-procedures/index.html (redirect)
service-providers.html → service-providers/index.html (redirect)
service-provider-profile.html → service-provider-profile/index.html (redirect)

// Em sp-portal/ (local)
sp-portal/*.html → versões canônicas em sp-portal/*/index.html (9 arquivos)
```

**Ação:** MANTER ✅

---

### 🎨 ESTILOS GLOBAIS — REORGANIZAR PARA `styles/global/`

Arquivos de CSS que são carregados globalmente (ordem importa!):

```
base-system-reference.css        → styles/global/01-base-system.css
liquid-glass.css                 → styles/global/02-liquid-glass.css
modern-ui.css                    → styles/global/03-modern-ui.css
refinements-v2.css               → styles/global/04-refinements-v2.css
refinements-v3-motion.css        → styles/global/05-refinements-v3-motion.css
shared-pages.css                 → styles/global/shared-pages.css
```

**Observação:** Numeração em ordem de carregamento (importante para cascata CSS!)

**Ação:** Mover para `styles/global/` com numeração

---

### 📦 DADOS MOCK — REORGANIZAR PARA `data/mock/`

Arquivos de dados globais que são injetados no `window`:

```
dhl-mock-data.js                 → data/mock/dhl-mock-data.js
dhl-embedded-data.js             → data/mock/dhl-embedded-data.js (5122 linhas!)
dhl-lastday-pdf-data.js          → data/mock/dhl-lastday-pdf-data.js
dhl-disco-route-data.js          → data/mock/dhl-disco-route-data.js
```

**Ação:** Mover para `data/mock/`

---

### 🔧 SCRIPTS UTILITÁRIOS — REORGANIZAR PARA `lib/shared/`

Scripts compartilhados carregados globalmente:

```
beam-sidebar.js                  → lib/shared/beam-sidebar.js
avisos-storage.js                → lib/shared/avisos-storage.js
sp-header-identity.js            → lib/shared/sp-header-identity.js
refinements-v3-motion.js         → lib/shared/refinements-v3-motion.js (227 linhas)
admin-header.js                  → lib/shared/admin-header.js
login.js                         → sp-portal/login/login.js (no escopo local)
```

**Ação:** Mover scripts compartilhados para `lib/shared/`; scripts específicos para suas pastas

---

### 🎯 ESTILOS ESPECÍFICOS — JÁ ORGANIZADOS (VALIDAR)

Arquivos CSS que já estão em um bom lugar ou precisam pequenos ajustes:

```
access-select.css                → dhl/access-select/access-select.css
admin-header-standard.css        → lib/shared/admin-header-standard.css
contract-management.css          → dhl/contract-management/contract-management.css
dashboard.css                    → dhl/dashboard/dashboard.css
service-provider-profile.css     → sp-portal/profile/profile.css (já existe profile.css!)
sidebar-beam.css                 → lib/shared/sidebar-beam.css
vendor-admin-view.css            → dhl/vendor-admin-view/vendor-admin-view.css
vehicles-admin-view.css          → dhl/vehicles-admin-view/vehicles-admin-view.css
```

**Ação:** Revisar colocação; consolidar se houver duplicatas

---

### 🚨 REQUER VERIFICAÇÃO MANUAL

Arquivo suspeito encontrado:

```
tste\                            → DELETAR (arquivo corrompido, nome inválido)
```

Este arquivo tem nome inválido (terminado em `\`). Provável lixo de edição. Recomendação: **DELETAR**.

---

### 🗑️ LIXO SEGURO PARA DELETAR

```
.DS_Store                        → DELETAR (lixo macOS)
```

Está em `.gitignore`, então é seguro remover. Se encontrado em subpastas, também remover.

---

## Nova Arquitetura Proposta

```
logix-subsistem/
├── README.md                                    # Documentação (manter)
├── ARCHITECTURE.md                              # Documentação (ATUALIZAR)
├── .gitignore                                   # Config (manter)
│
├── index.html                                   # Redirect (manter)
├── login.html                                   # Redirect (manter)
├── dashboard.html                               # Redirect (manter)
├── access-select.html                           # Redirect (manter)
├── ⋮ [outros 6 redirects]
│
├── data/                                        # Dados mock globais
│   └── mock/
│       ├── dhl-mock-data.js                    # ← dhl-mock-data.js
│       ├── dhl-embedded-data.js                # ← dhl-embedded-data.js
│       ├── dhl-lastday-pdf-data.js             # ← dhl-lastday-pdf-data.js
│       └── dhl-disco-route-data.js             # ← dhl-disco-route-data.js
│
├── styles/                                      # Estilos globais
│   └── global/
│       ├── 01-base-system.css                  # ← base-system-reference.css
│       ├── 02-liquid-glass.css                 # ← liquid-glass.css
│       ├── 03-modern-ui.css                    # ← modern-ui.css
│       ├── 04-refinements-v2.css               # ← refinements-v2.css
│       ├── 05-refinements-v3-motion.css        # ← refinements-v3-motion.css
│       └── shared-pages.css                    # ← shared-pages.css
│
├── lib/                                         # Scripts compartilhados
│   └── shared/
│       ├── beam-sidebar.js                     # ← beam-sidebar.js
│       ├── sidebar-beam.css                    # ← sidebar-beam.css
│       ├── avisos-storage.js                   # ← avisos-storage.js
│       ├── sp-header-identity.js               # ← sp-header-identity.js
│       ├── admin-header.js                     # ← admin-header.js
│       ├── admin-header-standard.css           # ← admin-header-standard.css
│       └── refinements-v3-motion.js            # ← refinements-v3-motion.js
│
├── dhl/                                         # DHL Admin (já organizado)
│   ├── access-select/
│   │   ├── index.html
│   │   └── access-select.css                   # ← access-select.css
│   ├── dashboard/
│   │   ├── index.html
│   │   └── dashboard.css                       # ← dashboard.css
│   ├── login/
│   ├── contract-management/
│   │   ├── index.html
│   │   └── contract-management.css             # ← contract-management.css
│   ├── vendor-admin-view/
│   │   ├── index.html
│   │   └── vendor-admin-view.css               # ← vendor-admin-view.css
│   ├── vehicles-admin-view/
│   │   ├── index.html
│   │   └── vehicles-admin-view.css             # ← vehicles-admin-view.css
│   ├── standard-operating-procedures/
│   └── ⋮ [outras pastas]
│
├── service-providers/                          # DHL Admin (já organizado)
│   ├── index.html
│   ├── profile.html
│   └── ⋮
│
├── sp-portal/                                   # Service Provider Portal
│   ├── dashboard/
│   │   ├── index.html
│   │   └── ⋮
│   ├── profile/
│   │   ├── index.html
│   │   ├── profile.css
│   │   └── profile.js
│   ├── login/
│   │   ├── index.html
│   │   └── login.js                            # ← login.js (relocado)
│   ├── drivers/
│   ├── vehicles/
│   ├── contracts/
│   ├── sop-feed/
│   ├── select/
│   ├── *.html                                   # Redirects (manter)
│   └── ⋮ [outras páginas]
│
├── assets/                                      # Recursos de mídia (já organizado)
│   ├── videos/
│   ├── images/
│   └── ⋮
│
├── pages-schema/                                # Esquema TypeScript (para Next.js)
├── scripts/                                     # Scripts variados (verificar uso)
├── __tests__/                                   # Testes (já organizado)
└── .claude/                                     # Config Claude Code
```

---

## Plano de Execução Fase-a-Fase

### Fase 1: Preparação (5 min)

```bash
# Entrar no diretório
cd /Users/jopitondo/Desktop/Subsystem/logix-subsistem

# Criar novas pastas
mkdir -p data/mock
mkdir -p styles/global
mkdir -p lib/shared

# Verificar estrutura
ls -la
```

### Fase 2: Mover Dados Mock (10 min)

```bash
# Dados
mv dhl-mock-data.js data/mock/
mv dhl-embedded-data.js data/mock/
mv dhl-lastday-pdf-data.js data/mock/
mv dhl-disco-route-data.js data/mock/
```

### Fase 3: Mover Estilos Globais (10 min)

```bash
# Estilos globais (com numeração para preservar ordem)
mv base-system-reference.css styles/global/01-base-system.css
mv liquid-glass.css styles/global/02-liquid-glass.css
mv modern-ui.css styles/global/03-modern-ui.css
mv refinements-v2.css styles/global/04-refinements-v2.css
mv refinements-v3-motion.css styles/global/05-refinements-v3-motion.css
mv shared-pages.css styles/global/
```

### Fase 4: Mover Scripts Compartilhados (15 min)

```bash
# Scripts compartilhados
mv beam-sidebar.js lib/shared/
mv avisos-storage.js lib/shared/
mv sp-header-identity.js lib/shared/
mv refinements-v3-motion.js lib/shared/
mv admin-header.js lib/shared/
mv admin-header-standard.css lib/shared/
mv sidebar-beam.css lib/shared/

# Login.js → sp-portal/login/ (específico do portal)
mv login.js sp-portal/login/
```

### Fase 5: Mover Estilos Específicos (10 min)

```bash
# Estilos de features específicas
mv access-select.css dhl/access-select/
mv contract-management.css dhl/contract-management/
mv dashboard.css dhl/dashboard/
mv vendor-admin-view.css dhl/vendor-admin-view/
mv vehicles-admin-view.css dhl/vehicles-admin-view/
mv service-provider-profile.css sp-portal/profile/profile-old.css

# Mover sidebar.css para lib/shared se ainda não estiver lá
# (verificar se dhl/access-select está usando sb-beam.css — pode estar duplicado)
```

### Fase 6: Deletar Lixo (2 min)

```bash
# Deletar arquivo corrompido
rm -f "tste\\"

# Deletar .DS_Store se existir
find . -name ".DS_Store" -delete
```

### Fase 7: Validação (10 min)

```bash
# Verificar que raiz está limpa (apenas redirects e pastas)
ls -la | grep -v "^d" | grep -v "^total" | grep -E "\.html|\.css|\.js"

# Deve retornar APENAS arquivos .html (redirects) e nada mais

# Testar URLs básicas (abrir em navegador)
# http://localhost:8000/index.html → deve redirecionar para dhl/access-select/
# http://localhost:8000/sp-portal/dashboard.html → deve redirecionar para dashboard/index.html
```

---

## Atualizar Referências HTML

Após mover os arquivos, **é necessário atualizar as referências nos arquivos HTML** que carregam estes scripts/estilos.

### Exemplo: `dhl/dashboard/index.html`

Antes:
```html
<link rel="stylesheet" href="../../dashboard.css">
<link rel="stylesheet" href="../../base-system-reference.css">
<script src="../../dhl-mock-data.js" defer></script>
<script src="../../beam-sidebar.js" defer></script>
```

Depois:
```html
<link rel="stylesheet" href="../../styles/global/01-base-system.css">
<link rel="stylesheet" href="../../dhl/dashboard/dashboard.css">
<script src="../../data/mock/dhl-mock-data.js" defer></script>
<script src="../../lib/shared/beam-sidebar.js" defer></script>
```

**⚠️ Esta etapa requer análise arquivo-por-arquivo. Recomendação: usar `grep -r` para encontrar todas as referências.**

---

## Atualizar ARCHITECTURE.md

Após conclusão, atualizar o documento com:

```markdown
## Estrutura Física (diretório)

### Raiz (/)
- `*.html` — Redirects de compatibilidade (index.html, login.html, etc.)
- Tudo mais está organizado em pastas

### data/mock/
Dados globais injetados no `window`:
- `dhl-mock-data.js` — Dados principal (vendors, vehicles, contracts)
- `dhl-embedded-data.js` — Dados operacionais e financeiros
- `dhl-lastday-pdf-data.js` — Dados do último dia (PDF)
- `dhl-disco-route-data.js` — Dados DISCO por rota

### styles/global/
Camadas CSS globais (carregadas em ordem numérica):
1. `01-base-system.css` — Base do sistema
2. `02-liquid-glass.css` — Efeitos glass morphism
3. `03-modern-ui.css` — Componentes modernos
4. `04-refinements-v2.css` — Refinamentos v2
5. `05-refinements-v3-motion.css` — Animações v3
- `shared-pages.css` — Estilos compartilhados entre páginas

### lib/shared/
Scripts e estilos reutilizáveis:
- `beam-sidebar.js` — Componente sidebar animado
- `avisos-storage.js` — CRUD de avisos (localStorage)
- `sp-header-identity.js` — Header com identidade do SP
- `admin-header.js` — Header administrativo
- `refinements-v3-motion.js` — Utilitários de animação
- `admin-header-standard.css` — Estilos do header
- `sidebar-beam.css` — Estilos da sidebar

### dhl/
DHL Administration (organizado por feature):
- `access-select/` — Seletor de acesso (DHL vs Portal)
- `dashboard/` — Dashboard administrativo
- `login/` — Login administrativo
- `contract-management/` — Gestão de contratos
- `vendor-admin-view/` — Administração de vendors
- `vehicles-admin-view/` — Administração de veículos
- `standard-operating-procedures/` — SOP Feed
- ⋮

### service-providers/
SP listing (administrativo):
- `index.html` — Lista de service providers
- `profile.html` — Perfil de um SP

### sp-portal/
Service Provider Portal (organizado por feature):
- `dashboard/` — Dashboard do SP
- `profile/` — Perfil da empresa
- `login/` — Login do portal
- `drivers/` — Gestão de drivers
- `vehicles/` — Gestão de veículos
- `contracts/` — Contratos (read-only)
- `sop-feed/` — SOP Feed (read-only)
- `select/` — Seletor de provider
- ⋮
- `*.html` — Redirects para compatibilidade

### assets/
Recursos de mídia:
- `videos/` — Vídeos
- `images/` → Imagens (estrutura a confirmar)

### pages-schema/
Metadado para integração com Next.js (não executa aqui):
- `manifest.ts` — Lista de rotas
- `types.ts` — Tipos TypeScript
- `routes/` — Definições por rota

### scripts/ e __tests__/
Scripts variados e testes (conforme existente).
```

---

## Comandos de Referência (Copiar/Colar)

### Executar toda a reorganização de uma vez:

```bash
cd /Users/jopitondo/Desktop/Subsystem/logix-subsistem

# Criar estrutura
mkdir -p data/mock styles/global lib/shared

# Mover dados mock
mv dhl-mock-data.js data/mock/
mv dhl-embedded-data.js data/mock/
mv dhl-lastday-pdf-data.js data/mock/
mv dhl-disco-route-data.js data/mock/

# Mover estilos globais
mv base-system-reference.css styles/global/01-base-system.css
mv liquid-glass.css styles/global/02-liquid-glass.css
mv modern-ui.css styles/global/03-modern-ui.css
mv refinements-v2.css styles/global/04-refinements-v2.css
mv refinements-v3-motion.css styles/global/05-refinements-v3-motion.css
mv shared-pages.css styles/global/

# Mover scripts compartilhados
mv beam-sidebar.js lib/shared/
mv avisos-storage.js lib/shared/
mv sp-header-identity.js lib/shared/
mv refinements-v3-motion.js lib/shared/
mv admin-header.js lib/shared/
mv admin-header-standard.css lib/shared/
mv sidebar-beam.css lib/shared/
mv login.js sp-portal/login/

# Mover estilos específicos
mv access-select.css dhl/access-select/
mv contract-management.css dhl/contract-management/
mv dashboard.css dhl/dashboard/
mv vendor-admin-view.css dhl/vendor-admin-view/
mv vehicles-admin-view.css dhl/vehicles-admin-view/

# Deletar lixo
rm -f "tste\\"
find . -name ".DS_Store" -delete

# Validar
echo "Arquivos restantes na raiz (devem ser APENAS .html redirects):"
ls -la | grep -E "\\.html|\\.css|\\.js"
```

---

## Pós-Reorganização: Atualizar Referências

Este é o trabalho manual crítico. Após mover, é necessário atualizar **cada arquivo HTML** que carrega estes recursos.

### Script para encontrar referências:

```bash
# Encontrar todos os arquivos que referenciam os arquivos movidos
grep -r "dashboard.css" dhl/
grep -r "dhl-mock-data.js" dhl/ sp-portal/
grep -r "beam-sidebar.js" dhl/ sp-portal/
# ... e assim por diante

# Resultado: lista de arquivos HTML que precisam de atualização manual
```

### Exemplo de atualização:

Se `dhl/dashboard/index.html` tem:
```html
<link rel="stylesheet" href="../../dashboard.css">
```

Deve passar a ser:
```html
<link rel="stylesheet" href="../../styles/global/04-refinements-v3-motion.css">
<link rel="stylesheet" href="./dashboard.css">
```

(ou conforme a navegação relativizada de pastas)

---

## Critérios de Sucesso (Validação)

- ✅ Raiz limpa: apenas `*.html` (redirects), pastas, e `.gitignore`
- ✅ Nenhum arquivo `*.js` ou `*.css` na raiz (todos organizados)
- ✅ `data/mock/` contém os 4 arquivos de dados
- ✅ `styles/global/` contém os 6 arquivos de estilos (numerados 01-05)
- ✅ `lib/shared/` contém scripts compartilhados
- ✅ Estilos específicos em suas pastas de feature
- ✅ URLs/redirects funcionam
- ✅ Nenhum arquivo quebrado ou faltando (testar em navegador)
- ✅ ARCHITECTURE.md atualizado com nova estrutura

---

## Próximos Passos (Após Reorganização)

1. **Atualizar todas as referências** em arquivos HTML (buscar/substituir)
2. **Testar cada página** no navegador (funcionalidade preservada)
3. **Fazer commit git** com mensagem clara:
   ```
   refactor: organize root files into logical folder structure
   
   - Move mock data to data/mock/
   - Move global styles to styles/global/ (numbered 01-05)
   - Move shared scripts to lib/shared/
   - Move feature-specific styles to their feature folders
   - Update all internal references
   - Preserve compatibility aliases (*.html redirects)
   ```
4. **Atualizar ARCHITECTURE.md** com nova estrutura
5. **Pronto para migração React** — estrutura clara para novo projeto Vite

---

**Intent Contract:** `.claude/session-intent.md`  
**Status:** Pronto para execução  
**Próxima ação:** Rever plano ou executar reorganização com `/octo:embrace`
