# S1 — SPP Integration Landing Zone Audit

**Data:** 2026-06-18  
**Repo auditado:** `https://github.com/NethermindEth/stellar-private-payments.git`  
**Commit inspecionado:** `5826b32b5ed98e19cd9eafed1bbc1a1682e3a76f`

## Executive summary

A landing zone de integração com o SPP **existe e está clara**.

Mas ela **não é um gateway protocolar nativo DPO2U ainda**. O padrão real do SPP hoje é:

1. o usuário gera/chaveia seu `note public key`;
2. existe um **ASP membership tree** separado do pool;
3. um ator administrativo calcula/informa o leaf de membership;
4. esse leaf é inserido no contrato `asp-membership` via `insert_leaf`;
5. o `pool` só aceita transações cujas proofs carregam roots que batem com os roots atuais de `asp-membership` e `asp-non-membership`.

Ou seja: **o encaixe real existe**, mas o modo nativo encontrado no SPP é **admin-mediated**, não um gateway compliance-first já modelado para DPO2U.

## Decisão A/B

### Recomendação final: **B — admin-mediated v1**

**Não** recomendo começar pela opção **A — gateway on-chain direto** como primeiro pouso.

### Por quê

- o SPP já expõe uma superfície mínima e funcional para admissão via `insert_leaf`;
- essa superfície já vem com auth administrativa por padrão;
- o próprio README e admin UI assumem uma operação de **admin console + assinatura do admin**;
- o toggle `adminInsertOnly=false` existe, mas o próprio projeto trata isso como modo de demo/teste, **não produção**;
- para DPO2U, começar por uma camada admin-mediated preserva controle, auditabilidade operacional e evita overbuild antes de congelar política, schema e lifecycle.

**Conclusão prática:** o primeiro produto correto não é “gateway on-chain autônomo”, e sim **orquestração de admissão ASP para o SPP existente**, com policy externa DPO2U decidindo quem entra e a inserção sendo feita de forma controlada.

---

## 1. Função exata de admissão

### Resposta
A função exata de admissão é **`insert_leaf`** no contrato `asp-membership`.

### Evidência
No SPP, o README instrui explicitamente:

```bash
stellar contract invoke --id <CONTRACT_ADDRESS> --source-account <ASP_ADMIN_ACCOUNT> -- insert_leaf --leaf <LEAF_VALUE>
```

Arquivo: `README.md:57-64`

No contrato `contracts/asp-membership/src/lib.rs`, a função real é:

- `pub fn insert_leaf(env: Env, leaf: U256) -> Result<(), Error>`

Arquivo: `contracts/asp-membership/src/lib.rs:180-251`

### Observação importante
A admissão ocorre **fora do pool**. O pool não “onboarda” a identidade diretamente. Ele apenas verifica depois se a proof apresentada referencia os roots ASP corretos.

---

## 2. Auth model

### Resposta
O auth model padrão é **admin-signed insertion**.

### Evidência
No construtor do `asp-membership`, o contrato inicializa:

- `AdminInsertOnly = true`

Arquivo: `contracts/asp-membership/src/lib.rs:91-107`

Na função `insert_leaf`:

- se `admin_only == true`, o contrato exige `admin.require_auth()`.

Arquivo: `contracts/asp-membership/src/lib.rs:195-201`

Há também a função:

- `set_admin_insert_only(env, admin_only)`

que permite ao admin desligar essa proteção.

Arquivo: `contracts/asp-membership/src/lib.rs:128-142`

### Evidência adicional de produto
O próprio README diz:

- a UI admin permite derivar chaves para qualquer conta;
- **mas a inserção deve ser assinada pela conta admin do ASP**;
- desabilitar `Admin-Only Leaf Insert` só faz sentido em demo/teste.

Arquivo: `README.md:57-64`, `README.md:79-92`

### Conclusão
O modelo real não é “self-service onboarding trustless”. O modelo real é:

