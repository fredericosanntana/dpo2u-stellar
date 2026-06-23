# Mercado Livre de Energia (ANEEL/CCEE) → Atestação/Oráculo no Gate DPO2U — Pesquisa 2026-06-23

**Método:** deep-research harness (5 ângulos · 22 fontes · 75 claims → 25 verificados →
**17 confirmados / 8 killed**). Verificação adversarial 3 votos; síntese manual (o agente
de síntese caiu no limite de sessão). Fontes primárias: ANEEL (REN 858/2019), Planalto
(Lei 14.300/2022), CVM (Ofícios SSE 4/2023 e 6/2023), gov.br/ANEEL; secundárias: Abraceel.

> **Tese confirmada:** a camada setorial de energia é **majoritariamente atestação/oráculo**,
> não predicado numérico auto-contido. A DPO2U entra como **atestador + evidence-pin**, não
> como enforcement determinístico (exceto o range do PLD).

---

## A. ANEEL — quem pode operar no ACL (verificado)

- **Lei 9.074/1995 criou o mercado livre** (direito do consumidor escolher fornecedor). [Abraceel, 3-0]
- **Abertura (Portaria GM/MME 50/2022):** desde **01/01/2024 todo consumidor Grupo A** (alta tensão, ≥2,3 kV) pode migrar ao ACL; **Grupo B / baixa tensão ainda NÃO é elegível**. [gov.br/ANEEL, 3-0 / 2-1]
  - ⚠️ **Correção (refutado 0-3):** o antigo limiar de **"só >500 kW"** está **SUPERADO** — com a abertura de 2024, todo Grupo A pode, não só >500 kW.
- **Comercializadora:** deve ser **autorizada pela ANEEL e habilitada na CCEE** (capital mínimo, aptidão). [Abraceel, 3-0]
- **Comercializador varejista** representa os consumidores perante a CCEE (submete info em nome deles). [gov.br/ANEEL, 3-0] → fato de **atestação**.

## B. CCEE — PLD (verificado)

- **REN ANEEL 858/2019** introduziu **dois tetos de PLD** (estrutural + horário) — PLD horário. [ANEEL, 3-0]
- Base: PLDmax estrutural **R$556,58/MWh** (95% risco, vig. 01/01/2020); PLDmax horário **R$1.141,85/MWh**. [ANEEL, 3-0]
- **Valores ATUAIS (2024)** sob a **REN 1.032/2022**, atualizados **anualmente pelo IPCA**: PLDmin **R$61,07**, PLDmax estrutural **R$716,80**, PLDmax horário **R$1.470,57** /MWh. [Abraceel, 3-0]
  → **O PLD é número oficial CCEE com piso/teto regulados → predicado de ORÁCULO de preço** (o gate checa `PLDmin ≤ preço ≤ PLDmax` + origem no feed CCEE).

## C. Tokenização de energia — classificação (verificado)

- **Linha divisória = Howey/CVM:** token é valor mobiliário **sempre que o benefício econômico advier do esforço do empreendedor/terceiro**. [CVM SSE 4/2023, 3-0]
- **Token de recebível/renda fixa** ofertado publicamente, lastreado em direitos creditórios/dívida, com **retorno dos fluxos subjacentes e remuneração definida por terceiros → valor mobiliário (CVM)**. [CVM SSE 4/2023, 3-0]
- **Ofícios SSE 4/2023 (04/04/2023, atual. 29/01/2024) e 6/2023 (05/07/2023):** guidance interpretativa ("orientar, não regulamentar") de quando TR é VM. [CVM, 3-0]
- _(Não-verificado, abstenção por limite, mas precedente conhecido):_ a CVM autorizou em **sandbox** um **token de lucro de usina solar via ICVM 88** (crowdfunding/security) — sinaliza que **energia-com-retorno tende a CVM**, não a commodity pura. _[Exame — confirmar]_

