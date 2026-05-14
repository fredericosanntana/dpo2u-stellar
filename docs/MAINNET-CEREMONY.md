---
type: ceremony
title: "Mainnet Deploy Ceremony — DPO2U Anti-corruption Pilot"
version: 1.0
status: pre-execution
date: 2026-05-13
related: ["RUNBOOK.md", "DPIA-Piloto-Anticorrupcao-v0.1.md", "../contracts/anticorruption-attestation"]
---

# MAINNET DEPLOY CEREMONY — DPO2U ANTI-CORRUPTION PILOT

> **🔒 EXECUÇÃO REQUER CHAIRMAN APPROVE FORMAL POR ESCRITO.**
> Este documento descreve o procedimento. Cada passo gera evidência durável.
> O ato de execução **NÃO É AUTOMATIZÁVEL** — é uma cerimônia humana com testemunhas, gravação em vídeo, e múltiplas assinaturas físicas. O script `deploy-mainnet.sh` cobre apenas a parte técnica determinística entre os checkpoints.

---

## 0. Pré-requisitos (gates)

Todos os itens abaixo devem estar concluídos e documentados **antes** da janela de execução. Cada item gera um artefato durável.

### 0.1 Engineering gate (✅ self-attestable)
- [ ] Sprints F1 + G.{1..6} + H.1 + J.{1,2,3} + K.{1,2,boot} merged em `main`.
- [ ] Pilot stack ≥ 233/233 testes verdes; 0 regressão vs Sprint K.2 baseline.
- [ ] `npx tsc --noEmit` strict clean.
- [ ] CI per-push verde nos últimos 7 dias contíguos.
- [ ] `nightly-e2e.yml` (Sprint K cron) verde por ≥ 14 dias contíguos.

### 0.2 Audit gate (🔴 humano, irreversível)
- [ ] Engagement contratado com **uma das**: OtterSec, Halborn, Sec3 (Soroban experience preferencial — OtterSec auditou Reflector).
- [ ] Audit report publicado, anexado a `docs/AUDIT-{firm}-{date}.pdf`.
- [ ] **Zero findings críticos**.
- [ ] **Zero findings high não mitigados**.
- [ ] Cada finding medium tem PR de mitigação merged OU justificativa escrita acceita pelo audit firm.
- [ ] Findings low listados em `docs/audit-residuals.md` para ciência.

### 0.3 Operations gate (🔴 humano)
- [ ] 3 tabletop drills executados conforme [RUNBOOK §7](RUNBOOK.md): A (key rotation 15 min), B (fee depletion 30 min), C (oracle stall 1h).
- [ ] Atas dos drills em `docs/drills/`.
- [ ] PagerDuty rotação configurada com on-call primário + secundário definidos.
- [ ] Statuspage público funcional em `status.dpo2u.com`.
- [ ] Hardware wallets (Ledger Nano S+) provisionados para os 3 SEP-30 cosigners — pré-validados em testnet com `setOptions` reproduzindo o multisig.

### 0.4 Compliance gate (🔴 humano, irreversível)
- [ ] DPIA v1.0 assinada por DPO município + DPO2U + advogada parceira. Anexada como `docs/DPIA-Piloto-{municipio}-v1.0.md`.
- [ ] Threat Model v1.0 formal — output do workshop 2h. Anexado como `docs/THREAT-MODEL-Piloto-v1.0.md`.
- [ ] DPA (Acordo de Processamento de Dados) assinado entre Município e DPO2U.
- [ ] Termo de Cooperação Técnica formalizado (90 dias Observer L1).

### 0.5 Chairman approve final (🔴 humano, irreversível)
- [ ] Frederico Santana, na qualidade de Founder/DPO2U Chairman, emite parecer escrito de aprovação. Anexado como `docs/CHAIRMAN-APPROVE-MAINNET-{date}.pdf`, assinado digitalmente ou ICP-Brasil.