- preparação do leaf pode acontecer na UI;
- **autorização de entrada no set é administrativa**.

Isso é compatível com o papel da DPO2U como camada de credencial positiva.

---

## 3. Formato exato do leaf

### Membership leaf

O leaf de membership é derivado a partir de:

- `note public key`
- `membership blinding` / `ASP secret`
- domain separation `0x01`

### Evidência no circuito
No circuito `policyTransaction.circom`, o membership leaf é recomputado assim:

- `Poseidon2(2)`
- input 0 = `inKeypair[tx].publicKey`
- input 1 = `membershipProofs[tx][i].blinding`
- `domainSeparation = 0x01`

Arquivo: `circuits/src/policyTransaction.circom:127-145`

### Evidência na UI
A admin page descreve:

- `Leaf = Poseidon2(note public key, ASP secret, domain=1)`

Arquivo: `app/admin.html:171-178`

### Evidência no frontend wasm
A UI usa `deriveAspUserLeaf(membership_blinding, pubkey_hex)`.

Arquivo: `app/js/admin.js:295-323`  
Arquivo: `app/crates/platforms/web/src/client/mod.rs:359-384`

### Conclusão
A DPO2U **não precisa inventar um schema novo** para o primeiro pouso.
Ela precisa produzir exatamente o leaf esperado pelo SPP:

```text
membership_leaf = Poseidon2(note_public_key, membership_blinding, domain=0x01)
```

---

## 4. Non-membership / blocked list

O SPP também tem um contrato separado `asp-non-membership`.

### Evidência
Arquivo: `contracts/asp-non-membership/src/lib.rs`

O hash de leaf é:

```text
hash(key, value, 1)
```

Arquivo: `contracts/asp-non-membership/src/lib.rs:126-145`

Na UI admin:

- `Leaf hash uses Poseidon2(key, value, domain=1)`

Arquivo: `app/admin.html:180-207`

### Interpretação
O SPP trabalha com dois controles paralelos:

- **membership tree** = conjunto aprovado
- **non-membership tree** = conjunto bloqueado / exclusion list

---

## 5. Como o pool consome isso

### Resposta
O pool não recebe “aprovação regulatória” em alto nível. Ele recebe **proofs** que carregam os roots ASP, e o contrato compara esses roots com os contratos ASP atuais.

### Evidência
No `contracts/pool/src/pool.rs`:

- `member_root = get_asp_membership_root()`
- `non_member_root = get_asp_non_membership_root()`
- se qualquer um divergir dos roots da proof, retorna `InvalidProof`

Arquivo: `contracts/pool/src/pool.rs:607-618`

Também existem getters dedicados:

- `get_asp_membership_root()`
- `get_asp_non_membership_root()`

Arquivo: `contracts/pool/src/pool.rs:839-860`

### Conclusão
O ponto de integração real da DPO2U com o SPP é:

- **alimentar corretamente os trees ASP**;
- e garantir que o usuário prove membership/non-membership sobre esses roots.

O pool já está desenhado para consumir isso.

---

## 6. Deploy / operator surfaces encontrados

### Deploy real
Existe script real de deploy:

- `deployments/scripts/deploy.sh`

Ele faz deploy de:
- `asp-membership`
- `asp-non-membership`
- `circom_groth16_verifier`
- `pool`

Arquivo: `deployments/scripts/deploy.sh:15-18`, `156-183`, `237+`

### Frontend real
Existe uma operator surface explícita:

- `http://localhost:8000/admin.html`

E o `Trunk.toml` copia `app/admin.html` para o staging.

Arquivo: `README.md:61`, `README.md:87`  
Arquivo: `Trunk.toml:50-52`

### Deployment sample encontrado
Existe deployment materializado em:

- `deployments/testnet/deployments.json`

com `asp_membership`, `asp_non_membership`, `verifier` e `pool` já endereçados.

---

## 7. O que isso significa para a DPO2U

## O que já está pronto no SPP para nós usar

