# Proof-Bound Execution — reframe do lane DeFindex × DPO2U

## Tese reframeada

O lane validado não deve mais ser apresentado como **"PoR autoriza rebalance"**.

Ele deve ser apresentado como:

> **proof-bound execution** — uma operação privilegiada on-chain só executa quando existe uma prova ZK válida, verificada on-chain, cujo `context` público foi derivado pelo próprio gate a partir do intent hash exato da operação.

Isso é o coração do track ZK.

A prova atual de solvência foi útil para provar a mecânica do lane, mas ela **não é a tese final**. Ela só mostrou que:
- o gate consegue derivar `evidence_hash` de um payload canônico;
- o gate consegue derivar `zk_context` desse hash;
- o verifier/VK podem ser pinados no próprio gate;
- a prova pode ser regenerada para aquele contexto;
- a execução live pode acontecer no mesmo lane role-gated da DeFindex.

Em outras palavras: o que foi provado não foi "solvência como produto". O que foi provado foi **o trilho de execução orientado por prova**.

---

## Verdade atual

### O que o lane já faz de verdade
No gate `contracts/defindex-rebalance-gate/src/lib.rs`, o fluxo ZK atual já garante:
1. `derive_evidence_hash(operator, scope, nonce, expires_at, instructions)` deriva o intent hash da operação;
2. `derive_zk_context(evidence_hash)` projeta esse hash para o campo BN254 de forma determinística;
3. `execute_rebalance_with_proof(...)` exige:
   - operador autorizado,
   - `scope/nonce/expires_at` válidos,
   - proteção contra replay,
   - verifier pinado,
   - VK pinada,
   - `pub_signals[0] == 1`,
   - `pub_signals[2] == derive_zk_context(evidence_hash)`;
4. só depois disso o rebalance é encaminhado ao vault real.

### O que o circuito atual prova
O circuito atual em `zk-prover/por/por_solvency.circom` prova:
- witness privado: `reserves[]`, `liabilities[]`
- claim público: `sum(reserves) >= sum(liabilities)`
- sinais públicos: `[solvent, commit, context]`

Isso foi suficiente para provar a mecânica do lane, mas não é ainda um predicado institucionalmente legível para Pulso/GTM.

---

## Reframe correto

### Formulação nova
O mesmo lane deve ser descrito como:

> **A DPO2U controla execução privilegiada em vaults institucionais via provas atadas ao intent.**

A pergunta deixa de ser:
- "o vault é solvente?"

E passa a ser:
- "este rebalance específico satisfaz a policy de compliance exigida para este mandato, nesta jurisdição, neste escopo, neste instante?"

### Implicação estratégica
Isso muda a narrativa dos 3 tracks ao mesmo tempo:

#### 1. Pulso hackathon
Não é "ZK de solvência".
É:
- **execução institucional condicionada por policy verificável**;
- um operador não rebalanceia porque quer;
- ele rebalanceia porque um predicado verificável permitiu aquele intent exato.

#### 2. ZK Stellar hackathon
Não é "temos Groth16 no Soroban".
É:
- **Stellar contracts can require a proof tied to a single live execution intent**.

#### 3. GTM
Não é "compliance analytics".
É:
- **compliance-gated execution**;
- a policy fica no caminho da ação privilegiada;
- a prova é o mecanismo de autorização, não um dashboard paralelo.

---

## Troca de predicado: de PoR para compliance/policy

## O que NÃO fazer
Não trocar direto para um circuito regulatório maximalista com 15 variáveis, múltiplas jurisdições, scoring complexo, oráculos e governance embutida.

Isso seria overengineering.

## O que fazer
Trocar o predicado por um **predicado mínimo, institucionalmente legível e compatível com o lane atual**.

### Predicado recomendado v1

**Nome de trabalho:** `policy_threshold_bn254`

### Statement
O prover conhece um witness privado que demonstra que a operação satisfaz uma policy agregada mínima.

Forma sugerida:
- `policy_score >= min_threshold`
- `jurisdiction_code_commit` consistente com a policy alvo
- `mandate_commit` consistente com o mandato/vault alvo
- `context` igual ao `zk_context` derivado do intent hash

