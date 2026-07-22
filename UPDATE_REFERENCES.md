# Atualizar Referências em Arquivos HTML

## O que foi movido

| Arquivo Original | Novo Local | Tipo |
|---|---|---|
| `dhl-mock-data.js` | `data/mock/dhl-mock-data.js` | Data |
| `dhl-embedded-data.js` | `data/mock/dhl-embedded-data.js` | Data |
| `dhl-lastday-pdf-data.js` | `data/mock/dhl-lastday-pdf-data.js` | Data |
| `dhl-disco-route-data.js` | `data/mock/dhl-disco-route-data.js` | Data |
| `base-system-reference.css` | `styles/global/01-base-system.css` | Style |
| `liquid-glass.css` | `styles/global/02-liquid-glass.css` | Style |
| `modern-ui.css` | `styles/global/03-modern-ui.css` | Style |
| `refinements-v2.css` | `styles/global/04-refinements-v2.css` | Style |
| `refinements-v3-motion.css` | `styles/global/05-refinements-v3-motion.css` | Style |
| `shared-pages.css` | `styles/global/shared-pages.css` | Style |
| `beam-sidebar.js` | `lib/shared/beam-sidebar.js` | Script |
| `avisos-storage.js` | `lib/shared/avisos-storage.js` | Script |
| `sp-header-identity.js` | `lib/shared/sp-header-identity.js` | Script |
| `refinements-v3-motion.js` | `lib/shared/refinements-v3-motion.js` | Script |
| `admin-header.js` | `lib/shared/admin-header.js` | Script |
| `admin-header-standard.css` | `lib/shared/admin-header-standard.css` | Style |
| `sidebar-beam.css` | `lib/shared/sidebar-beam.css` | Style |
| `login.js` | `sp-portal/login/login.js` | Script |
| `access-select.css` | `dhl/access-select/access-select.css` | Style |
| `contract-management.css` | `dhl/contract-management/contract-management.css` | Style |
| `dashboard.css` | `dhl/dashboard/dashboard.css` | Style |
| `vendor-admin-view.css` | `dhl/vendor-admin-view/vendor-admin-view.css` | Style |
| `vehicles-admin-view.css` | `dhl/vehicles-admin-view/vehicles-admin-view.css` | Style |
| `service-provider-profile.css` | `sp-portal/profile/service-provider-profile.css` | Style |

## Encontrar Arquivos HTML Afetados

```bash
# Listar todos os arquivos HTML que precisam de atualização
grep -r "dhl-mock-data.js\|dhl-embedded-data.js\|dhl-lastday-pdf-data.js\|dhl-disco-route-data.js" . --include="*.html" | cut -d: -f1 | sort -u

# Ou individual
grep -r "dhl-mock-data.js" . --include="*.html"
grep -r "beam-sidebar.js" . --include="*.html"
# ... etc
```

## Como Atualizar

Para cada arquivo HTML encontrado, trocar:

### Dados Mock

```html
<!-- ANTES -->
<script src="../../dhl-mock-data.js" defer></script>
<script src="../../dhl-embedded-data.js" defer></script>

<!-- DEPOIS (se em dhl/) -->
<script src="../../data/mock/dhl-mock-data.js" defer></script>
<script src="../../data/mock/dhl-embedded-data.js" defer></script>

<!-- DEPOIS (se em sp-portal/) -->
<script src="../../../data/mock/dhl-mock-data.js" defer></script>
<script src="../../../data/mock/dhl-embedded-data.js" defer></script>
```

### Estilos Globais

```html
<!-- ANTES -->
<link rel="stylesheet" href="../../base-system-reference.css">
<link rel="stylesheet" href="../../liquid-glass.css">

<!-- DEPOIS (se em dhl/) -->
<link rel="stylesheet" href="../../styles/global/01-base-system.css">
<link rel="stylesheet" href="../../styles/global/02-liquid-glass.css">

<!-- DEPOIS (se em sp-portal/) -->
<link rel="stylesheet" href="../../../styles/global/01-base-system.css">
<link rel="stylesheet" href="../../../styles/global/02-liquid-glass.css">
```

### Scripts Compartilhados

```html
<!-- ANTES -->
<script src="../../beam-sidebar.js" defer></script>
<script src="../../avisos-storage.js" defer></script>

<!-- DEPOIS (se em dhl/) -->
<script src="../../lib/shared/beam-sidebar.js" defer></script>
<script src="../../lib/shared/avisos-storage.js" defer></script>

<!-- DEPOIS (se em sp-portal/) -->
<script src="../../../lib/shared/beam-sidebar.js" defer></script>
<script src="../../../lib/shared/avisos-storage.js" defer></script>
```

