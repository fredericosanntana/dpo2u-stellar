# S4 — Validação role-as-contract em DeFindex

**Status:** artefato canônico da S4  
**Pergunta central:** um contrato/control plane DPO2U pode ocupar o papel `Rebalance Manager` num vault DeFindex real?  
**Resposta curta:** **sim, em testnet isso já está validado**.

## Objetivo

Fechar com evidência a pergunta aberta da S4:

> um contrato DPO2U pode ocupar de fato um papel DeFindex no fluxo real, ou isso ainda é só hipótese de arquitetura?

## Conclusão

A conclusão honesta é:

> **sim** — o contrato/gate DPO2U já ocupa o papel `Rebalance Manager` do vault DeFindex live em testnet, e o rebalance proof-bound já foi executado com essa topologia.

Isso fecha a claim estreita de **role-as-contract validation** para o papel de rebalance no slice atual.

## Evidência direta

### 1. O `rebalance_manager` do vault live aponta para um contrato (`C...`)

Readback executado em 2026-06-20:

```bash
stellar contract invoke \
  --id CB5YHBXELSXGNWGJURUD5W23C4VVRIN7CX4WMDNZ7FR5TUVNEJPEOF5W \
  --source dpo2u-deployer \
  --network testnet \
  --send no \
  -- get_rebalance_manager
```

Resultado:

```text
"CDVOKZMLIAHSESPHH47K76X2OYYOSDFRHXSUHLXV6JRCQRYRE4SWNL3E"
```

Esse valor é um **contract id** (`C...`), não uma conta `G...`.

### 2. O gate DPO2U aponta para o vault live correto

```bash
stellar contract invoke \
  --id CDVOKZMLIAHSESPHH47K76X2OYYOSDFRHXSUHLXV6JRCQRYRE4SWNL3E \
  --source dpo2u-deployer \
  --network testnet \
  --send no \
  -- vault_contract
```

Resultado:

```text
"CB5YHBXELSXGNWGJURUD5W23C4VVRIN7CX4WMDNZ7FR5TUVNEJPEOF5W"
```

Ou seja: o vínculo **gate contrato → vault live** permanece íntegro.

### 3. O vault continua refletindo o estado pós-rebalance

```bash
stellar contract invoke \
  --id CB5YHBXELSXGNWGJURUD5W23C4VVRIN7CX4WMDNZ7FR5TUVNEJPEOF5W \
  --source dpo2u-deployer \
  --network testnet \
  --send no \
  -- fetch_total_managed_funds
```

Resultado resumido:

- `idle_amount = 1`
- `invested_amount = 1000`
- `total_amount = 1001`
- strategy allocation presente para `CDVLOSPJPQOTB6ZCWO5VSGTOLGMKTXSFWYTUP572GTPNOWX4F76X3HPM`

### 4. A rotação para contrato já estava ancorada em tx pública

Do live slice anterior:

- `set_rebalance_manager`: `2573a34bc6e76ac4f318edbf6219ae32615cdafb9c62cbd7505056a5111602bf`
- rebalance proof-bound live: `cf790f4d96e7087c0c756531d2bea89f45b88a2e1389d579ed5f9ada5832e3d5`

## O que a S4 prova

A S4 prova, de forma estreita e útil, que:

- um **contrato Soroban DPO2U** pode ocupar o papel DeFindex de **Rebalance Manager**;
- o vínculo contrato→vault foi realmente aplicado em testnet;
- a topologia não ficou só no papel: ela coexistiu com um rebalance live já executado;
- portanto a frase **role-as-contract** não é apenas tese de arquitetura neste slice.

## O que a S4 ainda não prova

A S4 **não** prova que:

- todos os papéis DeFindex podem ser ocupados por contrato com a mesma segurança;
- a DeFindex API já suporta essa surface de forma completa e pública;
- a operação inteira já está pronta para produção;
- o contrato/gate atual já cobre todas as regras finais de revogação, partner ops e governance hardening.

## Leitura estratégica

Com S1+S2+S3+S4, a tese agora fica muito mais forte:

1. **S1** definiu o primeiro circuito público: `rebalanceVault` sob `sect_cvm_175_v1`.
2. **S2** endureceu o gateway: payload canônico, hash determinístico, deny paths, unsigned XDR só após `PASS`.
3. **S3** conectou isso a um demo reproduzível e ao live slice real.
4. **S4** removeu a principal dúvida estrutural: **o papel DeFindex já pode ser ocupado por contrato DPO2U em testnet**.

## Claim pública agora suportada

A claim que agora fica suportada, sem overclaim, é:

> a DPO2U já validou em Stellar/DeFindex uma lane onde um contrato/gate ocupa o papel de `Rebalance Manager`, e uma ação privilegiada de rebalance só pode ser preparada/executada dentro do framing proof-bound ligado ao intent exato.

## Próximo passo lógico

**S5 — partner/legal validation**

O próximo passo não é mais provar arquitetura básica. É fechar:

- wording público com DeFindex/parceiro;
- limites explícitos de API/operator surface;
- validação jurídica/claim boundary para uso externo.
