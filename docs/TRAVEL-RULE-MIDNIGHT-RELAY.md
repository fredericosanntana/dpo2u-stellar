# Travel Rule: veredito da Midnight espelhado na Stellar

16/11/2026. Fase 3 do plano de adoção do roadmap Midnight (multi-chain). Componentes:

| Parte | Onde |
|---|---|
| Formato comum do veredito (`dpo2u.travel-rule-verdict/1`) | dpo2u-midnight `docs/VERDICT-FORMAT.md` |
| Vetores compartilhados (11) | dpo2u-midnight `test/vectors/verdict-v1-crosschain.json`, copiado em `contracts/travel-rule-gate/vectors/` |
| Gate na Stellar (Soroban) | `contracts/travel-rule-gate` |
| Relayer Midnight → Stellar | `relayer/midnight-verdict.mjs` (+ `midnight-verdict-lib.mjs`) |
| Deploy na testnet | `scripts/relayer/deploy-travel-rule-gate-testnet.sh` |

## ⚠️ Modelo de confiança: confiança no operador, não prova

**Este caminho depende de confiar no operador do relayer (hoje, o DPO2U).** A Stellar não tem cliente leve da Midnight nem prova de estado. O contrato Soroban confere a *forma* do veredito, mas **não consegue conferir que a Midnight produziu esse veredito**. Um relayer desonesto (ou um quórum desonesto, se o limiar for maior que 1) poderia gravar na Stellar um PASS que nunca existiu na Midnight.

Isso é diferente do `xchain-attest` deste repositório, em que a prova Groth16 é reverificada na Stellar. Aqui não há prova: o circuito do Travel Rule roda na Midnight, e o que atravessa é só o veredito público.

| A Stellar confere (na cadeia) | A Stellar **não** confere |
|---|---|
| Regras do formato: PASS tem reason 0, FAIL tem reason 1 a 4, só PASS pode estar liberado | Que o veredito existe no ledger do gate na Midnight |
| Gate de origem fixado pelo admin (`source_chain` + `source_contract`) | Que o bloco e a tx apontados são reais |
| `policy_hash` diferente de zero e na lista permitida | Que a política foi de fato aplicada no circuito |
| Digest SHA-256 do JSON canônico, recalculado no contrato | |
| Assinatura de `threshold` relayers autorizados, distintos, ainda autorizados | |
| Veredito ancorado (bloco + tx); FAIL é final; PASS só pode virar PASS liberado com as mesmas raízes | |

**Como reduzir a confiança hoje:** subir o `threshold` com relayers operados por partes diferentes (por exemplo, DPO2U + a VASP + um auditor), cada um lendo a Midnight pelo próprio indexer.

**Como auditar qualquer veredito gravado:** o registro na Stellar guarda o bloco e a tx da Midnight. Qualquer pessoa roda, no dpo2u-midnight,

```
MIDNIGHT_NETWORK=preview npx tsx scripts/export-verdict.ts --transfer <transfer_id> --tx <tx> --contract <source_contract>
```

e compara o `digest` com o `get(transfer_id).digest` do contrato Soroban. Se forem diferentes, o relayer mentiu, e isso fica provado publicamente (os endereços estão em `relayed_by`).

**Quando houver mensageria nativa** entre Midnight e Stellar (VIA Labs ou outra, ainda não confirmada na Midnight), troca-se o transporte, não o formato nem o digest.

## Contrato `travel-rule-gate`

- `__constructor(admin, threshold)`.
- Admin: `set_relayer`, `set_threshold`, `set_source(source_chain, source_contract, allowed)`, `set_policy(policy_hash, allowed)`. Tudo fechado por padrão.
- Relayer: `submit(relayer, v) -> confirmações`. Grava quando `threshold` relayers enviam o mesmo digest.
- Leitura: `get`, `is_pass`, `is_released`, `require_pass` (para outros contratos Stellar, por exemplo a liquidação x402 ou um escrow), `pending(digest)`, e os auxiliares `canonical(v)` e `digest(v)`.
- Eventos: `tr_conf` a cada confirmação, `tr_rec` quando grava.

O contrato recalcula na cadeia o mesmo JSON canônico da Midnight e o mesmo digest. Os 11 vetores compartilhados batem nas três implementações (TypeScript da Midnight, relayer em JS, Soroban em Rust); os 6 primeiros saem do `TravelRuleGate` compilado rodando no simulador.

## Relayer

```
# planejar (sem rede)
node relayer/midnight-verdict.mjs --in export.json --plan

# relay real (no VPS, onde o dpo2u-midnight está compilado)
TRG_ID=C... STELLAR_SRC=dpo2u-relayer-1 MIDNIGHT_REPO=/root/dpo2u-midnight \
  node relayer/midnight-verdict.mjs --transfer <id> --tx <tx de evaluateTransfer ou releaseTransfer>
```

O relayer: (1) exporta o veredito da Midnight (só leitura, só indexer); (2) confere o formato e o digest; (3) recusa veredito sem âncora, com política zero ou com campos fora dos limites do contrato; (4) pede ao contrato o digest e confere que bate; (5) envia `submit`; (6) lê o registro e grava o evidence record.

## Evidence record (`dpo2u.travel-rule-relay-evidence/1`)

Um JSON por relay, em `EVIDENCE_DIR` (padrão `relayer/evidence/`), para o evidence pack:

| Campo | Conteúdo |
|---|---|
| `trust_model` | `"operator"` |
| `trust_statement` | a frase do modelo de confiança acima, por extenso |
| `midnight.verdict`, `midnight.digest` | o veredito exportado e o digest |
| `midnight.reproduce` | o comando que qualquer auditor roda para reexportar e comparar |
| `stellar` | rede, contrato, endereço do relayer, confirmações, se gravou, o registro lido de volta |
| `relayed_at` | data e hora |

Nenhum dado pessoal atravessa: o veredito só tem raízes salgadas dos dados do originador e do beneficiário.

## Estado

- Contrato e relayer testados localmente: 11 testes Rust + 6 testes Node, incluindo os 11 vetores.
- **Ainda não rodou ao vivo.** O deploy na testnet da Stellar e o primeiro relay precisam do VPS (onde estão o `stellar` CLI, as chaves e o build do dpo2u-midnight) e do indexer da preview da Midnight no ar.
- Só testnet. Para a mainnet da Stellar: decidir o `threshold` e quem opera os relayers, e só depois do gate v10 estar na mainnet da Midnight.
