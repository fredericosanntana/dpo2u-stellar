# Cerimônia de trusted setup — Prova de Solvência (`por_solvency`, Groth16/BN254)

Pipeline reproduzível que leva a prova de solvência ZK (`zk-prover/por/por_solvency.circom`,
verificada on-chain por `contracts/por-verifier`) do **setup de dev** (coordenador único
+ beacon fixo, `build.sh`) para uma **cerimônia MPC multi-party** (1-of-N honesto).

> **Status (2026-10-02): pipeline pronto e ENSAIADO ponta a ponta. NÃO houve cerimônia de
> produção.** O ensaio (`ensaio/`) usou 3 contribuidores **simulados na mesma máquina, pelo
> mesmo operador** — sem independência, portanto **sem** garantia 1-of-N. A VK do ensaio
> não deve ser pinada em nenhum contrato (`por-filing`, `agg-filing`, `xchain-attest`
> etc. seguem com a VK dev até a cerimônia de produção).

O pipeline irmão `scripts/zk-ceremony/` (circuito `score_threshold`, BLS12-381) fica
intacto; este diretório é separado porque curva, ptau, conversor e verificador são outros.

## Pré-requisitos
- `circom` ≥ 2.1.6 (ensaio: 2.2.2), `snarkjs` 0.7.x (ensaio: 0.7.6), Node ≥ 18
- `circomlib` 2.0.5 (instalado por `00-compile.sh` em `zk-prover/por/node_modules`)
- `b2sum`, `sha256sum`, `curl`; Rust (só para o teste do contrato)

## Phase 1 — Powers of Tau pública (não rodamos a nossa)
| Item | Valor |
|---|---|
| Arquivo | `powersOfTau28_hez_final_12.ptau` (Hermez/Polygon, bn128, 54 contribuições + beacon, 2^12 = 4096 ≥ 1113 constraints) |
| URL | `https://circom.info/powersOfTau28_hez_final_12.ptau` (o espelho antigo `storage.googleapis.com/zkevm/ptau/` responde 403 desde ao menos 2026-10-02) |
| blake2b-512 **publicado** | `ded2694169b7b08e898f736d5de95af87c3f1a64594013351b1a796dbee393bd825f88f9468c84505ddd11eb0b1465ac9b43b9064aa8ec97f2b73e04758b8a4a` — tabela "Prepared (phase2) Ptau files for bn128" do README oficial do snarkjs (iden3/snarkjs) |
| sha256 (medido) | `dcf4ea473bf14b971ce5f7b7c1d6ce1c41a8ed042cdb75b65ca9178e3a3c7c17` |

`01-phase1.sh` recusa o arquivo se o blake2b não bater e roda `snarkjs powersoftau verify`
(valida as 54 contribuições + beacon embutidos). Alternativa equivalente: PSE Perpetual
Powers of Tau `ppot_0080_12.ptau` (`https://pse-trusted-setup-ppot.s3.eu-central-1.amazonaws.com/pot28_0080/ppot_0080_12.ptau`,
80 contribuições, beacon = randao do slot 7.325.000 da Ethereum); o README da PSE **não**
publica hash por arquivo truncado, por isso o padrão é o Hermez. `LOCAL_PHASE1=1` roda uma
Phase 1 local de 1 parte — só para ensaio offline, nunca para produção.

## Scripts
| Script | Quem roda | O que faz |
|---|---|---|
| `00-compile.sh` | coordenador e auditores | compila o circuito, grava `build-info.txt` (versões, sha256 do `.circom` e do `.r1cs`) |
| `01-phase1.sh` | coordenador, contribuidores, auditores | baixa o ptau, confere blake2b publicado, `powersoftau verify` |
| `02-phase2-init.sh` | coordenador | `groth16 setup` → `por_0000.zkey` (determinístico: auditor regenera e compara) |
| `03-contribute.sh <in> <out> <nome>` | **cada contribuidor, na máquina dele** | verifica a entrada, contribui (entropia pedida pelo snarkjs no terminal), imprime sha256 + contribution hash |
| `04-beacon-finalize.sh <por_N> <beacon> [iter]` | coordenador | aplica o beacon público (sem default), `zkey verify`, exporta a VK |
| `05-convert.sh [input.json]` | coordenador | prova de solvência de teste, `groth16 verify`, converte com `zk-prover/por/snarkjs2soroban-bn254.js`; apaga o witness |
| `06-rust-fixture.js <soroban-bn254.json>` | coordenador | emite as constantes do `contracts/por-verifier/src/test_ceremony.rs` |
| `verify-transcript.sh <dir-zkeys> <manifest>` | **qualquer um** | auditoria independente da cadeia (ver abaixo) |
| `rehearsal.sh` | — | ENSAIO completo com 3 contribuidores simulados |

