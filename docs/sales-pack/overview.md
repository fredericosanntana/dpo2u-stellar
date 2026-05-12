# DPO2U Piloto Anticorrupção — Overview (1-pager)

## Para quem
Prefeituras municipais brasileiras (até ~50k habitantes), com Controladoria-Geral do Município (CGM) ativa, que querem **prova externa** de que seus controles de pagamento funcionam — sem reescrever sistema financeiro.

## O quê
Modo **observador** (90 dias úteis, não-bloqueante) que aplica dois casos de uso institucionalmente validados a cada pagamento:

1. **UC-1 — Troca de conta bancária de fornecedor** (caso TJDFT R$ 5,5 milhões, 2024). 5 verificações determinísticas: CNPJ do titular ≡ fornecedor, canal oficial com 2FA, sem mudanças recentes, sem pagamento iminente, banco regulado pelo BCB.
2. **UC-2 — Conformidade documental de pagamento**. 6 verificações sobre NF + empenho + atesto + contrato + CEIS/CNEP: documentos presentes e legíveis, CNPJ consistente, NF dentro do empenho, datas dentro do contrato, atesto válido, fornecedor não-sancionado.

Cada decisão vira uma **atestação na blockchain Stellar** (testnet inicialmente, mainnet após auditoria externa) — auditável independente pelo TCE / TCU / CGU sem precisar pedir nada pra prefeitura.

## O quê NÃO é
- **Não bloqueia pagamento**. Modo observador L1 só registra e alerta CGM.
- **Não armazena dado pessoal on-chain**. Só hashes determinísticos + metadata pública. DPIA específica fica anexada ao DPA.
- **Não exige reescrever sistema interno**. Integração via REST API + webhook reverso. SIAFI / sistema próprio do município fica intacto.
- **Não é cripto-token**. Não há ICO, financeirização ou exposição cambial; XLM (token da rede) é pago pelo DPO2U via fee sponsor — município nunca custodia cripto.

## Por que blockchain
**Razão única**: o auditor externo (TCE/TCU/CGU) precisa verificar **sem cooperação do município**. Stellar é uma escolha técnica neutra:
- Rede pública, qualquer auditor consulta direto.
- Read-only barato (~zero) e instantâneo.
- Imutabilidade institucional: contrato deployado é fiscalizável bit a bit.
- Não-EVM, não-meme — usado por bancos (MoneyGram, IBM World Wire, Vibrant) e governos (Ucrânia, Cingapura, El Salvador piloto).

## O que muda no dia-a-dia do município
- **CGM** recebe alertas (PASS / REVIEW / FAIL) por email + dashboard.
- **Operador financeiro** continua usando o sistema atual — adiciona apenas o POST para a API DPO2U como webhook na intake de mudanças bancárias.
- **TI** instala um SDK Node.js e configura uma API key + URL de callback. Suporte DPO2U end-to-end durante o piloto.
- **Prefeito / Procuradoria** ganham um relatório trimestral pra ostentar — "todas as decisões de pagamento dos últimos 90 dias estão fiscalizáveis na blockchain pública".

## Stack institucional
- **DPIA** (Lei 13.709/2018, Art. 38) pré-redigida; customizamos e assinamos com seu DPO + advogada parceira em 2 sessões.
- **Threat model** STRIDE-light v0.1 público; refinado em workshop 2h com seu time.
- **Auditoria externa** do contrato pré-mainnet (OtterSec / Halborn / Sec3).
- **Multi-jurisdicional**: a DPO2U opera com cobertura LGPD + GDPR + 15 outras jurisdições (Brasil, EU, UK, Cingapura, EUA-Califórnia, Canadá-Quebec, Coreia, Japão, África do Sul…).

## Custos
- **Piloto (90 dias)**: R$ `[ABERTO_A_NEGOCIACAO]` — recomendado simbólico (R$ 1,00 ou contrapartida não-monetária). Objetivo é validação compartilhada, não receita.
- **Fees Stellar testnet**: zero (rede de testes). Mainnet: < R$ 100/mês para volumes piloto.
- **DPO2U cobre infra, oracles, suporte e auditoria do contrato.**

## Pré-requisitos do município
- CGM ativa com email institucional.
- IT capaz de fazer POST HTTPS de um sistema interno (qualquer linguagem).
- Conta em provedor de email com SPF/DKIM funcional pra receber alertas.
- DPO formalmente designado (Art. 41 LGPD).

## Próximos passos
1. NDA mútuo (modelo DPO2U disponível).
2. Sessão técnica de 60min — demo round-trip ao vivo + Q&A.
3. Customização da DPIA + threat model (Sprint K do DPO2U; ~2 semanas).
4. Carta de intenção → contrato observador L1 90d.
5. Go-live em testnet (D+0) → relatório semanal → relatório final D+90 → decisão sobre L2.

---

**Contato**: Frederico Santana — fredericosanntana@gmail.com — Founder & DPO2U Chairman. Mestre em Direito, Tecnologia e Inovação pela FGV; DPO há 15 anos; co-autor whitepaper DPO2U, ERC-8004 spec, paper DAO governance 2024.

**Verificar trustlessly hoje**: `npm i -g @dpo2u/stellar-sdk && dpo2u-attest verify bank_change_v1 <hash>` — esse comando funciona sem nenhum acesso ao município ou à DPO2U.
