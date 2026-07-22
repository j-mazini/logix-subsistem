---
name: repo-reorganization-intent
description: Reorganizar logix-subsistem para faxina estrutural com segurança
metadata:
  type: project
  created: 2026-07-22
  status: planning
---

# Session Intent Contract — Reorganização logix-subsistem

## Job Statement

Faxinar e reorganizar o repositório `logix-subsistem` movendo ~35 arquivos soltos na raiz para uma arquitetura clara e lógica, mantendo:
- Histórico git intacto (sem `git reset --hard`)
- URLs existentes funcionando (alias/redirects onde necessário)
- Preparação estrutural para migração React planejada

## Success Criteria

✅ **Plano claro com comandos bash** — Mapeamento linha-a-linha de cada arquivo para seu novo destino, com comandos `mkdir`, `mv`, `rm` prontos para copiar/colar

✅ **Reorganização executada** — Arquivos movidos de forma segura, projeto funcionando após mudanças

✅ **Documentação atualizada** — ARCHITECTURE.md e README.md refletindo a nova estrutura (sem guesswork)

## User Profile

- **Conhecimento:** Avançado — Conhece a arquitetura, precisa de execução limpa
- **Role:** Senior Software Engineer — Especialista em arquitetura e organização
- **Context:** Repositório estático (HTML/CSS/JS) com estrutura parcialmente criada, muita documentação em português sobre o projeto

## Boundaries (Restrições Preservadas)

| Restrição | Significado | Implicação |
|-----------|------------|-----------|
| **Preservar histórico git** | Sem `git reset --hard`, sem operações destrutivas | Usar `mv` e `rm` seguros; commits subsequentes preservam história |
| **Sem quebra de URLs** | Caminhos existentes devem seguir funcionando | Manter alias/redirects onde necessário (ex: `login.html` → `sp-portal/login/index.html`) |
| **Fazer agora** | Urgência de tempo — não é planejamento futuro | Plano executável imediatamente, não conceitual |

## Context & Constraints

- **Stack:** Projeto estático (HTML, CSS, JS via CDN) + estrutura de dados mock em `localStorage`
- **Fase atual:** Transição — código estático bem estruturado em `sp-portal/`, mas raiz está desorganizada
- **Próximo passo:** Migração planejada para React (Vite + React + TS) — esta limpeza prepara o terreno

## What We're NOT Doing

- ❌ Modificar `logix-sphere-frontend-nextjs` (repositório externo)
- ❌ Executar migração React agora (apenas preparar estrutura)
- ❌ Deletar arquivos sem verificação manual
- ❌ Quebrar URLs ou redirecionamentos existentes

## Próximos Passos

1. **Define:** Analisar cada arquivo solto, classificar (redirect/style/data/utility), propor novo local
2. **Develop:** Criar script bash com comandos de movimentação seguros
3. **Deliver:** Executar mudanças, validar, atualizar documentação

---

**Ready to proceed with structured planning.**
