# Catálogo "estado da arte" — 62 use cases explícitos (mainnet)

Objetivo: o deploy mainnet expõe **todas** as jurisdições e funcionalidades de
`dpo2u-mcp` (24 jurisdições + 8 frameworks AI + 10 setoriais + MiCAR/CASP/CVM) e
`dpo2u-solana` (16 programas), como use cases **explícitos** (1 id por item) — máxima
transparência on-chain (o auditor lê o `use_case_id` e sabe o que foi atestado, sem
metadados off-chain). Contrato é genérico → **sem mudança de Rust**: catálogo no SDK +
evaluator no gateway (delega ao MCP) + `configure_use_case` on-chain.

Símbolos: `[a-zA-Z0-9_]`, ≤32 chars. Todos os ids abaixo respeitam o limite.

## 1. B2G — anticorrupção (6, já existem)
`sanction_check_v1`, `overpricing_v1`, `divergent_payee_v1`, `leniency_flag_v1`,
`winner_rotation_v1`, `bank_chg`.

## 2. B2B — maturidade de proteção de dados, 1 por jurisdição (22)
Esquema `<code>_compliance_v1`. MCP: `check_compliance(jurisdiction=<code>)` → score → verdict.

lgpd, gdpr, ccpa, pipeda, law25 (Quebec), appi, pipa, pdp, pdpa, dpdp, uae, popia,
ndpa, mexico, vietnam, malaysia, **kenya, ghana, colombia, tanzania, rwanda, uganda** (6 novas).
→ `lgpd_compliance_v1` … `uganda_compliance_v1`.

## 3. B2B — eventos / direitos do titular (8)
- `consent_record_v1` (DPDP/LGPD), `consent_revoke_v1` (novo)
- `ccpa_optout_v1`, `popia_officer_v1`, `pipeda_consent_v1`, `pipa_identity_v1`
- `erasure_v1` (LGPD Art.18 / GDPR Art.17, novo), `dsr_request_v1` (novo)
MCP: `submit_consent_record`/`register_ccpa_optout`/`register_popia_io`/`record_pipeda_consent`/
`issue_pipa_zk_identity`/`erase_attestation_payload`.

## 4. AI Governance (12)
Frameworks (8) — MCP `audit_ai_governance(framework=<fw>)`:
`ai_japan_v1`, `ai_hiroshima_v1`, `ai_eu_aia_v1`, `ai_korea_v1`, `ai_caidp_v1`,
`ai_unesco_v1`, `ai_mgf_agentic_v1`, `ai_gov_stack_v1`.
Atestações transversais (4) — MCP `audit_ai_red_lines`/`generate_ai_hria`/`report_ai_incident`/
`generate_caio_governance_plan`:
`ai_red_line_v1`, `ai_hria_v1`, `ai_incident_v1`, `caio_appoint_v1`.
(Espelha os 8 tipos do `hiroshima-ai-process-attestation` Solana.)

## 5. Cripto / financeiro (13)
- `micar_art_v1` (MiCAR Tít.III ART — MCP `audit_micar_art`; Solana `art-vault`)
- `micar_casp_v1` (MiCA Tít.V CASP)
- `cvm_token_v1` (CVM tokens BR — MCP `validate_cvm_token_rules`/`generate_cvm_report`)
- Setoriais (10) — MCP `check_sectoral_framework(framework=<code>)`, esquema `sect_<code>_v1`:
  `sect_bcb_14478_v1`, `sect_eudr_v1`, `sect_mifid2_v1`, `sect_pci_dss_v1`, `sect_cvm_175_v1`,
  `sect_rfb_1888_v1`, `sect_eidas2_v1`, `sect_fatf_tr_v1`, `sect_sec_howey_v1`, `sect_cnbv_uif_v1`.

## 6. ZK (1)
`zk_compliance_v1` — score privado, prova pública. **Só ativado pós-cerimônia** (VK da
cerimônia drand). Fica fora do `configure` inicial até a finalização.

---

## Total: 62 (6 + 22 + 8 + 12 + 13 + 1). Ativados no deploy: **61** (ZK depois).

## Implementação (sem mudança de contrato)
1. **SDK `sdk/src/use-cases.ts`** — reescrever `USE_CASES` com os 62; layer enum
   `'B2G' | 'B2B' | 'AIGOV' | 'CRYPTO'`; campos opcionais `jurisdiction?`/`framework?`/`mcpTool?`
   documentando o wiring. Manter `DATA_PROTECTION_JURISDICTIONS` (→22), add
   `AI_GOVERNANCE_FRAMEWORKS` (8) e `SECTORAL_FRAMEWORKS` (10).
2. **Gateway `pilot-gateway/src/lib/predicates.ts`** — registrar um evaluator por use case.
   A maioria são wrappers finos que delegam ao MCP (`check_compliance`, `audit_ai_governance`,
   `audit_micar_art`, `check_sectoral_framework`, `validate_cvm_token_rules`) e mapeiam
   score/resultado → `Verdict` (Pass/Fail/Review) por threshold. Eventos (consent/optout/…)
   mapeiam presença/validade → Pass.
3. **`scripts/configure-mainnet-usecases.sh`** — lista dos 61 (ZK fora). ~61 `configure_use_case`.
4. **Testes** — SDK: integridade do catálogo (ids únicos, ≤32 chars, layers válidos, contagem 62).
   Gateway: evaluator por família.
5. **Custo on-chain** — 61 `configure_use_case` (instance storage, ~5KB total; cada call barata).
   Estimar e, se o deployer (25 XLM) ficar apertado com deploy(2)+config(61)+authorize(5),
   pedir top-up da treasury. Verificar limite de instance storage do contrato.

## Verificação
- `cargo`/`vitest` verdes; catálogo com 62 entradas; `configure` idempotente roda 2× sem erro.
- E2E por família: 1 atestação real verificável via `dpo2u-attest verify <id> <hash>`.
