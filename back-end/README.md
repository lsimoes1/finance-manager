# Finance Manager — API local (SQLite)

Este README documenta o script `server.js` em `back-end/`.

## O que é
Uma API Node.js minimalista que usa SQLite (`better-sqlite3`) para armazenar dados localmente. Suporta:
- Categorias
- Métodos de pagamento
- Recorrências (fixas ou parceladas)
- Transações avulsas e geradas a partir de recorrências

## Arquitetura de dados (tabelas)
- `categorias`:
  - `id` INTEGER PK
  - `nome` TEXT NOT NULL

- `metodos_pagamento`:
  - `id` INTEGER PK
  - `nome` TEXT NOT NULL

- `recorrencias`:
  - `id` INTEGER PK
  - `descricao` TEXT NOT NULL
  - `valor` REAL NOT NULL
  - `categoria_id` INTEGER FK -> `categorias.id`
  - `metodo_pagamento_id` INTEGER FK -> `metodos_pagamento.id`
  - `dia_vencimento` INTEGER NOT NULL (1-31)
  - `tipo_id` INTEGER NOT NULL -> FK `transacao_tipos(id)` (ver tabela de domínio)
  - `total_parcelas` INTEGER NULL (aplicável a `parcelada`)
  - `parcelas_restantes` INTEGER NULL (aplicável a `parcelada`)

- `transacoes`:
  - `id` INTEGER PK
  - `descricao` TEXT NOT NULL
  - `valor` REAL NOT NULL
  - `data` TEXT NOT NULL (YYYY-MM-DD)
  - `categoria_id` INTEGER FK
  - `metodo_pagamento_id` INTEGER FK
  - `tipo_id` INTEGER NOT NULL -> FK `transacao_tipos(id)` (1=avulsa,2=fixa,3=parcelada)
  - `parcela_atual` INTEGER NULL (se for parcela)
  - `recorrencia_id` INTEGER NULL (se vier de uma recorrência)
  - `created_at` TEXT DEFAULT now

TABELA DE DOMÍNIO:
- `transacao_tipos`:
  - `id` INTEGER PK (1=avulsa, 2=fixa, 3=parcelada)
  - `nome` TEXT

## Como rodar (local)
1. Abra um terminal na pasta `back-end`.
2. Instale dependências (se houver `package.json`):

```bash
npm install express cors better-sqlite3
```

3. Inicie a API:

```bash
node server.js
```

A API escuta na porta `3000` por padrão.

## Endpoints e exemplos (JSON)
- Cabeçalho comum: `Content-Type: application/json`

1) POST /categorias
Body:
```json
{ "nome": "Alimentação" }
```
Resposta (201):
```json
{ "ok": true, "id": 1 }
```

2) GET /categorias
(no body)
Resposta (200): array de categorias

3) PUT /categorias/:id
Body:
```json
{ "nome": "Supermercado" }
```
Resposta (200): `{ "ok": true }`

4) POST /metodos-pagamento
Body:
```json
{ "nome": "Cartão de Crédito" }
```
Resposta (201): `{ "ok": true, "id": 1 }`

5) GET /metodos-pagamento
(no body)

6) PUT /metodos-pagamento/:id
Body:
```json
{ "nome": "Boleto" }
```

7) POST /recorrencias
Esta rota foi removida. Crie recorrências e transações usando `POST /transacoes` com o campo `tipo` (`fixa` ou `parcelada`). Veja as instruções em `POST /transacoes`.

8) POST /recorrencias/gerar-mensal
Esta rota foi removida. Use `POST /transacoes` com `tipo` apropriado para criar recorrências e suas transações.

9) POST /transacoes
Responsabilidade estendida: além de inserir transações avulsas, este endpoint pode criar `recorrencias` quando o payload incluir `tipo`.

Exemplo (transação avulsa):
```json
{
  "descricao": "Almoço",
  "valor": 35.5,
  "data": "2026-03-15",
  "categoria_id": 1,
  "metodo_pagamento_id": 1
}
```

Exemplo (criar recorrência fixa — cria rec e transação inicial):
```json
{
  "descricao": "Assinatura X",
  "valor": 29.9,
  "data": "2026-03-15",
  "categoria_id": 1,
  "metodo_pagamento_id": 1,
  "tipo": "fixa",
  "dia_vencimento": 5
}
```

Exemplo (criar recorrência parcelada — cria rec e todas as parcelas):
```json
{
  "descricao": "Celular",
  "valor": 1200,
  "data": "2026-03-20",
  "categoria_id": 3,
  "metodo_pagamento_id": 1,
  "tipo": "parcelada",
  "total_parcelas": 12,
  "dia_vencimento": 20
}
```

Respostas:
- Para `tipo: "fixa"`: `{ "ok": true, "recorrencia_id": <id> }` (201)
- Para `tipo: "parcelada"`: `{ "ok": true, "recorrencia_id": <id>, "parcelas": <n>, "transacao_ids": [...] }` (201)
- Para transação avulsa: `{ "ok": true, "id": <id> }` (201)

10) PUT /transacoes/:id
Body (enviar os campos a atualizar):
```json
{
  "descricao": "Almoço com cliente",
  "valor": 45.0,
  "data": "2026-03-15",
  "categoria_id": 1,
  "metodo_pagamento_id": 1,
  "parcela_atual": null
}
```
Resposta: `{ "ok": true }`

11) DELETE /transacoes/:id
(no body)
Resposta: `{ "ok": true }`

12) GET /transacoes
(no body)
Resposta: array de transações

## Boas práticas e pontos a melhorar
- Exibir recorrências fixas no front-end: o servidor cria a `recorrencia` (quando solicitado), mas não gera cobranças mensais automaticamente — o front-end deve mostrar a recorrência em meses futuros ou você pode optar por agendar um job backend se preferir geração automática.
- Evitar duplicação: ao criar transações/recorrências, implemente checagens (por exemplo, verificar existência de recorrência similar ou transação no mesmo mês) para evitar inserções duplicadas.
- Adicionar autenticação/autorizações se a API for exposta além do ambiente local.
- Validar ranges e tipos: por exemplo `dia_vencimento` entre 1 e 31, `valor` maior que zero, `total_parcelas` inteiro positivo.
 - Considere usar transações de banco (`BEGIN/COMMIT`) ao criar recorrência + múltiplas parcelas para garantir atomicidade.

---

Arquivo fonte: `server.js` (em `back-end/`).

Se quiser, eu gero uma collection do Insomnia/Postman pronta para importar com todos os exemplos acima.