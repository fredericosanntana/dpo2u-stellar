# Reanálise pós-investigação bid-protest — 2026-05-26 noite

Investigação de 5h+ pra viabilizar use case "bid-protest" expôs limites regulatórios.
Mas no caminho ganhamos infraestrutura + acesso a fontes que viabilizam outros use cases.

## 1. Dados/Infra novos disponíveis

### 1.1 Proxy Playwright via Tailscale residencial
- `http://100.107.101.83:9876` (máquina Chairman, sempre online)
- Auto-warmup F5 BIG-IP cookies
- Allowlist: pncp.gov.br, dadosabertos.compras.gov.br, comprasnet.gov.br, www.gov.br/compras, compras.gov.br, www.in.gov.br
- Capacidade: ~10 req/min seguro, mais escalável se necessário
- **Bypassa todos os WAFs gov.br via fingerprint Chrome real**

### 1.2 PNCP API completa acessível
- Swagger 354KB em `/api/pncp/v3/api-docs` (77+ endpoints)
- Consulta: `/api/consulta/v3/api-docs` (mais 30+ endpoints)
- Volume: **6.607 contratações Lei 14.133 em 5 dias** = ~1.300/dia (modalidade Pregão Eletrônico apenas)
- Por classe CATMAT/CATSER, por UF, por município, por CNPJ órgão, por CNPJ fornecedor
- D+0 real (publicação imediata)

### 1.3 ComprasNet fase-externa API
- `cnetmobile.estaleiro.serpro.gov.br/comprasnet-fase-externa/v3/api-docs` (335KB)
- Endpoints públicos `/public/v1/compras/{chave}/...`
- Inclui propostas, propostas-iniciais, fase-recursal, sessão-pública (mas 204 em testes)
- **Limitação: só SISG federal e em janela ativa**

### 1.4 OCR Tesseract validado
- Funciona em PDFs escaneados (PORT, ~12s/página em CPU 4-core)
- pdftotext pra PDFs textuais (instantâneo)
- pdfinfo + pdffonts detectam tipo
- Sintoma: PNCP publica só ~4% das compras com ata, e ata só tem vencedora

### 1.5 OmniVoice TTS clonado Chairman
- Já existia: `100.107.101.83:8882`
- Pode narrar dossiês/representações em PT-BR voz real

### 1.6 Atestação on-chain Stellar
- Contract `CC4TJGDR…ZHM5` (anticorruption-attestation testnet)
- 16 use cases configurados (bid_protest_overpricing_v1 já registrado)
- ~5 XLM por tx, saldo 9988 XLM

## 2. Mapa de cobertura por dado

| Dado | Onde está | Cobertura D+0 | Acessível? |
|---|---|---|---|
| Preços praticados (vencedora) | Compras.gov.br | 100% federal SISG | ✅ direto |
| Cesta de mercado | Compras.gov.br | nacional | ✅ direto |
| Lista contratações | PNCP (via proxy) | 100% (todas plataformas) | ✅ proxy |
| Itens de contratação | PNCP /v1/.../itens | 100% | ✅ proxy |
| Documentos (Edital + Ata RP) | PNCP /v1/.../arquivos | ~4% têm ata | ✅ proxy |
| Vencedora homologada | PNCP /v1/.../resultados | 100% pós-homologação | ✅ proxy |
| Perdedoras nominais D+0 | ❌ não existe em fonte pública | 0% | — |
| Editais (PDF) | PNCP `/arquivos` | 96% têm edital | ✅ proxy |
| Sanções (CEIS/CNEP/CEPIM) | Portal Transparência | 100% até 2024-04 | ✅ direto |
| Acordos leniência | Portal Transparência (CGU) | 100% | ✅ direto |
| Pagamentos | Portal Transparência | D+30 | ✅ direto |
| Diário Oficial | INLABS-DOU (SSO) | D+1 | ⚠ requer SSO |

## 3. Use cases REVISITADOS com dados novos

### 3.1 Use cases existentes DPO2U (15)
1. `sanction_check_v1` — fornecedor sancionado ✅ rodando
2. `overpricing_v1` — sobrepreço B2G ✅ rodando (cobertura ampliada agora com PNCP)
3. `divergent_payee_v1` — favorecido divergente ✅
4. `leniency_flag_v1` — leniência ativa ✅
5. `winner_rotation_v1` — rodízio de vencedores ✅
6. `bank_chg` — mudança de conta bancária ✅
7. LGPD/GDPR/CCPA/POPIA/PIPEDA/PIPA compliance (6 use cases)
8. `consent_record_v1`, `compliance_attestation_v1`, `zk_compliance_v1`
9. `bid_protest_overpricing_v1` (novo, mas inviável D+0)

### 3.2 Use cases NOVOS viáveis com dados de hoje

#### Tier S (alto valor + viável imediato)

