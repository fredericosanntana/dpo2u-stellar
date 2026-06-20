# S4 Role-as-Contract Validation Report — 2026-06-20

## Objetivo
Responder com evidência se a DPO2U já validou a tese de `role-as-contract` na surface DeFindex escolhida para o circuito S1.

## Readbacks executados
```bash
stellar contract invoke --id CB5YHBXELSXGNWGJURUD5W23C4VVRIN7CX4WMDNZ7FR5TUVNEJPEOF5W --source dpo2u-deployer --network testnet --send no -- get_rebalance_manager
stellar contract invoke --id CDVOKZMLIAHSESPHH47K76X2OYYOSDFRHXSUHLXV6JRCQRYRE4SWNL3E --source dpo2u-deployer --network testnet --send no -- vault_contract
stellar contract invoke --id CB5YHBXELSXGNWGJURUD5W23C4VVRIN7CX4WMDNZ7FR5TUVNEJPEOF5W --source dpo2u-deployer --network testnet --send no -- fetch_total_managed_funds
```

## Resultados
- `get_rebalance_manager` => `CDVOKZMLIAHSESPHH47K76X2OYYOSDFRHXSUHLXV6JRCQRYRE4SWNL3E`
- `vault_contract` do gate => `CB5YHBXELSXGNWGJURUD5W23C4VVRIN7CX4WMDNZ7FR5TUVNEJPEOF5W`
- `fetch_total_managed_funds` => idle `1`, invested `1000`, total `1001`

## Interpretação
Isso confirma que:
1. o `Rebalance Manager` do vault é um **contrato** (`C...`), não uma conta EOA;
2. esse contrato é o gate DPO2U já usado no slice proof-bound;
3. a ligação gate→vault continua íntegra;
4. o estado do vault permanece coerente com o rebalance live já executado.

## Conclusão
**S4 fechada em testnet:** role-as-contract está validado para a lane `rebalanceVault` / `defindex_rebalance_v1`.

## Limite honesto
Ainda não está validado que:
- outros papéis DeFindex sigam a mesma semântica sem ajuste;
- a surface de API parceira esteja madura para operação pública completa;
- os controles de produção já estejam fechados.

## Próximo passo real
Subir para **S5 — partner/legal validation**, porque o blocker remanescente agora é de claim boundary e alinhamento externo, não de arquitetura base.
