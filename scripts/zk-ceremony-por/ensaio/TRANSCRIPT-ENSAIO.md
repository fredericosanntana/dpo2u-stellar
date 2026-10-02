# ENSAIO da cerimônia PoR (BN254) — 2026-10-02

> **ISTO É UM ENSAIO, NÃO UMA CERIMÔNIA DE PRODUÇÃO.** Os 3 contribuidores foram
> **simulados na mesma máquina, pelo mesmo operador, no mesmo processo de shell**, com
> entropia de `/dev/urandom` (`ENTROPY_SOURCE=urandom`). Não há independência entre eles,
> logo **não existe garantia 1-of-N**: quem controla a máquina poderia, em tese, ter
> registrado as três entropias. A VK abaixo **não deve ser pinada** em contrato algum.
> O objetivo foi provar que o pipeline funciona ponta a ponta e é verificável por terceiros.

Comando: `SKIP_PTAU_VERIFY=1 scripts/zk-ceremony-por/rehearsal.sh` (o `powersoftau verify`
completo do ptau foi rodado à parte — ver "Phase 1").

## Circuito
| | |
|---|---|
| Fonte | `zk-prover/por/por_solvency.circom` (N=4 ativos) · sha256 `1c3cd58577c127f63da7e06c46ba4a289ded0461dee47416d1a0b344e6407ea4` |
| R1CS | 1113 constraints, 1 input público, 2 outputs · sha256 `e564b4119421cde9296d98cd52256b768a61a8cda64663ea5c7e983f6ab04313` |
| Ferramentas | circom 2.2.2 · snarkjs 0.7.6 · circomlib 2.0.5 |

## Phase 1 (pública, reusada)
- `powersOfTau28_hez_final_12.ptau` de `https://circom.info/` — blake2b
  `ded26941…758b8a4a` **igual** ao publicado no README do snarkjs; sha256 `dcf4ea47…3c7c17`.
- `snarkjs powersoftau verify` completo: ver `ptau-verify.log` (resultado registrado abaixo).

## Phase 2 — cadeia
| # | Contribuidor | sha256(entrada) | sha256(saída) | contribution hash (blake2b, prefixo) |
|---|---|---|---|---|
| 0 | init (`groth16 setup`, determinístico) | — | `c9c178e6…e393f` | — |
| 1 | ENSAIO simulado #1 | `c9c178e6…` | `30009bbd…c6e5a6` | `514d93db63a1f92b…` |
| 2 | ENSAIO simulado #2 | `30009bbd…` | `10c18694…38e13f` | `5e633cce7d1959db…` |
| 3 | ENSAIO simulado #3 | `10c18694…` | `dad5ef00…943e21` | `a6cfadef5071dacab…` |
| final | beacon drand (2^10 iterações) | `dad5ef00…` | `a59add52…5b6940` | — |

Valores completos: `manifest.txt` e `contributions.log`.

## Beacon (commit-reveal)
- Fonte: drand **quicknet** (`52db9ba7…e971`, período 3 s) — escolhida por rapidez no ensaio.
  Em produção: drand mainnet ou bloco BTC futuro, anunciado publicamente com antecedência.
- **Commit** (antes da contribuição 1): round **32713294**, fixado em `2026-10-02T12:12:09Z`
  quando a rodada corrente era 32713254 (alvo 40 rodadas ≈ 2 min no futuro).
- Cadeia de contribuições fechada em `2026-10-02T12:12:33Z`, antes de a rodada existir.
- **Reveal**: randomness `350fb9427ce2bfcd983044b66a0dab2dadce997c5ff2152ea1800f66df60d49b`
  (`beacon-drand-round.json`; conferível em
  `https://api.drand.sh/52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971/public/32713294`).

## Resultado
- `snarkjs zkey verify r1cs ptau por_final.zkey` = **ZKey Ok!**
- `verification_key.json` sha256 = `4b68403d964a117eab20ac14ef02fdc59eee2e1b89e4711ea42d6a9bb70d3da6`
- Prova de solvência de teste (Σ reservas 4.250.000 ≥ Σ obrigações 3.980.000, context 123456789):
  `snarkjs groth16 verify` = **OK**; sinais públicos `[1, 2083480609…848549, 123456789]`
  (o `commit` Poseidon é o mesmo da prova dev, porque o enunciado é o mesmo — muda só o setup).
- `verify-transcript.sh` = **TRANSCRIPT OK** (`verify-transcript.log`).
- Negativos do verificador de transcrição (rodados manualmente sobre cópias):
  elo `por_0002` trocado por contribuição intrusa → `✗ por_0002 sha256 diverge` / **FALHOU**;
  manifest anunciando beacon diferente do aplicado → `✗ beacon … != beacon_hash` / **FALHOU**.
- On-chain (`cargo test -p por-verifier`, `contracts/por-verifier/src/test_ceremony.rs`): aceita a
  prova do ensaio; rejeita A negado, C trocado, bytes com bit invertido, context adulterado,
  VK dev antiga com prova nova e prova dev antiga com VK nova.

## O que este ensaio NÃO prova
- Independência dos contribuidores, descarte de entropia, publicação por canal próprio.
- Que o beacon foi anunciado publicamente (o commit ficou só no log local).
- Segurança do circuito ou do contrato (exige auditoria por terceiro).

Os `.zkey` do ensaio ficaram em `zk-prover/por/build/ceremony/` (gitignored, ~586 KB cada) e
não foram publicados; para reproduzir, rode `rehearsal.sh` (os hashes mudarão, pois a entropia
é nova a cada execução).
