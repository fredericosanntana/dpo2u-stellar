# S6 — Registry Revoke -> Blocked Lane

## Objetivo

Acoplar a revogação canônica do `protocol-registry` à geração e execução de uma ação concreta no `asp-non-membership`.

## Critério de verdade

A sprint só fecha se houver:
1. revogação real no registry;
2. decisão revogada extraída do registry vivo;
3. helper que transforme essa decisão em ação blocked-lane;
4. execução real do `insert_leaf` correspondente no `asp-non-membership`;
5. record fim-a-fim persistido.

## Regra canônica usada nesta sprint

O `blocked key` é `operator.note_public_key`, desde que seja um escalar válido no domínio BN254.