> ⚠️ **Sem o item 0.5, este documento não pode ser executado.**

---

## 1. Equipe da cerimônia

| Papel | Nome | Responsabilidade |
|---|---|---|
| **Chairman / Approve** | Frederico Santana | Decisão final go/no-go; assina cerimônia |
| **Cerimônia officer** | `[DPO2U_ENG_CEREMONY]` | Executa o script + gerencia hardware wallets |
| **Testemunha 1** | `[MUNICIPIO_IT_REPRESENTATIVE]` | Confirma multisig setup |
| **Testemunha 2** | `[ADVOGADA_PARTNER]` | Compliance witness, assina ata jurídica |
| **Audit observer** | `[AUDIT_FIRM_REPRESENTATIVE]` | Validação técnica em tempo real (opcional) |

Mínimo 4 pessoas físicas presentes (presencial ou videoconferência **gravada**).

---

## 2. Janela de execução

- **Duração estimada**: 3 horas (preparação 60 min + cerimônia 90 min + verificação 30 min).
- **Quando**: dia útil 10:00–13:00 BRT (operating hours TCE / município responde).
- **Onde**: presencial no escritório DPO2U (preferencial) OU Google Meet gravado.
- **Gravação**: vídeo da sessão completa, áudio de cada passo announce + confirm. Arquivada em storage cifrado por 7 anos (legal hold).

---

## 3. Procedimento

### Fase 1 — Setup (60 min)

#### 3.1 Pre-flight check
1. **Cerimônia officer** lê em voz alta cada item do gate 0.{1..5} → testemunhas confirmam visualmente o artefato (papel, PDF, repo URL).
2. **Chairman** assina ata de pre-flight.
3. Vídeo continua gravando — não pausa até o fim da Fase 4.

#### 3.2 Hardware wallets
1. Ledger Nano S+ #1 (Chairman) — desbloqueia + verifica `[ADMIN_PUBKEY]`. Vídeo grava o tela do device confirming address.
2. Ledger Nano S+ #2 (Município IT) — desbloqueia + verifica `[MUNICIPAL_COSIGNER_PUBKEY]`.
3. Ledger Nano S+ #3 (DPO2U engineer) — desbloqueia + verifica `[DPO2U_COSIGNER_PUBKEY]`.

Cada um anuncia em voz alta o public key na tela. **Testemunhas confirmam strkey caractere-a-caractere contra o documento de pre-flight**. Esta verificação física previne MITM em qualquer ponto antes desse momento.

#### 3.3 Fund the operations accounts
1. Transfer 200 XLM do treasury wallet (cold) → admin account.
2. Transfer 10,000 XLM do treasury wallet → fee_sponsor account.
3. Cada transfer é verificada em Stellar Expert mainnet **antes** de prosseguir.

### Fase 2 — Deploy (90 min)

#### 3.4 Build artifact reproducibility
1. `git checkout main && git status` → árvore limpa, nenhum commit fora de `origin/main`.
2. `git log -1 --oneline` → registrado na ata + commit hash anunciado em voz alta.
3. `cargo clean && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test --workspace --locked` → tudo verde.
4. `stellar contract build` → wasm gerado, hash anunciado.
5. **Confronto com audit**: o wasm hash deve bater com o hash auditado em `docs/AUDIT-{firm}-{date}.pdf §<wasm-hash-section>`. Audit observer confirma em voz alta.
6. `stellar contract optimize --wasm target/...wasm` → optimized wasm, hash anunciado.

#### 3.5 Network config
1. `stellar network add public --rpc-url https://soroban-mainnet.stellar.org --network-passphrase "Public Global Stellar Network ; September 2015"` (idempotent).
2. `stellar keys add dpo2u-admin-mainnet --ledger --hd-path "m/44'/148'/0'"` — bind hardware wallet #1.

