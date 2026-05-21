# Runbook — Demo ao Vivo do Piloto Anticorrupção (testnet)

> Roteiro ensaiável para apresentar o piloto a investidor / órgão de controle.
> Duração-alvo: **5–6 minutos**. Tudo roda sobre dados públicos reais e a testnet
> Stellar — nada de slides nesta parte, é o produto funcionando.

## 0. Pré-voo (rodar 30 min antes — fora do palco)

Checklist — todos devem passar:

- [ ] `stellar --version` responde (CLI ≥ 26).
- [ ] `stellar keys ls` lista `gateway-signer` e `dpo2u-deployer`.
- [ ] `gateway-signer` financiado na testnet
      (`stellar keys fund gateway-signer --network testnet` se necessário).
- [ ] Contrato alcançável:
      `stellar contract invoke --id CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5 --source gateway-signer --network testnet -- admin`
- [ ] Painel de alertas abre: `https://dpo2u.com/pilot/alertas`
      (ou, em ensaio local, `vite preview` → `localhost:4173/pilot/alertas`).
- [ ] `npx tsx scripts/demo-live.ts` roda fim-a-fim no ensaio (atesta 1 alerta de teste).
- [ ] Stellar Expert abre: `https://stellar.expert/explorer/testnet`.
- [ ] Internet do palco testada (a demo faz 2 chamadas de rede; sem ela, ver §4).

## 1. Ato 1 — O panorama (≈ 90 s)

**Tela:** `dpo2u.com/pilot/alertas`.

**Fala:**
> "Isto não é um mockup. São compras públicas reais. Rodamos dois detectores —
> fornecedor sancionado e sobrepreço estatístico — sobre 14.430 registros do
> Compras.gov.br cruzados com as listas de sanção do Portal da Transparência."

**Mostrar, nesta ordem:**
1. Os KPIs: **1.142 alertas** · 56 de sanção vigente · **28 FAIL prospectivo** ·
   911 de sobrepreço · 6 selados on-chain.
2. O histograma de severidade — *"o threshold 3,5 é o piso de triagem; a fila do
   auditor prioriza as faixas altas — o sistema prioriza, não acusa."*
3. A cobertura: **27 UFs**, janela 2021–2026 — *"cobertura nacional, dados de hoje."*

## 2. Ato 2 — Um alerta, rastreável (≈ 90 s)

**Tela:** mesma página; clicar numa linha **FAIL de sanção** — ex.:
*DISTRIBUIDORA DE MEDICAMENTOS BACKES LTDA*.

**Fala:**
> "Cada alerta é uma ficha pronta para o auditor: fornecedor, CNPJ, órgão, data,
> item, o motivo exato do flag — e a ação sugerida, um pedido LAI com a base legal.
> Nada precisa ser reinterpretado."

Apontar o painel de drill-down: o motivo do flag, a ficha completa, a ação LAI.
Mencionar a distinção **FAIL / REVIEW**: *"uma compra anterior à sanção não é
infração — vira REVIEW, não FAIL. O sistema é honesto sobre o que viu."*

## 3. Ato 3 — A atestação nasce ao vivo (≈ 2 min)

**Tela:** terminal.

**Fala:**
> "Até aqui é detecção. O que torna isto verificável é o selo. Vou selar um alerta
> agora, na frente de vocês, na blockchain."

**Comando:**
```bash
cd /root/DPO2U/packages/pilot-gateway
npx tsx scripts/demo-live.ts
```

O script: escolhe um alerta de sobrepreço real ainda não selado → mostra a
evidência → registra a atestação no contrato → lê o contrato de volta para
confirmar o veredito. ~20 s.

**Quando aparecer o `tx …`:** copiar o hash, abrir no Stellar Expert ao vivo
(`https://stellar.expert/explorer/testnet/tx/<hash>`).

**Fala de fechamento:**
> "Esse veredito agora é imutável e público. O dado sensível nunca foi para a
> blockchain — só o hash da evidência. Qualquer auditor do TCU ou da CGU verifica
> com um comando, sem credencial, sem depender de nós. É o selo de cera, devolvido
> ao compliance."

Verificação trustless que qualquer um na plateia pode rodar depois:
```bash
stellar contract invoke --network testnet \
  --id CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5 \
  --source <qualquer-conta> -- verify_attestation \
  --use_case_id overpricing_v1 --evidence_hash <hash-da-evidência>
```

## 4. Fallbacks

| Falha no palco | Plano B |
|---|---|
| Sem internet | Usar capturas de tela do ensaio (Ato 1/2) + o vídeo do produto para o Ato 3. |
| `demo-live.ts` falha (rede/testnet) | Mostrar uma das 6 atestações já seladas direto no Stellar Expert (hashes no relatório v2, §5). |
| `gateway-signer` sem saldo | `stellar keys fund gateway-signer --network testnet` (resolver no pré-voo). |
| Todos os alertas de sobrepreço já selados | Rodar `run-real-pilot.ts` antes para gerar artefato novo, ou trocar para `sanction_check_v1` no script. |

## 5. Números de apoio (decorar)

- **1.142** alertas reais · **14.430** registros de compras públicas analisados.
- **56** fornecedores com sanção vigente; **28** compraram *depois* de sancionados.
- **911** itens com sobrepreço estatístico (Z-modificado, TCU Acórdão 1875/2021).
- Caso-âncora: **ACICLOVIR** em Boa Vista/RR — R$ 45,00 vs. mediana R$ 2,48 (**+1.715 %**).
- Contrato testnet: `CC4TJGDRWZOPGBWOOHBJF3N2VKUQRNIW6C6PTYHD7ZI3D42GBQRRZHM5`.
- Custo por atestação: frações de centavo · finalidade sub-segundo.
