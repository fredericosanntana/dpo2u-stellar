---
type: runbook
title: "DPO2U Piloto Anticorrupção — Operations Runbook"
version: 1.0
status: pre-mainnet
date: 2026-05-13
related: ["MAINNET-CEREMONY.md", "DPIA-Piloto-Anticorrupcao-v0.1.md", "THREAT-MODEL-Piloto-v0.1.md"]
---

# OPERATIONS RUNBOOK — DPO2U PILOTO ANTICORRUPÇÃO

**Audience**: DPO2U on-call engineer + município IT contact + DPO município (escalation).
**Status**: pre-mainnet. **Sprint L gate**: this RUNBOOK must be tabletop-tested (3 incident drills) before the mainnet ceremony.

---

## 0. Escalation

| Severity | Definition | Channel | SLO |
|---|---|---|---|
| **P0** | Loss of issuer key OR contract halt OR fund drain confirmed | PagerDuty primary + WhatsApp Chairman | 15 min response |
| **P1** | Attestation pipeline down >5 min OR oracle stale >12h OR fee_sponsor < 1000 XLM | PagerDuty primary | 30 min |
| **P2** | Predicate verdict drift >0.5% from canary OR test suite red on main | Email | 4h business hours |
| **P3** | Documentation drift OR non-prod test failure | GitHub issue | next business day |

**Primary on-call**: DPO2U engineer (rotation TBD per Sprint L tabletop).
**Secondary**: Chairman (Frederico Santana).
**External counsel**: advogada parceira DPO2U (`[PARTNER_NAME]`).
**Município ponto-focal IT**: `[MUNICIPIO_IT_CONTACT]` (filled per município in Sprint K).

---

## 1. Incident playbooks

### 1.1 Stellar issuer key compromised (P0)

**Symptoms**:
- On-chain `auth` event from an issuer-controlled address adding an unexpected submitter.
- Multiple `attest` events from a submitter the município does not recognise.
- Statuspage alert: `unexpected_authorize_submitter`.

**Immediate steps** (15 min target):

1. **Disable upstream**. Município pauses POST to `/api/v1/attestation/submit` from its financial system.
2. **Revoke compromised submitter**: from the admin hardware wallet, call `authorize_submitter(admin, <compromised_address>, false)`. This blocks further on-chain damage immediately — even if attacker still holds the issuer key, new attestations from that key will FAIL on the on-chain `Authorized` check.
3. **Rotate issuer key**: generate new keypair (`stellar keys generate dpo2u-issuer-v2`), authorize via `authorize_submitter(admin, new_address, true)`, update `STELLAR_ISSUER_SECRET` env, redeploy container.
4. **Communicate**: P0 notification to município + advogada + Chairman.
5. **Post-mortem within 5 business days**.

**Forensic checklist**:
- Pull all `attest` events from compromised window via Horizon: `https://horizon-mainnet.stellar.org/contracts/<CONTRACT>/effects?cursor=...`
- For each, verify off-chain payload exists + matches stored metadata_hash. Flag any that don't reconcile.
- Snapshot `.env` + recent commits + container image digest at incident time. Preserve for audit.

### 1.2 Fee sponsor balance < 1000 XLM (P1)

**Symptoms**: Statuspage alert `fee_sponsor_low_balance`.

**Action**:
1. Top up fee sponsor: send XLM from DPO2U treasury wallet (cold) to `STELLAR_FEE_SPONSOR_SECRET`'s public key. Recommended top-up: 10,000 XLM at a time.
2. If repeat alerts within 24h: investigate transaction volume — pilot phase should consume ≤ 1 XLM/day. Suspect runaway resource estimate (predicate p2_6 oracle thrashing?) OR DoS attack (T5 in threat model).
3. Confirm `feeCapPerUseCase` is set in env (defaults to 100k stroops = 0.01 XLM per inner tx).

### 1.3 CEIS/CNEP oracle stale > 24h (P1)

**Symptoms**: predicate p2_6 returns `REVIEW` with `code: ceis_cnep_list_stale`. Statuspage alert `oracle_stale`.

