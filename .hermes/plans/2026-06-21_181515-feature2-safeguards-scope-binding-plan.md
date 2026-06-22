# Feature 2 — Safeguards scope binding implementation plan

> **Para Hermes:** executar depois desta sprint de operator admission, mantendo o mesmo padrão anti-overclaim e TDD estrito.

**Goal:** endurecer o `SafeguardsEvidencePayload` para que o gateway não valide só a postura abstrata (`PASS/FAIL/REVIEW`, PoR, segregation, incident, expiry), mas também o **alvo correto** da ação privilegiada: operador e vault corretos.

**Architecture:** reutilizar o padrão já aplicado em `operator admission`: bind mecânico, fail-closed e narrow. Em vez de criar uma plataforma IAM/safeguards, evoluir o `DefindexPolicyGateway` para negar quando os safeguards apresentados não correspondem ao vault/operador esperados pela ação em curso.

**Tech Stack:** TypeScript, Vitest, SDK/gateway local em `sdk/src`, docs em `docs/`.

---

## 1. Contexto atual

Hoje `evaluateSafeguards(...)` já nega quando encontra:
- `requiredRole` divergente,
- `verdict = FAIL|REVIEW`,
- `proofOfReserveStatus !== PASS`,
- `segregationStatus !== PASS`,
- `incidentStatus = OPEN`,
- `validUntil` expirado.

Mas **ainda não** faz bind mecânico de:
- `safeguards.vault` ao vault da ação solicitada;
- `safeguards.operatorId` ao operador/caller responsável pela ação.

Isso deixa um gap institucional óbvio: um payload de safeguards "bom" poderia, em tese, ser apresentado para o vault ou operador errado.

---

## 2. Resultado que a feature 2 deve entregar

Depois da implementação, o gateway deve conseguir dizer honestamente:

> além de exigir posture `PASS`, o layer de safeguards já garante que a evidência apresentada corresponde ao vault e ao operador esperados para aquela execução privilegiada.

Isso melhora a tese para:
- **DeFindex:** ação privilegiada bindada ao vault/operador corretos;
- **Binance-like institution:** safeguard posture contextualizada ao book/desk/operator surface certa.

---

## 3. Escopo proposto (mínimo e forte)

### 3.1 Tipos
Adicionar em `sdk/src/DefindexPolicyGateway.ts` um contexto opcional de safeguards, por exemplo:

```ts
export interface SafeguardsRequestContext {
  readonly expectedVault?: string;
  readonly expectedOperatorId?: string;
}
```

E incluir em `AuthorizeArgs`:

```ts
readonly safeguardsContext?: SafeguardsRequestContext;
```

### 3.2 Gateway
Evoluir `evaluateSafeguards(...)` para negar fail-closed quando:
- `safeguardsContext.expectedVault` existir e `safeguards.vault !== expectedVault`;
- `safeguardsContext.expectedOperatorId` existir e `safeguards.operatorId !== expectedOperatorId`.

Novos códigos de deny:
- `SAFEGUARDS_VAULT_MISMATCH`
- `SAFEGUARDS_OPERATOR_MISMATCH`

### 3.3 Helpers públicos
Propagar `safeguardsContext?` de forma opcional para os helpers onde faz sentido:
- `prepareVaultCreationIfAuthorized(...)` — opcional, provavelmente **sem** `expectedVault` (o vault ainda não existe), mas pode aceitar `expectedOperatorId` se o caller quiser bindar o operador;
- `prepareRebalanceIfAuthorized(...)` — passar `expectedVault = request.vault` e `expectedOperatorId = request.caller` automaticamente quando um safeguards payload for fornecido;
- `prepareFeeDistributionIfAuthorized(...)` — passar `expectedVault = request.vault` e `expectedOperatorId = request.caller` automaticamente quando um safeguards payload for fornecido;
- avaliar se `rescue/pause/unpause` já têm helpers públicos equivalentes; se houver, seguir o mesmo padrão.

**Princípio:** quando o request já contém vault/caller, o helper deve derivar o bind automaticamente em vez de empurrar complexidade para o usuário.

---

## 4. Ordem de implementação (TDD)

### Task 1: escrever REDs de vault mismatch
**Files:**
- Modify: `sdk/src/__tests__/DefindexPolicyGateway.test.ts`

