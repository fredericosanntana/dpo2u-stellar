# Pulso — Video Shooting Runbook (operacional)

**Objetivo:** gravar o vídeo final do Pulso em 90–120s sem improviso, usando apenas evidência já validada no repo.  
**Base narrativa:** `docs/submissions/PULSO-VIDEO-SCRIPT.md`  
**Base probatória:**
- `docs/S4-LIVE-REGISTRY-TO-SPP-REPORT.md`
- `docs/S8-EXTERNAL-ASP-BOUNDARY-REPORT.md`
- `docs/DEFINDEX-PROOF-BOUND-EXECUTION-LIVE-SLICE.md`
- `docs/submissions/PULSO-FINAL-SUBMISSION-PACK.md`

---

## 1. Setup de gravação

### Janela 1 — roteiro
Abrir:
- `docs/submissions/PULSO-VIDEO-SCRIPT.md`

### Janela 2 — evidência principal
Abrir:
- `docs/S4-LIVE-REGISTRY-TO-SPP-REPORT.md`

### Janela 3 — boundary honesto
Abrir:
- `docs/S8-EXTERNAL-ASP-BOUNDARY-REPORT.md`

### Janela 4 — supporting evidence
Abrir:
- `docs/DEFINDEX-PROOF-BOUND-EXECUTION-LIVE-SLICE.md`

### Configuração visual recomendada
- editor/preview com fonte grande;
- zoom de 125–150%;
- terminal escuro ou markdown preview limpa;
- evitar trocar de app demais;
- manter cursor calmo, sem scroll nervoso.

---

## 2. Estrutura do take único

## 0–10s — Hook
### Fala
> Privacy without compliance doesn't scale. But compliance that re-exposes user data defeats the whole point. At DPO2U, we solve that on Stellar — with positive credentials.

### Tela
- abrir `docs/submissions/PULSO-FINAL-SUBMISSION-PACK.md`
- deixar visível:
  - título
  - seção `Claim canônica curta`

### Movimento
- começar no topo;
- dar um micro-scroll até a claim curta;
- parar.

### Objetivo visual
Ancorar imediatamente que existe uma tese clara e curta.

---

## 10–25s — O que a DPO2U é
### Fala
> So what is DPO2U? Think of it as compliance turned into a protocol. We don't run KYC on-chain, and we never put personal data on-chain. Instead, we take a compliance decision that already happened upstream, and we turn it into a credential anyone can verify.

### Tela
- continuar em `PULSO-FINAL-SUBMISSION-PACK.md`
- deixar visível:
  - seção `O que dizer em uma frase`
  - começo de `Claim permitida`

### Ênfase
- pausar levemente em `never put personal data on-chain`

### Objetivo visual
Reforçar privacidade + verificabilidade sem parecer “KYC on-chain”.

---

## 25–50s — O que a integração faz
### Fala
> Here's how it works in this build. A canonical attestation registry decides whether a user qualifies — whether they belong to a positive set. If that attestation checks out, the ASP lane lets them in. And if the attestation gets revoked, they can't get back in.

### Tela
Trocar para `docs/S4-LIVE-REGISTRY-TO-SPP-REPORT.md`.

### Mostrar exatamente
1. seção `Resumo executivo`
2. bloco `Isso fecha três provas novas`
3. seção `Registry vivo criado`
4. seção `Attestation viva registrada`

### Pontos para pausar visualmente
- `deploy vivo do registry em testnet`
- `extração live da decisão canônica`
- `revogação canônica executada`
- `verify result = true`
- `active result = true`

### Objetivo visual
Fazer o reviewer entender que não é simulação local solta; houve registry real, attestation real e execução real.

---

## 50–80s — Mostrar o fluxo load-bearing
### Fala
> And this integration is load-bearing — it actually carries weight. The attestation result directly changes what a user can do inside the Stellar lane. This isn't decoration.

### Tela
Ainda em `docs/S4-LIVE-REGISTRY-TO-SPP-REPORT.md`.

