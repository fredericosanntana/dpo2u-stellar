# Brief operacional — Lionel — S1 / SPP landing zone

**Objetivo da sprint:** auditar a superfície exata do SPP antes de qualquer implementação nova do Gateway.

## Contexto
A DPO2U **já provou** no repo `dpo2u-stellar` o lado de:
- registry canônico,
- ASP gated,
- Merkle root autenticada,
- ZK membership slice com nullifier real.

O que falta agora não é inventar novo protocolo. É **pousar essa primitive no trilho SPP** com o menor delta possível.

## Missão da S1
Trazer a integração SPP para terreno verificável e sem ambiguidade.

### Você precisa sair desta sprint com 4 respostas fechadas
1. **Qual é a função exata de admissão** no conjunto de membership do SPP?  
2. **Qual é o modelo de auth** dessa função?  
3. **Qual é o formato exato do leaf** esperado pelo circuito/contrato do SPP?  
4. **Quais são os pontos de deploy/frontend** que precisamos tocar para fechar o happy path?  

Se uma dessas 4 respostas continuar em aberto, a sprint **não fechou**.

---

## Escopo permitido

### Fazer
- trazer o repo/version exato do SPP para o workspace;
- localizar contrato(s) de membership;
- localizar `insert_leaf` ou equivalente;
- entender auth/ownership/admin model;
- entender encoding/shape do leaf;
- mapear fluxo de deploy testnet;
- mapear ponto mínimo de frontend para credentialed-join;
- escrever um documento curto tornando a S2 implementável sem chute.

### Não fazer
- não reescrever circuito;
- não abrir nova ceremony;
- não generalizar múltiplas credenciais;
- não refatorar o repo DPO2U sem necessidade;
- não construir o Gateway ainda;
- não gastar tempo com polish visual.

---

## Entregável obrigatório
Criar um documento curto em `docs/` com nome sugerido:

`docs/SPP-INTEGRATION-LANDING-ZONE.md`

Esse documento precisa conter, no mínimo:

## 1. Repo / commit / versão alvo
- URL do repo
- commit / tag / branch usada
- caminho local no workspace

## 2. Contratos e superfícies relevantes
- contrato de membership
- contrato de pool
- verifier relacionado
- frontend/admin pages relevantes

## 3. Hook de admissão
- função exata
- assinatura
- auth exigida
- efeitos colaterais
- restrições

## 4. Formato do leaf
- tipo exato
- origem dos campos
- onde isso é definido (código/circuito)
- o que DPO2U terá de derivar

## 5. Implicação para o Gateway DPO2U
- qual input o Gateway precisa receber
- o que ele precisa verificar
- qual call ele precisa fazer no SPP
- se dá para fazer on-chain direto ou se o fallback admin-mediated é mais seguro para o prazo

## 6. Caminho mínimo de demo
- passos exatos do happy path
- dependências externas
- pontos frágeis

## 7. Recomendação executiva
Ao final, você precisa recomendar objetivamente uma destas opções:
- **A:** Gateway on-chain direto  
- **B:** admin-mediated insert como v1  

Não entregar “depende”. Tem que recomendar uma.

---

## Critério de saída da sprint
A sprint S1 está pronta quando Fred/Hermes puderem ler o documento e responder, sem novo discovery:
- o que vamos construir na S2,
- contra qual função,
- com qual auth,
- com qual leaf schema,
- e com qual fallback.

---

## Qualidade esperada
- curto;
- preciso;
- citando caminhos reais de arquivo;
- sem linguagem aspiracional;
- sem “parece”, “acho”, “provavelmente” sem evidência.

---

## Regra de ouro
> Não inventar camada nova antes de identificar exatamente onde a camada atual da DPO2U encosta no SPP.

---

## Base de verdade
Ler antes de começar:
- `docs/PULSO-DPO2U-ASP-PRD-v1.1-reviewed.md`
- `docs/PULSO-DPO2U-ASP-SPP-roadmap-executivo.md`
- `docs/asp-protocol-mvp.md`

## Resultado esperado da S1
No fim desta sprint, a S2 tem que virar um problema de implementação — **não mais um problema de descoberta**.
