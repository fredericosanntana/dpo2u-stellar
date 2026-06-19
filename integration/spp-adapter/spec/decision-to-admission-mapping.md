# Decision → Admission Mapping

## Objetivo

Traduzir uma decisão canônica do `protocol-registry` para o contrato de entrada do adapter SPP sem mover a lógica de policy para dentro do adapter.

## Lane congelada para a S3

| Campo | Valor |
|---|---|
| `claim_type` | `kyc` |
| `jurisdiction` | `BR` |
| `min_trust_tier` | `2` |
| `min_stake` | `1000` |
| `revocation consequence` | tombstone no `protocol-registry`; admissão futura bloqueada; blocked-lane SPP preparado separadamente |

Essa lane é ancorada no shape real do `protocol-registry` observado em `contracts/protocol-registry/src/test.rs` e `src/lib.rs`.

## Fatos exigidos antes do adapter agir

| Fato canônico do registry | Superfície real | Ação no adapter |
|---|---|---|
| issuer profile ativo | `configure_issuer_profile(...)` | sem isso, `go/no-go = no-go` |
| issuer tem escopo de claim | `set_issuer_claim_scope(...)` | sem isso, `go/no-go = no-go` |
| issuer tem escopo jurisdicional | `set_issuer_jurisdiction_scope(...)` | sem isso, `go/no-go = no-go` |
| policy da lane está ativa | `set_claim_policy_requirements(...)` / `get_claim_policy(...)` | sem isso, `go/no-go = no-go` |
| stake do issuer cobre a lane | `set_policy_stake(...)` + `issuer_stake(...)` | sem isso, `go/no-go = no-go` |
| attestation existe | `register_attestation(...)` | vira `subject_commitment`, `claim_type`, `jurisdiction`, `attestation_root` |
| attestation está ativa | `is_attestation_active(...)` | sem isso, `go/no-go = no-go` |
| root bate | `verify_attestation_proof(...)` | sem isso, `go/no-go = no-go` |
| attestation não foi revogada | `revoke_attestation(...)` / `is_revoked(...)` | sem isso, `go/no-go = no-go` |

## Mapeamento de campos

| Campo no decision package | Campo no AdmissionDecisionInput | Observação |
|---|---|---|
| `request_id` | `request_id` | id operacional do bridge |
| `subject_commitment` | `subject_commitment` | compromisso canônico do sujeito |
| `claim_type` | `claim_type` | ex.: `kyc` |
| `jurisdiction` | `jurisdiction` | ex.: `BR` |
| `attestation_root` | `attestation_root` | root validado pelo registry |
| `operator.note_public_key` | `note_public_key` | chave usada para gerar leaf SPP |
| `operator.membership_blinding` | `membership_blinding` | segredo operacional do leaf |
| `target.network` | `target_network` | ex.: `testnet` |
| `target.asp_membership_contract_id` | `membership_contract_id` | landing zone real do SPP |
| `target.asp_non_membership_contract_id` | `non_membership_contract_id` | lane de blocked list |
| `operator.mode` | `operator_mode` | `prepared` ou `executed` |
| `operator.prepared_by` | `prepared_by` | operador do bridge |
| `registry.contract_id` | `registry_contract_id` | proveniência, não usado pelo leaf |
| `issuer.address` | `issuer` | proveniência, não usado pelo leaf |
| `attestation.valid_until` | `valid_until` | proveniência temporal |
| `policy.min_trust_tier` | `policy_min_trust_tier` | proveniência de gating |
| `policy.min_stake` | `policy_min_stake` | proveniência de gating |
| `decision_source` | `decision_source` | trilha de auditoria |
| `decision_provenance` | `decision_provenance` | trilha de auditoria livre |

## Go / No-Go

O adapter **não decide policy**. Ele só executa se receber um package já marcado como:

- `registry_verified = true`
- `attestation_active = true`
- `lane_active = true`
- `revoked = false`

Se qualquer um desses vier divergente, a execução deve ser barrada antes do `prepare_insert_leaf.py`.
