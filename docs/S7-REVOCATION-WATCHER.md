# S7 — Revocation Watcher / Worker

## Objetivo

Materializar um worker idempotente que observe um caso do `protocol-registry`, detecte revogação e execute automaticamente a blocked-lane no `asp-non-membership`.

## Critério de verdade

A sprint só fecha se houver:
1. worker executável;
2. caso novo onde o worker bloqueia sozinho após revogação;
3. segunda execução no mesmo caso sem duplicar o bloqueio;
4. record persistido.
