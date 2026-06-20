# S1 — Predicate map de rebalance sob CVM 175

**Status:** artefato canônico da decisão S1  
**Circuito escolhido:** governança de rebalance via CVM 175  
**Ação DeFindex:** `rebalanceVault`  
**Papel DeFindex:** Rebalance Manager  
**Âncora legal principal:** `sect_cvm_175_v1`  
**Predicado de operador:** `defindex_rebalance_v1`  
**PRD relacionado:** `docs/DPO2U-STELLAR-DEFINDEX-COMPLIANCE-LAYER-PRD.md`

## Decisão

A S1 escolhe um primeiro circuito parceiro público: usar o policy gateway da DPO2U para gatear uma ação `rebalanceVault` da DeFindex sob o papel **Rebalance Manager**, onde o predicado específico da ação é `defindex_rebalance_v1` e a âncora legal principal é `sect_cvm_175_v1`.

A claim pública é intencionalmente estreita:

> **Um rebalance privilegiado da DeFindex só pode ser preparado quando uma atestação DPO2U afirmar que aquele intent exato de rebalance passou pelo predicado selecionado de mandato/governança sob CVM 175, sem publicar o dossiê jurídico subjacente nem PII.**

Isso **não** transforma a CVM 175 na stack inteira de compliance. A **LGPD** continua como boundary de disclosure; **PSAV/VASP** continua como regime adjacente de operador/safeguards; e **Travel Rule** continua como circuito posterior de settlement/mensageria.

## Por que este é o primeiro circuito público

### Por que governança de rebalance via CVM 175

Governança de rebalance é a lane pública mais forte para começar porque junta os elementos load-bearing que já existem no repo:

- a DeFindex expõe `rebalanceVault` como ação privilegiada de operador;
- o mapeamento atual do SDK já associa `rebalanceVault` ao papel **Rebalance Manager** e ao predicado `defindex_rebalance_v1`;
- o live slice de proof-bound execution já provou que uma ação estreita de rebalance pode ser ligada ao intent exato e executada por meio de um policy gate;
- a **CVM 175** é a âncora institucional brasileira mais legível para mandato, alocação, limites de risco e governança de veículos/vaults geridos.

Essa S1 é melhor do que um mapa jurídico amplo porque a claim fica:

- ligada a uma ação específica;
- auditável;
- pequena o suficiente para implementar com a semântica atual do gateway.

Em termos práticos:

- `PASS` prepara a ação não assinada;
- `FAIL`, `REVIEW`, ausência ou expiração da evidência negam fail-closed.

### Por que não começar por safeguards PSAV/VASP

Safeguards PSAV/VASP são importantes, mas são mais amplos do que uma ação DeFindex só. Eles cobrem:

- postura do operador;
- segregação patrimonial;
- reserve/safeguards;
- controles de incidente;
- deveres operacionais contínuos.

Isso os torna melhores como circuito adjacente de **admission** ou de **review periódico**, e não como a primeira lane pública de proof-bound execution.

Para S1, PSAV/VASP permanece como dependência e circuito posterior, não como a lane escolhida. Ele pode virar predicado de operador como `vasp_por_br_v1` ou `sect_bcb_14478_v1` em S2/S3, mas não deve diluir o primeiro predicate map público.

### Por que não começar por Travel Rule / settlement evidence

Travel Rule é um circuito de mensageria de transferência e de evidência de settlement. Ele é valioso quando a claim do produto trata de:

- transferências cobertas;
- dados originador/beneficiário;
- mensageria entre VASPs;
- trilha de auditoria de settlement.

Mas a surface DeFindex com o ponto nativo de controle mais claro **não** é mensageria de settlement; é operação role-gated de vault. Portanto, Travel Rule deve permanecer como circuito posterior de settlement/reporting, e não como a primeira claim pública para execução privilegiada de vault.

## Predicate map canônico