- contrato separado de membership;
- contrato separado de non-membership;
- função de admissão real (`insert_leaf`);
- auth administrativo padrão;
- pool já validando os roots ASP;
- admin UI pronta como referência operacional;
- schema de leaf implícito e testável.

## O que **não** está pronto como produto DPO2U

- policy engine DPO2U plugada nativamente ao SPP;
- fluxo institucional de emissão/revogação de credencial positiva;
- mapeamento formal `attestation DPO2U -> membership leaf lifecycle`;
- trilha de auditoria específica da DPO2U para decisões de inclusão/exclusão;
- integração automática entre `protocol-registry` do `dpo2u-stellar` e os contratos ASP do SPP.

---

## 8. Resposta objetiva às 4 perguntas da S1

| Pergunta | Resposta curta |
|---|---|
| Qual a função exata de admissão? | `insert_leaf` no contrato `asp-membership` |
| Qual o auth model? | `admin.require_auth()` por padrão; existe toggle para abrir, mas é modo inseguro/demo |
| Qual o formato do leaf? | `Poseidon2(note_public_key, membership_blinding, domain=0x01)` |
| Onde estão deploy/operator surfaces? | `deployments/scripts/deploy.sh`, `deployments/testnet/deployments.json`, `app/admin.html`, `app/js/admin.js` |

---

## 9. Recomendação de produto e arquitetura

## Recomendação v1

A DPO2U deve operar inicialmente como:

**Compliance Admission Orchestrator for SPP ASP trees**

e não como “novo gateway on-chain completo” já na primeira entrega.

### Forma prática

1. DPO2U decide off-chain / control-plane se um usuário recebe credencial positiva;
2. DPO2U obtém ou recebe o `note public key` do usuário;
3. DPO2U gera/gerencia o `membership_blinding` conforme política operacional;
4. DPO2U calcula o leaf no schema do SPP;
5. DPO2U insere esse leaf no `asp-membership` com conta admin;
6. opcionalmente insere exclusões no `asp-non-membership`;
7. o usuário então consegue provar compliance dentro do fluxo SPP.

---

## 10. S2 recomendada

## Nome
**S2 — DPO2U ASP Adapter (admin-mediated v1)**

## Entregáveis

1. **adapter spec** entre `protocol-registry` e SPP ASP;
2. função/camada que converte decisão DPO2U em:
   - `note_public_key`
   - `membership_blinding`
   - `membership_leaf`
3. executor operacional de `insert_leaf` assinado por admin;
4. trilha de auditoria:
   - quem foi admitido
   - por qual policy/scope
   - quando entrou
   - qual leaf foi inserido
   - em qual contrato/root
5. fluxo de revogação/bloqueio mapeado para `asp-non-membership`.

## Critério de pronto de S2

Uma demo real com:

`attestation/decision DPO2U -> derive leaf -> insert_leaf -> root atualizado -> user prova membership no SPP`

---

## 11. Riscos / alertas

1. **Não confundir auth administrativo com descentralização pronta.**  
   O que existe hoje é uma trilha administrada.

2. **Não usar `adminInsertOnly=false` como narrativa de produto.**  
   O próprio SPP trata isso como cenário inseguro para produção.

3. **Não prometer integração protocolar nativa DPO2U-SPP antes do adapter.**  
   O encaixe é real, mas a camada DPO2U ainda precisa ser construída.

4. **Leaf lifecycle ainda precisa governança operacional.**  
   Principalmente geração/guarda/rotação de `membership_blinding` e tratamento de revogação.

---

## 12. Veredito final

**Status da landing zone SPP:** `COMPROVADA`  
**Tipo de encaixe encontrado:** `admin-mediated ASP admission`  
**Chance de integração v1 rápida:** `alta`  
**Gateway on-chain DPO2U direto como primeiro passo:** `não recomendado`  
**Próxima sprint correta:** `S2 — adapter admin-mediated entre DPO2U e SPP`
