# Pulso — Live Demo Script

**Data:** 2026-06-22  
**Status:** script oficial de execução ao vivo  
**Base:** `docs/PULSO-OFFICIAL-DEMO-PATH.md` + `docs/PULSO-DEMO-PACK.md`

---

## 1. Objetivo

Este documento converte o demo pack em um **script executável de palco/call**.

Ele responde quatro perguntas:
1. **o que mostrar**;
2. **em que ordem**;
3. **o que dizer em cada bloco**;
4. **o que fazer se algo falhar**.

---

## 2. Regra principal

A demo precisa provar uma frase só:

> **DPO2U turns canonical compliance decisions into verifiable operational consequences on Stellar.**

Se um trecho não reforça essa frase, cortar.

---

## 3. Modo oficial de apresentação

## Full demo mode
- duração alvo: **6 a 8 minutos**
- uso: call técnica, parceiro, investidor, avaliação com espaço de contexto

## Judge mode
- duração alvo: **90 segundos**
- uso: banca, palco, introdução rápida, triagem

## Backup mode
- duração alvo: **3 minutos**
- uso: quando conexão, terminal ou tempo falham

---

## 4. Full demo mode — ordem oficial

## Bloco 1 — framing
**Tempo:** 30–45s

### Mostrar
- slide/tela inicial ou README/doc curto
- referência ao modo `B-first`

### Falar
> A DPO2U não é compliance em dashboard. A gente transforma decisão canônica de compliance em consequência operacional verificável on-chain. Hoje mostramos isso numa lane real em Stellar, sob nossa própria autoridade operacional.

### Evidência de apoio
- `docs/B-FIRST-OPERATING-MODE.md`

### Se precisar encurtar
Manter só:
> Estamos mostrando enforcement verificável numa lane real, não uma simulação conceitual.

---

## Bloco 2 — registry vivo
**Tempo:** 45–60s

### Mostrar
- `docs/S4-LIVE-REGISTRY-TO-SPP-REPORT.md`
- contract id do registry
- trecho com register + revoke + verify/active

### Falar
> Primeiro, a verdade canônica nasce num registry vivo. A attestation é registrada on-chain, com claim, jurisdição e evidência verificável. Então a política deixa de ser PDF e vira estado canônico consultável.

### Pontos concretos para citar
- registry contract: `CAUDSMRKMZPZNCVHJZ3JFYVV2ZNK7TC7MFZCJNN75QUBZ2W4AYTEWTYP`
- houve register tx e revoke tx reais

### Fallback
Se não abrir o doc a tempo, dizer:
> Já temos no repo o relatório com contract id, tx de registro e tx de revogação, todos ancorados em testnet.

---

## Bloco 3 — admissão na lane
**Tempo:** 45–60s

### Mostrar
- artefatos `live-registry-decision.json`
- `live-registry-admission.json`
- `live-registry-executed.record.json`

### Falar
> Segundo, essa decisão sai do registry e vira admissão operacional na lane ASP/SPP. Ou seja: não é só verificar uma policy; é transformar essa policy em uma permissão verificável de entrada.

### Mensagem-chave
> Uma decisão canônica virou admissão operacional verificável.

### Fallback
Se os JSONs não estiverem abertos:
> O bridge já materializa a decisão em artefatos reexecutáveis e registra o resultado da admissão.

---

## Bloco 4 — revogação canônica
**Tempo:** 45–60s

### Mostrar
- mesma evidência da S4 com `verify_attestation_proof == false`
- `is_attestation_active == false`
- falha de nova tentativa de bridge

### Falar
> Terceiro, quando a decisão é revogada, a mudança não fica abstrata. A prova deixa de valer, a attestation deixa de estar ativa, e a tentativa de reentrada falha.

### Mensagem-chave
> Revogação muda comportamento, não só registro.

### Fallback
> O repo já contém a evidência de que, após revogação, a tentativa de bridge falha com `registry decision is not verified`.

---

## Bloco 5 — blocked-lane real
**Tempo:** 60–75s