| Campo | Valor S1 |
|---|---|
| Circuito público | governança de rebalance via CVM 175 |
| Ação DeFindex | `rebalanceVault` |
| Papel DeFindex | Rebalance Manager |
| Operação no gateway | `rebalanceVault` |
| Helper do gateway | `prepareRebalanceIfAuthorized` |
| Predicado de operador / `use_case_id` | `defindex_rebalance_v1` |
| Âncora legal principal | `sect_cvm_175_v1` |
| Binding de evidência | hash SHA-256 do payload canônico da ação |
| Regra de allow | só `PASS` permite preparação |
| Regra de deny | `FAIL`, `REVIEW`, ausência, expiração ou revogação negam fail-closed |

`defindex_rebalance_v1` é o predicado de execução checado pelo gateway. `sect_cvm_175_v1` é a âncora legal referenciada dentro do payload de evidência e da avaliação upstream. A S1 **não** exige um mega-schema que junte todos os regimes legais.

## Princípio do `evidence_hash`

O `evidence_hash` precisa prender o verdict de policy à **ação exata** de rebalance e ao **escopo exato** do predicado.

Princípios obrigatórios:

- hashear um payload JSON canônico com ordenação determinística de chaves;
- incluir vault, caller, papel, operação, instruções, âncora legal, id do predicado, versão da policy, janela de validade e referências opacas à evidência upstream;
- excluir PII crua, pareceres jurídicos completos, documentos de cliente, payloads IVMS e material não público de diligência;
- usar digest SHA-256 de 32 bytes representado em hex lowercase;
- tratar qualquer mudança material na ação, instrução, versão de policy, âncora legal, janela de validade ou refs de evidência como **novo hash**;
- nunca reutilizar um `PASS` para um payload diferente de rebalance.

O verificador público deve precisar apenas de `(use_case_id = defindex_rebalance_v1, evidence_hash)` para decidir se a ação do **Rebalance Manager** pode ser preparada. O dossiê detalhado permanece off-chain.

## Schema proposto do payload de evidência

Este schema é intencionalmente **estreito** e **implementável**. Ele descreve o payload que será canonizado e hasheado; não é uma data room legal completa.

```json
{
  "schema": "dpo2u.defindex.rebalance.cvm175.v1",
  "operation": "rebalanceVault",
  "operator_predicate": "defindex_rebalance_v1",
  "primary_legal_anchor": "sect_cvm_175_v1",
  "network": "testnet",
  "vault": "C...",
  "requested_by": "G_or_C...",
  "required_role": "Rebalance Manager",
  "rebalance_intent": {
    "instructions": [
      {
        "action": "invest",
        "strategy": "C...",
        "amount": "1000"
      }
    ],
    "asset_scope": [
      {
        "asset": "C...",
        "strategy": "C..."
      }
    ]
  },
  "mandate_controls": {
    "mandate_id": "opaque-mandate-id",
    "mandate_version": "2026-06-20",
    "allocation_policy_id": "opaque-policy-id",
    "risk_policy_id": "opaque-risk-id",
    "max_deviation_bps": 500,
    "asset_allowed": true,
    "strategy_allowed": true,
    "within_allocation_limits": true
  },
  "review": {
    "reviewer": "issuer-or-policy-engine-id",
    "reviewed_at": "2026-06-20T00:00:00Z",
    "valid_until": "2026-06-27T00:00:00Z",
    "source_evidence_refs": [
      "sha256:..."
    ]
  },
  "privacy": {
    "pii_onchain": false,
    "public_fields_only": true,
    "disclosure_boundary": "lgpd_minimized_hash_only"
  }
}
```

### Notas de implementação

- `source_evidence_refs` devem ser hashes ou IDs opacos de registros off-chain, não documentos crus;
- `requested_by` é o caller do papel ou o contrato de policy esperado para preparar/assinar via fluxo DeFindex;
- `instructions` deve espelhar o shape de `RebalanceInstruction` em `sdk/src/defindex-policy-types.ts`;
- `network`, `vault`, `requested_by` e campos de instrução entram no hash para evitar replay entre vaults, atores e ambientes.