Diretório de trabalho: `zk-prover/por/build/ceremony/` (gitignored; nunca contém entropia).

## Verificação do transcript (credibilidade 1-of-N)
`verify-transcript.sh` não confia em nada que o coordenador diga além dos arquivos públicos:
1. recompila o circuito do fonte e compara `r1cs_sha256`;
2. confere o blake2b do ptau contra o publicado pelo snarkjs e roda `powersoftau verify`
   (`SKIP_PTAU_VERIFY=1` pula essa etapa lenta — ~minutos);
3. regenera `por_0000.zkey` de (r1cs, ptau) e compara o sha256;
4. para cada `por_i.zkey`: sha256 == manifest e `snarkjs zkey verify r1cs ptau por_i` = ZKey Ok
   (cada elo publicado estende o anterior);
5. `por_final.zkey`: ZKey Ok; todo contribution hash publicado por cada contribuidor
   aparece na cadeia listada pelo snarkjs; o beacon aplicado == o `beacon_hash` anunciado;
6. a VK exportada == `vk_sha256` (é a VK que vai ao `por-verifier`).

Cada contribuidor deve, além disso, conferir que o **seu** contribution hash (que ele anotou
na hora) aparece na cadeia final — é isso que o torna "o 1 honesto" verificável.

## Fluxo de produção
```
# Coordenador
./00-compile.sh && ./01-phase1.sh && ./02-phase2-init.sh      # publica por_0000 + sha256
# ANUNCIA, antes da 1ª contribuição: fonte do beacon (ex.: drand round R / bloco BTC H)
# Contribuidor i (máquina própria, organização própria), i = 1..N, N ≥ 3:
./00-compile.sh && ./01-phase1.sh
./03-contribute.sh por_000{i-1}.zkey por_000{i}.zkey "<nome> (<organização>)"
# publica por_000i.zkey + sha256 + contribution hash em canal próprio (assinado)
# Coordenador, depois que a rodada/bloco anunciado existir:
./04-beacon-finalize.sh por_000N.zkey <randomness-do-beacon> 10
./05-convert.sh
node 06-rust-fixture.js $WORK/soroban-bn254.json   # → test_ceremony.rs; cargo test -p por-verifier
# Publica: todos os .zkey, manifest, contributions.log, VK; qualquer um roda verify-transcript.sh
```

## O que a cerimônia de PRODUÇÃO exige e uma só parte NÃO consegue fazer
Nada disso pode ser feito pela DPO2U sozinha — por definição, um setup em que uma só parte
controla todas as entropias é um setup de 1 parte, qualquer que seja o nº de `.zkey`s.

1. **Contribuidores independentes: ≥ 3, de organizações diferentes**, sem relação de
   controle com a DPO2U nem entre si, cada um na sua máquina (idealmente air-gapped ou
   VM efêmera destruída após), com identidade pública (nome + organização + chave que
   assina a publicação). Pelo menos um deles precisa ser honesto — e a DPO2U não pode ser
   quem atesta isso.
2. **Entropia descartada** por cada contribuidor: digitada no prompt do snarkjs, nunca em
   arquivo/argv/histórico; máquina desligada ou VM destruída depois. Só o próprio
   contribuidor pode atestar o descarte (declaração assinada na transcrição).
3. **Publicação dos hashes por canal do próprio contribuidor** (repo/gist/post assinado),
   não só pelo coordenador: sha256 de entrada e saída + contribution hash, no momento da
   contribuição. Publicação apenas pelo coordenador não prova nada sobre a cadeia.
4. **Beacon público anunciado antes**: fonte, rodada/altura e iterações (`2^10`) fixadas
   publicamente ANTES da 1ª contribuição — ex.: rodada futura da drand (League of Entropy,
   mainnet `8990e7a9…b2ce`) ou hash de um bloco futuro do Bitcoin. O valor só pode existir
   depois do fechamento da cadeia.
5. **Auditoria de segurança por terceiro** do circuito (`por_solvency.circom`: range checks
   de 64 bits, `GreaterEqThan(67)`, ausência de sinais sub-restritos, binding de `context`)
   **e** do contrato (`contracts/por-verifier`: equação Groth16, checagem de |ic|, validação
   de pontos/subgrupo pelas host functions BN254, e os contratos que pinam a VK). A
   cerimônia só protege contra forja via toxic waste; não corrige bug de circuito.
6. **Transcrição publicada e verificável**: todos os `.zkey` (em local durável — release,
   IPFS), `manifest.txt`, `contributions.log`, VK, e o resultado de `verify-transcript.sh`
   rodado por pelo menos um terceiro.
7. **Troca de VK on-chain** como ato separado e autorizado (pin nos contratos consumidores),
   só depois dos itens 1–6.

## Ensaio (2026-10-02)
Ver `ensaio/TRANSCRIPT-ENSAIO.md`.
