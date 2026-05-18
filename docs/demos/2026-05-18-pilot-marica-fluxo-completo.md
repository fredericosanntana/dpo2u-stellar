# Pilot Anticorrupção — Fluxo Completo com Âncora na Stellar Testnet

**Data:** 18 de maio de 2026
**Audiência:** Município de Maricá (Secretaria de Transparência, Ouvidoria, Procuradoria)
**Reproduzido em:** ~30 segundos a partir do repositório público

---

## Por que isto existe

Em fevereiro de 2024, o **TJDFT perdeu R$ 5,5 milhões** numa fraude de troca de conta bancária de fornecedor. O fluxo é clássico: alguém se passa pelo fornecedor por canal lateral (email, WhatsApp), submete uma nova conta corrente, alguém aprova sem checar lateralmente, o pagamento sai. O dinheiro vai pra conta do atacante.

O problema **não é** falta de regra interna. É que **a evidência da conferência some** depois — sumiu o ticket, sumiu o email, sumiu o screenshot. Quando o caso vira investigação, o auditor externo (TCE, CGU, MP) não tem como reconstruir o que foi verificado, por quem, contra quê.

O Piloto Anticorrupção da DPO2U muda isto registrando **cada conferência feita numa âncora pública e imutável**:

- nenhum dado pessoal vai pra blockchain (só hashes);
- a verificação independente é trustless — o auditor não precisa cooperação do município, nem credencial nenhuma;
- a operação custa ~R$ 0,01 por atestação (Stellar testnet, gratuita).

---

## O fluxo, em cinco atos

Cinco atores, todos rodando no testnet:

| Sigla | Ator                 | Papel                                                          |
| ----- | -------------------- | -------------------------------------------------------------- |
| **A** | Operador município   | Recebe o pedido de mudança de conta e submete pra atestação    |
| **B** | Gateway DPO2U        | Avalia 5 predicates determinísticos e assina a transação       |
| **C** | Contrato Soroban     | Registra a atestação on-chain (imutável, indexável)            |
| **D** | Auditor externo      | TCE / CGU / imprensa / cidadão — verifica trustless de fora     |

```
A ─────► B ─────► C ─────► (público)
                            ▲
                            │
D ─────────────────────────/   sem credencial, sem cooperação do município
```

| # | Ato                                       | Comando                                          | Verificável em                       |
| - | ----------------------------------------- | ------------------------------------------------ | ------------------------------------ |
| 1 | Operador faz login no console             | `GET  /api/v1/healthz` (x-api-key)               | 200 OK                               |
| 2 | Operador submete payload bank_chg         | `POST /api/v1/attestation/submit`                | `attempt_id` + `status=PENDING`      |
| 3 | Gateway âncora on-chain (Soroban testnet) | `register_attestation` no contrato CC4TJGDR…ZHM5 | tx hash + ledger sequence            |
| 4 | Operador faz polling até COMPLETED        | `GET  /api/v1/attestation/:attempt_id`           | `status=COMPLETED` + tx hash + verdict |
| 5 | Auditor externo verifica trustless        | `dpo2u-attest verify bank_chg <evidence_hash>`   | PASS/FAIL retornado da blockchain    |

---

## Coordenadas vivas

| Item                    | Valor                                                                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Rede                    | Stellar testnet                                                                                                                                |
| Contrato Soroban        | `CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5`                                                                                      |
| Contrato (Stellar Expert) | https://stellar.expert/explorer/testnet/contract/CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5                                       |
| Gateway REST            | `https://mcp.dpo2u.com`                                                                                                                        |
| Use case ativo          | `bank_chg` (predicate set v1, 5 predicates determinísticos)                                                                                    |
| Submitter (gateway)     | `GAD3DAM5JTVWZSWTENR443Y6OKUKRX7EOZYCCN3JEWKEFUTEPY4LSI65`                                                                                      |
| Admin (governance)      | `GDJSDCHTRQYZNKJMUFZ76NAIZ3ZNMBWWAPQ5UHI3JUSOFPSB7NEGQ6UN`                                                                                      |
| Wasm hash               | `d706a07161d784dcf2790c95c5e5e516c0993dfbbd0c8eb7a61cdefd4a6d7595`                                                                              |

---

## Execução ao vivo — caminho legítimo (PASS)

