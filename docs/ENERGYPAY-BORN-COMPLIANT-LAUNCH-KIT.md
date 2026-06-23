# EnergyPay — Born-Compliant Launch Kit (DPO2U)

_2026-06-23 · dossiê de oferta · ancorado em artefatos reais (commits + tx on-chain)_

## Resumo executivo
A EnergyPay vai lançar energia tokenizada (EPWR) liquidada a PLD na Stellar **antes**
de emitir o token — o melhor momento possível para nascer em conformidade. A DPO2U
entrega a camada que normalmente falta entre **obrigação regulatória → ação sensível →
evidência verificável**: um gate de execução proof-bound que **só deixa a ação acontecer
quando a regra passa**, com trilha auditável on-chain. Não é dashboard; é enforcement.

## O problema (datado e real)
1. **Prazo BCB (verificado):** Res. BCB 520 vigora **02/02/2026**; a partir de **30/10/2026
   é VEDADO** a instituições autorizadas operar com VASP não-autorizado — os trilhos
   bancários/PIX da EnergyPay dependem disso.
2. **3 camadas regulatórias** incidem ao mesmo tempo: **dados (LGPD)**, **financeira
   (BCB/VASP + CVM)**, **setorial (ANEEL/CCEE)**.
3. **Risco nº 1 da tokenização (Art. 11 Lei 14.300):** vedado tokenizar energia já
   contabilizada na CCEE → **lastro/dupla-venda**.

## O que a DPO2U entrega — enforcement por camada

| Camada | Predicado / atestação | Estado |
|---|---|---|
| **Dados (LGPD)** | privacy-by-design: evidência on-chain é hash, sem PII | ✅ framework |
| **BCB/VASP** | segregação · buffer 5% · admissão operador/contraparte | ✅ **pack `bcb-policy` — construído, testado, WIRED LIVE** |
| **CVM** | teto retail R$20k · emissor R$15M · janela 180d · cooldown 120d | ✅ pack `bcb-policy` (RCVM88) |
| **Energia (ANEEL/CCEE)** | PLD-range (oráculo) · comercializadora · consumidor · **lastro CCEE não-duplo** | ✅ **pack `energy-policy`** |

**Inventário de código:** `sdk/src/bcb-policy.ts` (8 predicados, 18 testes) + `sdk/src/energy-policy.ts`
(4 predicados, 11 testes) — **136 testes SDK + 26 testes de gate**, todos verdes. Cada
predicado carrega sua **citação legal** e produz um veredito ligado à ação exata (TOCTOU).

## Prova viva (testnet — não é slide)
| Marco | Tx |
|---|---|
| Rebalance proof-bound (ZK on-chain) | `1a2f08b1…` |
| Settlement governado (Privy + admit + evidence pin) | `f657871d…` |
| **Privy operador → gate on-chain → DeFindex** (enforcement) | `92e20c8a…` |
| **Settlement gateado por predicado BCB REAL** (segregação+buffer 5%) | `d18ef8d8…` |

O operador assina via **Privy** (embedded wallet, raw-sign ed25519 — provado); o gate
**enforça**; a evidência (com `predicate_set` + citação) é **pinada on-chain**.

## A decisão-pivô: o EPWR é valor mobiliário?
As 3 pesquisas convergem na linha de **Howey** (esforço de terceiro):
- **EPWR com retorno/recebível** (fluxo de caixa do contrato, remuneração definida pela
  EnergyPay) → **valor mobiliário (CVM)** — Ofícios SSE 4/6 2023; precedente: token de
  lucro de usina solar saiu **via ICVM 88 (security)**.
- **EPWR como entrega/representação pura de energia** (commodity) → **fora da CVM**
  (regime ANEEL/BCB).

→ **A pesquisa puxa o EPWR-com-retorno pra CVM.** É decisão de counsel, mas o sinal é
claro. O código **apoia a decisão**: (a) desenha o EPWR pra cair limpo no regime escolhido;
(b) registra o parecer de counsel como **atestação on-chain** ligada ao token; (c) o gate
ativa o predicate-set do regime classificado (mesma infra, predicados diferentes).

## Checklist born-compliant (ordem)
1. **Classificar o EPWR** (counsel / análise Howey) — destrava o regime e o predicate-set.
2. **Operador via Privy `USER_CONTROLLED`** — segregação por construção (a EnergyPay não custodia).
3. **Wire dos predicados no gate** por regime: BCB (segregação/buffer/contraparte) ou CVM
   (tetos RCVM88) + **energia** (PLD-range + lastro CCEE não-duplo).
4. **Atestações setoriais** (comercializadora ANEEL/CCEE, lastro CCEE) como evidence-pin.
5. **Pedir autorização BCB / estar em-processo antes de 30/10/2026** (se VASP).

## Limite honesto
- A DPO2U **não decide** se o EPWR é security (Howey = humano) nem lê o registro BCB/CCEE
  sem **oráculo/atestador**. As condições setoriais e de admissão entram como **atestação
  assinada** (a forma que o gate já suporta), não como fato auto-contido on-chain.
- **PoR não é exigência BCB** (refutado: só auditoria bienal) — fica como value-add.
- Tudo provado em **testnet**; mainnet/governança não estão neste escopo.

## Por que isto é defensável (moat)
A regulação BR de 2026 é uma **proibição executável** — a DPO2U tem a mesma forma
(enforcement na execução, fail-closed, ligado à ação exata). RegTech reporta depois; a
DPO2U impede antes. Os predicados-âncora (segregação, contraparte-VASP, lastro CCEE) são
**mandatórios por lei + objetivos**, e a **janela 02/02 → 30/10/2026** é o timing de entrada.

> **A frase:** _"EnergyPay liquida energia tokenizada; a DPO2U é o que você mostra ao BCB,
> à CVM, à ANEEL/CCEE e ao auditor — a prova, ligada a cada ação, de que a regra foi
> cumprida antes de a transação acontecer."_

### Fontes
Relatórios citados no repo: `docs/RESEARCH-BCB-CVM-ONCHAIN-PREDICATES-2026-06-23.md`,
`docs/RESEARCH-ENERGY-ANEEL-CCEE-2026-06-23.md`, `docs/PRD-ENERGYPAY-PRIVY-DPO2U-PHASE1.md`.
