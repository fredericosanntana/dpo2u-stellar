# S5 — Partner/Legal Validation Pack

**Status:** pack canônico para validação externa  
**Objetivo:** congelar claims públicas suportadas, limites de overclaim e perguntas que precisam de alinhamento parceiro/jurídico antes de comunicação externa mais ampla.

## Resumo executivo

Depois de S1+S2+S3+S4, a parte **interna e técnica controlável por nós** está suficientemente aterrada para uma claim pública estreita.

O que falta agora não é arquitetura base. É:

1. **sign-off de wording** com parceiro/DeFindex quando aplicável;
2. **boundary jurídico/comercial** do que pode ser dito em material externo;
3. explicitar onde a surface atual é:
   - já provada;
   - parcialmente suportada;
   - dependente de alinhamento externo.

## Claim pública recomendada

A claim recomendada, hoje, já pode subir um nível sem romper o boundary:

> a DPO2U já validou em Stellar/DeFindex uma camada operator/safeguards/reporting-aware onde um contrato/gate pode ocupar o papel de `Rebalance Manager`, e uma ação privilegiada só pode avançar quando o intent exato e a evidência operacional relevante estão bound ao fluxo de policy/proof.

A formulação mais estreita e ainda totalmente válida continua sendo:

> a DPO2U já validou em Stellar/DeFindex uma lane onde um contrato/gate ocupa o papel de `Rebalance Manager`, e uma ação privilegiada de rebalance só pode ser preparada/executada dentro de um framing proof-bound ligado ao intent exato.

## Matriz de claims

| claim | status | base de evidência | pode ir a público? |
|---|---|---|---|
| DPO2U tem lane DeFindex/Stellar de rebalance proof-bound | **suportada** | S1 + S2 + S3 + S4 | **sim** |
| contrato DPO2U ocupou o papel `Rebalance Manager` em testnet | **suportada** | readbacks live + tx histórica | **sim** |
| payload canônico → hash → verify → prepare unsigned XDR existe no SDK | **suportada** | código + testes + demo S3 | **sim** |
| reporting artifact → hash → verify → allow → prepare existe como demo reproduzível | **suportada** | tipos + gateway + `demo:defindex:reporting` + report Fase 2 | **sim** |
| framing operator/safeguards/reporting-aware já está materializado no repo | **suportada** | docs Fase 2 + testes + demo | **sim, com cuidado** |
| rebalance live em testnet já ocorreu com gate ligado ao vault live | **suportada** | tx `cf790f4d96e7...` + reports | **sim** |
| DPO2U já resolve o regime VASP/PSAV inteiro | **não suportada** | framing atual é parcial | **não** |
| DPO2U já gateia depósitos/saques retail nativamente na DeFindex | **não suportada** | surface atual é operator-side | **não** |
| DeFindex API já expõe todas as operator surfaces necessárias para operação pública completa | **não suportada** | há limites/403 históricos | **não** |
| solução pronta para produção regulada multi-jurisdição | **não suportada** | faltam partner/legal/prod hardening | **não** |
| CVM 175 sozinha resolve a tese regulatória inteira | **não suportada** | precisa stack LGPD + PSAV/VASP + reporting | **não** |

## Wording recomendado

### Frase curta

> DPO2U transforma política de conformidade em condição verificável de execução para ações privilegiadas em Stellar.

### Frase DeFindex/Stellar

> No slice atual com DeFindex, a DPO2U já provou uma lane em que o papel de `Rebalance Manager` é ocupado por um contrato/gate e o rebalance só avança quando o intent exato está bound ao fluxo de policy/proof.

### Frase DeFindex/Stellar expandida (já reconciliada com a Fase 2)

> Além do rebalance proof-bound, a DPO2U já materializou uma camada operator/safeguards/reporting-aware em que evidência operacional adicional também pode condicionar a autorização da ação privilegiada.

### Frase regulatória correta

> O framing jurídico é em stack: **LGPD** como boundary de disclosure e minimização, **PSAV/VASP** como regime operacional e de salvaguardas, **CVM 175** como âncora institucional de mandato e governança de rebalance, e **Travel Rule** como um circuito específico de mensageria/reporting — não como o regime inteiro.

## Claims proibidas / overclaims

Não usar publicamente, salvo nova evidência:

- “A DPO2U já é a camada regulatória completa da DeFindex.”
- “Toda operação DeFindex já é compliance-gated pela DPO2U.”
- “Travel Rule resolve o enquadramento VASP.”
- “A integração já está pronta para produção institucional.”
- “A DeFindex já expôs toda a operator surface por API pública para esse fluxo.”
- “CVM 175 resolve sozinha todo o enquadramento.”

## Perguntas para partner/legal

### Para DeFindex / parceiro técnico

1. Quais operator surfaces devem ser consideradas públicas/suportadas vs experimentais?
2. Existe posição oficial sobre contratos ocuparem papéis como `Rebalance Manager` em fluxos parceiros?
3. Quais limites de SDK/API precisam ser assumidos explicitamente em material externo?
4. Há roadmap formal para surfaces adicionais além do slice atual?

### Para jurídico / compliance externo

1. O wording com **CVM 175** como âncora de mandato/rebalance está adequado para material externo?
2. O uso do framing **PSAV/VASP** deve ser descrito como “operator/safeguards layer” ou outra formulação mais segura?
3. Há cuidado adicional ao falar em “everyday financial solutions” sem parecer oferta regulada abrangente?
4. Qual formulação mais segura para dizer “proof-bound execution” em português jurídico-comercial?

## Entregáveis para handoff externo

Enviar junto, se necessário:

- `docs/STELLAR-DEFINDEX-LEGAL-CIRCUITS-MEMO.md`
- `docs/DPO2U-STELLAR-DEFINDEX-COMPLIANCE-LAYER-PRD.md`
- `docs/S1-CVM175-REBALANCE-PREDICATE-MAP.md`
- `docs/S3-PROOF-BOUND-EXECUTION-DEMO-RUNBOOK.md`
- `docs/S4-DEFINDEX-ROLE-AS-CONTRACT-VALIDATION.md`
- `docs/DEFINDEX-PROOF-BOUND-EXECUTION-LIVE-SLICE.md`
- `docs/PHASE2-OPERATOR-SAFEGUARDS-PRD.md`
- `docs/PHASE2-CLAIM-BOUNDARY.md`
- `docs/PHASE2-TRAVEL-RULE-ADJACENT-FLOW.md`
- `docs/PHASE2-OPERATOR-SAFEGUARDS-DEMO-RUNBOOK.md`
- `.hermes/reports/2026-06-20_phase2-operator-safeguards-report.md`

## Decisão de fechamento desta etapa

A etapa autônoma interna pode ser considerada **concluída** quando:

- memo canônico existe;
- PRD canônico existe;
- S1, S2, S3 e S4 estão fechadas com evidência;
- S5 deixa o boundary público congelado.

Esse estado já foi atingido.

## Próximo passo após este pack

O próximo passo não é mais build interno cego.

É escolher um destes movimentos:

1. **partner outreach controlado** com este pack;
2. **ajuste de materiais públicos/submission deck** usando apenas as claims liberadas;
3. **nova fase técnica** só se o parceiro exigir surface adicional específica.
