% DPO2U × Pulso Hackathon
% Frederico Santana
% 2026-06-19

# Credencial positiva para private finance na Stellar

- A DPO2U transforma o resultado de uma verificação regulatória em uma primitive verificável.
- Privada, composable e acionável on-chain.
- Sem expor PII.

# O problema

- Chains públicas expõem informação demais.
- Fluxos tradicionais de compliance reexpõem dado pessoal a cada integração.
- Privacy pools precisam de uma camada crível de admissão para uso institucional.

# Nossa tese

**Prove, don’t perform.**

- O usuário deve provar que qualifica para um conjunto conforme.
- Sem revelar quem é.

# O que a DPO2U faz

- registry canônico de atestações;
- layer de policy para credencial positiva;
- admissão / revogação ASP;
- bridge operacional para uma lane em Stellar.

# Por que Stellar

- ecossistema real de settlement;
- composability via Soroban;
- primitives ZK emergindo no stack;
- forte encaixe para private finance com superfície institucional.

# O que é load-bearing aqui

Não é integração cosmética.

O resultado da atestação controla diretamente:

- admissão no conjunto positivo;
- revogação do conjunto positivo;
- bloqueio operacional de re-entry após revogação.

# Demo flow

1. configurar policy viva no registry;
2. registrar atestação viva;
3. extrair decisão canônica;
4. gerar payload de admissão;
5. inserir leaf / admitir na lane;
6. revogar atestação;
7. provar bloqueio de re-entry.

# Evidência

- deployment testnet do registry;
- txs públicas de registry;
- runbook replayable;
- S4 live report;
- S8 boundary report;
- contratos e testes open-source.

# Boundary honesto

Podemos ler publicamente a instância externa auditada, mas não mutá-la sem a signing key do admin.

**Por que isso importa:**

- a lane técnica está provada;
- o gap remanescente é de governança, não de viabilidade.

# Why we win Pulso

- integração Stellar real;
- primitive composable de policy;
- caso LatAm / institucional forte;
- privacidade + compliance juntos, não como tradeoff.

# Depois do hackathon

Transformar a lane na primitive canônica de admissão conforme para:

- private payments;
- compliant stablecoin flows;
- regulated settlement;
- RWA movement.

# Closing

**DPO2U torna fluxos privados na Stellar credibly compliant sem colocar dado pessoal on-chain.**