Cenário: fornecedor "Indústria Acme Ltda" (CNPJ `11.222.333/0001-81`) abre ticket no portal oficial do município solicitando atualização de sua conta corrente para o Itaú (ISPB `60701190`). Email vem de `@marica.rj.gov.br`. Operador clica em "atestar".

### Comando único

```bash
PILOT_API_KEY=... ./scripts/demo-pilot-marica-fluxo-completo.sh
```

### Saída — Atos 1 a 4

```
Ato 1/5 — Operador município abre o console
✓ Login OK — {"status":"ok","version":"0.1.0"}

Ato 2/5 — Operador submete pedido de mudança de conta bancária
▸ Variante PASS — operação legítima conforme controle interno
▸ request_id: marica-demo-1779114799-...
✓ Gateway aceitou — attempt_id=att-...-... status=PENDING

Ato 3-4/5 — Gateway âncora a evidência on-chain (Stellar testnet)
▸ Predicates rodando off-chain; gateway assina e envia tx Soroban...
  [ 0s] status=PENDING  [ 2s] status=COMPLETED
✓ Atestação COMPLETED em 2s
▸ verdict:        PASS
▸ evidence_hash:  e9c83325f2cddd675a80dfa018fa9c1ebd1fb8dad232b2904e86ffb391972717
▸ tx hash:        c573ddc586232a032c0dbbc42421de343f4329813f2b53551e786413fc6c2002
▸ ledger:         2621105
▸ predicates:     5/5 avaliados

Predicate results:
  P1_cnpj_match        → PASS  CNPJ do fornecedor confere com titular da conta.
  P2_official_channel  → PASS  Canal portal_oficial.
  P3_sender_domain     → PASS  Domínio remetente confere com municipal.
  P4_bank_regulated    → PASS  ISPB 60701190 regulado BCB.
  P5_no_recent_change  → PASS  Sem mudança prévia registrada (primeira atestação).
```

A transação `c573ddc5…fc6c2002` está pública e indexada no Stellar Expert:

- Tx: https://stellar.expert/explorer/testnet/tx/c573ddc586232a032c0dbbc42421de343f4329813f2b53551e786413fc6c2002
- Conta submitter: https://stellar.expert/explorer/testnet/account/GAD3DAM5JTVWZSWTENR443Y6OKUKRX7EOZYCCN3JEWKEFUTEPY4LSI65

### Ato 5 — Auditor externo verifica trustless

Agora um auditor do TCE-RJ, da CGU, ou um repórter, abre um terminal limpo (sem nenhuma credencial da DPO2U, sem cooperação do município):

```bash
$ npm i -g @dpo2u/stellar-sdk      # ou: node sdk/dist/cli.js
$ dpo2u-attest verify bank_chg e9c83325f2cddd675a80dfa018fa9c1ebd1fb8dad232b2904e86ffb391972717

  DPO2U Anti-corruption Pilot — attestation verification
  ────────────────────────────────────────────────────────
  Contract:    CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5
  Network:     Test SDF Network ; September 2015

  Verdict:     ✅ PASS
  Predicate:   bank_chg@v1
  Submitter:   GAD3DAM5JTVWZSWTENR443Y6OKUKRX7EOZYCCN3JEWKEFUTEPY4LSI65
  Timestamp:   2026-05-18T14:33:27.000Z
```

**Esse é o ponto que vende.** O município não precisa estar disponível. O ticket no portal interno pode ter sido apagado. O servidor que aprovou pode ter saído. A âncora pública continua lá, e qualquer um lê.

---

## Execução ao vivo — caminho da fraude (FAIL)

Mesmo fornecedor, mas agora alguém tenta forjar o ticket: vem por email externo (`atacante.example.com`), pede pra mover a conta pra um CNPJ diferente (`99.888.777/0001-66`).

```bash
PILOT_API_KEY=... VERDICT=fail ./scripts/demo-pilot-marica-fluxo-completo.sh
```

### Saída — Atos 3 e 4

```
✓ Atestação COMPLETED em 8s
▸ verdict:        FAIL
▸ evidence_hash:  b364f513c8fb80f25d490f8a7315ce6dea857de4d22a20336836614da0795a93
▸ tx hash:        9d2a7bbcb1568d88c192788ecb526c0914a1ff156f39b6a20ca6725ed6d0d302
▸ ledger:         2621109

Predicate results:
  P1_cnpj_match        → FAIL  CNPJ do fornecedor difere do titular da nova conta.
  P2_official_channel  → FAIL  Canal 'email_externo' não é oficial.
  P3_sender_domain     → FAIL  Domínio 'atacante.example.com' != 'marica.rj.gov.br'.
  P4_bank_regulated    → PASS  ISPB 00000000 regulado BCB.
  P5_no_recent_change  → PASS  Sem mudança prévia registrada (primeira atestação).
```

