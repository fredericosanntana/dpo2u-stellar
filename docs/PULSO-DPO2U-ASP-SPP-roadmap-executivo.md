# Roadmap executivo — ASP × SPP (PULSO)

**Base:** `docs/PULSO-DPO2U-ASP-PRD-v1.1-reviewed.md`  
**Objetivo:** converter o posicionamento do PRD em plano de execução com escopo rígido, owners, dependências, validação e riscos.

---

## 1. Princípio operacional

O roadmap parte de uma verdade simples:

- a DPO2U **já provou** o lado de atestação / policy / gating / ZK slice em `dpo2u-stellar`;
- o hackathon pede o **pouso dessa primitive no SPP**, não uma reinvenção do mecanismo.

Logo, o plano correto é:
1. alinhar verdade pública;
2. auditar a superfície do SPP;
3. construir o menor Gateway possível;
4. fechar uma demo replayável;
5. só então polir.

---

## 2. Meta de sucesso

Ao final do roadmap, devemos conseguir demonstrar:

1. uma credencial positiva DPO2U sendo emitida/validada;  
2. essa credencial autorizando admissão no conjunto do SPP;  
3. um fluxo privado provando membership no conjunto positivo;  
4. tudo isso com evidência verificável, endereços, passos e narrativa honestos.  

---

## 3. Sprint map

> **Historical note:** this roadmap captured the pre-S8 integration push up to the first operational proof. The current post-S8 operating reality is documented in `docs/B-FIRST-OPERATING-MODE.md` and `docs/S8-EXTERNAL-ASP-BOUNDARY-REPORT.md`: Opção B is now the official lane, and Opção A is a governance/institutional convergence track.


| Sprint | Objetivo | Owner primário | Resultado esperado |
|---|---|---|---|
| **S0** | Alinhamento de verdade pública | Fred | PRD/docs corrigidos; escopo congelado |
| **S1** | Auditoria da landing zone SPP | Lionel | Superfície de integração documentada |
| **S2** | Schema v1 + design do Gateway | Fred + Lionel | Contrato de integração fechado |
| **S3** | Implementação Gateway mínimo | Lionel | Admissão atestation-gated funcionando |
| **S4** | Demo ponta a ponta | Lionel + Fred | Happy path replayável |
| **S5** | Polish + submission pack | Fred + Paulo | deck, vídeo, discovery, README |

---

## 4. Sprint detalhada

## S0 — Alinhamento de verdade pública
**Owner:** Fred  
**Apoio:** Hermes

### Objetivo
Eliminar overclaim e congelar a narrativa oficial.

### Entregáveis
- PRD revisado aprovado
- matriz “real agora / target do build / fora de escopo”
- linguagem padronizada para:
  - `prototype-real`
  - `symbolic-stateful`
  - `stake/slash simbólico`
  - `SPP integration target`

### Tarefas
1. aprovar a versão revisada do PRD;  
2. alinhar pitch/README/docs com essa verdade;  
3. remover frases que impliquem Gateway SPP já concluído.  

### Dependências
- nenhuma

### Critério de pronto
- nenhum material principal contradiz o estado real do repo

### Risco
- baixo

---

## S1 — Auditoria da landing zone SPP
**Owner:** Lionel  
**Apoio:** Hermes

### Objetivo
Trazer a superfície exata do SPP para terreno verificável antes de escrever código novo.

### Entregáveis
- repo/version do SPP congelado no workspace
- nota técnica de integração
- resposta fechada para:
  - qual função de admissão será usada
  - qual auth model ela exige
  - qual formato de leaf é aceito
  - onde o frontend precisa ser tocado

### Tarefas
1. clonar/vendor o repo do SPP;  
2. localizar contrato de membership;  
3. localizar `insert_leaf` ou equivalente;  
4. inspecionar formato do leaf;  
5. mapear deploy/runbook;  
6. confirmar se o fluxo pode ser feito sem tocar circuito.  

### Dependências
- S0 concluído

### Critério de pronto
- existe um doc curto e objetivo que torna a integração implementável sem ambiguidade

### Risco
- **médio** — pode revelar complexidade não antecipada na auth ou no leaf binding

### Decisão-gate ao fim da sprint
Escolher formalmente:
- **A:** Gateway on-chain direto  
- **B:** fallback admin-mediated  

---

## S2 — Schema v1 + design do Gateway
**Owner:** Fred + Lionel  
**Apoio:** Hermes

### Objetivo
Fechar o contrato de produto antes de codar o componente novo.

### Entregáveis
- schema v1 da credencial
- regra determinística de derivação de leaf
- API/surface do Gateway
- decisão de escopo P0 final

### Tarefas
1. congelar campos mínimos da credencial:  
   - `subject_key` / commitment  
   - `claim_type`  
   - `jurisdiction`  
   - `valid_until`  
   - `attestation_root` / commitment  
2. escolher **um** claim type do demo;  
3. escolher **uma** jurisdição principal;  
4. definir como o Gateway valida issuer/predicado/expiração;  
5. definir leaf derivation v1;  
6. definir interface do Gateway com o SPP.  

### Dependências
- S1 concluído

### Critério de pronto
- Lionel consegue implementar sem tomar decisão de produto no meio do código

### Risco
- médio

### Regra de disciplina
Se surgir vontade de “aproveitar para generalizar”, cortar. V1 precisa ser estreito.

