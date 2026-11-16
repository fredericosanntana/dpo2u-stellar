# Instruções ao contribuidor — cerimônia da Prova de Solvência (BN254)

Você é um dos N (≥ 3) contribuidores independentes. A segurança de toda a cerimônia
depende de **pelo menos um** contribuidor ter gerado entropia imprevisível e tê-la
destruído. Se for você, ninguém — nem a DPO2U — consegue forjar provas de solvência.

Tempo: ~5 minutos (mais o download de ~5 MB). Você recebe `por_{i-1}.zkey` e devolve `por_{i}.zkey`.

## Requisitos (o que torna sua contribuição válida para produção)
- Você é de uma **organização diferente** da DPO2U e dos demais contribuidores, e
  contribui por iniciativa própria (ninguém opera sua máquina por você).
- **Máquina sua**, de preferência uma VM efêmera ou máquina offline, destruída/desligada
  depois. Nunca a mesma máquina de outro contribuidor.
- Um **canal público seu** (repositório, gist ou post assinado com uma chave sua) onde
  você publica os hashes. Publicação feita só pelo coordenador não conta.

## 1. Preparar e conferir a entrada
```bash
git clone <repo> && cd <repo>/scripts/zk-ceremony-por
./00-compile.sh          # compila o circuito; anote r1cs_sha256 e compare com o anunciado
./01-phase1.sh           # baixa o ptau público e confere o blake2b publicado pelo snarkjs
cp <onde-recebeu>/por_000{i-1}.zkey ../../zk-prover/por/build/ceremony/
sha256sum ../../zk-prover/por/build/ceremony/por_000{i-1}.zkey   # == publicado pelo anterior?
```

## 2. Contribuir
```bash
W=../../zk-prover/por/build/ceremony
./03-contribute.sh $W/por_000{i-1}.zkey $W/por_000{i}.zkey "<Seu nome> (<Organização>)"
```
- O script verifica a entrada (`ZKey Ok`) e só então chama o snarkjs, que **pede a
  entropia no terminal**. Digite uma sequência longa e aleatória (bata no teclado por
  ~20 s). Ela não vai para arquivo, argumento de linha de comando nem histórico.
- **Não use** `ENTROPY_SOURCE=urandom` — é só para o ensaio automatizado.
- Não anote, não reuse, não fotografe a entropia.

## 3. Publicar
O script imprime três coisas — publique-as **no seu canal**, com data/hora:
```
contribuidor     : <nome> (<organização>)
sha256(saída)    : <64 hex>
contribution hash: <128 hex>
```
Envie `por_000{i}.zkey` ao próximo contribuidor (ou ao coordenador, se for o último).

## 4. Descartar
Feche o terminal, desligue a máquina ou destrua a VM. Opcional mas recomendado: publique
uma declaração assinada de que a entropia foi descartada e não foi registrada.

## 5. Conferir o resultado final
Quando o coordenador publicar `por_final.zkey` + `manifest.txt`:
```bash
./verify-transcript.sh <pasta-com-os-zkeys> manifest.txt
```
Confirme que **o seu** contribution hash aparece na cadeia ("contribuição i: hash publicado
aparece na cadeia") e que o beacon é o que foi anunciado antes da 1ª contribuição.

## Não faça
- Não contribua duas vezes, nem empreste sua máquina a outro contribuidor.
- Não contribua sem antes conferir o sha256 da entrada contra o publicado.
- Não aceite que o coordenador rode o comando por você.
