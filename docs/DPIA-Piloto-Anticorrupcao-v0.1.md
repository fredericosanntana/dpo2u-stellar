---
type: dpia
title: "DPIA — Piloto Anticorrupção Municipal (DPO2U / Stellar)"
version: 0.1
status: draft
date: 2026-05-12
related: ["DPO2U_PRD_Piloto_Anticorrupcao_v0.2.docx", "THREAT-MODEL-Piloto-v0.1.md"]
---

# RELATÓRIO DE IMPACTO À PROTEÇÃO DE DADOS PESSOAIS (RIPD/DPIA)

## Piloto Anticorrupção — Plataforma DPO2U sobre Stellar Soroban

**Base Legal**: Art. 38 da Lei 13.709/2018 (LGPD); Art. 23 (tratamento por pessoas jurídicas de direito público); Art. 7º incisos III (cumprimento de obrigação legal) e VI (exercício regular de direitos em processo administrativo e arbitral).
**Norma de referência**: ABNT NBR 15287:2011, Guia de Boas Práticas ANPD/LGPD para administração pública municipal (2024).
**Data**: 2026-05-12
**Versão**: 0.1 (rascunho — pré-município)
**Status**: Draft — preenchido com **placeholders** marcados `[MUNICIPIO]` que serão substituídos no Sprint K com dados reais do município contratado.
**Responsável (DPO2U)**: CLO — Chief Legal Officer.
**Aprovação pendente**: DPO do município, DPO2U, advogada externa parceira.

> 🟡 **Versão pré-município**. Este documento serve como **template institucional** pra apresentação durante a prospecção (Sprint I Track A). Cada acordo gera uma versão v1.0 customizada e assinada.

---

## 1. Identificação dos agentes

| Papel LGPD | Entidade | Função |
|---|---|---|
| **Controlador** | `[MUNICIPIO]` — Prefeitura municipal | Detém competência legal pela execução de pagamentos e contratos administrativos (Lei 14.133/2021) |
| **Operador** | DPO2U Plataforma de Compliance LTDA | Executa orquestração off-chain e registra atestações on-chain por conta do controlador |
| **DPO Controlador** | `[NOME_DPO_MUNICIPIO]` | Encarregado do tratamento de dados pelo município (Art. 41 LGPD) |
| **DPO Operador** | Frederico Santana | Encarregado DPO2U |
| **Subprocessadores** | Stellar Development Foundation (rede pública), Reflector Network (oracle CEIS/CNEP — Sprint J.3), brasilapi.com.br (consulta CNPJ pública) | Infraestrutura imutável e fontes públicas |

## 2. Escopo e finalidade

### 2.1 Finalidades (Art. 6º, I LGPD)
Detecção de fraudes em pagamentos públicos municipais via **registro auditável de decisões de compliance** sobre dois casos de uso:
- **UC-1 (`bank_change_v1`)**: alteração de conta bancária de fornecedor.
- **UC-2 (`payment_doc_v1`)**: conformidade documental de pagamento (NF + empenho + atesto + contrato + CEIS/CNEP).

### 2.2 Fase do piloto
**Observer Level-1** por 90 dias úteis: as atestações são registradas e os alertas são enviados ao Controle Interno (CGM) **sem bloquear o fluxo financeiro do município**. Após o período, mediante avaliação conjunta, decide-se sobre escalonamento pra Observer L2 (bloqueio assistido) ou descontinuação.

### 2.3 Limites de escopo (o que NÃO é tratado)
- Não há decisão automatizada com efeitos jurídicos (Art. 20 LGPD não-aplicável — humano em loop sempre).
- Não há perfilamento ou avaliação de pessoas naturais; sujeitos são CNPJs de fornecedores.
- Não há tratamento de dados sensíveis (Art. 5º, II LGPD).
- Nenhum dado pessoal de servidor público ou cidadão é registrado on-chain; apenas hashes determinísticos de evidência + metadados públicos.

## 3. Inventário de dados pessoais tratados

