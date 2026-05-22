# Auditoria de segurança — pipeline DPO2U-Stellar (2026-05-22)

> Auditoria interna do pipeline (contratos Soroban + Pilot Gateway + tools MCP).
> O documento `SECURITY_AUDIT.md` é o *escopo de pré-engajamento* para uma firma
> externa — permanece o caminho para a auditoria independente. Este relatório é
> a revisão interna que **encontrou, corrigiu e documentou** o achado crítico.

## Escopo e método

| Superfície | Revisado |
|---|---|
| Contrato `anticorruption-attestation` (testnet) | registro/verificação de atestação, autorização de submitter |
| Contrato `zk-verifier` (testnet) | equação de Groth16, sinais públicos, limites de recurso |
| Pilot Gateway | `predicates`, rota `/api/v1/attestation/submit`, `resolveZkCompliance`, `zk-verify` |
| Tools MCP | `submit_attestation_stellar`, `build_compliance_evidence` |

Método: revisão de código manual orientada pelo threat model
`zk-verifier-threat-model.md`, com foco no caminho de confiança da camada B2B ZK
(score privado, prova pública).

---

## 🔴 Achado crítico — T1: verifying key fornecida pelo cliente

### Vulnerabilidade

No gateway, `resolveZkCompliance` (`pilot-gateway/src/routes/attestation.ts`)
verificava a prova ZK passando a **verifying key vinda de
`evidence.zk_proof.vk`** — um campo **controlado pelo cliente** — ao contrato
verificador:

```ts
// ANTES (vulnerável)
zkVerified = await verifyZkProof({ vk: zk.vk, proof: zk.proof, pubSignals: [...] });
```

O contrato `verify_proof` é uma primitiva correta: responde fielmente "esta
prova é válida para *esta* vk". Mas **não impõe qual vk é a canônica** — e o
gateway tampouco. A vk efetiva era escolhida pelo solicitante.

### Risco — CRÍTICO (bypass de soundness)

Um cliente malicioso:

1. Gera o **próprio** trusted setup para um circuito trivial (ex.: que "prova"
   qualquer coisa) → obtém um par `(vk_atacante, proof_atacante)`.
2. Submete `zk_compliance_v1` com `evidence.zk_proof.vk = vk_atacante`.
3. O gateway verifica a prova **contra a vk do atacante** → `verify_proof`
   retorna `true` → `zk_verified: true`.
4. Uma atestação de **"conformidade verificada em zero-knowledge"** é selada
   on-chain — **sem o atacante jamais ter tido score ≥ threshold**.

Impacto: derrota total da propriedade de segurança da camada B2B ZK. Qualquer
parte poderia cunhar atestações de conformidade fraudulentas, verificáveis
on-chain. Severidade **Crítica** (CVSS-equivalente: alta — integridade
comprometida, sem privilégio prévio, sem interação).

### Correção

A vk **canônica** do circuito DPO2U passa a ser **fixada no gateway**, jamais
aceita do cliente:

- **`pilot-gateway/src/lib/canonical-vk.ts`** (novo) — a `CANONICAL_VK`
  versionada no reppositório, referência única de confiança.
- **`verifyZkProof`** — `vk` removida de `VerifyZkOpts`; a função usa
  **sempre** a `CANONICAL_VK` (sem parâmetro de override — sem footgun).
- **`resolveZkCompliance`** — deixa de ler `evidence.zk_proof.vk`; o cliente
  envia apenas `proof`. Sela `zk_vk_pinned: true` + `zk_vk_hash` (sha256 da vk)
  para auditabilidade.
- **Teste de regressão** — confirma que uma vk adulterada injetada no payload
  do cliente é **ignorada**: o gateway verifica com a canônica.

**Commit da correção:**
[`6afecb92`](https://github.com/fredericosanntana/DPO2U/commit/6afecb9246fab112099bb88c663faba21503cf47)
— `security: corrige achado critico T1 — vk fixada no gateway`
(branch `chore/install-eval-hardening-2026-05-11`).

### Verificação

- `npm run build` do pilot-gateway — verde.
- Suíte de testes — **65/65 verde**, incluindo:
  - `verifyZkProof` (sem vk de entrada) aceita a prova real contra a vk
    canônica → `true`;
  - `resolveZkCompliance` com `zk_proof.vk` adulterada → **ignorada**,
    `zk_verified: true` resolvido pela vk canônica;
  - rejeição de `context`/`threshold` adulterados mantida.

### Resíduo

A `CANONICAL_VK` atual provém do setup com seed fixa (dev). A confiança plena
depende da **cerimônia de trusted setup** (achado T6 / `zk-trusted-setup-runbook.md`):
quando a cerimônia rodar, a constante é substituída pela vk cerimonial. O
*mecanismo* de pinning — que fecha T1 — já está em produção; o *valor* fixado é
atualizado pós-cerimônia.

---

## Achados de menor severidade

Já enumerados em `zk-verifier-threat-model.md`; sem ação de código nesta rodada:

| Id | Severidade | Estado |
|---|---|---|
| T2 — replay de prova | Média | **Mitigado** pelo binding `context` (A2) |
| T3 — maleabilidade de prova Groth16 | Baixa | Não-soundness; `proof_hash` não é id único (usa-se `evidence_hash`) |
| T6 — toxic waste do trusted setup | Alta (de processo) | Runbook de cerimônia entregue; pendente execução |
| Bypass `PILOT_DEMO_API_KEY` | Média | Aceitável em dev; **nunca setar em produção** — recomenda-se assert quando `NODE_ENV=production` |
| Contrato single-sig (admin/submitter) | Média | Hardening C8 — multisig nativo Stellar para mainnet |

---

## Conclusão

Um achado **crítico** (T1) foi encontrado, **corrigido e verificado** nesta
rodada — o bypass de soundness da camada ZK está fechado. Os demais itens são de
severidade menor ou de processo (cerimônia, multisig), já rastreados. A auditoria
externa independente (`SECURITY_AUDIT.md`) segue recomendada antes do mainnet,
agora partindo de uma base com o achado crítico já sanado.
