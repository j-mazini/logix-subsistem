#!/bin/bash
# logix-subsistem Reorganization Script
#
# Propósito: Limpar a raiz movendo arquivos soltos para estrutura clara
# Criado: 2026-07-22
# Segurança: Usa 'mv' e 'rm', preserva histórico git
#
# Uso: bash reorganize.sh [--dry-run] [--phase N]
#   --dry-run    : Mostrar comandos sem executar
#   --phase 1-7  : Executar apenas fase específica

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DRY_RUN=false
TARGET_PHASE=""
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
LOG_FILE="${REPO_ROOT}/reorganization_${TIMESTAMP}.log"

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse argumentos
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run) DRY_RUN=true; shift ;;
    --phase) TARGET_PHASE="$2"; shift 2 ;;
    *) echo "Uso: $0 [--dry-run] [--phase N]"; exit 1 ;;
  esac
done

log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1" | tee -a "$LOG_FILE"; }
success() { echo -e "${GREEN}✓${NC} $1" | tee -a "$LOG_FILE"; }
error() { echo -e "${RED}✗${NC} $1" | tee -a "$LOG_FILE"; }
warn() { echo -e "${YELLOW}⚠${NC} $1" | tee -a "$LOG_FILE"; }

run_cmd() {
  local cmd="$1"
  local desc="$2"

  log "$desc"
  if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}[DRY-RUN]${NC} $cmd"
  else
    eval "$cmd" && success "$desc" || error "Falhou: $desc"
  fi
  echo "$cmd" >> "$LOG_FILE"
}

# ============================================================================
# FASE 1: PREPARAÇÃO
# ============================================================================
phase_prepare() {
  log "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  log "${BLUE}║ FASE 1: PREPARAÇÃO                                         ║${NC}"
  log "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

  cd "$REPO_ROOT"

  # Verificar que estamos no diretório certo
  if [ ! -f "index.html" ] || [ ! -d "sp-portal" ]; then
    error "Não estamos no diretório certo. Esperado logix-subsistem com index.html e sp-portal/"
    exit 1
  fi

  success "Verificação de localização OK"

  # Criar estrutura de pastas
  run_cmd "mkdir -p data/mock" "Criando data/mock/"
  run_cmd "mkdir -p styles/global" "Criando styles/global/"
  run_cmd "mkdir -p lib/shared" "Criando lib/shared/"

  success "Pastas criadas"
}

# ============================================================================
# FASE 2: MOVER DADOS MOCK
# ============================================================================
phase_mock_data() {
  log "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  log "${BLUE}║ FASE 2: MOVER DADOS MOCK                                   ║${NC}"
  log "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

  cd "$REPO_ROOT"

  files=(
    "dhl-mock-data.js"
    "dhl-embedded-data.js"
    "dhl-lastday-pdf-data.js"
    "dhl-disco-route-data.js"
  )

  for file in "${files[@]}"; do
    if [ -f "$file" ]; then
      run_cmd "mv '$file' 'data/mock/'" "Movendo $file"
    else
      warn "Arquivo não encontrado: $file"
    fi
  done
}

# ============================================================================
# FASE 3: MOVER ESTILOS GLOBAIS
# ============================================================================
phase_global_styles() {
  log "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  log "${BLUE}║ FASE 3: MOVER ESTILOS GLOBAIS                              ║${NC}"
  log "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

  cd "$REPO_ROOT"

  # Numerados para preservar ordem de carregamento
  run_cmd "mv 'base-system-reference.css' 'styles/global/01-base-system.css'" "Movendo base-system-reference.css"
  run_cmd "mv 'liquid-glass.css' 'styles/global/02-liquid-glass.css'" "Movendo liquid-glass.css"
  run_cmd "mv 'modern-ui.css' 'styles/global/03-modern-ui.css'" "Movendo modern-ui.css"
  run_cmd "mv 'refinements-v2.css' 'styles/global/04-refinements-v2.css'" "Movendo refinements-v2.css"
  run_cmd "mv 'refinements-v3-motion.css' 'styles/global/05-refinements-v3-motion.css'" "Movendo refinements-v3-motion.css"
  run_cmd "mv 'shared-pages.css' 'styles/global/'" "Movendo shared-pages.css"
}

# ============================================================================
# FASE 4: MOVER SCRIPTS COMPARTILHADOS
# ============================================================================
phase_shared_scripts() {
  log "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  log "${BLUE}║ FASE 4: MOVER SCRIPTS COMPARTILHADOS                       ║${NC}"
  log "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

  cd "$REPO_ROOT"

  run_cmd "mv 'beam-sidebar.js' 'lib/shared/'" "Movendo beam-sidebar.js"
  run_cmd "mv 'avisos-storage.js' 'lib/shared/'" "Movendo avisos-storage.js"
  run_cmd "mv 'sp-header-identity.js' 'lib/shared/'" "Movendo sp-header-identity.js"
  run_cmd "mv 'refinements-v3-motion.js' 'lib/shared/'" "Movendo refinements-v3-motion.js"
  run_cmd "mv 'admin-header.js' 'lib/shared/'" "Movendo admin-header.js"
  run_cmd "mv 'admin-header-standard.css' 'lib/shared/'" "Movendo admin-header-standard.css"
  run_cmd "mv 'sidebar-beam.css' 'lib/shared/'" "Movendo sidebar-beam.css"
}

