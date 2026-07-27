# Session Intent Contract

**Created:** 2026-07-27 14:35 GMT-3  
**Project:** logix-subsistem (sp-portal-react)  
**Feature:** Live Service Page - Real-time Operations Dashboard

## Job Statement

Implementar uma página **Live Service** que seja o "Pulso da Operação" — um painel em tempo real para administradores gerenciarem entregas ao vivo, rastrearem entregadores, detectarem exceções e reatribuirem tarefas dinamicamente.

## User Context

- **Nível de conhecimento:** Iniciante em implementação técnica
- **Urgência:** Alta — precisa de execução rápida
- **Clareza de escopo:** Ideia descrita em português, precisa tradução técnica
- **Preferência:** Solução funcionando + integrada + pronta para produção

## Success Criteria

1. ✅ **Compreensão Clara**
   - Arquitetura técnica bem documentada
   - Decisões de design justificadas
   - Padrões do projeto replicados

2. ✅ **Soluções Funcionando**
   - 5 seções principais implementadas e testadas
   - Mock data realista e determinística
   - Componentes reutilizáveis

3. ✅ **Integração Perfeita**
   - Roteamento configurado em App.tsx
   - Usa padrões existentes (PortalLayout, hooks, tipos)
   - Dados fluem corretamente

4. ✅ **Pronto para Produção**
   - Componentes com TypeScript strict
   - Sem console errors
   - Pronto para substituir mock data por API real

## Feature Breakdown (Tradução Técnica)

### 1. KPI Cards — "Visão Geral em Tempo Real"
- Total de Entregas Hoje
- Progresso Atual (barra)
- Taxa de Sucesso vs. Insucesso
- Tempo Médio por Parada

### 2. Mapa Operacional — "O Olho de Águia"
- Ícones de entregadores (verde/amarelo/vermelho)
- Heatmap de zonas com acúmulo
- Rastreamento ao vivo

### 3. Triage de Exceções — "Foco na Ação"
- Fila de exceções em tempo real
- Click para detalhes e ação
- Integração com cliente

### 4. Live Feed do Scanner — "O Ticker"
- Feed rolando com eventos
- Timestamp + ação
- Auditoria em tempo real

### 5. Raio-X da Equipe — "Status da Operação"
- Nome, status, carga, bateria
- Drag-and-drop para reatribuir entregas

## Boundaries

**Must Have:**
- 5 componentes principais
- Mock data realista
- Integração com routing
- TypeScript strict

**Nice to Have:**
- Drag-and-drop funcional
- WebSocket prep
- Mapa Leaflet

**Out of Scope:**
- Backend API real
- Autenticação customizada
- Internacionalização

## Next Phase

1. Discover → Arquitetura existente, modelo de dados
2. Define → Tipos, componentes, estrutura
3. Develop → Implementação, hooks, integração
4. Deliver → Testes, documentação

