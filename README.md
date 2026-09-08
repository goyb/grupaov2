# Grupão Minigames — v1

## O que já funciona
- Interface preto/roxo.
- Cadastro e login por nickname + senha.
- Hash de senha com scrypt.
- Menu de minigames.
- Lobby multiplayer com código de 5 caracteres.
- Até 8 jogadores por sala.
- Pronto / Desistir.
- Quiz de Futebol com banco de 500 perguntas.
- Cada partida sorteia 200 perguntas sem repetir.
- 60 segundos por pergunta.
- Uma resposta errada ou tempo esgotado encerra a partida.
- Vitória após 200 rodadas.
- Tela de derrota/vitória com jogar novamente.

## Rodar
Requer Node.js 18+ (20+ recomendado).

```bash
npm install
npm start
```

Abra http://localhost:3000

Para multiplayer pela internet, hospede o servidor em um serviço que aceite Node.js e WebSockets/Socket.IO.

## Próxima etapa recomendada
Trocar `data/users.json` por PostgreSQL/Supabase, adicionar sessões persistentes, perfil/recordes e depois conectar o RPG ao mesmo sistema de contas.
