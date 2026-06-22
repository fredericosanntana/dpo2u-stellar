# Pulso Demo Pack

**Data:** 2026-06-22  
**Status:** pacote oficial de apresentação  
**Base:** `docs/PULSO-OFFICIAL-DEMO-PATH.md`

---

## 1. Objetivo do pacote

Este documento converte o caminho oficial de demo do Pulso em um pacote executável de apresentação:
- runbook único;
- pitch de 30 segundos;
- pitch de 3 minutos;
- Q&A de boundary honesto.

A função dele é impedir que a narrativa se desorganize entre:
- ASP/SPP,
- DeFindex,
- ZK,
- GTM.

---

## 2. Demo goal

A demo do Pulso precisa provar uma frase só:

> **a DPO2U transforma decisões canônicas de compliance em admissão e bloqueio verificáveis numa lane institucional em Stellar.**

Tudo o que não reforça essa frase deve sair da demo principal.

---

## 3. Runbook oficial

## Bloco 1 — framing inicial
### O que dizer
- a DPO2U não é “compliance em dashboard”;
- a DPO2U é um **gate operacional verificável**;
- a lane oficial desta fase é **B-first**: operamos nossa própria lane e tratamos a instância externa como boundary auditável.

### Artefato de apoio
- `docs/B-FIRST-OPERATING-MODE.md`

### Frase sugerida
> Hoje nós já operamos uma lane replayável de enforcement regulatório on-chain em Stellar. O que mostramos aqui não é slide: é comportamento verificável.

---

## Bloco 2 — verdade canônica nasce no registry
### O que mostrar
- existe um `protocol-registry` vivo em testnet;
- uma attestation foi registrada on-chain;
- claim/jurisdiction/issuer constraints fazem parte da decisão canônica.

### Artefato de apoio
- `docs/S4-LIVE-REGISTRY-TO-SPP-REPORT.md`

### Pontos concretos para citar
- registry contract: `CAUDSMRKMZPZNCVHJZ3JFYVV2ZNK7TC7MFZCJNN75QUBZ2W4AYTEWTYP`
- houve registro vivo, verificação viva e revogação canônica viva

### Frase sugerida
> A política não está fora da cadeia. A decisão nasce num registry vivo e verificável.

---

## Bloco 3 — admissão na lane
### O que mostrar
- a decisão do registry é extraída para os artefatos do bridge;
- essa decisão vira admissão operacional na lane ASP/SPP;
- leaf/root/resultados ficam materializados como evidência.

### Artefatos de apoio
- `integration/spp-adapter/examples/live-registry-decision.json`
- `integration/spp-adapter/examples/live-registry-admission.json`
- `integration/spp-adapter/examples/live-registry-executed.record.json`
- `docs/S4-LIVE-REGISTRY-TO-SPP-REPORT.md`

### Frase sugerida
> Uma decisão canônica saiu do registry e virou admissão verificável na lane.

---

## Bloco 4 — revogação canônica
### O que mostrar
- a attestation é revogada on-chain;
- `verify_attestation_proof(...) == false`;
- `is_attestation_active(...) == false`;
- nova tentativa de bridge falha.

### Artefato de apoio
- `docs/S4-LIVE-REGISTRY-TO-SPP-REPORT.md`

### Frase sugerida
> Quando a decisão é revogada, a mudança não fica no papel. Ela altera o comportamento da lane.

---

## Bloco 5 — blocked-lane real
### O que mostrar
- a instância própria do `asp-non-membership` está operacional;
- `verify_non_membership == true` antes do bloqueio;
- `insert_leaf` torna a prova falsa;
- `delete_leaf` restaura o estado limpo.

### Artefato de apoio
- `docs/S5-ASP-NON-MEMBERSHIP-BLOCKED-LANE-REPORT.md`

### Pontos concretos para citar
- own contract: `CAEJBGQDGTFZ5DGRZZ5SYPSFUWRI4IX2V3KMDLS5ANUAI4TX52RTEUUS`
- insert tx real: `538026824852d7ddf718661db100ae1d66233eb96aee2516f20e7dc0a7bb0d0e`
- delete tx real: `39034e29f52a6219f0ed6f0ae3be1722bc92e08b10666a5d1d58b876c5b1772c`

### Frase sugerida
> A lane de bloqueio não é teórica: ela já roda, bloqueia e reverte com evidência on-chain.

---

## Bloco 6 — revoke -> blocked-lane acoplado
### O que mostrar
- decisão revogada é reextraída;
- helper gera automaticamente a blocked action;
- `insert_leaf` é executado a partir da decisão revogada.

### Artefato de apoio
- `docs/S6-REGISTRY-REVOKE-TO-BLOCKED-LANE-REPORT.md`
- `integration/spp-adapter/scripts/prepare_non_membership_from_registry.py`

### Pontos concretos para citar
- revoke tx: `056f3930bad0ad72fa78ce953392256f6aa7ca9a8aca770646aa20dfa4158f54`
- blocked-lane insert tx: `2abe3083ffa7a63a53307ac22b3d82da90c9b71c6486d6cb9d9b64396f33593c`

### Frase sugerida
> A revogação canônica já se transforma automaticamente em consequência operacional de bloqueio.

---

## Bloco 7 — watcher idempotente
### O que mostrar
- quando a attestation está ativa, o worker faz `no-op`;
- após revogação, ele executa o bloqueio;
- em rerun, ele não duplica a ação.

### Artefato de apoio
- `docs/S7-REVOCATION-WATCHER-REPORT.md`
- `integration/spp-adapter/scripts/run_revocation_watcher.py`

