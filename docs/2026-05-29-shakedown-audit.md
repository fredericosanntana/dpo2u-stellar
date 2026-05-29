# Shake-down de prontidão mainnet — dpo2u-stellar (2026-05-29)

**Propósito.** O deploy mainnet do `dpo2u-stellar` será o **comprovante de atestação técnica**
do projeto. Este relatório é parte desse comprovante: registra a auditoria adversarial de
prontidão, o que foi corrigido, o que foi conscientemente adiado, e os gaps tratados em trilha
separada. **Honestidade > marketing** (não há overstatement).

**Método.** 3 explorações adversariais paralelas (x402-scoping, shake-down de contratos/scripts,
postura de produção do gateway/MCP) + verificação manual dos achados (git-tracking, toolchain,
reprodutibilidade de hash).

> Esta fase é **shake-down completo** (faz/corrige tudo). O **deploy on-chain é fase separada**.

## Veredito
**dpo2u-stellar pronto para a fase de deploy**, gated em: shake-down 100% verde (✅ abaixo) +
5 pubkeys Freighter + top-up XLM + "go" + frase de confirmação. Os achados reais foram corrigidos;
os gaps remanescentes são (a) conscientemente adiados (cerimonial pesado) ou (b) tratados em trilha
separada (higiene de segredos do `/root/DPO2U`, que **não** contamina o comprovante — o repo
`dpo2u-stellar` está limpo de segredos).

## Estado verde (verificável)
- Contratos: **16/16** (`cargo test`; 10 attestation + 6 zk-verifier, inclui testes defensivos).
- SDK: **51/51** · Pilot-gateway: **122/122** · MCP: **519/519** (7 skipped).
- Build **reproduzível** com toolchain pinado: `d706a07161…d7595` (attestation) e `4af767bb…a9a0`
  (zk) — idênticos ao já em testnet.
- ZK: VK da cerimônia (drand 6153120) verifica on-chain (`test_ceremony.rs`); boot do gateway
  faz fail-closed se a VK for adulterada (`assertCanonicalVk`, hash `9f6fab1e…1ed3`).

## Achados e status

### Corrigidos nesta fase
| ID | Sev | Achado | Correção |
|----|-----|--------|----------|
| TOOLCHAIN | P1 | Sem `rust-toolchain.toml` → hash não-reproduzível | `rust-toolchain.toml` (1.95.0) + versões documentadas; rebuild reproduz os 2 hashes |
| A1 | P1 | `configure-mainnet-usecases.sh` engolia erros (`>/dev/null 2>&1`) | fail-fast por invoke (stderr capturado) + `.checkpoint` + `RESUME_FROM` |
| A2 | P1 | `MAINNET_ATTESTATION_CONTRACT_ID` vazio pós-deploy | `deploy-mainnet-pilot.sh` auto-popula via `sed` + rebuild do SDK |
| A3a | P2 | Deploy sem retry (RPC transiente) | `run_retry` (backoff) nos 2 deploys |
| A3b | P2 | Faltava teste de `MalformedVerifyingKey` | teste `rejects_malformed_vk_signal_count_mismatch` (zk 6/6) |
| C1 | P1 | `API_KEY_SECRET` aceitava defaults fracos | sentinel cobre `change-me`/`dev-only-insecure-secret`; exit(1) em produção |
| C2 | P1 | VK canônica sem checagem de integridade no boot | `assertCanonicalVk()` no `createApp()` (fail-closed) + teste |

### Recalibrados (NÃO eram bloqueadores)
- zk-verifier `lib.rs:77` `vk.ic.get(0).unwrap()`: **guardado** pelo length-check (`pub_signals.len()+1 == ic.len() ≥ 1`) — seguro. Coberto agora por teste defensivo.
- attestation `lib.rs:169` `admin()` `.expect()`: **pós-deploy impossível** — o `__constructor` roda no deploy e `AlreadyInitialized` impede reinit; o caminho "não inicializado" é inalcançável on-chain.
- `docs/RUNBOOK.md`: **existe** (o achado de "ausente" estava errado).
- 62 use cases em instance storage: ~5KB, muito abaixo do limite — sem risco.

### Conscientemente adiados (decisão "piloto enxuto")
- Auditoria externa de segurança (A3 do cerimonial), Ledger HW, multisig 2-of-3, DPIA/DPA assinados — fora do escopo do piloto enxuto; documentados em `mainnet-readiness-checklist.md` como trilha "full production".

### Tratar em trilha SEPARADA (não bloqueia o comprovante)
- **Segredos rastreados no git do `/root/DPO2U`** (NÃO em `dpo2u-stellar`, que está limpo):
  `.agent-smtp-credentials.env`, `02-Projects/active/$DPO2U/dpo2u-dao-interface/.env.local`,
  `self-funding-agent/.env-deployed`, `packages/compliance-engine/test/e2e/.env.e2e`. Ação:
  `git rm --cached` + **rotação humana** das chaves (SMTP/Lighthouse/TRANSPARENCIA/JWT). O
  `.gitignore` já cobre os padrões (untrack pendente porque foram commitados antes).
- **handlebars** (mcp-server): floor elevado p/ `^4.7.10` no `package.json`; rodar
  `npm update handlebars` p/ fixar no lockfile (sem CVE crítico aberto na 4.7.8 hoje).

## x402 (habilitado em ambas as superfícies)
- **Pilot-gateway**: `middleware/x402.ts` + `lib/facilitator-stellar.ts` (interface + StellarFacilitator HTTP + MockFacilitator) + `lib/payment-ledger.ts`; wired na rota de submissão, **gated por `X402_ENABLED=1`** (OFF por default — não altera comportamento atual). Settlement **Stellar USDC**. Tier ENTERPRISE isento. 6 testes (402→pagar→200, inválido, malformado, isenção, inerte-off).
- **MCP**: `x402-stellar.ts` + `requirePayment` estendido — short-circuit por `X-PAYMENT` (Stellar USDC) + opção Stellar no corpo do 402, mantendo o charge hospedado e os tiers. 4 testes.
- ⚠️ **A confirmar antes do go-live**: nome de pacote/endpoint exato do facilitator Built-on-Stellar (a implementação é protocolo-direto + facilitator plugável por `FACILITATOR_URL`; testada com mock). Há duplicação leve do protocolo entre gateway e MCP → unificar num pacote compartilhado é melhoria futura.

## Claim ZK honesto
A cerimônia de trusted setup teve **contribuidores externos/independentes** + **beacon público
drand** → **1-de-N honesto externo** (basta um contribuidor honesto ter descartado sua parcela
para o toxic waste ser irrecuperável). **Caveat residual:** as contribuições rodaram em
**máquinas proprietárias / mesma rede** — um comprometimento de infraestrutura que capturasse a
entropia de *todos* simultaneamente enfraqueceria a garantia; isso é **mitigado pelo beacon drand**
(aleatoriedade pública fora da rede DPO2U, aplicada após as contribuições). (Ver
`scripts/zk-ceremony/TRANSCRIPT.md`.)