### 3.1 Categorias de titulares
| Categoria | Tipo | Volume estimado (PRD §3) |
|---|---|---|
| Fornecedores (pessoa jurídica, mas com sócios PF rastreáveis) | Sócio-administrador (CPF) presente em contratos | até 500 fornecedores ativos por município médio |
| Servidores responsáveis | CPF/SIAPE/matrícula em atestos e empenhos | conforme estrutura administrativa do `[MUNICIPIO]` |

### 3.2 Dados pessoais por categoria
| Dado | Origem | Categoria LGPD | On-chain? | Base legal |
|---|---|---|---|---|
| CNPJ do fornecedor | Documentos submetidos via canal oficial municipal | Dado de PJ + identificador fiscal | **Não — hashed** | Art. 7º III (cumprimento de obrigação legal) |
| CPF/SIAPE do servidor responsável | Atesto fiscal de receita | Dado pessoal (Art. 5º I) | **Não — fica off-chain** | Art. 7º III + Lei 14.133/2021 |
| Razão social, valor, datas | Consulta Receita/brasilapi + parsing OCR | Dado de PJ + dado público administrativo | **Hash + metadata** | Art. 7º III |
| IP do remetente | Canal oficial (email/portal) | Dado pessoal (Art. 5º I — IP) | **Off-chain, log forense, 90d** | Art. 7º IX (interesse legítimo: detecção de fraude) |

### 3.3 Princípio "no PII on-chain"
**Regra dura PRD §3.1**: nenhum dado pessoal — em texto claro ou identificável por correlação — é gravado no contrato Soroban. O contrato armazena exclusivamente:
1. SHA-256 do payload de evidência (`evidence_hash`).
2. SHA-256 de metadados públicos (`metadata_hash`) — request ID, predicate set, versão, timestamp.
3. Endereço Stellar do submitter institucional DPO2U (não-PF).
4. Veredito enumerado (`PASS|FAIL|REVIEW`).

> Esta propriedade é verificável publicamente: qualquer auditor pode rodar `dpo2u-attest verify <contract> <use_case> <hash>` e confirmar que zero PII existe no estado on-chain.

## 4. Fluxo de tratamento (RoPA)

```
┌─ Município (Controlador) ────────────────────────────┐
│  1. Operador financeiro recebe pedido (email/portal) │
│  2. Sistema interno cria payload com evidência       │
└──────────────────┬───────────────────────────────────┘
                   ▼  POST /api/v1/attestation/submit  (TLS + API key)
┌─ DPO2U-MCP (Operador) ───────────────────────────────┐
│  3. L1 REST valida shape do payload                  │
│  4. L2 MCP roda predicate engine (off-chain, det.)   │
│  5. Hash SHA-256 do evidence + metadata              │
│  6. L3 Submitter Stellar — sign + fee-bump           │
└──────────────────┬───────────────────────────────────┘
                   ▼  invokeHostFunction
┌─ Stellar Soroban (Subprocessador) ───────────────────┐
│  7. register_attestation (use_case, hash, verdict)   │
│  8. Event emit + persistent storage                  │
└──────────────────┬───────────────────────────────────┘
                   ▼  ledger sequence + tx hash
┌─ DPO2U-MCP ──────────────────────────────────────────┐
│  9. POST callback_url (HMAC-signed)                  │
│ 10. CGM municipal recebe alerta + tx para auditoria  │
└──────────────────────────────────────────────────────┘
```

## 5. Transferência internacional

A rede Stellar opera com nodes distribuídos globalmente. As atestações on-chain são públicas por design.

| Risco | Mitigação |
|---|---|
| Nodes em jurisdições sem adequação ANPD (ex. EUA, Singapura) | **Não há transferência de dado pessoal** — só hashes determinísticos publicados num ledger público. Equivalente a publicar um SHA-256 em jornal oficial. |
| Compliance Art. 33 LGPD (transferência internacional) | **Não aplicável** ao escopo on-chain. Off-chain DPO2U mantém infra na UE e/ou Brasil — declarado em DPA específico com município. |

## 6. Direitos dos titulares (Art. 18 LGPD)

