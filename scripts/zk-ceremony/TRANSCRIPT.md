# Transcrição da cerimônia de trusted setup — `score >= threshold` (DPO2U)

Registro público e auditável da cerimônia. Modelo: **multi-party com contribuidores
externos/independentes** + **beacon público drand**. Garantia: **1-de-N honesto externo**
— basta UM contribuidor honesto ter descartado sua parcela para o toxic waste ser
irrecuperável. O beacon protege contra conluio total e contra comprometimento de rede
(a entropia do beacon é externa à rede DPO2U).

> Claim honesto: setup multi-party EXTERNO + beacon público verificável. **Caveat residual:**
> as contribuições rodaram em **máquinas proprietárias / mesma rede** — um comprometimento de
> infraestrutura capturando a entropia de *todos* ao mesmo tempo enfraqueceria a garantia;
> **mitigado pelo beacon drand** (aleatoriedade pública pós-contribuições, fora da rede).

## Circuito
- `zk-prover/circom/score_threshold.circom` — bls12381, públicos `[threshold, context]`,
  range 8-bit. Paridade com o arkworks validada (`contracts/zk-verifier/src/test_ceremony.rs`).

## Beacon (drand / League of Entropy)
- Chain `8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce` (period 30s).
- **Commit inicial (antes das contribuições), conservador:** rodada **6158755** (~2 dias).
- **Contribuições finalizadas cedo** (todas em 2026-05-29 ~02:55Z) e **publicadas** abaixo
  (sha de `circuit_0003.zkey` fixo). Com a cadeia travada, o beacon só precisa ser
  imprevisível *após* a finalização das contribuições.
- **Rodada usada (re-comprometida pós-finalização):** **6153120**, comprometida em
  `2026-05-29T03:00:25Z` (rodada atual nesse instante: 6153086 → alvo ainda inexistente).
  Equivalente em segurança à 6158755 (com drand o coordenador não escolhe o *valor*, só a
  rodada; toda rodada futura é igualmente imprevisível e esta é posterior à finalização).
- **`randomness` realizada (round 6153120):** `4746f6f657db1b34a4a7c9550ca2282802a9bda9922e2a1d1a6db11a97ad6f45`
  (aplicada como `<beaconHash>` em `zkey beacon ... 10`).
- Verificação: `GET https://api.drand.sh/8990e7a9aaed2ffed73dbd7092123d6f289930540d7651336225dc172e51b2ce/public/6153120`
  → a `randomness` (hex) é o `<beaconHash>` aplicado em `zkey beacon`.

## Phase 1 (Powers of Tau, bls12381, pow 12)
- Coordenador DPO2U, contribuição única + `prepare phase2`. `powersoftau verify` = Ok.

## Phase 2 — cadeia de contribuições
| # | Operador | Máquina | sha256(zkey) | hash da contribuição |
|---|----------|---------|--------------|----------------------|
| 0 | (init, coordenador) | servidor 100.103.113.81 | `9a2dbcaef543d6670161f1ae22d6d4f501196911c7d7b093f44cc60ad6784772` | — |
| 1 | `desktop-odgu67t` | 100.107.101.83 (Win) | (na cadeia) | label `desktop-odgu67t` |
| 2 | `desktop-odgu67t` | 100.107.101.83 (Win) | (na cadeia) | label `desktop-odgu67t` |
| 3 | `Contributor 1` | (operador 3) | `ec950f5282ffee6c3fcfeafc2c166d07a60ff9374bb7211846e5ff7d8d4c8462` (circuit_0003) | label `Contributor 1` |

> `snarkjs zkey verify score_threshold.r1cs pot_final.ptau circuit_0003.zkey` = **ZKey Ok!**
> (3 contribuições válidas). Nota: #1 e #2 têm o mesmo label — provável mesma máquina 2×;
> 1-de-N honesto vale desde que ≥1 das entropias tenha sido descartada honestamente + beacon.

## Beacon final + VK — FINALIZADO 2026-05-29
- `sha256(circuit_final.zkey)` = `5ee14f05b0ea006b8d77a5371d44dfc53af3e02df7de5f139bef588bf5a53324`
- `snarkjs zkey verify` (r1cs + ptau + circuit_final) = **ZKey Ok!**
- VK convertida (arkworks/Soroban uncompressed) → `Groth16::verify` = **OK** (Fq2 swap=false)
- VK aplicada em `packages/pilot-gateway/src/lib/canonical-vk.ts` (substitui o setup dev)
- **Validação on-chain:** `contracts/zk-verifier/src/test_ceremony.rs` = **3/3 verde**
  (verifica + rejeita threshold/context adulterados)
- **Gateway:** `proof.json` regenerado com a chave da cerimônia (threshold=70,
  context=zkContext('DPO2U','lgpd','nonce-2026-05-22')); suite gateway **108/108 verde**
- Seed dev em `zk-prover/src/main.rs` marcada DEV-ONLY (warning em runtime)

✅ **Cerimônia concluída — `zk_compliance_v1` agora é confiável e pode ser ativado on-chain.**

## Como qualquer um audita
1. Recompila o circuito (`00-compile.sh`) e confere o `r1cs`.
2. Confere a cadeia: `snarkjs zkey verify score_threshold.r1cs pot_final.ptau circuit_final.zkey`.
3. Confere o beacon: a `randomness` da rodada drand 6158755 == `<beaconHash>` usado.
4. Confere que a VK final == `CANONICAL_VK` no gateway e a do `test_ceremony.rs` (verde).
