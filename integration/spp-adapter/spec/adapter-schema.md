# Adapter schema

## AdmissionDecisionInput

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---:|---|
| `request_id` | string | sim | identificador único da operação |
| `subject_commitment` | string(hex-32) | sim | compromisso canônico do sujeito |
| `claim_type` | string | sim | tipo de claim |
| `jurisdiction` | string | sim | jurisdição/lane regulatória |
| `attestation_root` | string(hex-32) | sim | root registrada no `protocol-registry` |
| `note_public_key` | string(hex-32) | sim | chave pública usada pelo SPP |
| `membership_blinding` | string(decimal ou 0xhex) | sim | material de blinding para o leaf |
| `target_network` | string | sim | testnet/futurenet/etc |
| `membership_contract_id` | string | sim | contrato destino do `insert_leaf` |
| `non_membership_contract_id` | string | não | contrato de blocked-list |
| `operator_mode` | enum | sim | `prepared` ou `executed` |
| `prepared_by` | string | não | operador/bot que preparou o payload |

## AdmissionExecutionRecord

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---:|---|
| `request_id` | string | sim | correlaciona com a entrada |
| `status` | enum | sim | `draft`, `policy_verified`, `prepared`, `submitted`, `confirmed`, `failed` |
| `subject_commitment` | string(hex-32) | sim | sujeito canônico |
| `claim_type` | string | sim | claim usada |
| `jurisdiction` | string | sim | lane usada |
| `attestation_root` | string(hex-32) | sim | root de verificação |
| `note_public_key` | string(hex-32) | sim | chave pública do usuário |
| `membership_blinding` | string | sim | blinding usado |
| `membership_leaf_hex` | string(hex-32) | sim | leaf final em hex |
| `membership_leaf_dec` | string | sim | leaf final em decimal |
| `membership_contract_id` | string | sim | contrato destino |
| `target_network` | string | sim | rede alvo |
| `operator_mode` | enum | sim | `prepared` ou `executed` |
| `root_before` | string | não | root observada antes |
| `root_after` | string | não | root observada depois |
| `tx_handle` | string | não | tx hash / invocation handle |
| `prepared_command` | string | não | comando pronto para submissão |
| `executed_by` | string | não | operador/bot |
| `executed_at` | string(date-time) | não | timestamp |
| `failure_reason` | string | não | motivo de falha |