### Pontos concretos para citar
- blocked tx do watcher: `0223660c0548b94c1dce9ea8c6b7c4ac4b4041a5fba147339ef10df31b278ada`
- rerun idempotente: `insert_executed = false`

### Frase sugerida
> Não dependemos de operador humano para repetir o gesto certo: o worker observa, decide e evita duplicação.

---

## Bloco 8 — boundary honesto
### O que mostrar
- a instância externa auditada pode ser lida;
- mutação exige signing key do admin;
- portanto a convergência externa é tema de governança, não de integração técnica pendente.

### Artefato de apoio
- `docs/S8-EXTERNAL-ASP-BOUNDARY-REPORT.md`

### Frase sugerida
> Nós não overclaimamos autoridade sobre a lane externa. Hoje operamos nossa lane própria; a convergência externa depende de governança formal.

---

## Bloco 9 — supporting evidence DeFindex
### Como usar
Usar apenas no final, como reforço.

### O que dizer
- a DPO2U já provou que a mesma primitive pode governar ação privilegiada real em Stellar;
- isso reforça a robustez institucional da tese;
- mas não substitui a narrativa central ASP/SPP.

### Artefato de apoio
- `docs/DEFINDEX-PROOF-BOUND-EXECUTION-LIVE-SLICE.md`

### Frase sugerida
> A mesma primitive que aqui governa admissão e bloqueio já foi forte o bastante para sentar no caminho de uma ação privilegiada real em DeFindex.

---

## 4. Pitch de 30 segundos

> A DPO2U transforma decisões canônicas de compliance em enforcement verificável on-chain. No Pulso, mostramos uma lane real em Stellar onde uma decisão nasce no registry, vira admissão operacional e, quando é revogada, dispara bloqueio verificável e idempotente. Não é compliance em PDF; é compliance como comportamento de infraestrutura.

---

## 5. Pitch de 3 minutos

> A tese da DPO2U é simples: compliance não deve terminar em parecer ou dashboard; ele deve conseguir mudar o comportamento operacional de uma lane institucional.
>
> No Pulso, mostramos isso numa forma estreita e honesta. Primeiro, existe um `protocol-registry` vivo em Stellar testnet onde uma decisão canônica é registrada com claim, jurisdição e evidência verificável. Segundo, essa decisão é extraída e transformada em admissão operacional na lane ASP/SPP. Terceiro, quando essa attestation é revogada on-chain, a mudança não fica abstrata: ela gera consequência real na blocked-lane do `asp-non-membership`.
>
> Essa blocked-lane já foi provada numa instância própria da DPO2U: antes do bloqueio a prova de non-membership passa, ao inserir a key ela falha, e ao remover a key o estado limpo volta. Depois, fomos além: mostramos o acoplamento fim-a-fim entre revogação do registry e bloqueio automático, e materializamos um watcher idempotente que observa, executa a ação quando necessário e não duplica o bloqueio em reruns.
>
> O boundary honesto também está resolvido: a instância externa auditada pode ser lida publicamente, mas não pode ser mutada por nós sem autoridade formal de admin. Então o que mostramos não depende de inventar permissão inexistente. Mostramos uma lane soberana, replayável e verificável agora.
>
> E como reforço, o repo já sustenta uma evidência lateral importante: a mesma primitive também foi capaz de sentar no caminho de uma ação privilegiada real em DeFindex. Isso mostra que não estamos falando só de admissão abstrata, e sim de uma camada verificável de controle institucional em Stellar.

---

## 6. Q&A de boundary honesto

### Pergunta 1 — “Vocês controlam a instância externa auditada?”
**Resposta curta:** não.

**Resposta completa:**
Hoje a instância externa auditada é um boundary de leitura, auditoria e comparabilidade. A mutação nela exige a signing key do admin. Nossa lane operacional oficial nesta fase é a instância própria B-first.

### Pergunta 2 — “Então o problema restante é técnico?”
**Resposta curta:** não, é de governança.

**Resposta completa:**
A integração técnica relevante já foi provada. O gap remanescente para convergência com a instância externa é autoridade formal para mutação ou migração governada.

### Pergunta 3 — “Isso já é produto institucional completo?”
**Resposta curta:** não.

**Resposta completa:**
O que está provado é um lane institucional narrow: registry-backed admission, revocation consequence, blocked-lane e worker idempotente. Não é exchange stack completa, nem MiCA full, nem custody orchestration.

### Pergunta 4 — “Onde entra ZK?”
**Resposta curta:** como extensão da mesma primitive, não como produto separado.

**Resposta completa:**
O track ZK deve reforçar a tese de elegibilidade/admissão com privacidade, não abrir outra arquitetura concorrente à demo principal do Pulso.

### Pergunta 5 — “Onde entra DeFindex?”
**Resposta curta:** como evidência de suporte.

**Resposta completa:**
O slice DeFindex prova que a mesma primitive já governa ação privilegiada real em Stellar. Isso fortalece a robustez da tese, mas a demo principal do Pulso continua sendo ASP/SPP.

---

## 7. Ordem mínima de demo para palco/call

Se houver pouco tempo, usar esta sequência fixa:

1. `B-first` e boundary honesto
2. registry vivo
3. admissão na lane
4. revogação canônica
5. blocked-lane + watcher
6. boundary externo
7. DeFindex como supporting evidence

---

## 8. Regra final

Se uma explicação não ajuda a reforçar a frase abaixo, cortar da demo principal:

> **DPO2U turns canonical compliance decisions into verifiable operational consequences on Stellar.**
