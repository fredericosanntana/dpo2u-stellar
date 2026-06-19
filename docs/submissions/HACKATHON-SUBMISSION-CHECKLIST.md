# Hackathon Submission Checklist — Pulso + Real-World ZK on Stellar

## Veredito executivo

| Frente | Status agora | Falta para submeter |
|---|---|---|
| **Pulso Hackathon** | **quase pronta** | README raiz alinhado, deck final, gravação do vídeo de 90–120s |
| **Real-World ZK on Stellar** | **quase pronta** | vídeo de 2–3 min e write-up final com claims calibradas |
| **GTM da solução** | **não é blocker de submissão** | definir wedge, ICP e narrativa de category creation pós-hackathon |

## Evidência técnica já validada nesta auditoria

```bash
cargo test -p protocol-registry -p asp-mvp -p pool-adapter-mock
cargo test -p privacy-pool -p zk-verifier
```

Resultado observado em 2026-06-19:
- `protocol-registry`: **21/21**
- `asp-mvp`: **11/11**
- `pool-adapter-mock`: **11/11**
- `privacy-pool`: **8/8**
- `zk-verifier`: **6/6**

## 1. Pulso Hackathon

### O que já temos
- repo open-source;
- README público agora alinhado à tese atual;
- integração Stellar load-bearing documentada;
- live registry -> SPP lane com evidência e txs públicas;
- replayable runbook;
- boundary honesto da instância externa já explicitado.

### Gaps restantes
- [ ] gravar vídeo final de 90–120s;
- [ ] transformar `PULSO-PITCH-DECK.md` / `PULSO-PITCH-DECK.html` em slides finais ou usar o HTML diretamente no pitch;
- [ ] decidir qual demo será gravada como canonical take;
- [ ] anexar links finais do deck/vídeo na submissão.

### Claim permitida
> A DPO2U opera uma lane verificável em Stellar que transforma uma decisão canônica de atestação em admissão ou bloqueio operacional no conjunto positivo, com revogação efetiva e boundary honesto de governança.

### Claim proibida
- “integramos permissionlessly a instância externa oficial sem dependência de admin”;
- “pool production-ready”;
- “governança descentralizada completa”.

## 2. Real-World ZK on Stellar

### O que já temos
- proof BN254/Groth16 real;
- root history real;
- nullifier real;
- testes de verificação on-chain passando;
- lane stateful de deposit/withdraw simbólico no `privacy-pool`.

### Gaps restantes
- [ ] gravar vídeo final de 2–3 min;
- [ ] publicar write-up final puxando a tese de private compliance / positive credentialing;
- [ ] opcional: screenshot/clip do teste ou runbook visual para reforçar submission page.

### Claim permitida
> A DPO2U já demonstra em Soroban uma lane ZK load-bearing com membership proof real, root history e nullifier real, aplicada ao problema de credencial positiva para private compliance.

### Claim proibida
- “anonymity set de produção”;
- “custody/value-moving pool pronto para mainnet”;
- “cerimônia final/MPC final para todo o stack”.

## 3. GTM da solução

### Papel correto do GTM agora
O GTM **não** deve abrir uma plataforma inteira. Deve amplificar o wedge validado no hackathon.

### Wedge
> **Positive compliance credential for private finance on Stellar.**

### ICP inicial
1. privacy-preserving payments infra;
2. stablecoin / settlement operators que precisam de compliance sem reexpor PII;
3. issuers / pools / institution-grade builders em Stellar.

### Entregáveis GTM mínimos pós-submissão
- [ ] one-liner canônica;
- [ ] landing / memo curto com tese;
- [ ] 10 contas/alvos de outreach;
- [ ] 3 conversas com parceiros potenciais;
- [ ] FAQ para judges / partners / auditors.

## Ordem de execução recomendada

1. **Gravar vídeo Pulso** com base em `PULSO-VIDEO-SCRIPT.md`.
2. **Gravar vídeo ZK** com base em `ZK-VIDEO-SCRIPT.md`.
3. **Transformar deck markdown em slides**.
4. **Publicar links finais e submeter**.

## Definição das 3 vertentes

| Vertente | Objetivo | O que prova | Não-objetivo agora |
|---|---|---|---|
| **Pulso Hackathon** | vencer no critério de integração | Stellar load-bearing composability | resolver governança final da instância externa |
| **ZK Stellar** | vencer no critério de profundidade | ZK load-bearing com proof path real | production pool completo |
| **GTM da solução** | transformar a vitória em pipeline | categoria e wedge claros | operação comercial pesada antes da tese cristalizar |
