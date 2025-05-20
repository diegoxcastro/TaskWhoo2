# TaskVida

TaskVida é uma plataforma de gerenciamento de hábitos e tarefas inspirada em Habitica, que permite aos usuários acompanhar tarefas diárias e desenvolver hábitos saudáveis através de elementos de gamificação.

![TaskVida Logo](https://i.imgur.com/EWfXGNJ.png)

## 🌟 Características

- **Sistema de autenticação** para gerenciar contas de usuários
- **Três tipos de tarefas**:
  - **Hábitos**: tarefas recorrentes que podem ser positivas ou negativas
  - **Diárias**: tarefas que precisam ser concluídas diariamente
  - **Afazeres**: tarefas únicas que precisam ser concluídas uma vez
- **Sistema de gamificação** com XP, níveis e recompensas
- **Filtragem de tarefas** por estado de conclusão
- **Estatísticas** para acompanhar o progresso
- **API RESTful** completa para integração com outros sistemas

## 💻 Tecnologias

- **Frontend**: React, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express
- **Base de dados**: PostgreSQL
- **ORM**: Drizzle ORM

## 🚀 Instalação e Execução

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/taskvida.git
cd taskvida
```

2. Instale as dependências:
```bash
npm install
```

3. Configure o banco de dados PostgreSQL:
```bash
npm run db:push
```

4. Inicie a aplicação:
```bash
npm run dev
```

5. Acesse no navegador:
```
http://localhost:5000
```

## 📊 Sistema de Pontos e Recompensas

O TaskVida utiliza um sistema de pontos baseado na dificuldade das tarefas:

| Prioridade | Pontos XP (Concluir) | Penalidade (Falhar) |
|------------|----------------------|---------------------|
| Trivial    | 1 XP                 | -0.5 XP             |
| Fácil      | 2 XP                 | -1 XP               |
| Médio      | 5 XP                 | -2.5 XP             |
| Difícil    | 10 XP                | -5 XP               |

### Níveis

Os usuários sobem de nível à medida que ganham experiência:

- Nível 1: 0-50 XP
- Nível 2: 51-100 XP
- Nível 3: 101-150 XP
- Nível n: (n-1)*50+1 até n*50 XP

## 📱 API

A TaskVida oferece uma API RESTful completa para integração com outros sistemas. Todos os endpoints requerem autenticação, exceto para registro e login.

### Autenticação

#### Registrar Usuário
```
POST /api/auth/register
Content-Type: application/json

{
  "username": "example",
  "password": "password"
}
```

#### Login
```
POST /api/auth/login
Content-Type: application/json

{
  "username": "example",
  "password": "password"
}
```

#### Verificar Autenticação
```
GET /api/auth/check
```

#### Logout
```
POST /api/auth/logout
```

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
  "notes": "8 copos por dia",
  "priority": "medium",
  "direction": "positive"
}
```

#### Atualizar Hábito
```
PATCH /api/habits/:id
Content-Type: application/json

{
  "title": "Novo título",
  "notes": "Novas notas",
  "priority": "easy"
}
```

#### Excluir Hábito
```
DELETE /api/habits/:id
```

#### Pontuar Hábito
```
POST /api/habits/:id/score
Content-Type: application/json

{
  "direction": "up"
}
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
  "title": "Exercício matinal",
  "notes": "30 minutos de caminhada",
  "priority": "medium",
  "repeat": [true, true, true, true, true, true, true],
  "icon": "Activity"
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
  "title": "Comprar mantimentos",
  "notes": "Leite, pão, frutas",
  "priority": "easy",
  "dueDate": "2023-12-31"
}
```

#### Atualizar Afazer
```
PATCH /api/todos/:id
Content-Type: application/json

{
  "title": "Novo título",
  "dueDate": "2024-01-15"
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
GET /api/activity
```

## 🙏 Inspiração

Este projeto foi inspirado pelo [Habitica](https://habitica.com/), que usa RPG e gamificação para ajudar os usuários a melhorar seus hábitos e completar tarefas.

## 🤝 Contribuição

Contribuições, problemas e solicitações de novos recursos são bem-vindos!

## 📄 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo LICENSE.md para detalhes.