Adicionar teste que falhe com algo como:
- safeguards payload com `vault = CVAULT-OTHER`
- request/authorize esperando `CVAULT`
- resultado esperado: `DENY:SAFEGUARDS_VAULT_MISMATCH`
- verifier **não** chamado

### Task 2: rodar RED isolado
Run:
```bash
npm run test:run -- DefindexPolicyGateway
```
ou comando equivalente focal do Vitest.

Esperado: falha pelo novo deny ainda não implementado.

### Task 3: escrever RED de operator mismatch
Adicionar teste que falhe com:
- `safeguards.operatorId = operator-002`
- contexto esperado `operator-001` ou caller equivalente
- resultado esperado: `DENY:SAFEGUARDS_OPERATOR_MISMATCH`
- verifier **não** chamado

### Task 4: implementar mínimo no gateway
**Files:**
- Modify: `sdk/src/DefindexPolicyGateway.ts`

Adicionar `SafeguardsRequestContext`, propagar em `AuthorizeArgs`, aplicar denies mínimos em `evaluateSafeguards(...)`.

### Task 5: propagar nos helpers
**Files:**
- Modify: `sdk/src/DefindexPolicyGateway.ts`

Onde existir `request.vault` / `request.caller`, preencher automaticamente o contexto esperado ao chamar `authorize(...)`.

### Task 6: escrever/ajustar GREEN tests de caminho feliz
Adicionar testes que provem:
- safeguards matching `vault + operator + posture PASS` continuam exigindo attestation `PASS`;
- o helper de rebalance deriva corretamente `expectedVault` e `expectedOperatorId` do request.

### Task 7: rodar suíte e build
Run:
```bash
cd /root/dpo2u-stellar/sdk
npm run test:run
npm run build
```

### Task 8: atualizar docs mínimas
**Files:**
- Modify: `docs/PHASE2-OPERATOR-SAFEGUARDS-PRD.md`
- Modify: `docs/MICA-BINANCE-COVERAGE-AUDIT.md`

Atualizar apenas para refletir que safeguards agora não é só posture genérica, mas também bind de vault/operador quando solicitado/derivado.

### Task 9: registrar report da sprint
**Files:**
- Create: `.hermes/reports/<timestamp>-safeguards-scope-sprint-report.md`

Conteúdo:
- arquivos alterados
- testes adicionados
- comandos executados
- limitações honestas

---

## 5. Arquivos prováveis

### Código
- `sdk/src/DefindexPolicyGateway.ts`

### Testes
- `sdk/src/__tests__/DefindexPolicyGateway.test.ts`

### Docs
- `docs/PHASE2-OPERATOR-SAFEGUARDS-PRD.md`
- `docs/MICA-BINANCE-COVERAGE-AUDIT.md`

### Evidência
- `.hermes/reports/*safeguards-scope-sprint-report.md`

---

## 6. Critérios de aceite

A feature 2 só fecha se houver evidência real de que:
- safeguards com vault errado negam antes do verifier;
- safeguards com operator errado negam antes do verifier;
- o caminho feliz com binds corretos ainda exige attestation `PASS`;
- build do SDK passa;
- docs não extrapolam para MiCA/CASP full.

---

## 7. Riscos e tradeoffs

### Risco bom (aceitável)
Mais parâmetros opcionais nos helpers podem aumentar a superfície pública.

**Mitigação:** derivar automaticamente de `request.vault` e `request.caller` quando possível.

### Risco ruim (evitar)
Transformar safeguards em um sistema multi-entidade/multi-book genérico.

**Mitigação:** manter a feature restrita a `vault + operator` binding e aos deny paths verificáveis.

### Risco narrativo
Parecer que já existe stack institutional safeguards completa.

**Mitigação:** manter docs explícitas: isso continua sendo `operator-side fail-closed gate`, não regime completo.

---

## 8. Posicionamento estratégico

Se a feature 1 foi "**quem pode operar este papel sob este scope/jurisdição**", a feature 2 deve ser:

> **esse operador pode operar este vault agora, porque a postura de safeguards vinculada a esse vault continua válida**.

Essa sequência é boa porque:
1. aprofunda o seam real;
2. evita overengineering;
3. melhora muito a história institucional;
4. prepara o terreno para reporting e Travel Rule sem pular direto para claims maiores que o repo ainda não sustenta.