#### 3.6 Deploy
Execute `scripts/deploy-mainnet.sh`. The script:
1. Re-asserts the build artifact hash matches the audited hash (env var `EXPECTED_WASM_HASH`).
2. Asks for explicit confirmation: type `I-UNDERSTAND-THIS-IS-MAINNET-AND-IRREVERSIBLE`.
3. Invokes `stellar contract deploy --network public --source dpo2u-admin-mainnet -- --admin <ADMIN_PUBKEY>`.
4. Captures: contract id, wasm hash, upload tx hash, deploy tx hash, ledger sequence.
5. Writes `scripts/deploy-mainnet.json` (committed).

**Hardware wallet prompt**: Ledger Nano displays the transaction; **Chairman confirms physically by pressing both buttons**. Testemunhas observam.

#### 3.7 Multisig setup (SEP-30)
1. From `dpo2u-admin-mainnet`, build the SEP-30 ops (see `scripts/setup-sep30.ts`):
   - `setOptions { masterWeight: 1, lowThreshold: 2, medThreshold: 2, highThreshold: 2 }`
   - `setOptions { signer: <MUNICIPAL_COSIGNER_PUBKEY>, weight: 1 }`
   - `setOptions { signer: <DPO2U_COSIGNER_PUBKEY>, weight: 1 }`
   - (server-side recovery key adicionada DEPOIS do mainnet smoke OK, na §3.10)
2. Sign with Ledger #1 (Chairman). Testemunhas confirmam tela.
3. Submit. Verify on Stellar Expert: account now multisig 2-of-3 (master + 2 cosigners; threshold 2).

#### 3.8 First authorize_submitter
1. Build call: `authorize_submitter(admin=<ADMIN_PUBKEY>, submitter=<ISSUER_PUBKEY>, allowed=true)`.
2. After SEP-30, this needs **2 signatures**. Sign with Ledger #1 + Ledger #3 (DPO2U engineer).
3. Submit. Verify event `auth` on Stellar Expert.

#### 3.9 First use_case config
1. Build call: `configure_use_case(admin=<ADMIN_PUBKEY>, use_case_id="bank_change_v1", config={ active: true, predicate_set: "bank_change_v1", predicate_version: 1 })`.
2. Sign 2-of-3, submit. Verify event `config`.
3. Repeat for `payment_doc_v1` and `erasure_v1`.

### Fase 3 — Smoke + canary (30 min)

#### 3.10 Smoke attestation
1. Município pré-fornece um payload PASS canônico (sem PII real — apenas dados que devem produzir PASS).
2. Submit via REST: `POST /api/v1/attestation/submit`.
3. Receba 202 + callback HMAC-signed em < 90s.
4. Verifique via Stellar Expert que o evento `attest` apareceu.
5. Auditor (terceiro presente) roda `dpo2u-attest verify` (CLI público) **sem credenciais** — confirma o mesmo veredito on-chain.

#### 3.11 Add server-side recovery cosigner
Após o smoke OK, adicione o terceiro cosigner (server-managed key, em HSM cloud separada):
1. Build call: `setOptions { signer: <SERVER_HSM_COSIGNER_PUBKEY>, weight: 1 }`.
2. Sign 2-of-3 (Chairman + DPO2U engineer ou Município IT). Submit.
3. Multisig final: 4 signers (master + 3 cosigners), threshold 2.

### Fase 4 — Sealing (30 min)

#### 3.12 Git tag + Sigstore signature
1. `git tag -s mainnet-v1.0.0 -m "Mainnet deploy 2026-XX-XX, contract id <C…>"`. Tag signed with Chairman's GPG key.
2. `git push origin mainnet-v1.0.0`.
3. Sigstore: `cosign sign-blob --output-signature scripts/deploy-mainnet.json.sig scripts/deploy-mainnet.json`.
4. README mainnet section updated with the contract id + audit report link + tag.

