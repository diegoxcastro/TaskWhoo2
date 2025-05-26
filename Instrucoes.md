# Instruções para Deploy do HabitTracker em Servidor Linux com Docker

Este guia detalhado mostra como subir o projeto HabitTracker em um servidor Linux com Docker e Docker Compose já instalados.

---

## 1. **Pré-requisitos**
- Docker instalado (`docker --version`)
- Docker Compose instalado (`docker compose version` ou `docker-compose version`)
- Acesso ao terminal do servidor (SSH)
- Git instalado (`git --version`)

---

## 2. **Clone o repositório**

```sh
# Substitua pelo caminho desejado
cd /home/seu-usuario

git clone https://github.com/SEU_USUARIO/HabitTracker.git
cd HabitTracker
```

> **Obs:** Se você já tem o código, apenas navegue até a pasta do projeto.

---

## 3. **Configuração de variáveis de ambiente**

O arquivo `docker-compose.yml` já está configurado para uso local. Se quiser alterar senhas, portas ou outros parâmetros, edite o arquivo conforme necessário.

Principais variáveis:
- `ADMIN_USERNAME` e `ADMIN_PASSWORD`: usuário admin inicial
- `API_KEY`: chave de API para autenticação interna
- `DATABASE_URL`: já configurada para não usar SSL no Docker

---

## 4. **Build e subida dos containers**

Execute os comandos abaixo na raiz do projeto:

```sh
docker compose build --no-cache
docker compose up -d
```

- O primeiro comando constrói as imagens do projeto.
- O segundo comando sobe os containers em segundo plano.

---

## 5. **Verifique se está rodando**

Veja os logs do backend para garantir que tudo subiu corretamente:

```sh
docker compose logs -f app
```

Procure por mensagens como:
- `✅ Database tables configuradas com sucesso`
- `serving on port 3000`

Se aparecer erro de conexão com o banco, revise a variável `DATABASE_URL`.

---

## 6. **Acessando a aplicação**

Abra o navegador e acesse:

```
http://SEU_IP_OU_DOMINIO:3000
```

- O frontend e backend estão juntos na mesma porta.
- O usuário admin padrão é:
  - **Usuário:** `awake`
  - **Senha:** `45Seo123`

---

## 7. **Comandos úteis**

- **Ver status dos containers:**
  ```sh
  docker compose ps
  ```
- **Ver logs do backend:**
  ```sh
  docker compose logs -f app
  ```
- **Ver logs do banco:**
  ```sh
  docker compose logs -f postgres
  ```
- **Parar os containers:**
  ```sh
  docker compose down
  ```
- **Reiniciar containers:**
  ```sh
  docker compose restart
  ```

---

## 8. **Dicas de segurança para produção**
- Altere as senhas padrão do banco e do admin.
- Use um domínio e configure HTTPS (recomendado para produção).
- Restrinja o acesso à porta 3000 no firewall, se necessário.
- Faça backup do volume do Postgres (`postgres_data`).

---

## 9. **Resolução de problemas**
- **Erro de conexão com o banco:**
  - Verifique se o container `postgres` está rodando.
  - Confira a variável `DATABASE_URL`.
- **Não acessa pelo navegador:**
  - Verifique se a porta 3000 está liberada no firewall do servidor.
  - Use `docker compose logs -f app` para ver mensagens de erro.
- **Login não funciona:**
  - Use o usuário e senha admin padrão.
  - Veja os logs do backend para mensagens de erro.

---

## 10. **Atualizando o sistema**

Para atualizar o código:

```sh
cd /caminho/para/HabitTracker
git pull
docker compose build --no-cache
docker compose up -d
```

---

**Pronto! O HabitTracker estará rodando no seu servidor.**

Se precisar de suporte, consulte o README do projeto ou abra uma issue no repositório. 