## Exemplo Completo: dhl/dashboard/index.html

Se este arquivo tem:

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="../../base-system-reference.css">
  <link rel="stylesheet" href="../../dashboard.css">
  <script src="../../dhl-mock-data.js" defer></script>
  <script src="../../beam-sidebar.js" defer></script>
</head>
</html>
```

Deve passar a ser:

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="../../styles/global/01-base-system.css">
  <link rel="stylesheet" href="./dashboard.css">
  <script src="../../data/mock/dhl-mock-data.js" defer></script>
  <script src="../../lib/shared/beam-sidebar.js" defer></script>
</head>
</html>
```

## Automatizar com sed (CUIDADO - faça backup primeiro!)

```bash
# Backup
cp -r . ../logix-subsistem-backup

# Executar replacements em um arquivo (ex: dhl/dashboard/index.html)
sed -i 's|"../../dhl-mock-data.js"|"../../data/mock/dhl-mock-data.js"|g' dhl/dashboard/index.html
sed -i 's|"../../beam-sidebar.js"|"../../lib/shared/beam-sidebar.js"|g' dhl/dashboard/index.html
sed -i 's|"../../base-system-reference.css"|"../../styles/global/01-base-system.css"|g' dhl/dashboard/index.html
```

## Script Automático (Recomendado)

```bash
#!/bin/bash
# Script para atualizar TODAS as referências
# Execute a partir da raiz de logix-subsistem

# Dados mock
find . -name "*.html" -exec sed -i 's|src="../../dhl-mock-data.js"|src="../../data/mock/dhl-mock-data.js"|g' {} \;
find . -name "*.html" -exec sed -i 's|src="../../dhl-embedded-data.js"|src="../../data/mock/dhl-embedded-data.js"|g' {} \;
find . -name "*.html" -exec sed -i 's|src="../../dhl-lastday-pdf-data.js"|src="../../data/mock/dhl-lastday-pdf-data.js"|g' {} \;
find . -name "*.html" -exec sed -i 's|src="../../dhl-disco-route-data.js"|src="../../data/mock/dhl-disco-route-data.js"|g' {} \;

# Estilos globais (em ordem - importante!)
find . -name "*.html" -exec sed -i 's|href="../../base-system-reference.css"|href="../../styles/global/01-base-system.css"|g' {} \;
find . -name "*.html" -exec sed -i 's|href="../../liquid-glass.css"|href="../../styles/global/02-liquid-glass.css"|g' {} \;
find . -name "*.html" -exec sed -i 's|href="../../modern-ui.css"|href="../../styles/global/03-modern-ui.css"|g' {} \;
find . -name "*.html" -exec sed -i 's|href="../../refinements-v2.css"|href="../../styles/global/04-refinements-v2.css"|g' {} \;
find . -name "*.html" -exec sed -i 's|href="../../refinements-v3-motion.css"|href="../../styles/global/05-refinements-v3-motion.css"|g' {} \;
find . -name "*.html" -exec sed -i 's|href="../../shared-pages.css"|href="../../styles/global/shared-pages.css"|g' {} \;

# Scripts compartilhados
find . -name "*.html" -exec sed -i 's|src="../../beam-sidebar.js"|src="../../lib/shared/beam-sidebar.js"|g' {} \;
find . -name "*.html" -exec sed -i 's|src="../../avisos-storage.js"|src="../../lib/shared/avisos-storage.js"|g' {} \;
find . -name "*.html" -exec sed -i 's|src="../../sp-header-identity.js"|src="../../lib/shared/sp-header-identity.js"|g' {} \;
find . -name "*.html" -exec sed -i 's|src="../../refinements-v3-motion.js"|src="../../lib/shared/refinements-v3-motion.js"|g' {} \;
find . -name "*.html" -exec sed -i 's|src="../../admin-header.js"|src="../../lib/shared/admin-header.js"|g' {} \;
find . -name "*.html" -exec sed -i 's|href="../../admin-header-standard.css"|href="../../lib/shared/admin-header-standard.css"|g' {} \;
find . -name "*.html" -exec sed -i 's|href="../../sidebar-beam.css"|href="../../lib/shared/sidebar-beam.css"|g' {} \;

echo "✓ Todas as referências atualizadas"
```

## Próximas Etapas

1. [ ] Executar busca com `grep -r` para encontrar todas as referências
2. [ ] Atualizar cada arquivo HTML (manual ou script)
3. [ ] Testar no navegador — cada página deve carregar corretamente
4. [ ] Fazer commit git: `git add -A && git commit -m "refactor: update file references after reorganization"`
5. [ ] Atualizar ARCHITECTURE.md com nova estrutura