#### 3.13 Compliance update
1. DPIA v1.0 → DPIA v1.1: append "Mainnet contract id: <C…>, deployed YYYY-MM-DD, audit firm: <X>".
2. Threat Model v1.0 → v1.1: same append + "production phase begins".
3. Both v1.1 signed by all 3 parties of DPIA. Anexados ao repo.

#### 3.14 Ata final
1. **Chairman** lê em voz alta:
   - Contract id mainnet.
   - Wasm hash deployed = audit hash.
   - Multisig: 4 signers, threshold 2.
   - Smoke OK.
   - Audit report findings: 0 críticos, 0 highs não mitigados.
   - Gate 0 todos verdes.
2. Cada participante assina a ata (papel + foto ou DocuSign).
3. Vídeo pausa.

### Fase 5 — 7-day canary

A partir do go-live:

1. Sistema rodando em **shadow mode**: cada submissão real é também submetida em testnet (existing pilot environment) com o mesmo payload. Verdicts são comparados.
2. Canary script `scripts/canary-compare.sh` roda diariamente; relatório enviado ao Chairman + município.
3. **Critério para declarar go-live final**: divergência < 0.5% em 7 dias contínuos.
4. Se divergência ≥ 0.5%: **HALT mainnet rollout** — RUNBOOK §1.8.

---

## 4. Pós-cerimônia

### 4.1 Anúncio público
- Post no blog DPO2U: "DPO2U Anti-corruption Pilot live on Stellar mainnet."
- Tweet do Chairman.
- Press release coordenado com município (somente se município autorizar).

### 4.2 Observer L1 90 dias
- Município opera normalmente.
- Reports mensais ao Prefeito + CGM.
- Sem decisão sobre L2 (bloqueio) até o final dos 90 dias.

### 4.3 Tabletop drills recurrentes
- Quarterly: re-rodar os 3 drills da §0.3 RUNBOOK.
- Annual: full disaster recovery exercise.

---

## 5. Rollback

**Não há rollback automático** — o contrato é imutável.

**Cenários de "abort gracefully"**:
- Após §3.6 (deploy) mas antes de §3.10 (smoke): chairman declara abort, contract permanece no estado initial (apenas admin), nenhum submitter autorizado, nenhum use_case configurado. Custo: ~ 1 XLM de fees. Sem impacto institucional.
- Após §3.8 (authorize_submitter) mas antes de §3.10: revogue submitter via `authorize_submitter(false)` (precisa de 2-of-3). Mesmo resultado.
- Após §3.10 (smoke): qualquer rollback é institucional — o evento `attest` é público e permanente. Decisão Chairman + advogada.

---

## 6. Versão / histórico

| Versão | Data | Mudança |
|---|---|---|
| 1.0 | 2026-05-13 | Versão inicial pré-execução (Sprint L). Pendente todos gates 0.{1..5}. |

---

## Apêndice A — Checklist resumida

```
PRE-FLIGHT
[ ] Engineering gate 0.1 ✅
[ ] Audit gate 0.2 ✅
[ ] Operations gate 0.3 ✅
[ ] Compliance gate 0.4 ✅
[ ] Chairman approve 0.5 ✅

CEREMONY DAY
[ ] Equipe presente (4+ pessoas)
[ ] Gravação iniciada
[ ] Pre-flight checklist read aloud
[ ] Hardware wallets verified
[ ] Funding done
[ ] Build hash = audit hash ✅
[ ] Deploy ok, tx hash recorded
[ ] SEP-30 multisig set
[ ] authorize_submitter ok
[ ] use_case configs ok (3 sets)
[ ] Smoke attestation PASS
[ ] Server-side cosigner added
[ ] Git tag mainnet-v1.0.0 signed + pushed
[ ] DPIA + Threat Model bumped to v1.1
[ ] Ata final signed (4 signatures)
[ ] Recording archived to legal hold

POST-CEREMONY (7d)
[ ] Canary divergence < 0.5% across 7 days
[ ] Statuspage green throughout
[ ] No incidents above P2
[ ] Chairman declares go-live final
```
