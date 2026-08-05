# BCB & CVM → Predicados Enforçáveis On-Chain (DPO2U) — Pesquisa 2026-06-23

**Método:** deep-research harness (6 ângulos · 24 fontes · 111 claims → 25 verificados →
**24 confirmados / 1 refutado** → síntese). Verificação adversarial 3 votos por claim.
Fontes primárias: BCB (Res. 520 via mirror legisweb id=486181 + slide oficial), CVM
(Pare040.pdf, resol088consolid.pdf), Planalto (Lei 14.478/2022, Decreto 11.563/2023),
corroborado por ~8 bancas tier-1 (Mattos Filho, Machado Meyer, Felsberg, Souto Correa,
NDM, Lefosse, Madrona, Bichara e Motta).

> ⚠️ **CORREÇÃO MATERIAL (não vender):** **NÃO existe** mandato de PoR diária/mensal na
> Res. BCB 520. A norma exige **métodos de PoR documentados + auditoria independente
> BIENAL** ("bases bienais"). PoR contínua é **value-add** da DPO2U (`seal_solvency`),
> não cumprimento de uma cadência regulatória inexistente. (voto 0-3, refutado)

---

## A. BCB / VASP — Resoluções 519/520/521 (Lei 14.478/2022 + Decreto 11.563/2023)

**Arquitetura datada e operativa** (3-0): Lei 14.478/2022 Art. 2º exige **autorização
prévia federal** para operar como PSAV e **exclui valores mobiliários** (preserva a CVM,
Art. 1º p.u./3º); Art. 6º delega o regulador ao Executivo; **Decreto 11.563/2023** designa
o **BCB** e preserva a competência da CVM. Res. **519/520/521 publicadas 10/11/2025**,
**vigência 02/02/2026**, **prazo de autorização / corte de contraparte 30/10/2026**.

| Obrigação | Predicado | Base | Cabe no gate? |
|---|---|---|---|
| **Admissão de operador** — só PSAV autorizado/em-processo opera | `operator ∈ autorizados` | Lei 14.478 Art. 2º | ✅ como atestação — **precisa de oráculo do registro BCB** (licencia a *entidade*, não a chave) |
| **Corte de contraparte (30/10/2026)** — vedado operar c/ VASP não-autorizado | `counterparty ∈ autorizados` | Res. 520 (Mattos Filho verbatim) | ✅ idem — **forma exata do gate** |
| **Segregação patrimonial** — VAs de cliente em carteiras distintas das da prestadora | `wallet_cliente ≠ wallet_prestadora` | Res. 520 **Art. 30, I** (+ Art. 28 §1, Art. 31) | ✅ **objetivo on-chain** (topologia de endereços) |
| **Buffer 5%** — prestadora pode manter ≤ 5% do total de VAs de clientes como liquidez | `ativos_prestadora ÷ ativos_clientes ≤ 5%` | Res. 520 **Art. 30 §3º, II** | ✅ **ratio numérico determinístico** — o predicado BCB mais limpo (classificação titularidade precisa de atestação) |
| ~~PoR diária/mensal~~ | — | **REFUTADO** — só auditoria **bienal** | ⚠️ PoR vira **value-add** (`seal_solvency`), não baseline |

---

## B. CVM — Parecer 40, RCVM 88, teste de valor mobiliário

**Parecer 40** (3-0): taxonomia funcional **não-exaustiva** em 3 categorias (pagamento /
utilidade / referenciado a ativo — esta inclui *security tokens*, stablecoins, NFTs;
categorias não-exclusivas). Token é valor mobiliário se **(i)** representa um VM do art. 2º
I-VIII da Lei 6.385/76 (ou recebíveis Lei 14.430/2022), ou **(ii)** se enquadra no conceito
aberto do **art. 2º IX (contrato de investimento coletivo / Howey)**.