→ **Implicação EPWR:** se o EPWR der **retorno/recebível** (fluxo de caixa do contrato de energia) → **valor mobiliário (CVM)**. Se for **representação/entrega pura de energia (commodity)** → fora da CVM (regime ANEEL/BCB). É a bifurcação de counsel já mapeada — e a pesquisa confirma que o **lado "recebível" puxa pra CVM**.

## D. O risco regulatório nº 1 da tokenização (verificado)

- **Art. 11 da Lei 14.300/2022:** é **VEDADO** enquadrar/contar energia que **já foi registrada no ACL/ACR ou contabilizada na CCEE**. [Planalto, 3-0]
  → **Fronteira anti-dupla-contagem.** O maior risco de tokenizar energia é **lastro inexistente / dupla-venda** (tokenizar energia já contabilizada/vendida na CCEE). **A DPO2U mitiga atestando "lastro registrado na CCEE + não duplo-contado".**

---

## E. MAPA setorial → atestação / oráculo / processual

| Condição setorial | Tipo | Cabe no gate? |
|---|---|---|
| Trader é **comercializadora autorizada ANEEL + habilitada CCEE** | **Atestação** | ✅ como atestação assinada (padrão `bcb_operator_admission`) |
| **Consumidor é livre elegível** (Grupo A) | **Atestação** | ✅ atestação |
| **Lastro registrado/contabilizado na CCEE, não duplo** (Art. 11) | **Atestação** ⭐ | ✅ **a mais importante** — atestação + evidence-pin |
| **PLD usado ∈ [PLDmin, PLDmax] do feed CCEE** | **Oráculo de preço** | 🟡 range numérico verificável on-chain; valor vem de oráculo |
| Registro de agente, garantias financeiras CCEE, penalidades | **Processual** | ❌ fora do gate |

→ Confirma a tese: **nada aqui é predicado numérico auto-contido (exceto o range do PLD).** A camada de energia é Categoria B (atestação/oráculo) — exatamente a forma que o gate já suporta (atestação assinada + evidence-pin).

---

## F. Riscos / janela — lançamento born-compliant da EnergyPay

1. **Classificação do EPWR (Howey):** se recebível/retorno → **CVM** (ativa RCVM88 + registro/oferta); se commodity → ANEEL/BCB. **A pesquisa indica que o lado recebível puxa pra CVM** — decisão de counsel, mas com o sinal claro.
2. **Lastro + anti-dupla-venda (Art. 11):** o risco mais agudo — garantir contrato real, registrado na CCEE, não duplo-contado. **Atestação DPO2U + evidence-pin reduz isso.**
3. **Elegibilidade dos participantes:** comercializadora autorizada ANEEL/CCEE; consumidor Grupo A. **Atestação.**
4. **PLD como oráculo** dentro do range regulado (REN 1.032/2022, IPCA anual).

**Onde a DPO2U reduz risco:** transforma cada condição setorial numa **atestação assinada pinada on-chain** (quem atestou, sobre qual lastro/registro CCEE, com qual PLD), ligada à ação exata. Não enforça a regra de energia (é off-chain), mas cria a **trilha verificável** que ANEEL/CCEE/auditor/contraparte exigem — e bloqueia a ação se a atestação faltar (fail-closed).

---

## Killed / não-verificados (honesto)
- Limiares kW de micro/minigeração (75 kW / 5 MW / 3 MW): **1-2** (não confirmado — verificar Art. 1º Lei 14.300).
- "TR é automaticamente security": **1-2** (é **caso-a-caso**, não automático — consistente com Howey).
- "só >500 kW pode ser livre": **0-3 REFUTADO** (superado pela abertura 2024).
- Caso sandbox CVM (token solar ICVM 88): **abstido** (precedente real, confirmar).

## Fontes primárias
- ANEEL REN 858/2019 — www2.aneel.gov.br/cedoc/ren2019858.html
- Lei 14.300/2022 (Art. 11 anti-dupla) — planalto.gov.br
- CVM Ofícios SSE 4/2023 + 6/2023 — gov.br/cvm
- ANEEL abertura Grupo A / varejista — gov.br/aneel
- PLD 2024 + REN 1.032/2022 — Abraceel (secundária)
