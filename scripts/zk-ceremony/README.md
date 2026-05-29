# Cerimônia de trusted setup — `score >= threshold` (DPO2U, A1)

Pipeline que substitui a VK dev/seed-fixa por uma VK de **cerimônia MPC** (1-of-N
honesto). Valida o runbook `docs/zk-trusted-setup-runbook.md`. **Status: pipeline
testado ponta a ponta** (ensaio dev) — `Circom → snarkjs → conversor → verify_proof
Soroban` provado verde em `contracts/zk-verifier/src/test_ceremony.rs`.

## Pré-requisitos
- `circom` ≥ 2.2 e `snarkjs` ≥ 0.7 (`npm i -g snarkjs`; circom binário em /usr/local/bin)
- Rust (para o conversor `zk-prover/src/bin/snarkjs2soroban.rs`)

## Papéis
- **Coordenador** (DPO2U): compila, roda Phase 1, inicia Phase 2, encadeia as
  contribuições, aplica o beacon, exporta a VK, converte e troca a `CANONICAL_VK`.
- **Contribuidores** (≥3, idealmente os membros do piloto): cada um roda UMA
  contribuição com entropia fresca, **descarta** a entropia, publica o `.zkey` + hash.

## Passos

```
# Coordenador (1x):
./00-compile.sh                       # circuito → r1cs/wasm
./01-phase1.sh                        # powers of tau (bls12381) + beacon
./02-phase2-init.sh                   # → circuit_0000.zkey

# Cada contribuidor i = 1..N (na máquina DELE), encadeado:
./03-contribute.sh circuit_0000.zkey circuit_0001.zkey "Membro 1"
./03-contribute.sh circuit_0001.zkey circuit_0002.zkey "Membro 2"
./03-contribute.sh circuit_0002.zkey circuit_0003.zkey "Membro 3"
# (publica cada .zkey + o hash; passa adiante)

# Coordenador (após N contribuições):
./04-beacon-finalize.sh circuit_0003.zkey <beaconHash>   # beacon público + verify + export VK
./05-convert.sh 85 70 1               # proof de teste + hex Soroban (Groth16::verify valida)
```

## Aplicar a VK da cerimônia
1. Copiar o `VK_*`/`VK_IC*` impressos por `05-convert.sh` para a constante
   `CANONICAL_VK` em `packages/pilot-gateway/src/lib/canonical-vk.ts`.
2. Atualizar `contracts/zk-verifier/src/test_ceremony.rs` com a nova VK + um proof
   de teste, e rodar `cargo test -p zk-verifier` (deve passar).
3. Marcar a seed dev em `zk-prover/src/main.rs` atrás de uma flag `--dev` (ou
   removê-la) — nenhum proof de produção deve usá-la.
4. Publicar a transcrição (todos os `.zkey` + hashes + o beacon) para auditoria.
5. Só então configurar `zk_compliance_v1` on-chain e incluí-lo no E2E.

## Beacon
Use uma fonte de aleatoriedade pública verificável a futuro (ex.: hash de um bloco
do Bitcoin combinado/anunciado de antemão). O placeholder nos scripts é só p/ ensaio.

## Notas de paridade (já validadas)
- Circuito Circom (`zk-prover/circom/score_threshold.circom`) tem paridade com o
  arkworks: sinais públicos `[threshold, context]`, range 8-bit, curva bls12381.
- O conversor reconstrói os pontos em arkworks, **valida com `Groth16::verify`** e
  emite `serialize_uncompressed` (96B G1 / 192B G2) — o formato exato de
  `G1Affine/G2Affine::from_array` do Soroban. A ordem de Fq2 é auto-detectada.