## Critérios de `PASS` / `FAIL` / `REVIEW`

### PASS

Retornar `PASS` para `defindex_rebalance_v1` **somente** quando tudo abaixo for verdadeiro:

- o payload está completo, pode ser canonizado e hasheia para o `evidence_hash` fornecido;
- `operation` é exatamente `rebalanceVault`;
- `required_role` é **Rebalance Manager**;
- `primary_legal_anchor` é `sect_cvm_175_v1`;
- as instruções propostas estão dentro do mandato aprovado, da allocation policy e da risk policy;
- todo asset e strategy do rebalance é permitido no escopo do mandato;
- a revisão ainda está dentro de `valid_until`;
- o dossiê upstream existe off-chain e sustenta auditoria por revisor autorizado;
- nenhuma PII crua ou conteúdo sensível do dossiê precisa ir on-chain.

### FAIL

Retornar `FAIL` quando o rebalance **não** estiver autorizado no mérito, inclusive quando:

- a instrução, o asset ou a strategy caem fora do mandato;
- limites de alocação/risco são ultrapassados;
- o caller/papel não é aceitável para a ação revisada;
- a evidência é materialmente inconsistente, adulterada, revogada ou sabidamente falsa;
- o mesmo hash está sendo usado para um payload materialmente diferente;
- revisão legal ou operacional bloqueia explicitamente o rebalance.

### REVIEW

Retornar `REVIEW` quando o engine não consegue afirmar `PASS` nem `FAIL` com honestidade, inclusive quando:

- a interpretação legal ainda está em aberto;
- o mandato ou a risk policy estão ambíguos;
- a evidência upstream está incompleta ou stale, mas não claramente falsa;
- dependências de PSAV/VASP, asset, sanctions, reserve ou disclosure exigem revisão humana;
- a ação pode até ser válida, mas ainda depende de partner/legal approval antes da execução pública.

O comportamento do gateway permanece **fail-closed**: `REVIEW` nega preparação da mesma forma que `FAIL` ou ausência de evidência.

## Limites anti-overclaim

A S1 **não** alega:

- que a CVM 175 sozinha satisfaz LGPD, PSAV/VASP, Travel Rule ou todo dever jurisdicional;
- que a DPO2U emite parecer jurídico final ou substitui governança do operador regulado;
- que todos os depósitos ou saques da DeFindex são nativamente KYC-gated;
- que a DPO2U assina, custodia ativos, transmite transações ou move valor;
- que permissões de API/operator da DeFindex estejam plenamente disponíveis em produção;
- que o primeiro circuito já seja um mega-schema global de compliance;
- que um `PASS` possa ser reutilizado entre vaults, atores, redes ou instruções alteradas.

A formulação pública correta é:

> **primeira âncora, primeiro circuito público, proof-bound execution para uma ação privilegiada única de rebalance.**

## Dependências para S2 / S3

### S2 — adapter hardening
Deve:

- preservar o mapeamento `rebalanceVault` -> Rebalance Manager -> `defindex_rebalance_v1`;
- canonizar e hashear o payload antes da autorização;
- retornar unsigned XDR apenas depois de `PASS`;
- testar deny path para `FAIL`, `REVIEW`, ausência de evidência e hash mismatch;
- manter `sect_cvm_175_v1` como âncora legal principal do payload, sem fingir substituir todos os outros checks.

### S3 — demo de proof-bound execution
Deve:

- mostrar payload, hash canônico, lookup de atestação e caminho de rebalance preparado/executado;
- registrar tx IDs apenas quando a execução realmente ocorrer;
- provar que a ação ligada ao hash é a mesma ação preparada/executada;
- documentar qualquer dependência remanescente de role-as-contract, permissão de API ou validação partner/legal com a DeFindex.