**Action**:
1. Check Portal da Transparência reachability: `curl -I https://api.portaldatransparencia.gov.br/api-de-dados/ceis?pagina=1&tamanhoPagina=1`
2. Check `PORTAL_API_TOKEN` validity (expired? rate-limited?).
3. Manually trigger refresh: SSH into container, exec `node -e "import('./dist/predicates/integrations/dpo2u-oracle.js').then(m => new m.Dpo2uOracleCeisCnepClient(...).refresh())"`.
4. If Portal down for > 24h: check Reflector primary path. If both down: município should manually verify suppliers via Portal web UI until restored — predicate REVIEW is the right behaviour; CGM must clear.
5. Long-term mitigation: stand up secondary `PORTAL_API_TOKEN` rotation (Sprint L follow-up).

### 1.4 Storage rent expiry imminent (P1)

**Symptoms**: Statuspage alert `attestation_rent_below_30d`.

**Action**:
1. Batch `extend_ttl` for all attestations with < 30 days remaining. Use the quarterly cron (Sprint K x-task) OR run manually:
   ```bash
   stellar contract invoke --id $CONTRACT --source $ADMIN --network mainnet \
     -- bump_attestation_ttl --use_case $USE_CASE --evidence_hash $HASH
   ```
2. Confirm bump succeeded by re-querying TTL.
3. Document the bump in the audit log.

> **Sprint K open item**: implement `bump_attestation_ttl` as a no-op admin function on the contract (the contract is immutable so this requires Sprint L re-deploy with a new contract; for now use plain `extend_ttl` Soroban host op via stellar-cli).

### 1.5 Contract paused via admin compromise (P0)

**Note**: the deployed contract has NO pause mechanism (immutability is a feature). If the admin is compromised, the worst the attacker can do is `authorize_submitter(false)` for ALL legitimate submitters, effectively halting the chain.

**Recovery**:
1. From the admin hardware wallet (recovered via SEP-30 if needed), re-authorize known-good submitters.
2. Audit any `attest` events between the start of the incident and recovery — confirm none introduced fraudulent records.
3. Document in incident log; this is a Sprint L mainnet learning that goes into v0.2 contract design.

### 1.6 Attestation submitter not whitelisted (FAIL spike)

**Symptoms**: API requests start returning errors mentioning `Error::NotAuthorized (#1)`.

**Action**:
1. Check current authorized submitters via `verify_attestation` queries — the `auth` events on the contract are the source of truth.
2. If the running submitter is genuinely not authorized: re-authorize via admin tx.
3. If submitter SHOULD be authorized but contract says no: check Stellar Expert for any unexpected `authorize_submitter(false)` call.

### 1.7 Secure-erase failure during LGPD Art. 18 erasure (P0 — compliance)

**Symptoms**: `POST /api/v1/attestation/erasure-request` returning 503 with `secure_erase_failed`.

**Critical**: by design, when secure-erase fails, **we do NOT submit the on-chain erasure attestation**. This avoids the "auditor sees data erased while data is still recoverable" compliance bug. The endpoint is regression-tested to preserve this.

**Action**:
1. Inspect adapter error: `secure_erase.error` field on the 503 response.
2. Filesystem adapter: check disk space, permissions on `SECURE_ERASE_ROOT`. If disk full, free space + retry.
3. Verify off-chain payload location matches `resolvePath(req)` in `FilesystemSecureEraseAdapter`.
4. Once secure-erase succeeds: the município re-submits the erasure request (same `municipal_ticket_id` → idempotent).
5. Document: 15-day LGPD response window is preserved as long as final resolution lands within window. Communicate proactively if approaching deadline.

### 1.8 Predicate verdict drift > 0.5% during canary (P2)

**Symptoms**: Sprint L 7-day canary script (`scripts/canary-compare.sh`) reports divergent verdicts between testnet and mainnet runs of the same evidence.

**Action**:
1. Identify divergent attestations: canary log lists `(use_case, evidence_hash, testnet_verdict, mainnet_verdict)`.
2. For each: re-run predicate engine locally with both predicate registries pinned to the on-chain `predicate_set@version`. Determinism failure means a bug.
3. Common cause: env-derived randomness leaked into a predicate (none should — all 5 UC-1 + 6 UC-2 predicates are deterministic on `(evidence, registry_version)`).
4. If genuine drift: HALT mainnet rollout. Investigate, fix, re-canary.

