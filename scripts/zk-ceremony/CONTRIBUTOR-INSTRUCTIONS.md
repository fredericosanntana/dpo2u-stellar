# Instruções por operador — contribuição na cerimônia ZK (DPO2U)

Cada operador roda **na sua própria máquina** (entropia gerada e destruída localmente).
Tempo: ~2 minutos. Em sequência: o operador _i_ recebe o `.zkey` do operador _i-1_.

## Pré
- Node ≥ 18 e snarkjs: `npm install -g snarkjs`
- O arquivo `circuit_{i-1}.zkey` (o coordenador te envia; operador 1 recebe `circuit_0000.zkey`).
- O script `03-contribute.sh` (deste diretório) — opcional; pode rodar o comando direto.

## Passo
```bash
# i = seu número na fila. Ex.: operador 1:
snarkjs zkey contribute circuit_0000.zkey circuit_0001.zkey \
  --name="<seu nome/host>" -e="<digite aqui uma string LONGA e ALEATÓRIA>"
```
- A string de entropia: bata no teclado aleatoriamente, bastante. Ela **não é salva** —
  **não anote, não reuse**. Quanto mais imprevisível, melhor.
- O comando imprime o **hash da sua contribuição**. Copie e envie ao coordenador
  (vai para a transcrição pública).

## Verificar e entregar
```bash
snarkjs zkey verify circuit_0001.zkey   # (opcional) sanity da sua etapa
```
- Envie o `circuit_{i}.zkey` gerado ao próximo operador (ou ao coordenador, se for o último)
  e publique o hash impresso.
- Apague qualquer rascunho da entropia. Pode apagar o `.zkey` antigo.

## Importante
- **Não** rode dois operadores na mesma sessão/host com a mesma entropia — a independência
  é o que dá segurança.
- O coordenador aplica o **beacon drand** (rodada 6158755, ver `TRANSCRIPT.md`) ao final —
  isso é feito uma única vez, depois de todas as contribuições.
