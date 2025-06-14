# HabitTracker API

## Autenticação

- Para acessar qualquer rota protegida, envie o header:
  ```
  x-api-key: SUA_API_KEY
  ```
  ou faça login via `/api/auth/login` e use o cookie de sessão.

## ⏱️ Funcionalidade de Duração

Todos os hábitos, diárias e afazeres agora suportam um campo `duration` que representa o tempo estimado em minutos para completar a tarefa:

- **Campo**: `duration` (número inteiro)
- **Unidade**: Minutos
- **Valor padrão**: 0 (sem duração especificada)
- **Uso**: Ajuda no planejamento e controle de tempo das atividades

### Exemplos de Uso:
- Exercício: 30 minutos
- Meditação: 10 minutos
- Leitura: 45 minutos
- Tarefa rápida: 5 minutos

---

## Endpoints e Payloads

### Hábitos

#### Listar Hábitos
```
GET /api/habits
```

#### Obter Hábito
```
GET /api/habits/:id
```

#### Criar Hábito
```
POST /api/habits
Content-Type: application/json

{
  "title": "Beber água",
  "notes": "Beber 8 copos por dia",
  "priority": "easy",
  "direction": "both",
  "positive": true,
  "negative": true,
  "duration": 5
}
```

#### Atualizar Hábito
```
PATCH /api/habits/:id
Content-Type: application/json

{
  "title": "Novo título",
  "notes": "Novas notas",
  "priority": "easy",
  "duration": 10
}
```

#### Excluir Hábito
```
DELETE /api/habits/:id
```

#### Pontuar Hábito
```
POST /api/habits/:id/score/:direction
```
Exemplo:
```
POST /api/habits/1/score/up
```

### Diárias

#### Listar Diárias
```
GET /api/dailies
```

#### Obter Diária
```
GET /api/dailies/:id
```

#### Criar Diária
```
POST /api/dailies
Content-Type: application/json

{
  "title": "Exercício diário",
  "notes": "Caminhar 30 minutos",
  "priority": "medium",
  "repeat": [true, true, true, true, true, true, true],
  "icon": "Dumbbell",
  "duration": 30
}
```

#### Atualizar Diária
```
PATCH /api/dailies/:id
Content-Type: application/json

{
  "title": "Novo título",
  "priority": "hard"
}
```

#### Excluir Diária
```
DELETE /api/dailies/:id
```

#### Marcar Diária
```
POST /api/dailies/:id/check
Content-Type: application/json

{
  "completed": true
}
```

### Afazeres

#### Listar Afazeres
```
GET /api/todos
```

#### Obter Afazer
```
GET /api/todos/:id
```

#### Criar Afazer
```
POST /api/todos
Content-Type: application/json

{
  "title": "Pagar contas",
  "notes": "Luz, água, internet",
  "priority": "hard",
  "dueDate": "2024-07-01T23:59:59.000Z",
  "duration": 15
}
```

#### Atualizar Afazer
```
PATCH /api/todos/:id
Content-Type: application/json

{
  "title": "Novo título",
  "dueDate": "2024-01-15",
  "duration": 25
}
```

#### Excluir Afazer
```
DELETE /api/todos/:id
```

#### Marcar Afazer
```
POST /api/todos/:id/check
Content-Type: application/json

{
  "completed": true
}
```

## 📊 Logs de Atividade

#### Obter Logs de Atividade
```
GET /api/stats/activity
```

## 🙏 Inspiração

Este projeto foi inspirado pelo [Habitica](https://habitica.com/), que usa RPG e gamificação para ajudar os usuários a melhorar seus hábitos e completar tarefas.

## 🤝 Contribuição

Contribuições, problemas e solicitações de novos recursos são bem-vindos!

## 📄 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo LICENSE.md para detalhes.

---

**Dúvidas? Consulte o código-fonte ou abra uma issue!**#   T a s k W h o 
 
 