---

## 2. Routine procedures

### 2.1 Quarterly TTL bump

**Schedule**: 1st business day of each quarter.
**Owner**: DPO2U on-call.
**Procedure**:
1. Query all attestations from the past quarter via Stellar Expert.
2. Run `scripts/bump-all-ttls.sh --since $(date -d '-90 days' '+%Y-%m-%d')`.
3. Confirm 100% of bumps succeeded.
4. Update audit log + Chairman digest.

### 2.2 Daily CEIS/CNEP oracle refresh

**Schedule**: 02:00 BRT.
**Owner**: cron in container.
**Procedure** (Sprint K.x cron PR):
1. `Dpo2uOracleCeisCnepClient.refresh()` is called.
2. If successful AND list_hash differs from yesterday: submit on-chain attestation with `use_case_id='dpo2u_oracle_v1'`, `evidence_hash=list_hash`, `metadata_hash=SHA256({date, hash, source: 'portaltransparencia'})`.
3. Statuspage `oracle_freshness` gauge updated.
4. Email digest to DPO2U on-call if failure.

### 2.3 API key rotation

**Schedule**: per-tenant, every 90 days OR on incident.
**Owner**: DPO2U on-call coordinating with município IT.
**Procedure**:
1. Generate new key via `openssl rand -hex 32`.
2. Provision in município tenant config.
3. Old key deactivated 7 days later (overlap window for graceful upgrade).

### 2.4 Webhook signing key rotation

**Schedule**: every 180 days OR on incident.
**Procedure**:
1. Generate new key via `openssl rand -hex 32`.
2. Set `WEBHOOK_SIGNING_KEY_NEXT` env var (caller verifies against both during overlap).
3. After 7-day overlap, promote NEXT to current.
4. Município re-configures their webhook receiver with the new key.

---

## 3. Health checks

### 3.1 Liveness

```bash
curl -sf https://mcp.dpo2u.com/health
# → { "status": "ok", "version": "<hash>", "uptime_s": N }
```

Statuspage probe every 60s. >2 consecutive failures = P1.

### 3.2 Attestation pipeline E2E

```bash
curl -X POST https://mcp.dpo2u.com/api/v1/attestation/submit \
  -H 'content-type: application/json' \
  -H "x-api-key: $CANARY_API_KEY" \
  -d '{
    "use_case_id": "bank_change_v1",
    "request_id": "canary-'$(date +%s)'",
    "evidence": { … canary-known PASS payload … }
  }'
# Expect 202 { attempt_id, status: "PENDING" }, then COMPLETED within 90s.
```

Statuspage probe every 5 min. >3 consecutive failures = P1.

### 3.3 Predicate engine smoke

```bash
node -e "
import('./dist/predicates/index.js').then(async (m) => {
  m.bootstrapDefaultPredicateSets();
  console.log(m.listPredicateSets().map(s => s.id));
});
"
# → [ 'bank_change_v1', 'payment_doc_v1', 'erasure_v1' ]
```

### 3.4 Oracle health

```bash
# Check DPO2U-owned oracle snapshot freshness:
node -e "
import('./dist/boot/wire-attestation.js').then(async (m) => {
  const s = await m.bootAttestationStack({ skipInitialOracleRefresh: false });
  const lookup = await s.ceisCnep.lookup('11222333000181');
  console.log({ list_age_hours: lookup.list_age_hours, source: lookup.source });
});
"
# Expect list_age_hours < 24, source ∈ {reflector, dpo2u_oracle}.
```

---

## 4. Communication templates

### 4.1 P0 município notification

