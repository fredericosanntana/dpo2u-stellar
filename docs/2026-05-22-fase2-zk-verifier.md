# Fase 2 — verificação ZK on-chain no Soroban (score privado, prova pública)

> Execução da Fase 2 do plano "dpo2u-stellar oferece B2B (dual-chain, ZK
> preservado)". O spike confirmou GO; esta fase entrega o substrato técnico
> funcionando — um verificador Groth16/BLS12-381 que roda **on-chain no Soroban**.
>
> - Data: 2026-05-22
> - Verificador testnet: `CBOOYCOU4USCWDKPRXFG4IVA7BLU6ILXD2OBTAMNBM3V3HKRVQC5FMNT`

## O problema

O produto B2B verifica provas ZK on-chain. No Solana isso usa o precompile
`alt_bn128` (curva BN254). O Soroban **não tem** esse precompile — mas o
Protocol 22 (CAP-0059) adicionou host functions **BLS12-381**. A Fase 2 portou
a verificação para esse caminho.

## O que foi entregue

### Prover — `zk-prover/`

Crate Rust (arkworks) que prova o enunciado **"score privado, prova pública"**:

- Circuito `score >= threshold`: o detentor conhece um `score` (witness
  **privado**) e prova que `score >= threshold` (`threshold` é o único sinal
  **público**), sem revelar o score. A prova decompõe `score - threshold` em
  bits — só possível se `0 <= diff < 2^8`, logo `score >= threshold`.
- `Groth16::<Bls12_381>` — setup + prove. Verifica off-chain antes de emitir.
- Saída: vk + proof + sinal público em hex uncompressed — o formato que o
  contrato consome direto (`G1Affine::from_array`).

### Verificador — `contracts/zk-verifier/`

Contrato Soroban que verifica a prova **on-chain** via `env.crypto().bls12_381()`:

- `verify_proof(vk, proof, pub_signals) -> bool` — a equação canônica de Groth16
  `e(-A,B)·e(α,β)·e(vk_x,γ)·e(C,δ) == 1`, com `pairing_check` nativo.
- Wasm 6.166 bytes. Budget de uma verificação ≈ 41M de 100M CPU (1 sinal
  público; cada sinal extra ≈ +2,5M) — cabe folgado.

### Verificação ponta-a-ponta — testnet

Prova **real** gerada pelo `zk-prover` (score=85 **privado**, threshold=70
**público**) verificada no contrato deployado:

| Invocação | Sinal público | Resultado |
|---|---|---|
| `verify_proof` (prova válida) | threshold = 70 | **`true`** ✅ |
| `verify_proof` (sinal adulterado) | threshold = 71 | **`false`** ✅ |

O `score` (85) **nunca** aparece on-chain — só a prova e o threshold. "Score
privado, prova pública" — preservado no Stellar. Os 2 testes de integração do
contrato (prova real no host Soroban) passam.

- Deploy tx: [`334cace8…`](https://stellar.expert/explorer/testnet/tx/334cace86529e5036479ba8342f1043336a5c0246d86a30e1e67ec9e7dc6843f)
- Wasm hash: `5d411dca81e693319a20d6675b443f4379c43eed72889c96c78234d7b258b170`

## Resta da Fase 2

O substrato funciona. Para produção falta:

1. **Cerimônia de trusted setup** — o Groth16 exige um setup por circuito; a
   `vk` desta demo veio de um setup com seed fixa (reprodutível, **não** seguro
   para produção). Produção exige uma cerimônia multi-party.
2. **Auditoria de segurança** do contrato verificador.
3. **Circuito v2 — binding ao compromisso** — hoje o circuito prova só
   `score >= threshold`; falta amarrar a prova a um compromisso da atestação
   (`commitment = hash(score, salt)`) para impedir reuso de prova.
4. **Wiring `zk_compliance_v1`** — um use case de atestação em que o gateway
   exige uma prova ZK verificada (chamada ao `zk-verifier`) antes de selar.

## Wiring — use case `zk_compliance_v1` ✅

O verificador foi conectado ao fluxo de atestação. O use case `zk_compliance_v1`
(UC-B9) fecha a cadeia inteira:

```
zk-prover (prova)  →  contrato zk-verifier (verifica ON-CHAIN)  →
   predicado zk_compliance_v1  →  contrato de atestação (sela o veredito)
```

- PredicateSet `zk_compliance_v1` (Z1 organização+jurisdição · Z2 prova presente
  · Z3 prova verificada on-chain) + evaluator `evaluateZkCompliance`.
- `pilot-gateway/src/lib/zk-verify.ts` — a ponte: `verifyZkProof()` invoca o
  contrato `zk-verifier`. O `evidence.zk_verified` **só** vem daqui — nunca do
  cliente (senão a prova seria forjável).
- `scripts/run-zk-compliance.ts` — orquestrador E2E.
- Configurado no contrato de atestação: tx `829de719…`.

**Demo E2E (testnet):** a prova real (score=85 privado, threshold=70 público)
foi verificada on-chain pelo `zk-verifier` → `zk_compliance_v1` avaliou **PASS**
→ atestação **selada** (tx [`aaf6b31c…`](https://stellar.expert/explorer/testnet/tx/aaf6b31c5acd88f81bd6872b2d7f24c8d6bdf12cbb0ea51e70dd7c9e0f175ca2))
→ `verify_attestation` confirma `Pass`. O score nunca apareceu on-chain.

Falta só plugar o `verifyZkProof` na rota `routes/attestation.ts` do gateway
(o módulo já é gateway-usável) — mecânico, exige redeploy do container.

## Conclusão

A questão de risco da Fase 2 — "dá para verificar ZK on-chain no Soroban?" —
está respondida com um artefato funcionando em testnet. O caminho BLS12-381 é
viável, o budget cabe, a ponte arkworks→Soroban está resolvida, e o use case
`zk_compliance_v1` sela atestações de "score privado, prova pública" ponta-a-ponta.
