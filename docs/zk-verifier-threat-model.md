# Modelo de ameaças — contrato `zk-verifier` (A3)

> Preparação para auditoria externa do verificador Groth16/BLS12-381 on-chain
> (`contracts/zk-verifier/`, testnet `CBOOYCOU4USCWDKPRXFG4IVA7BLU6ILXD2OBTAMNBM3V3HKRVQC5FMNT`).
> Não substitui uma auditoria — a enquadra.

## Superfície

`verify_proof(vk: VerificationKey, proof: Proof, pub_signals: Vec<Fr>) -> bool`
— função única, **read-only**, sem estado, sem `storage`. Verifica a equação de
Groth16 via as host functions BLS12-381 do Soroban.

## Ameaças

### T1 — vk fornecida pelo chamador *(CRÍTICA — ✅ MITIGADO 2026-05-22)*
`verify_proof` recebe a `vk` como **parâmetro**. O contrato responde fielmente
"esta prova é válida para *esta* vk e *estes* sinais" — mas **não impõe qual vk**
é a canônica. Um cliente malicioso podia gerar o próprio par (vk, proof) e obter
`true` → atestação fraudulenta.
**Mitigação aplicada:** o gateway agora **fixa a vk canônica**
(`pilot-gateway/src/lib/canonical-vk.ts`); `verifyZkProof` usa sempre a
`CANONICAL_VK` e `resolveZkCompliance` ignora qualquer `vk` do payload do
cliente. Correção no commit
[`6afecb92`](https://github.com/fredericosanntana/DPO2U/commit/6afecb9246fab112099bb88c663faba21503cf47);
relatório em `2026-05-22-security-audit.md`. Resíduo: a vk fixada é a do setup
dev — substituída pela vk da cerimônia (T6). Defesa-em-profundidade futura: o
contrato armazenar a vk canônica por circuito (`configure`/admin).

### T2 — replay de prova *(MÉDIA — mitigado por A2)*
Uma prova válida poderia ser re-submetida para outra atestação. **Mitigado** pelo
binding `context` (2º sinal público = H(org, jurisdição, nonce)): a prova só
verifica para o `context` exato. Resíduo: dentro do *mesmo* context, a prova é
reutilizável — aceitável, pois o context já identifica a atestação.

### T3 — maleabilidade de prova *(BAIXA)*
Provas Groth16 são re-randomizáveis: dada uma prova válida, gera-se outra prova
válida distinta para os mesmos sinais. Não é falha de soundness. Implicação: o
`proof_hash` **não** é um identificador único de atestação — o identificador é o
`evidence_hash` (que inclui `context`). Não usar `proof_hash` como chave única.

### T4 — descasamento de nº de sinais públicos *(BAIXA — tratado)*
`verify_proof` checa `pub_signals.len() + 1 == vk.ic.len()` e retorna
`MalformedVerifyingKey` caso contrário. Sem leitura fora de limites.

### T5 — esgotamento de recurso *(BAIXA)*
Custo dominado pelo `pairing_check` (~30M CPU) + `g1_mul` por sinal (~2,5M).
Com 2 sinais, ~41M de 100M — folgado. N grande de sinais poderia estourar o
budget, mas o circuito DPO2U tem N fixo = 2. Sem loop não-limitado.

### T6 — toxic waste do trusted setup *(ALTA — fora do contrato)*
Se o segredo do setup vazar, forjam-se provas que passam em T1-honesto. **Não é
ameaça do contrato** — é do setup. Endereçada pela cerimônia MPC
(`zk-trusted-setup-runbook.md`). Enquanto a seed fixa estiver em uso, considerar
o sistema **dev-only**.

## Checklist de prontidão para auditoria

- [ ] **T1 resolvido** — gateway fixa a vk canônica (ou o contrato a armazena).
      *Bloqueador de produção.*
- [ ] **T6 resolvido** — cerimônia de trusted setup executada.
- [ ] Verificador re-deployado a partir de fonte auditada (hash do wasm
      registrado).
- [ ] Testes de soundness: prova inválida → `false`; sinais trocados → `false`;
      vk malformada → erro. (Cobertos em `contracts/zk-verifier/src/test.rs` e
      em `pilot-gateway` `zk-verify.test.ts`.)
- [ ] Revisão da serialização uncompressed dos pontos (G1 96B / G2 192B) contra
      a especificação das host functions BLS12-381 do Soroban.
- [ ] Confirmar imutabilidade desejada vs. necessidade de upgrade do verificador.

## Resumo

O contrato é uma primitiva de verificação **correta e mínima**. O risco real de
produção **não está na equação de Groth16** — está em (T1) garantir que a vk é a
canônica e (T6) na cerimônia de setup. Ambos são endereçáveis fora do contrato,
na camada de orquestração e de processo.