A tentativa de fraude **também fica registrada on-chain** (tx `9d2a7bbc…d6d0d302`). FAIL não é silenciado — é um registro público de que o sistema barrou. Auditor que rode `dpo2u-attest verify` na mesma evidence_hash recebe ❌ FAIL e exit code não-zero. Quem auditar três meses depois vê: "neste dia, com este pedido, três predicates falharam, e o município **não** prosseguiu com o pagamento."

Esse é o registro que falta no caso TJDFT.

---

## O que o município precisa fazer pra adotar

| Etapa                                                   | Quem faz             | Tempo estimado | Custo |
| ------------------------------------------------------- | -------------------- | -------------- | ----- |
| Plugar webhook do ERP/financeiro no gateway DPO2U       | TI município         | 1-2 dias       | zero  |
| Definir lista de canais oficiais e domínio municipal    | Procuradoria + TI    | 1 reunião      | zero  |
| Treinar operadores no fluxo (3 cliques no console)      | DPO2U                | 2h             | zero  |
| Mainnet deploy (irreversível, depois do piloto)         | DPO2U + Tesouro      | 1 dia          | < R$ 50/mês de gas |

Mainnet hoje **bloqueado** pela conclusão da auditoria externa de segurança (M5, marcada pra 30 de maio de 2026). Piloto roda em testnet sem qualquer risco financeiro.

---

## Reproduzir localmente em três comandos

```bash
git clone https://github.com/fredericosanntana/dpo2u-stellar.git
cd dpo2u-stellar
PILOT_API_KEY=<sua-chave> ./scripts/demo-pilot-marica-fluxo-completo.sh
```

Para a variante de fraude, adicione `VERDICT=fail`. O script gera um run report JSON completo em `docs/demos/runs/<UTC>-pilot-marica.json` com todos os hashes, tx, e payloads, pronto pra arquivamento.

---

## Anexos

- **Vídeo apresentável (2:38, PT-BR, 1080p):** `/root/DPO2U/07-Content/videos/2026-05-18-pilot-marica-fluxo-completo.mp4` (3.5 MB · narrado com a voz do Chairman)
- **Roteiro do vídeo:** `/root/DPO2U/07-Content/videos/2026-05-18-roteiro.md`
- **Run reports completos:**
  - PASS: [`docs/demos/runs/2026-05-18T14-33-31-pilot-marica.json`](./runs/2026-05-18T14-33-31-pilot-marica.json)
  - FAIL: [`docs/demos/runs/2026-05-18T14-33-51-pilot-marica.json`](./runs/2026-05-18T14-33-51-pilot-marica.json)
- **Script reproduzível:** [`scripts/demo-pilot-marica-fluxo-completo.sh`](../../scripts/demo-pilot-marica-fluxo-completo.sh)
- **Round-trip anterior (admin direto, sem gateway):** [`2026-05-14-testnet-anchor-roundtrip.md`](./2026-05-14-testnet-anchor-roundtrip.md)
- **Contrato Soroban (5 funções):** [`contracts/anticorruption-attestation/src/lib.rs`](../../contracts/anticorruption-attestation/src/lib.rs)
- **Predicates do use case bank_chg:** [`/root/DPO2U/packages/pilot-gateway/src/lib/predicates.ts`](https://github.com/fredericosanntana/DPO2U) (privado)
- **PRD v0.3:** [`docs/DPO2U_PRD_Piloto_Anticorrupcao_v0.3.docx`](../DPO2U_PRD_Piloto_Anticorrupcao_v0.3.docx)
- **Runbook operacional:** [`docs/RUNBOOK.md`](../RUNBOOK.md)

---

## Observação técnica — idempotência

O gateway é idempotente por `evidence_hash` (mesma evidência = mesma atestação on-chain). Se o operador re-submete a mesma operação, o gateway detecta `AttestationExists` no contrato e devolve o registro existente como `COMPLETED` (sem gasto de nova tx). Isso é por design: **uma operação real do mundo = uma única entrada on-chain**. O script de demo varia um campo `audit_seed` no payload pra cada execução produzir uma tx nova (apenas pra apresentação); em produção real, esse campo não existe.