# ============================================================================
# FASE 5: MOVER ESTILOS ESPECÍFICOS DE FEATURES
# ============================================================================
phase_feature_styles() {
  log "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  log "${BLUE}║ FASE 5: MOVER ESTILOS ESPECÍFICOS                          ║${NC}"
  log "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

  cd "$REPO_ROOT"

  run_cmd "mv 'access-select.css' 'dhl/access-select/'" "Movendo access-select.css"
  run_cmd "mv 'contract-management.css' 'dhl/contract-management/'" "Movendo contract-management.css"
  run_cmd "mv 'dashboard.css' 'dhl/dashboard/'" "Movendo dashboard.css"
  run_cmd "mv 'vendor-admin-view.css' 'dhl/vendor-admin-view/'" "Movendo vendor-admin-view.css"
  run_cmd "mv 'vehicles-admin-view.css' 'dhl/vehicles-admin-view/'" "Movendo vehicles-admin-view.css"

  # Login.js → sp-portal/login/
  if [ -f "login.js" ]; then
    run_cmd "mv 'login.js' 'sp-portal/login/'" "Movendo login.js para sp-portal/login/"
  fi
}

# ============================================================================
# FASE 6: DELETAR LIXO
# ============================================================================
phase_cleanup() {
  log "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  log "${BLUE}║ FASE 6: DELETAR LIXO                                       ║${NC}"
  log "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

  cd "$REPO_ROOT"

  # Deletar arquivo corrompido
  if [ -f "tste\\" ]; then
    run_cmd "rm -f 'tste\\\\'" "Deletando arquivo corrompido tste\\"
  else
    warn "Arquivo tste\\ não encontrado"
  fi

  # Deletar .DS_Store
  run_cmd "find . -name '.DS_Store' -delete" "Deletando .DS_Store"
}

# ============================================================================
# FASE 7: VALIDAÇÃO
# ============================================================================
phase_validate() {
  log "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  log "${BLUE}║ FASE 7: VALIDAÇÃO                                          ║${NC}"
  log "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

  cd "$REPO_ROOT"

  log "Verificando estrutura criada..."

  # Verificar que pastas foram criadas
  [ -d "data/mock" ] && success "data/mock/ criado" || error "data/mock/ não existe!"
  [ -d "styles/global" ] && success "styles/global/ criado" || error "styles/global/ não existe!"
  [ -d "lib/shared" ] && success "lib/shared/ criado" || error "lib/shared/ não existe!"

  # Verificar que arquivos foram movidos
  [ -f "data/mock/dhl-mock-data.js" ] && success "dhl-mock-data.js movido" || error "dhl-mock-data.js não encontrado!"
  [ -f "styles/global/01-base-system.css" ] && success "base-system.css movido" || error "base-system.css não encontrado!"
  [ -f "lib/shared/beam-sidebar.js" ] && success "beam-sidebar.js movido" || error "beam-sidebar.js não encontrado!"

  log ""
  log "Verificando que raiz está limpa (devem ser apenas *.html e pastas)..."

  # Listar arquivos soltos (não deve haver .js ou .css fora das pastas)
  loose_files=$(ls -1 | grep -E '\.(js|css)$' | wc -l)

  if [ "$loose_files" -eq 0 ]; then
    success "Raiz está limpa! Nenhum .js ou .css solto"
  else
    warn "Ainda há $loose_files arquivos .js ou .css na raiz"
    ls -1 | grep -E '\.(js|css)$'
  fi

  log ""
  success "Validação completa!"
  log "Log salvo em: $LOG_FILE"
}

# ============================================================================
# MAIN
# ============================================================================
main() {
  log "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
  log "${BLUE}║  🗂️  REORGANIZAÇÃO LOGIX-SUBSISTEM                         ║${NC}"
  log "${BLUE}║  Arquivo de log: $LOG_FILE                         ║${NC}"
  log "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"

  if [ "$DRY_RUN" = true ]; then
    warn "MODO DRY-RUN: nenhum comando será executado"
  fi

  log ""

  # Se fase específica for definida, só rodar essa
  if [ -n "$TARGET_PHASE" ]; then
    case "$TARGET_PHASE" in
      1) phase_prepare ;;
      2) phase_mock_data ;;
      3) phase_global_styles ;;
      4) phase_shared_scripts ;;
      5) phase_feature_styles ;;
      6) phase_cleanup ;;
      7) phase_validate ;;
      *) error "Fase inválida: $TARGET_PHASE (use 1-7)"; exit 1 ;;
    esac
  else
    # Executar todas as fases
    phase_prepare
    phase_mock_data
    phase_global_styles
    phase_shared_scripts
    phase_feature_styles
    phase_cleanup
    phase_validate
  fi

  log ""
  log "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
  log "${GREEN}║  ✅ REORGANIZAÇÃO COMPLETA!                               ║${NC}"
  log "${GREEN}║  Próximos passos:                                         ║${NC}"
  log "${GREEN}║  1. Verificar se URLs funcionam (abrir em navegador)     ║${NC}"
  log "${GREEN}║  2. Atualizar referências nos arquivos HTML              ║${NC}"
  log "${GREEN}║  3. Fazer commit git com as mudanças                     ║${NC}"
  log "${GREEN}║  4. Atualizar ARCHITECTURE.md                             ║${NC}"
  log "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
}

main "$@"