### Mostrar exatamente
1. `Bridge live → SPP executado`
2. tabela da execução SPP
3. `Revogação canônica executada`
4. bloco `Efeito observado`

### Pausas visuais obrigatórias
- `insert tx`
- `root before`
- `root after`
- `verify_attestation_proof(...) == false`
- `is_attestation_active(...) == false`
- `nova tentativa de bridge falhou`

### Frase visual implícita
Entrou quando estava válido; bloqueou quando foi revogado.

### Objetivo visual
Provar o núcleo do Pulso: admissão real + revogação com efeito operacional.

---

## 80–100s — Boundary honesto + supporting slice
### Fala
> Now, let me be honest about the boundary. On the external, audited instance, we can read the state publicly — but we can't change it without the admin key. That's a governance boundary by design. It's not a gap in the integration. And separately, we've already proven a second live Stellar slice where a privileged DeFindex rebalance only executes after a proof bound to that exact intent passes on-chain.

### Tela parte A — boundary
Trocar para `docs/S8-EXTERNAL-ASP-BOUNDARY-REPORT.md`.

### Mostrar exatamente
- `Leitura pública funciona`
- `Escrita falha sem a key do admin`
- a mensagem:
  - `Missing signing key for account ...`

### Tela parte B — supporting slice
Trocar para `docs/DEFINDEX-PROOF-BOUND-EXECUTION-LIVE-SLICE.md`.

### Mostrar exatamente
- `What this slice proved live`
- `The first policy-bound rebalance executed live`
- `Post-execution state confirmed the effect on-chain`

### Pausas visuais obrigatórias
- `Factory tx`
- `New vault`
- `Rebalance tx`
- `idle 1, invested 999, total 1000`

### Objetivo visual
Mostrar duas coisas ao mesmo tempo:
1. honestidade sobre o boundary externo;
2. profundidade técnica adicional já provada em Stellar.

---

## 100–120s — Close
### Fala
> So that's DPO2U. We make private flows on Stellar credibly compliant, composable, and auditable — without ever putting personal data on-chain. For Pulso, that means the admission primitive is real. And for the broader Stellar story, proof-bound execution is already live.

### Tela
Voltar para `docs/submissions/PULSO-FINAL-SUBMISSION-PACK.md`.

### Mostrar exatamente
- `Claim canônica curta`
- `Claim permitida`
- `Claim proibida` (rápido, só para fechar com honestidade)

### Objetivo visual
Encerrar com tese + disciplina de claim.

---

## 3. Ordem operacional recomendada de abertura

Se quiser gravar com zero improviso, abrir nessa ordem antes de começar:

1. `docs/submissions/PULSO-FINAL-SUBMISSION-PACK.md`
2. `docs/S4-LIVE-REGISTRY-TO-SPP-REPORT.md`
3. `docs/S8-EXTERNAL-ASP-BOUNDARY-REPORT.md`
4. `docs/DEFINDEX-PROOF-BOUND-EXECUTION-LIVE-SLICE.md`
5. `docs/submissions/PULSO-VIDEO-SCRIPT.md`

---

## 4. Corte mínimo se precisar cair para ~90s

Se o take passar do tempo:
- encurtar a seção `O que a DPO2U é`;
- no bloco S4, mostrar menos tx hashes e mais headings;
- no supporting slice DeFindex, mostrar só:
  - `Rebalance tx`
  - `idle 1, invested 999, total 1000`

Não cortar:
- revogação com efeito;
- boundary honesto;
- frase final sobre proof-bound execution.

---

## 5. Erros a evitar na gravação

- não dizer que a instância externa é operável por nós sem admin;
- não dizer que a DPO2U faz KYC dentro da DeFindex;
- não vender o supporting slice DeFindex como claim principal do Pulso;
- não dizer `production-ready`;
- não abrir telas irrelevantes do repo no meio do take.

---

## 6. Checklist pré-gravação

- [ ] fonte ampliada e markdown legível
- [ ] abas já abertas na ordem do take
- [ ] áudio testado
- [ ] script à vista
- [ ] duração alvo: 100–110s
- [ ] terminar com a claim curta do pack final
