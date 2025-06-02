# Funcionalidade de Avatar do Usuário

Esta documentação descreve a implementação da funcionalidade de upload e gerenciamento de avatar para usuários na plataforma TaskVida.

## Funcionalidades Implementadas

### 1. Upload de Imagem Personalizada
- **Formatos suportados**: JPEG, PNG, GIF, WebP
- **Tamanho máximo**: 5MB
- **Armazenamento**: Base64 no banco de dados
- **Validação**: Tipo de arquivo e tamanho são validados tanto no frontend quanto no backend

### 2. Avatares Predefinidos
- Lista de 5 avatares predefinidos do Unsplash
- Seleção rápida através de interface visual
- Imagens otimizadas (80x80px)

### 3. Remoção de Avatar
- Opção para remover a foto atual
- Retorna ao avatar padrão (primeiro da lista de predefinidos)
- Confirmação visual através de interface

## Implementação Técnica

### Backend (Node.js/Express)

#### Rotas Implementadas:

1. **POST /api/user/avatar** - Upload de nova imagem
   - Middleware: `multer` para processamento de arquivos
   - Validação de tipo e tamanho
   - Conversão para Base64
   - Atualização no banco de dados

2. **DELETE /api/user/avatar** - Remoção de avatar
   - Define avatar como `null` no banco
   - Retorna usuário atualizado

3. **PATCH /api/user** - Atualização de perfil (existente, melhorada)
   - Suporte para atualização de avatar via URL
   - Usado para avatares predefinidos

#### Validações de Segurança:
- Verificação de autenticação obrigatória
- Validação de tipos MIME permitidos
- Limite de tamanho de arquivo (5MB)
- Sanitização de dados de entrada

### Frontend (React/TypeScript)

#### Componentes Modificados:

1. **UserProfile.tsx**
   - Interface visual para gerenciamento de avatar
   - Modal com opções de upload, seleção e remoção
   - Estados de loading para feedback visual
   - Validação no frontend antes do envio

2. **useUser.ts** (Hook personalizado)
   - `uploadAvatar()` - Função para upload de arquivo
   - `removeAvatar()` - Função para remoção
   - `updateProfile()` - Atualização de perfil (existente)
   - Estados de loading para cada operação
   - Tratamento de erros com toast notifications

#### Interface do Usuário:
- Botão de câmera sobreposto ao avatar atual
- Modal com três seções:
  1. Upload de arquivo personalizado
  2. Seleção de avatares predefinidos
  3. Remoção de avatar atual (se existir)
- Feedback visual durante operações (spinners)
- Mensagens de sucesso/erro via toast

## Fluxo de Uso

### Upload de Imagem Personalizada:
1. Usuário clica no ícone de câmera no avatar
2. Modal abre com opções
3. Clica em "Escolher arquivo"
4. Seleciona imagem do dispositivo
5. Validação automática (tipo/tamanho)
6. Upload e atualização automática
7. Feedback de sucesso/erro

### Seleção de Avatar Predefinido:
1. Usuário clica no ícone de câmera
2. Modal abre
3. Clica em um dos avatares predefinidos
4. Atualização imediata
5. Modal fecha automaticamente

### Remoção de Avatar:
1. Usuário clica no ícone de câmera
2. Modal abre (opção só aparece se há avatar personalizado)
3. Clica em "Remover foto atual"
4. Avatar volta ao padrão
5. Confirmação via toast

## Considerações de Performance

### Otimizações Implementadas:
- Imagens convertidas para Base64 apenas no backend
- Validação no frontend evita uploads desnecessários
- Cache de queries invalidado apenas quando necessário
- Avatares predefinidos servidos via CDN (Unsplash)

### Limitações Atuais:
- Armazenamento em Base64 pode aumentar tamanho do banco
- Sem compressão automática de imagens
- Sem redimensionamento automático

## Melhorias Futuras Sugeridas

1. **Compressão de Imagens**
   - Implementar redimensionamento automático
   - Compressão antes do armazenamento
   - Múltiplos tamanhos (thumbnail, perfil, etc.)

2. **Armazenamento Externo**
   - Migrar para serviços como AWS S3, Cloudinary
   - Reduzir carga no banco de dados
   - Melhor performance de carregamento

3. **Mais Opções de Avatar**
   - Gerador de avatares (iniciais, padrões geométricos)
   - Integração com Gravatar
   - Mais avatares predefinidos

4. **Funcionalidades Avançadas**
   - Crop/edição básica de imagens
   - Filtros e efeitos
   - Histórico de avatares

## Dependências Adicionadas

Nenhuma nova dependência foi necessária. A implementação utilizou:
- `multer` (já existente) - Upload de arquivos
- `@radix-ui/react-dialog` (já existente) - Modal
- `lucide-react` (já existente) - Ícones
- APIs nativas do browser para FileReader e FormData

## Testes Recomendados

1. **Testes de Upload**
   - Arquivos válidos (JPEG, PNG, GIF, WebP)
   - Arquivos inválidos (PDF, TXT, etc.)
   - Arquivos muito grandes (>5MB)
   - Arquivos corrompidos

2. **Testes de Interface**
   - Responsividade do modal
   - Estados de loading
   - Mensagens de erro/sucesso
   - Navegação entre opções

3. **Testes de Segurança**
   - Upload sem autenticação
   - Tentativas de upload de arquivos maliciosos
   - Validação de tamanho no backend

4. **Testes de Performance**
   - Upload de múltiplas imagens
   - Comportamento com conexão lenta
   - Uso de memória durante upload