### Witness privado sugerido
- `policy_score`
- `jurisdiction_code` (ou representação numérica/committed)
- `mandate_hash_preimage` / campos privados do mandato
- eventualmente `risk_bucket` ou `counterparty_class`

### Sinais públicos sugeridos
Manter shape mínimo e estável:
- `policy_pass` (0/1)
- `policy_commit`
- `context`

ou, se quiser um pouco mais de legibilidade on-chain sem inflar demais:
- `policy_pass`
- `policy_commit`
- `jurisdiction_tag`
- `context`

### Recomendação prática
**Ficar em 3 sinais públicos** na v1:
- `[policy_pass, policy_commit, context]`

Motivo:
- preserva quase intacta a ergonomia do gate atual;
- reaproveita o binding em `pub_signals[0]` e `pub_signals[2]`;
- troca apenas o significado econômico/legal do predicado;
- reduz risco de mexer demais no lane live antes do hackathon.

---

## Como mapear `policy_commit`

`policy_commit` não deve ser vendido como "o regulamento inteiro on-chain".

Ele deve ser descrito como um commitment compacto para a policy que foi avaliada off-chain/privadamente, por exemplo um Poseidon de:
- `jurisdiction_code`
- `policy_version`
- `mandate_class`
- `risk_bucket`
- `counterparty_class`
- `threshold`

Assim, o que fica público é:
- a operação executada,
- o `context` que a ancora,
- o fato de que a policy passou,
- e um commitment que permite reconciliação/auditoria posterior.

---

## Ajuste mínimo no gate

O gate não precisa virar engine de policy.

Ele só precisa continuar fazendo 4 coisas:
1. derivar o intent hash canônico;
2. derivar o `zk_context`;
3. verificar a prova contra verifier/VK pinados;
4. impor duas invariantes do lane:
   - `pub_signals[0] == 1`
   - `pub_signals[last] == expected_context`

### Conclusão importante
O gate deve permanecer **agnóstico ao conteúdo semântico detalhado da policy**.

Quem carrega a semântica da policy é o circuito + VK pinada.

Isso é bom porque:
- evita overengineering no contrato Soroban;
- mantém o lane canônico estável;
- permite trocar a policy ao trocar verifier/VK de forma governada.

---

## Proposta de naming

Para sair da semântica de solvência, eu sugiro:

### Use case / lane
- `pulso_zk_policy`
- `df_policy_zk_v1`
- `inst_exec_policy_v1`

### Scope live
- `zk_policy_rebalance`

### Circuito
- `policy_threshold_bn254.circom`
- ou `compliance_intent_policy.circom`

Meu favorito para o momento:
- circuito: `compliance_intent_policy.circom`
- lane: `pulso_zk_policy`
- scope: `zk_policy_rebalance`

Porque comunica melhor a tese real.

---

## Corte honesto de escopo

### V1 do circuito deve provar apenas:
- que uma policy agregada passou (`policy_pass = 1`);
- que ela está comprometida em `policy_commit`;
- que está atada ao `context` do intent.

### V1 NÃO deve provar ainda:
- compliance multi-jurisdição completa;
- MiCAR + LGPD + CVM no mesmo circuito;
- árvore de regras generalizada;
- policy DSL on-chain;
- múltiplos operadores/segregação complexa;
- envelope de transação completo.

---

## Arquitetura alvo em uma frase

> **The DeFindex lane is no longer a solvency demo. It is a proof-bound execution lane where a compliance policy proof authorizes a single scoped institutional action.**

---

## Próximo passo recomendado

1. manter o gate praticamente igual;
2. trocar o circuito PoR por um circuito de `policy >= threshold` atado ao mesmo `context`;
3. regenerar proof/VK/verifier fixtures;
4. repetir o mesmo live slice com `pulso_zk_policy`;
5. empacotar Pulso / ZK / GTM em cima desse mesmo lane.

Esse é o movimento certo.
Não ampliar a superfície do gate agora.