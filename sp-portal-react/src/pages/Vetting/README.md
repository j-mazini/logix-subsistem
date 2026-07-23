# Vetting Module - BA Express Driver Vetting System

Integração completa do sistema de vetting da BA Express, incluindo checklist de candidatos, testes de entrevista e módulos de avaliação.

## Estrutura

```
Vetting/
├── VettingChecklist.tsx       # Página principal de checklist
├── VettingInterview.tsx       # Página de assessment de entrevistas
├── index.ts                   # Exports públicos
├── README.md                  # Este arquivo
├── __tests__/                 # Testes unitários
│   ├── interview-scoring.test.ts
│   ├── auto-reject.test.ts
│   ├── dvla-check-date-regression.test.ts
│   ├── state-machine.test.ts
│   └── work-history-coverage.test.ts
├── checklist/                 # Módulos de checklist
│   ├── components/            # Componentes React
│   ├── data/                  # Dados e configurações
│   │   └── checklist.ts       # Estrutura das etapas de vetting
│   └── modules/               # Lógica de negócio
│       ├── application-form/
│       ├── central-driver-record/
│       ├── client-outputs/
│       ├── interview/
│       ├── notifications/
│       └── work-history/
├── interview/                 # Módulos de entrevista
│   ├── AssessmentPanel.tsx
│   ├── AssessmentResult.tsx
│   ├── assessment-bank.ts
│   └── assessment-types.ts
└── styles/                    # Estilos CSS
    ├── vetting-checklist.css
    └── vetting-interview.css
```

## Rotas

As seguintes rotas foram adicionadas ao aplicativo:

- `/vetting-checklist` - Página de checklist de candidatos
- `/vetting-interview` - Página de avaliação de entrevistas

## Componentes

### VettingChecklist

Gerencia o processo completo de vetting com 4 etapas:

1. **Driver Registration & Application Form**
   - Coleta de dados do formulário de aplicação
   - Verificação de Right to Work
   - Verificação de Driving Licence

2. **Interview**
   - Informações pré-entrevista
   - Scoring de competências
   - Testes online
   - Coleta de DBS
   - Referências de trabalho
   - Histórico de 5 anos

3. **Suitability Assessment**
   - Declaração de antecedentes criminais
   - Declaração de adequação
   - Observações

4. **DHL Courses & Finalisation**
   - Cursos de treinamento
   - Coleta de documentos originais
   - Modelo de custo
   - Organização da pasta DHL

### VettingInterview

Gerencia os testes online e avaliação de conhecimento:

- Liberação de testes para candidatos
- Scoring de testes
- Armazenamento de resultados
- Notas de avaliação

## Testes

O módulo inclui testes completos:

```bash
npm test -- src/pages/Vetting/__tests__
```

Testes cobertos:
- Pontuação de entrevistas
- Auto-rejeição de candidatos
- Regressão de datas DVLA
- State machine de workflow
- Cobertura de histórico de trabalho

## Dados do Checklist

A estrutura de etapas e itens do checklist é definida em:

```typescript
// src/pages/Vetting/checklist/data/checklist.ts
export const CHECKLIST_STEPS: ChecklistStep[]
```

Cada etapa contém:
- Título e subtítulo
- SLA (Service Level Agreement)
- Itens de checklist com:
  - Título e descrição
  - Campos de documento
  - Validações
  - Links de referência

## Fluxo de Dados

1. **Carregamento de Candidatos**
   - Sincroniza com Firebase (drivers e vendors legados)
   - Atualiza a lista em tempo real

2. **Seleção de Candidato**
   - Carrega dados completos do candidato
   - Sincroniza estado com navbar

3. **Atualização de Checklist**
   - Marca itens como completos
   - Aprova/rejeita etapas
   - Log de alterações para auditoria

4. **Persistência**
   - Salva alterações no Firebase
   - Rastreia quem e quando fez alterações
   - Mantém histórico de decisões

## Integração Firebase

O módulo se integra com Firebase Firestore:

- `drivers` - Coleção de novos candidatos
- `workspaces/ba-express-vetting/vendors` - Coleção de vendors legados

## Estilos

Os estilos são organizados em:

- `styles/vetting-checklist.css` - Estilos da página de checklist
- `styles/vetting-interview.css` - Estilos da página de entrevista

Usando uma paleta de cores consistente com o projeto.

## Próximas Melhorias

- [ ] Exportação de dados para PDF
- [ ] Notificações de email automáticas
- [ ] Integração com sistema de pagamento
- [ ] Dashboard de estatísticas de vetting
- [ ] Relatórios de performance de oficiais de vetting
- [ ] Agendamento de entrevistas integrado

## Referências

- BA Express Driver Vetting SOP v2.0
- Master Vetting Protocol v3.0
- Vetting Process Protocol v2.0
- Strategic Blueprint v2
