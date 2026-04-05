

# Aumentar tamanho do personagem

## Alteração

No arquivo `src/lib/gameEngine.ts`, no método `createPlayer()`, aumentar as dimensões do personagem de `48x56` para `64x74`. Também ajustar a hitbox margin no método `collides()` de `6` para `8` para manter a proporção justa.

### Arquivo: `src/lib/gameEngine.ts`
- `createPlayer()`: width `48→64`, height `56→74`
- `collides()`: margin `6→8`
- Sombra do jogador no `draw()`: raio da elipse de `20→26`

