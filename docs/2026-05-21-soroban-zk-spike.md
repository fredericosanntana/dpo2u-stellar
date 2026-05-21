# Spike — verificação ZK on-chain no Soroban (workstream C)

> Spike do plano "dpo2u-stellar oferece B2B (dual-chain, ZK preservado)".
> Pergunta: é viável preservar o "score privado, prova pública" no Stellar, com
> verificação de prova ZK **on-chain**?
>
> - Data: 2026-05-21
> - **Veredito: GO.**

## Contexto

O produto B2B (hoje no Solana) verifica provas ZK on-chain via o precompile
`alt_bn128` do Solana (curva BN254) — SP1 v6 → Groth16. O Soroban **não tem**
esse precompile. A questão do spike: o Soroban tem cripto suficiente para
verificar uma prova ZK on-chain?

## Achado

**Sim — e é caminho oficial e exemplificado.**

- O **Protocol 22 do Stellar** (CAP-0059, início de 2025) adicionou **11 host
  functions BLS12-381** ao Soroban: aritmética de campo, operações de curva
  (G1/G2) e **pairing** — exatamente o que zk-SNARKs exigem.
- Existe um **exemplo oficial `stellar/soroban-examples/groth16_verifier`** — um
  verificador Groth16 sobre **BLS12-381** rodando como contrato Soroban
  (traduzido do verificador Solidity auto-gerado; consome `proof.json` +
  `verification_key.json` + `public.json`).
- A Stellar promove ativamente verificação ZK on-chain — "Prototyping Privacy
  Pools on Stellar", "ZK Proof Verification Onchain" (fev/2026).
- O esquema confirmado: **Groth16 sobre a curva BLS12-381**, suportado pelo Soroban.

## Implicação para o workstream C

O custo-cabeça do plano (preservar o ZK) **deixa de ser pesquisa e vira
engenharia conhecida**:

1. **Verificador on-chain** — adaptar o `groth16_verifier` oficial como contrato
   Soroban de produção: regenerar a `verification_key` para o circuito DPO2U,
   endurecer e **auditar** (o exemplo é demo, não auditado).
2. **Circuito do prover** — reconstruir o enunciado `score ≥ threshold` como um
   circuito **Groth16 sobre BLS12-381** (circom/snarkjs ou arkworks/gnark),
   substituindo o caminho SP1→RISC-V→BN254. O enunciado é simples (abertura de
   compromisso + comparação) — um circuito escrito à mão é o ferramental certo
   (não exige uma VM RISC-V para provar "x ≥ t").
3. **Re-cablar** o prover off-chain (`dpo2u-solana/zk-circuits/`) para emitir a
   prova BLS12-381.

## Riscos remanescentes (não bloqueiam o GO)

- O exemplo oficial é **demonstração, não auditado** — produção exige
  verificador endurecido + auditoria de segurança.
- **Limites de recurso do Soroban** (CPU/memória) para o pairing — não
  detalhados na doc; validar com um deploy de teste do exemplo na testnet
  (o próprio fato de o exemplo existir indica que cabe nos limites).
- A generalidade do SP1 (provar qualquer programa RISC-V) é perdida — aceitável:
  o enunciado de compliance é simples e um circuito dedicado é melhor.

## Conclusão

Workstream C é **viável e de risco controlado**. O plano da Fase 2 segue sem o
fallback ("atestação simples / ZK híbrido por tier") — embora ele permaneça
como rede de segurança caso a auditoria/limites de recurso surpreendam.

## Fontes

- [Announcing Protocol 22 — Stellar](https://stellar.org/blog/developers/announcing-protocol-22)
- [CAP-0059 — Host functions for BLS12-381](https://github.com/stellar/stellar-protocol/blob/master/core/cap-0059.md)
- [stellar/soroban-examples — groth16_verifier](https://github.com/stellar/soroban-examples/tree/main/groth16_verifier)
- [Prototyping Privacy Pools on Stellar](https://stellar.org/blog/ecosystem/prototyping-privacy-pools-on-stellar)
