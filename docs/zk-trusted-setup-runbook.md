# Runbook — cerimônia de trusted setup do circuito ZK DPO2U (A1)

> Estado: **EXECUTADA — 2026-05-29** ✅. A cerimônia multi-party (Circom + snarkjs,
> bls12381, 3 contribuições + beacon drand round 6153120) foi concluída; a VK real está
> fixada em `packages/pilot-gateway/src/lib/canonical-vk.ts` (sha256 do `circuit_final.zkey`
> = `5ee14f05b0ea006b8d77a5371d44dfc53af3e02df7de5f139bef588bf5a53324`) e validada on-chain
> por `contracts/zk-verifier/src/test_ceremony.rs` (3/3 verde). **A transcrição auditável
> está em `scripts/zk-ceremony/TRANSCRIPT.md`.** O caminho de seed fixa do `zk-prover` ficou
> marcado DEV-ONLY. Este documento descreve a cerimônia que foi executada (mantido como
> referência de metodologia e para futuras re-cerimônias do circuito).

## Por que é necessário

O Groth16 exige um *trusted setup* **por circuito**. O setup produz a proving
key e a verifying key a partir de um segredo (τ, α, β, …) — o **toxic waste**.
Se esse segredo vazar, é possível forjar provas que verificam para qualquer
enunciado. A garantia de segurança vem de uma **cerimônia MPC**: N participantes
contribuem em sequência; basta **um** participante honesto que descarte sua
parcela para o segredo final ser inrecuperável ("1-of-N honesto").

## Estrutura em duas fases

1. **Phase 1 — Powers of Tau (universal, reusável).** Não depende do circuito.
   Pode-se **reusar uma cerimônia pública já existente** (ex.: a *Perpetual
   Powers of Tau*) — não há necessidade de rodar a Phase 1 do zero. Escolher um
   arquivo `.ptau` com potência ≥ ao nº de constraints do circuito (o circuito
   `score>=threshold` + `context` tem ~20 constraints — `2^12` sobra).
2. **Phase 2 — circuit-specific.** Depende do R1CS do circuito DPO2U. É a
   cerimônia que precisa ser executada para *este* circuito. Cada contribuição
   recebe a anterior, adiciona aleatoriedade fresca e publica o resultado + uma
   prova de contribuição.

## Tooling — decisão

`arkworks` 0.4 (o stack do `zk-prover`) **não tem** crate de cerimônia Phase-2.
Duas opções:

| Opção | Prós | Contras |
|---|---|---|
| **snarkjs / SnarkJS Groth16** | cerimônia Phase-2 madura (`zkey contribute`), curva BLS12-381 suportada, ferramentas de verificação prontas | exige reescrever o circuito em **Circom** (hoje é arkworks Rust) — manter os dois em paridade |
| **Integração Rust `phase2`** | mantém um só circuito (arkworks) | crate `phase2` para BLS12-381 não é oficial/estável; mais engenharia |

**Recomendação:** reescrever o circuito em Circom e usar **snarkjs** para a
cerimônia. O circuito é pequeno (decomposição em 8 bits + 2 inputs públicos) —
o port é de baixo risco e a vk resultante é consumida pelo verificador Soroban
do mesmo jeito (mesma serialização uncompressed dos pontos).

## Fluxo da cerimônia (Phase 2, snarkjs)

```
1. snarkjs groth16 setup circuit.r1cs powersOfTau.ptau circuit_0000.zkey
2. Para cada contribuidor i = 1..N:
   snarkjs zkey contribute circuit_{i-1}.zkey circuit_{i}.zkey \
     --name="contribuidor i" -e="<entropia fresca, descartada após>"
   → publica circuit_{i}.zkey + o hash da contribuição
3. Beacon final (aleatoriedade pública verificável — ex.: hash de um bloco
   futuro do Bitcoin):
   snarkjs zkey beacon circuit_{N}.zkey circuit_final.zkey <beaconHash> 10
4. snarkjs zkey export verificationkey circuit_final.zkey verification_key.json
5. Verificação independente por qualquer um:
   snarkjs zkey verify circuit.r1cs powersOfTau.ptau circuit_final.zkey
```

## Participantes e transparência

- **N ≥ 3 contribuidores independentes** (idealmente externos à DPO2U).
- Cada contribuidor: gera entropia fresca, roda `contribute`, **destrói** a
  entropia, publica o `.zkey` resultante + o hash em um canal público.
- O `circuit_final.zkey` + a transcrição (todos os hashes) ficam públicos no
  repositório, permitindo auditoria por qualquer terceiro.
- O **beacon** garante que nem todos os contribuidores em conluio comprometem o
  resultado.

## Critério de pronto — TODOS ATENDIDOS (2026-05-29) ✅

- [x] Circuito portado para Circom, em paridade com o arkworks (mesmos sinais
      públicos: `[threshold, context]`). Validado por `test_ceremony.rs`.
- [x] `.ptau` público escolhido e seu hash registrado (Powers of Tau bls12381 pow 12).
- [x] ≥ 3 contribuições independentes + beacon, transcrição publicada
      (`scripts/zk-ceremony/TRANSCRIPT.md` — beacon drand round 6153120).
- [x] `verification_key.json` final → vk canônica fixada em
      `packages/pilot-gateway/src/lib/canonical-vk.ts` (hash esperado travado em
      `zk-verify.ts::EXPECTED_CANONICAL_VK_HASH`, fail-closed no boot). Sem redeploy do
      `zk-verifier` (vk é parâmetro de `verify_proof`).
- [x] Seed fixa do `zk-prover` marcada DEV-ONLY (`zk-prover/src/main.rs`, warning em runtime).

## Status pós-cerimônia

`zk_compliance_v1` é **confiável** e pode ser ativado on-chain. A verificação ZK em
produção (gateway `verifyZkProof` + mcp-server `verify_agent_repo_zk_proof`) usa a VK
canônica da cerimônia — nenhuma atestação de produção depende da seed dev. Para o go-live
mainnet do `zk_compliance_v1`, ver o runbook de mainnet (`2026-05-29-mainnet-pilot-runbook.md`):
basta habilitá-lo em `configure-mainnet-usecases.sh` quando o deploy mainnet acontecer.