### Mostrar
- `docs/S5-ASP-NON-MEMBERSHIP-BLOCKED-LANE-REPORT.md`
- contract id da instância própria
- insert tx / delete tx
- antes e depois de `verify_non_membership`

### Falar
> Quarto, a blocked-lane é real. Antes do bloqueio, a prova de non-membership passa. Depois de inserir a key no SMT, ela falha. E ao remover a key, o estado limpo volta. Então o bloqueio não é narrativa; é mecânica operacional provada.

### Pontos concretos para citar
- contract: `CAEJBGQDGTFZ5DGRZZ5SYPSFUWRI4IX2V3KMDLS5ANUAI4TX52RTEUUS`
- insert tx: `538026824852d7ddf718661db100ae1d66233eb96aee2516f20e7dc0a7bb0d0e`
- delete tx: `39034e29f52a6219f0ed6f0ae3be1722bc92e08b10666a5d1d58b876c5b1772c`

### Fallback
> Mesmo sem rodar a tela agora, temos as txs reais e o before/after do `verify_non_membership` registrados no relatório S5.

---

## Bloco 6 — revoke -> blocked-lane acoplado
**Tempo:** 60–75s

### Mostrar
- `docs/S6-REGISTRY-REVOKE-TO-BLOCKED-LANE-REPORT.md`
- helper `prepare_non_membership_from_registry.py`
- revoke tx e blocked insert tx

### Falar
> Quinto, fomos além da prova isolada. A decisão revogada do registry já é reextraída e transformada automaticamente numa blocked action. Ou seja: a consequência operacional já nasce da verdade canônica revogada.

### Pontos concretos
- revoke tx: `056f3930bad0ad72fa78ce953392256f6aa7ca9a8aca770646aa20dfa4158f54`
- blocked insert tx: `2abe3083ffa7a63a53307ac22b3d82da90c9b71c6486d6cb9d9b64396f33593c`

### Fallback
> Se o helper não abrir, a mensagem principal é: revoke do registry já vira blocked-lane executada on-chain.

---

## Bloco 7 — watcher idempotente
**Tempo:** 60–75s

### Mostrar
- `docs/S7-REVOCATION-WATCHER-REPORT.md`
- `run_revocation_watcher.py`
- rodada 1: `no-op-active`
- rodada 2: bloqueio executado
- rodada 3: rerun sem duplicação

### Falar
> Sexto, já existe worker executável e idempotente. Quando a attestation está ativa, ele não faz nada. Quando é revogada, ele bloqueia. E quando roda de novo, ele não duplica a ação. Isso é importante porque enforcement institucional precisa ser automatizável e seguro em rerun.

### Pontos concretos
- watcher blocked tx: `0223660c0548b94c1dce9ea8c6b7c4ac4b4041a5fba147339ef10df31b278ada`
- rerun: `insert_executed = false`

### Fallback
> O ponto essencial é que o worker já prova no-op, bloqueio automático e idempotência.

---

## Bloco 8 — boundary honesto
**Tempo:** 45–60s

### Mostrar
- `docs/S8-EXTERNAL-ASP-BOUNDARY-REPORT.md`
- erro real de missing signing key

### Falar
> E o boundary honesto está explícito: a instância externa auditada pode ser lida, mas não pode ser mutada por nós sem autoridade formal de admin. Então o gap restante não é técnico de integração. É governança.

### Mensagem-chave
> Não overclaimamos controle sobre a lane externa.

### Fallback
> Hoje operamos nossa lane própria; a convergência externa depende de autorização formal.

---

## Bloco 9 — DeFindex como supporting evidence
**Tempo:** 45–60s

### Mostrar
- `docs/DEFINDEX-PROOF-BOUND-EXECUTION-LIVE-SLICE.md`

### Falar
> Como reforço, o repo já sustenta outra evidência importante: a mesma primitive também sentou no caminho de uma ação privilegiada real em DeFindex. Isso reforça que não estamos falando só de admissão abstrata, mas de controle operacional institucional em Stellar.