**Teste de 6 fatores** (3-0): (i) investimento; (ii) formalização; (iii) caráter coletivo;
(iv) expectativa de benefício; **(v) esforço de empreendedor/terceiro**; (vi) oferta pública.
O **fator (v)** é o teste operativo do EPWR. **Auto-avaliado** ("independe de manifestação
prévia da CVM"). → **Julgamento humano, NÃO decidível on-chain.**

**RCVM 88** (3-0) — os predicados numéricos mais limpos:

| Predicado | Valor | Base | Cabe no gate? |
|---|---|---|---|
| **Teto retail (mesma plataforma)** | R$ 20.000/ano ("no seu ambiente") | Art. 4º p.u. I | ✅ **on-chain** (soma corrente por investidor) |
| Teto retail (cross-plataforma) | agregado anual | Art. 4º p.u. III (Anexo C, **auto-declaração**) | 🟡 **precisa de atestação off-chain** |
| Exceção qualificado / renda > R$200k | até 10% | Art. 4º | 🟡 atestação de perfil/renda |
| **Teto do emissor** | valor alvo ≤ R$ 15M | Art. 3º I | ✅ on-chain (estado do emissor) |
| **Janela de captação** | ≤ 180 dias | Art. 3º I | ✅ on-chain (timestamps) |
| **Cooldown entre ofertas** | 120 dias | Art. 3º §5º | ✅ on-chain |

> **Incerteza sinalizada:** RCVM 88 está em **Consulta Pública SDM 05/2025** (comentários
> encerrados 23/12/2025, **não promulgada**). **Mantém** o teto de R$20k mas o tornaria
> **por-plataforma** — o que **elimina a dependência cross-plataforma** e torna o teto retail
> **totalmente enforçável on-chain.**

**Tokenização** (3-0): não exige aprovação prévia da CVM, mas emissor + oferta pública +
serviços downstream (administração, intermediação, custódia, escrituração, liquidação;
Res. CVM 160/22) são regulados. **Token classificado como VM SAI do regime VASP** para a CVM.

---

## C. MAPA consolidado — o que cabe no proof-bound gate

**Categoria A — ENFORÇÁVEL (encaixa como atestação PASS ou prova ZK):**
- Segregação de carteira (520 Art. 30 I) · Buffer 5% (520 Art. 30 §3 II) · Admissão de
  operador (Lei 14.478 Art. 2) · Corte de contraparte (30/10/2026) · Teto retail
  intra-plataforma + teto emissor R$15M + janela 180d + cooldown 120d (RCVM 88).

**Categoria B — EXIGE oráculo/atestador off-chain (gate NÃO decide, só registra após):**
- Classificação security/Howey (Parecer 40) · binding holdings de PoR · agregação retail
  cross-plataforma · exceções renda/qualificado · **binding entidade-autorizada ↔ chave de
  wallet** (o registro BCB licencia a entidade, não a chave).

---

## D. MOAT (inferência fundamentada — não votada independentemente)

1. **A regulação BR de 2026 É um gate, e a DPO2U já é um gate.** A norma **proíbe**
   ("é vedado… operar com contraparte não-autorizada", 30/10/2026); a DPO2U **impede na
   execução** (fail-closed, ligado à ação exata). Para uma proibição legal, **enforcement >
   dashboard**. RegTech reporta *depois*; a DPO2U impede *antes*.
2. **Predicados-âncora Categoria A** (segregação, buffer 5%, tetos numéricos) são
   **determinísticos** → encaixam direto no padrão `context == derive_zk_context(evidence_hash)`.
3. **Greenfield verificado:** a tooling da DPO2U não tem BCB/VASP e CVM é nascente — construir
   isso é terreno aberto.
4. **Janela temporal:** vigência **02/02/2026** → autorização **30/10/2026**. Janela de entrada
   datada, antes dos dashboards RegTech.
5. **vs Stellar nativo:** SEP-8 (regulated assets) é aprovação centralizada; a DPO2U adiciona
   proof-bound + ZK + os **predicados BR** que o SEP-8 não conhece.

**Limite honesto:** a DPO2U **não** decide se o EPWR é valor mobiliário (Howey/fator v =
humano) nem lê o registro BCB sem oráculo. O moat está nos **predicados objetivos da
Categoria A**, com a Categoria B entrando como **atestação assinada** (a forma que o gate
já suporta).

---

## E. MVP de moat (ordem de implementação)

1. **Segregação patrimonial** (520 Art. 30 I) — 100% on-chain, zero oráculo.
2. **Buffer 5%** (520 Art. 30 §3 II) — ratio determinístico.
3. **Teto retail intra-plataforma + teto emissor R$15M / 180d / 120d** (RCVM 88).
4. **Admissão de operador + corte de contraparte** (atestação do registro BCB — precisa do oráculo).
5. **PoR** via `seal_solvency` — posicionado como **value-add acima do baseline bienal**, não como cadência regulatória.

---

## F. Perguntas em aberto (para jurídico / re-checagem)
1. Alguma norma BCB especifica **periodicidade de PoR** mais curta que a auditoria bienal? (provável que não — PoR contínua é value-add).
2. Quando a **Consulta SDM 05/2025** for promulgada (teto retail → por-plataforma), qual a data de vigência?
3. Qual o **mecanismo BCB** (API de registro, atestação, âncora on-chain) para ligar a autorização da entidade a uma chave Stellar — sem o oráculo virar ponto único de falha?
4. **EPWR sob o fator (v):** energia liquidada a PLD aproxima de utility/commodity (BCB/VASP) ou de contrato de investimento (CVM)? Qual atestador (parecer de counsel / consulta CVM) o gate aceitaria como evidência?

---

## Fontes primárias
- BCB Res. 520 — bcb.gov.br (vigência 02/02/2026; segregação Art. 30 I; buffer 5% Art. 30 §3 II; auditoria bienal Art. 30 III)
- CVM Parecer 40 — conteudo.cvm.gov.br/.../Pare040.pdf (3 categorias; teste 6 fatores Howey)
- CVM Res. 88 consolidada — conteudo.cvm.gov.br/.../resol088consolid.pdf (R$20k retail; R$15M emissor; 180d; 120d cooldown)
- Lei 14.478/2022 + Decreto 11.563/2023 — planalto.gov.br (autorização Art. 2; BCB designado; exclui VM)
- Corroboração: Mattos Filho, Notabene (30/10/2026; faseamento)