| Direito | Como exercer | Tempo |
|---|---|---|
| Confirmação (II) | `dpo2u-attest verify` CLI + GET `/api/v1/attestation/{id}` | imediato (read-only on-chain) |
| Acesso (II) | DSR via canal DPO município com encaminhamento DPO2U | até 15 dias |
| Correção (III) | Nova atestação corretiva (contrato é imutável — append-only) | até 15 dias |
| Anonimização/bloqueio/eliminação (IV) | Atestação de revogação on-chain + delete payload off-chain | até 15 dias |
| Portabilidade (V) | Exportar AttestationRecord JSON via `verify_attestation` | imediato |
| Eliminação (VI) | Erasure flow — atestação com `verdict=REVOKED` + secure-erase off-chain | até 15 dias |
| Informação sobre uso compartilhado (VII) | Listada nesta DPIA | — |
| Revogação de consentimento | Não aplicável — base legal é Art. 7º III/VI, não consentimento | — |

## 7. Avaliação de riscos

Matriz qualitativa LGPD/ANPD aplicada às hipóteses ofensivas (detalhe técnico no [Threat Model v0.1](THREAT-MODEL-Piloto-v0.1.md)).

| ID | Risco | Impacto | Probabilidade | Mitigação | Risco residual |
|---|---|---|---|---|---|
| R1 | Vazamento de payload off-chain (S3/disco) | Alto | Baixa | Encriptação at-rest + acesso por chave de servidor único | Baixo |
| R2 | Comprometimento da chave de submissão Stellar | Alto | Baixa | Multisig 2-of-3 com sponsor separado; rotação trimestral | Baixo |
| R3 | Atestação falsa registrada por insider | Alto | Baixa | Whitelist on-chain `authorize_submitter`; log de cada `authorize_submitter` event | Baixo |
| R4 | Erro/bug em predicate gera FAIL falso (bloqueia pagamento legítimo) | Médio (no Observer L1: zero — não bloqueia) | Média | 90 dias Observer L1 + fixtures sintéticos com cobertura 100% precision/recall | Baixo |
| R5 | Atacante consegue mapear CNPJ → identidade do fornecedor via hash | Médio | Muito baixa | SHA-256 + salt institucional + ausência de quase-identificadores no on-chain | Mínimo |
| R6 | Storage rent expira → atestação perdida | Alto | Baixa | Cron quarterly `extend_ttl` no contrato + monitoramento Statuspage | Baixo |
| R7 | Reflector oracle CEIS/CNEP indisponível em momento crítico | Médio | Média | Fallback DPO2U-owned oracle (Sprint J.3) + REVIEW automático em > 24h staleness | Baixo |
| R8 | Município se recusa a entregar dados pra DSR de cidadão | Médio | Baixa | DPA explicita SLA 15 dias + escalonamento ANPD | Baixo |

## 8. Plano de mitigação (resumo)

1. **Não-negociáveis técnicos** (PRD §3): zero PII on-chain, predicates determinísticos, contrato imutável.
2. **Não-negociáveis institucionais**: DPA assinado, DPIA versionada, threat model anual, audit externo antes de mainnet (Sprint L).
3. **Observabilidade**: cada atestação gera evento on-chain + log estruturado off-chain + métrica Statuspage.
4. **Resposta a incidente**: playbook em [`RUNBOOK.md`](RUNBOOK.md) (Sprint L) — key rotation, fee depletion, oracle stall.
5. **Auditoria periódica**: relatório trimestral pra DPO município + ANPD se requisitada.

## 9. Aprovações

| Papel | Nome | Data | Assinatura |
|---|---|---|---|
| DPO Operador (DPO2U) | Frederico Santana | _pending Sprint K_ | — |
| DPO Controlador (Município) | `[NOME_DPO_MUNICIPIO]` | _pending Sprint K_ | — |
| Advogada externa parceira | `[NOME_PARTNER]` | _pending Sprint K_ | — |
| Aprovação CGM municipal | `[NOME_CGM]` | _pending Sprint K_ | — |

---

## Histórico de versões

| Versão | Data | Mudança |
|---|---|---|
| 0.1 | 2026-05-12 | Draft pré-município. Template institucional pra prospecção. |
| 1.0 | _Sprint K_ | Customização e assinaturas com município contratado. |
| 1.x | _Sprint L_ | Atualização com contract id mainnet + reflexão pós-piloto 90d. |