---

## S3 — Implementação Gateway mínimo
**Owner:** Lionel  
**Apoio:** Hermes

### Objetivo
Construir o menor componente novo capaz de transformar uma credencial válida em admissão no conjunto do SPP.

### Entregáveis
- contrato/serviço Gateway funcional
- testes do caminho válido e inválido
- helper script de execução

### Tarefas
1. criar o Gateway;  
2. implementar verificação fail-closed;  
3. implementar derivação de leaf;  
4. chamar a admissão no SPP;  
5. garantir insert-once / idempotência mínima se aplicável;  
6. testar happy path e fail path.  

### Dependências
- S2 concluído

### Critério de pronto
- uma credencial inválida **não** admite leaf
- uma credencial válida admite leaf corretamente
- existe evidência reproduzível disso

### Risco
- alto relativo — aqui mora a integração real

### Fallback oficial
Se a chamada on-chain direta se mostrar pesada demais para o prazo:
- ativar **B: admin-mediated insert**
- manter a validação da credencial como condição obrigatória
- documentar explicitamente a centralização temporária

---

## S4 — Demo ponta a ponta
**Owner:** Lionel + Fred  
**Apoio:** Hermes

### Objetivo
Fechar o fluxo de submissão com replay controlado.

### Entregáveis
- runbook único de demo
- endereços/txs/IDs públicos
- happy path do vídeo
- checklist de palco/call

### Tarefas
1. preparar sujeito de teste;  
2. emitir/obter a credencial;  
3. passar pelo Gateway;  
4. comprovar admissão no conjunto;  
5. executar deposit;  
6. executar withdraw/transfer provando membership;  
7. documentar cada passo com evidência.  

### Dependências
- S3 concluído

### Critério de pronto
- o fluxo roda do zero seguindo o runbook
- o time não depende de memória informal para demonstrar

### Risco
- médio/alto — integrações reais sempre falham no último metro se não houver runbook frio

### Observação crítica
Se o SPP E2E não fechar a tempo, a demo backup deve existir sobre o track interno `protocol-registry → asp-mvp → privacy-pool`.

---

## S5 — Polish + submission pack
**Owner:** Fred + Paulo  
**Apoio:** Lionel

### Objetivo
Transformar o build em material vencedor.

### Entregáveis
- deck
- vídeo 90s–120s
- README claro
- write-up de discovery
- FAQs e honest scope

### Tarefas
1. deck com narrativa única;  
2. vídeo do happy path;  
3. README com setup, runbook e claims honestas;  
4. discovery pack com 5+ entrevistas;  
5. argumentário para judges/investidores.  

### Dependências
- S4 concluído ou fallback aprovado

### Critério de pronto
- um terceiro entende o valor, o mecanismo e os limites sem conversar com o time

### Risco
- médio — risco aqui é clareza, não viabilidade técnica

---

## 5. Owners por trilha

| Trilha | Owner | Papel |
|---|---|---|
| Arquitetura / verdade pública | Fred | decide fronteira, tese, claims |
| Integração SPP / contratos | Lionel | build técnico principal |
| Discovery / validação comercial | Paulo | entrevistas, sinais de uso, dores |
| Orquestração / consistência | Hermes | gap analysis, roadmap, truth audit, docs |

---

## 6. Dependências críticas

### Dependência 1 — superfície SPP real
Sem isso, qualquer código novo é chute.

### Dependência 2 — schema v1 estreito
Sem schema congelado, o Gateway vira moving target.

### Dependência 3 — escopo P0 rígido
Se abrir para múltiplas credenciais, múltiplas jurisdições ou mudança de circuito cedo demais, o prazo degrada.

---

## 7. Riscos estratégicos

| Risco | Nível | Mitigação |
|---|---|---|
| Overclaim entre repo atual e target SPP | Alto | S0 já corrige wording |
| Integração SPP exigir adaptação maior que o esperado | Alto | S1 antes de S3; fallback B |
| Scope creep | Alto | 1 credencial, 1 jurisdição, 1 issuer |
| Demo quebrar no último metro | Médio/alto | runbook frio + fallback C |
| Confusão sobre o que já é production-ready | Médio | manter “prototype-real” e “symbolic-stateful” |
| Stake/slash ser mal interpretado | Médio | repetir “simbólico/admin-controlled” |

---

## 8. Definição de pronto do projeto

O projeto está **pronto para submissão** quando existir:

1. uma narrativa pública coerente com a realidade;  
2. uma integração SPP demonstrável ou fallback formalmente aceito;  
3. um happy path replayável do começo ao fim;  
4. um pacote de submissão que mostre profundidade técnica, impacto e honestidade de escopo.  

---

## 9. Próximas decisões imediatas

### Decidir agora
1. aprovar o PRD revisado como texto-base;  
2. mandar Lionel executar **S1 imediatamente**;  
3. congelar desde já que o v1 terá:  
   - 1 claim type  
   - 1 jurisdição  
   - 1 issuer path  
4. adotar **A com fallback B** como política oficial;  
5. manter **C** como demo backup e não como narrativa principal.  

---

## 10. Comando estratégico

> Não abrir novas frentes antes de fechar a superfície exata do SPP. O valor agora não está em inventar mais protocolo — está em pousar com precisão uma primitive que já provamos.
