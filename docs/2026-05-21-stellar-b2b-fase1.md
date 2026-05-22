# Fase 1 — dpo2u-stellar passa a oferecer B2B (use cases)

> Execução da Fase 1 do plano "dpo2u-stellar oferece B2B (dual-chain, ZK
> preservado)". O contrato Soroban genérico passa a hospedar a camada B2B de
> compliance ao lado do piloto anticorrupção B2G — sem tocar o Solana.
>
> - Data: 2026-05-21
> - Contrato testnet: `CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5`

## O que foi entregue

**7 use cases B2B novos** no mesmo contrato genérico do B2G — sem mudança de
código no contrato, só `configure_use_case`. Cada um = `PredicateSet`
(mcp-server) + evaluator (pilot-gateway), mesmo padrão dos 6 use cases B2G.

### Workstream A — atestação de conformidade de organização

| Use case | O quê | configure_use_case tx |
|---|---|---|
| `lgpd_compliance_v1` | Conformidade LGPD (DPO, bases legais, RIPD, incidente…) | `bf0dff8d…` |
| `gdpr_compliance_v1` | Conformidade GDPR (DPO, RoPA, DPIA, 72h, transferência…) | `c1f7e49d…` |

**Demo (dogfood):** a DPO2U atestou a própria postura GDPR no contrato —
veredito `REVIEW` honesto (3 controles confirmados, 3 a documentar), atestação
selada e verificada on-chain (tx `eb990b44…`).

### Workstream B — registros jurisdicionais (colapsam programas Solana)

Os 5 programas Solana de jurisdição (`consent-manager`, `ccpa-optout-registry`,
`popia-info-officer-registry`, `pipeda-consent-extension`, `pipa-korea-zk-identity`)
**não viram contratos Soroban separados** — colapsam em use cases de atestação
no contrato genérico. Um registro de consentimento / opt-out / nomeação é uma
atestação cujo `evidence` carrega o evento (só hashes, sem PII).

| Use case | Substitui (Solana) | configure_use_case tx |
|---|---|---|
| `consent_record_v1` | consent-manager (DPDP/LGPD) | `2cf325e1…` |
| `ccpa_optout_v1` | ccpa-optout-registry | `07883a32…` |
| `popia_officer_v1` | popia-info-officer-registry | `70933ecf…` |
| `pipeda_consent_v1` | pipeda-consent-extension | `a89954eb…` |
| `pipa_identity_v1` | pipa-korea-zk-identity | `093760c3…` |

Os 5 evaluators verificados localmente (cada um → `PASS` sobre registro
bem-formado, 3 predicados).

## Estado do contrato

O contrato Soroban hospeda agora **13 use cases** — 6 B2G + 7 B2B:
`sanction_check_v1`, `overpricing_v1`, `divergent_payee_v1`, `leniency_flag_v1`,
`winner_rotation_v1`, `bank_chg` (B2G) · `lgpd_compliance_v1`,
`gdpr_compliance_v1`, `consent_record_v1`, `ccpa_optout_v1`, `popia_officer_v1`,
`pipeda_consent_v1`, `pipa_identity_v1` (B2B).

Confirma a tese do plano: **não é um port de 15 programas** — o contrato
genérico + o mcp-server compartilhado já absorvem a camada B2B. Solana intacto
(dual-chain).

## Verificação

- Builds `mcp-server` e `pilot-gateway` verdes; 368 testes mcp-server sem regressão.
- 7 `configure_use_case` confirmados on-chain (txs acima).
- Demo B2B (GDPR) atestada e verificada via `verify_attestation`.

## Workstream G — superfície de produto ✅

- **SDK** `dpo2u-stellar/sdk/` — `use-cases.ts` novo: catálogo dos 13 use cases
  agrupados por camada (`USE_CASES`, `useCasesByLayer`, `findUseCase`),
  exportado pelo `index.ts`. O `verify` já era genérico. SDK compila.
- **Painel B2B** — nova rota `/pilot/compliance` no `dpo2u-landing-page`:
  apresenta a camada B2B (os 7 use cases), o contraste B2G/B2B (13 use cases,
  um contrato) e a prova on-chain da auto-atestação GDPR. Adicionado ao
  `PilotNav`. Build de produção verde, **deployado e verificado**.
- **Ferramentas MCP `onchain/`** — a superfície canônica de submissão ao Soroban
  **já é o `pilot-gateway`** (`POST /api/v1/attestation/submit`, aceita qualquer
  `use_case_id` → `evaluate()` → `StellarDriver` → `register_attestation`). Um
  wrapper MCP fino que chama o gateway é follow-up pequeno (depende da API key
  do gateway, gerida por SOPS) — não bloqueia o B2B-on-Stellar, que já funciona
  fim-a-fim pela rota do gateway.

## Fase 1 — fechada

A camada B2B está no `dpo2u-stellar`: 7 use cases configurados on-chain,
atestação real selada e verificada, SDK expõe o catálogo, painel B2B no ar.
O Solana segue intacto (dual-chain).

## Próximo: Fase 2 — ZK preservado

O spike (`docs/2026-05-21-soroban-zk-spike.md`) confirmou **GO**: Soroban tem
host functions BLS12-381 + exemplo oficial `groth16_verifier`. A Fase 2
implementa o circuito Groth16-BLS12-381 + o contrato verificador.