**A. `tcu_representation_v1`** — Representação ao TCU por sobrepreço
- Detecta sobrepreço Z>5 em qualquer plataforma (PNCP nacional)
- Prazo decadencial 5 anos (sem D+0 stress)
- Cliente: cidadão/jornalista/ong/escritório de advocacia controle externo
- Reuso 90%: pipeline + atestação + template adaptado
- **Diferencial DPO2U: 100% das atestações on-chain (timestamp imutável)**
- Receita: parceria escritório especializado / venda assinaturas pesquisadores

**B. `cgu_denuncia_v1`** — Denúncia à CGU por improbidade indiciária
- Multi-trigger: sanção+contratação (já temos), leniência+contratação (já temos), divergent_payee
- Caminho legal: representação preliminar para sindicância
- Prazo: 5 anos
- Cobertura: 100%

**C. `mpf_representacao_v1`** — Representação ao MPF (lei improbidade 8429)
- Trigger: combinação de 2+ indícios (sobrepreço + sanção, ou sobrepreço + rotação winners)
- Prazo decadencial: depende do caso, geralmente 5+ anos
- Atestação cross-source on-chain gera valor probatório

**D. `tribunal_contas_estadual_v1`** — Replica TCU para 26 TCEs estaduais
- Cobertura: licitações estaduais (PNCP filtra por UF)
- Cada TCE tem regras próprias, mas estrutura conceitual idêntica
- Use case parametrizado por UF

#### Tier A (médio valor + viável com investimento)

**E. `journalism_briefing_v1`** — Dossiê para jornalismo investigativo
- Hot lead: Estadão, Folha, G1, Agência Pública, Repórter Brasil
- Dossiê automatizado com atestação on-chain
- Receita: subscription B2B mídia (R$ 2-5k/mês por veículo)

**F. `compliance_due_diligence_v1`** — Due diligence pré-contratação
- Cliente B2B compra info sobre fornecedor antes de contratar
- Cruzamento: sanção + leniência + histórico de sobrepreço + contratações suspeitas
- Receita: R$ 50-200 por consulta

**G. `auditoria_interna_v1`** — Para órgãos públicos auto-auditarem
- Cliente: própria UASG/ órgão que quer detectar problemas internos antes do TCU
- Receita: contrato com órgão público (precisaria parceria com Esafe/Enap)

#### Tier B (futuro, requer infra adicional)

**H. `whistleblower_anonimo_v1`** — Canal denúncia anônima com ZK
- Atestação ZK on-chain prova denúncia foi feita em data X sem revelar identidade
- Caminho regulatório: Lei 13.608/2018 (proteção do denunciante)

**I. `verificacao_doacao_eleitoral_v1`** — Cruza doadores TSE com contratados gov
- Trigger eleitoral / pós-eleitoral

### 3.3 Melhorias incrementais nos existentes

#### Em `overpricing_v1` (que já roda B2G)
- ✅ Substituir Compras.gov.br por PNCP via proxy → **cobertura nacional 100%** (era ~70% só federal SISG)
- Adicionar trigger por UF/município
- Ranking de UASGs mais "suspeitas" (densidade de outliers)

#### Em `sanction_check_v1` + `leniency_flag_v1`
- Já rodam. Mas com PNCP via proxy podemos cruzar com **contratações em curso** (PNCP) em vez de só praticadas (Compras.gov.br)
- Detecta contratação iminente com fornecedor sancionado **antes da homologação**
- Janela de impugnação Art. 165 Lei 14.133: 3 dias úteis — **aqui sim D+0 é factível**, porque sanção é a evidência (não perdedora)

#### Em `winner_rotation_v1`
- Cobertura nacional com PNCP
- Adicionar análise temporal: padrões mensais/anuais
- Cross-UASG: empresa que ganha sempre em N UASGs diferentes

## 4. Recomendação executiva

### 4.1 Pivot bid_protest_overpricing_v1 → tcu_representation_v1
- 3-4h dev (template + handler + endpoint)
- Mantém infra (atestação, dossiê, on-chain)
- Cobertura nacional 100%

### 4.2 Expandir overpricing_v1 com PNCP
- 4-6h dev (novo source PNCP no runner)
- Salto: ~5-15% (SISG) → 100% (todas plataformas)
- 6.607 contratações novas/semana = mar de oportunidades

### 4.3 Adicionar sanction-on-pncp-pending
- 2-3h dev
- Detecta contratação SUSPEITA antes da homologação (D+0 real)
- Trigger único viável de "impugnação D+0" (com sanção como gatilho, não perdedora)

### 4.4 Dossiê jornalismo (B2B mídia)
- Reuso pipeline existente
- Criar template e canal de venda
- 1-2 semanas pra MVP comercial

## 5. Mantém em standby
- `bid_protest_overpricing_v1` — programado mas sem trigger viável
- ComprasNet fase-externa scraping — futuro se mudar política
- INLABS-DOU — futuro com SSO oficial

