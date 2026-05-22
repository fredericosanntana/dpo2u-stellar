# Runbook — cerimônia de trusted setup do circuito ZK DPO2U (A1)

> Estado: **planejado**. O `zk-prover` hoje usa um setup de **seed fixa**
> (`StdRng::seed_from_u64`) — reprodutível e bom para desenvolvimento/demo, mas
> **inseguro para produção**: quem conhece a seed conhece o "toxic waste" e pode
> forjar provas. Este runbook define a cerimônia que substitui isso.

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

## Critério de pronto

- [ ] Circuito portado para Circom, em paridade com o arkworks (mesmos sinais
      públicos: `[threshold, context]`).
- [ ] `.ptau` público escolhido e seu hash registrado.
- [ ] ≥ 3 contribuições independentes + beacon, transcrição publicada.
- [ ] `verification_key.json` final → vk do verificador Soroban; redeploy do
      `zk-verifier` **não** é necessário (vk é parâmetro de `verify_proof`), mas
      o gateway deve **fixar** a vk canônica (ver `zk-verifier-threat-model.md`).
- [ ] Seed fixa removida do `zk-prover` (ou mantida só atrás de uma flag `--dev`).

## Enquanto a cerimônia não roda

O caminho de seed fixa permanece **explicitamente marcado como dev-only** no
código (`zk-prover/src/main.rs`) e nos docs. Nenhuma atestação de produção deve
depender dele.