### Regra
Não deixar esse bloco virar o centro da demo.

### Fallback
Se o tempo estourar, cortar este bloco antes de cortar ASP/SPP.

---

## 5. Fechamento da full demo
**Tempo:** 20–30s

### Falar
> Então o que está provado aqui é simples e forte: uma decisão canônica nasce no registry, vira admissão, e quando é revogada gera consequência operacional verificável e automatizável numa lane institucional em Stellar.

---

## 6. Judge mode — 90 segundos

### Script pronto
> A DPO2U transforma decisões canônicas de compliance em consequências operacionais verificáveis on-chain. No Pulso, mostramos isso numa lane real em Stellar. Primeiro, uma attestation nasce num `protocol-registry` vivo com claim, jurisdição e evidência verificável. Segundo, essa decisão vira admissão operacional na lane ASP/SPP. Terceiro, quando a attestation é revogada, isso não fica só no registro: a blocked-lane do `asp-non-membership` é acionada, e a consequência de bloqueio passa a ser verificável on-chain. Já provamos também o worker idempotente que observa, bloqueia quando necessário e evita duplicação em rerun. E mantemos o boundary honesto: a instância externa auditada é legível, mas não é operada por nós sem autoridade formal. Então o que estamos mostrando aqui é compliance como comportamento de infraestrutura, não como dashboard.

---

## 7. Backup mode — 3 minutos

### Estrutura
1. framing B-first
2. registry vivo
3. revoke -> blocked-lane
4. watcher idempotente
5. boundary honesto

### Script curto
> A tese da DPO2U é que compliance deve mudar comportamento operacional. No Pulso, mostramos isso de forma estreita e honesta numa lane real em Stellar. Existe um registry vivo onde a decisão canônica é registrada. Essa decisão vira admissão operacional na lane ASP/SPP. Quando a attestation é revogada, a blocked-lane é acionada e a consequência de bloqueio passa a ser verificável on-chain. Já materializamos também um worker idempotente que faz no-op quando a attestation ainda está ativa, bloqueia quando ela é revogada e não duplica a ação em reruns. E o boundary honesto está resolvido: a instância externa auditada pode ser lida, mas não mutada por nós sem autoridade formal. Então o demo path já prova enforcement verificável real, não uma arquitetura teórica.

---

## 8. Stage discipline

## Nunca fazer
- abrir o bloco DeFindex cedo demais;
- gastar tempo demais explicando ZK architecture;
- sugerir que controlamos a instância externa;
- vender MiCA full / exchange stack / custody stack;
- explicar quatro produtos diferentes.

## Sempre fazer
- repetir que a lane oficial é B-first;
- reforçar que registry -> admission -> revoke -> blocked-lane é a cadeia principal;
- usar DeFindex só como supporting evidence;
- manter o boundary de governança explícito.

---

## 9. Checklist pré-demo

- [ ] abrir `docs/PULSO-DEMO-PACK.md`
- [ ] abrir `docs/PULSO-OFFICIAL-DEMO-PATH.md`
- [ ] abrir `docs/S4-LIVE-REGISTRY-TO-SPP-REPORT.md`
- [ ] abrir `docs/S5-ASP-NON-MEMBERSHIP-BLOCKED-LANE-REPORT.md`
- [ ] abrir `docs/S6-REGISTRY-REVOKE-TO-BLOCKED-LANE-REPORT.md`
- [ ] abrir `docs/S7-REVOCATION-WATCHER-REPORT.md`
- [ ] abrir `docs/S8-EXTERNAL-ASP-BOUNDARY-REPORT.md`
- [ ] deixar `docs/DEFINDEX-PROOF-BOUND-EXECUTION-LIVE-SLICE.md` só para o final
- [ ] preparar versão 90s de memória
- [ ] preparar frase de boundary honesto de memória

---

## 10. Frase final oficial

> **DPO2U turns canonical compliance decisions into verifiable operational consequences on Stellar.**