> Subject: **[DPO2U PILOTO — INCIDENTE P0]** — `[breve descrição]` — `[YYYY-MM-DD HH:MM BRT]`
>
> Prezado(a) `[NOME_DPO_MUNICIPIO]`,
>
> Comunicamos um incidente de severidade P0 no piloto anticorrupção da DPO2U:
>
> - **Descrição**: `[1 frase]`
> - **Início**: `[timestamp]`
> - **Status atual**: `[contido / em investigação / mitigado]`
> - **Ações imediatas**: `[bullet]`
> - **Impacto no município**: `[bullet]`
>
> Próxima atualização em `[15 min / 1h / 4h conforme severidade]`.
>
> Mais detalhes: `[link incident channel]`.
>
> Atenciosamente,
> DPO2U on-call: `[nome]` — `[telefone]`

### 4.2 Post-mortem template

Documento separado em `docs/post-mortems/YYYY-MM-DD-<slug>.md`. Estrutura:
1. Resumo executivo (1 parágrafo)
2. Timeline (timestamps UTC + BRT)
3. Causa raiz (5 whys)
4. Impacto (atestações afetadas, decisões municipais bloqueadas, custos)
5. O que funcionou
6. O que falhou
7. Ações corretivas (com responsáveis + prazos)
8. Lições para o threat model

---

## 5. Backup + disaster recovery

### 5.1 Off-chain payload backup

**Frequência**: contínua via rsync para storage cifrado em jurisdição diferente.
**RPO**: 5 minutos.
**RTO**: 30 minutos.

**Procedimento**:
- Source: `${PAYLOAD_ROOT}/` no container.
- Destination: bucket S3 com versioning DESLIGADO + lifecycle 90 dias + criptografia AES-256.
- Trigger: inotify → rsync incremental.

> **Privacy note**: payloads contêm PII. O bucket DEVE estar em região com adequação ANPD (Brasil ou UE com SCC). Sprint L decision: Brasil-only para o piloto.

### 5.2 Database backup (Sprint K postgres)

(Sprint K.x — placeholder)

### 5.3 Contract state recovery

**Não aplicável**: o contrato é imutável e o estado persiste na rede Stellar. Recovery = ler eventos via Horizon + reidratar caches off-chain. Procedimento documentado em `scripts/replay-from-chain.sh` (Sprint L follow-up).

---

## 6. Mainnet-specific concerns

Ver [`MAINNET-CEREMONY.md`](MAINNET-CEREMONY.md) para o procedimento de deploy. Este RUNBOOK assume que o deploy já aconteceu e o sistema está em produção.

**Diferenças operacionais mainnet vs testnet**:
- Fees são reais — `feeCapPerUseCase` ativo, alertas em `fee_sponsor < 1000 XLM`.
- Storage rent é real — quarterly TTL bump obrigatório (§2.1).
- Admin key + sponsor key em hardware wallet (Ledger), multisig 2-of-3.
- Nenhuma operação destrutiva sem documento de "aprovação Chairman" assinado eletronicamente.

---

## 7. Tabletop drills (pre-mainnet gate)

Antes do `MAINNET-CEREMONY.md` poder executar, este RUNBOOK exige **3 tabletop drills**:

1. **Drill A** — Key rotation (§1.1). Cenário: issuer key vazado em laptop perdido. Tempo alvo: 15 min recuperação.
2. **Drill B** — Fee depletion (§1.2). Cenário: alerta `fee_sponsor < 1000 XLM` durante feriado. Tempo alvo: 30 min top-up.
3. **Drill C** — Oracle stall (§1.3). Cenário: Portal da Transparência em manutenção 48h. Tempo alvo: 1h até CGM ter procedimento manual + 24h até oracle recuperar.

Cada drill produz uma ata em `docs/drills/YYYY-MM-DD-drill-<X>.md`. Sprint L Chairman approve depende de 3/3 drills com tempo dentro do alvo.

---

## 8. Reference

- [Stellar SDK docs](https://developers.stellar.org)
- [Soroban contract spec](../contracts/anticorruption-attestation/src/lib.rs)
- [Portal da Transparência API](https://portaldatransparencia.gov.br/api-de-dados)
- [Reflector Network](https://reflector.network)
- [LGPD (Lei 13.709/2018)](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm)

## Histórico

| Versão | Data | Mudança |
|---|---|---|
| 1.0 | 2026-05-13 | Versão inicial pré-mainnet (Sprint L). Pendente tabletop. |
