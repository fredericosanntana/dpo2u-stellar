# FAQ — Judges, Partners, Auditors

**Status:** draft público-técnico  
**Data:** 2026-06-18

**Public status labels:**
- **real now** — implemented and evidenced in this repo,
- **prototype-real** — real cryptographic/contract machinery with bounded scope,
- **symbolic** — stateful model, not yet production-complete,
- **roadmap** — not yet closed or governance-dependent.

## 1. Por que a DPO2U usa uma instância própria?
Porque a DPO2U precisa de uma lane de enforcement que seja **operável agora**, com autoridade de mutação real e prova on-chain replayável.

A instância externa auditada é legível, mas não está sob nossa autoridade de escrita nesta fase.

## 2. Isso quer dizer que vocês não estão integrados ao ecossistema?
Não.

Estamos integrados tecnicamente ao fluxo e à semântica do SPP/ASP track. O que não temos hoje é a **autoridade de governança** para escrever na instância externa auditada.

## 3. O que já está provado de verdade?
Está provado que:
- a revogação no `protocol-registry` pode ser lida e reextraída;
- essa revogação pode gerar uma blocked action canônica;
- a blocked action pode ser executada on-chain na lane própria;
- um watcher pode fazer isso de forma automática e idempotente.

## 4. Vocês controlam a instância externa auditada?
Não.

Hoje nós **não** afirmamos controle sobre:
`CDREZXZILERCSD7VMS4SKVRQY4FNIYJCTYA2AY4TKFRV6Y3L3M2OK3O3`

A evidência atual mostra leitura pública, mas falha de escrita sem a signing key/admin correspondente.

## 5. Então por que não esperar a autoridade externa antes de operar?
Porque isso trocaria execução real por dependência política.

Para hackathon e MVP, a decisão correta é provar enforcement verificável com autoridade soberana e deixar a convergência institucional como etapa posterior.

## 6. Isso é centralizado?
Existe autoridade operacional explícita hoje, sim. O ponto da DPO2U não é esconder isso; é torná-lo:
- explícito;
- auditável;
- endurecível para modelo institucional/multisig.

## 7. Qual é a diferença entre A e B?
- **A:** operar a instância externa auditada/shared
- **B:** operar a instância própria da DPO2U

Hoje:
- **B** maximiza execução, autonomia e clareza;
- **A** exigiria governança/admin que ainda não foi concedida.

## 8. O que falta para alcançar A?
Um destes caminhos:
1. transferência formal de admin para conta institucional da DPO2U;
2. delegação operacional formal;
3. migração/redeploy para uma instância compartilhada governada corretamente.

## 9. O que muda ao declarar a instância própria como lane oficial?
Ganhamos:
- soberania operacional;
- clareza arquitetural;
- capacidade de resposta e automação.

Assumimos também:
- responsabilidade explícita de governança;
- necessidade de explicar custódia, rotação e incidentes;
- necessidade de documentar melhor authority boundary.

## 10. Como vocês evitam double insert ou drift operacional?
O watcher atual já prova comportamento idempotente:
- se a decisão ainda está ativa, faz `no-op`;
- se a key já está bloqueada, não reinsere;
- records persistidos permitem auditoria do resultado.

## 11. A instância externa ainda importa?
Sim.

Ela continua importante para:
- leitura pública;
- boundary de auditoria;
- comparabilidade de estado;
- futura convergência institucional.

## 12. Isso invalida a tese do produto?
Não.

Pelo contrário: prova que a tese funciona tecnicamente **mesmo sem depender de permissão externa para executar**. O gap remanescente é de governança institucional, não de viabilidade do enforcement.

## 13. Qual é a frase curta correta para judges?
> A DPO2U opera hoje uma lane própria, verificável e automatizável de enforcement regulatório on-chain; a convergência para uma instância externa compartilhada depende de autorização de governança, não de uma lacuna técnica no fluxo.

## 14. Qual é a frase curta correta para parceiros técnicos?
> Já fechamos a execução ponta a ponta na nossa lane. Se houver abertura de governança, sabemos exatamente como convergir isso para uma instância compartilhada.

## 15. Qual é a frase curta correta para auditor/investidor?
> O boundary de autoridade está explícito: hoje executamos em lane própria e auditamos/comparamos com a externa; a migração para A depende de mandato institucional, não de improviso técnico.

## 16. Onde estão os docs de base pública desta fase?
- `docs/OPEN-STANDARD-DRAFT.md`
- `docs/CREDENTIAL-LIFECYCLE-SPEC.md`
- `docs/CROSS-CHAIN-CANONICAL-REGISTRY.md`
- `docs/SELECTIVE-DISCLOSURE-BOUNDARY.md`
- `docs/PRODUCTION-READINESS-GATES.md`

## 17. Vocês já têm selective disclosure real ou é só narrativa?
Temos agora um **helper bounded real**, não uma rede institucional final.

O que está real:
- grant específico para reviewer autorizado,
- binding do pacote off-chain por hash,
- expiry/revogação,
- fail-closed se o `protocol-registry` deixar de verificar a attestation subjacente.

O que ainda não afirmamos:
- view-key universal,
- key management institucional,
- workflow regulatório completo,
- disclosure network descentralizada.

Doc-base:
- `docs/DISCLOSURE-HELPER-MVP.md`
