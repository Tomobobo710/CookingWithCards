// game/GameBotController.js
// Bot AI logic, scoring values, and bot-driven card animations for Hotpot.

class HotpotGameBotController {
    constructor(game) {
        this.game = game;
        this.audio = game.audio;
    }

    // ---------- Bot Logic ----------
    updateGameLogic(dt) {
        if (this.game.state.gamePhase === 'gameOver') {
            if (this.game.gameState !== 'gameOver') {
                this.game.gameState = 'gameOver';
                this.audio.play('win', { volume: 0.7 });
            }
            return;
        }

        // In online mode, skip bot AI for remote humans (they control their own turns)
        // Bot players still use AI
        if (this.game.networkSession && this.game.networkSession.isHost) {
            const player = this.game.state.getCurrentPlayer();
            if (!player.isHuman && !player.isRemote) {
                this.updateBotTurn(player);
            }
        } else if (!this.game.networkSession) {
            const player = this.game.state.getCurrentPlayer();
            if (!player.isHuman) {
                this.updateBotTurn(player);
            }
        }
    }

    botCardValue(card, player) {
        const allCards = player.getAllCards();

        const ingCount = {};
        const catDistinct = {};
        const catCount = {};

        for (const c of allCards) {
            const ik = c.category + '|' + c.ingredient;
            ingCount[ik] = (ingCount[ik] || 0) + 1;
            catCount[c.category] = (catCount[c.category] || 0) + 1;
            if (!catDistinct[c.category]) catDistinct[c.category] = new Set();
            catDistinct[c.category].add(c.ingredient);
        }

        const ik = card.category + '|' + card.ingredient;
        const ingTotal = ingCount[ik] || 0;
        const catTotal = catCount[card.category] || 0;
        const distinctTotal = catDistinct[card.category] ? catDistinct[card.category].size : 0;

        let value = 0;

        if (ingTotal >= 3) value += 200;
        else if (ingTotal === 2) value += 80;

        if (distinctTotal >= 3) value += 150;
        else if (distinctTotal === 2) value += 40;

        if (catTotal >= 3) value += 20;
        else if (catTotal === 2) value += 8;

        if (ingTotal >= 4) value -= 150;

        if (catTotal <= 1) value -= 15;

        return value;
    }

    animateOtherDraw(player, sourceType, sourcePlayer = null) {
        if (sourceType === 'discard' && sourcePlayer) {
            this.game.state.drawFromDiscard(player, sourcePlayer);
            if (!player.drawnCard) return;
            const rect = this.game.layout.getDiscardRect(sourcePlayer);
            player.drawnCard.x = rect.x;
            player.drawnCard.y = rect.y;
            player.drawnCard.rotation = 0;
            player.drawnCard.targetRotation = 0;
            player.drawnCard.scaleTo(0.75, true);
            player.drawnCard.faceUp = true;
            player.drawnCard.targetX = rect.x;
            player.drawnCard.targetY = rect.y;
        } else {
            this.game.state.drawFromDeck(player);
            if (!player.drawnCard) return;
            const rect = this.game.layout.getDeckRect();
            player.drawnCard.x = rect.x;
            player.drawnCard.y = rect.y;
            player.drawnCard.targetX = rect.x;
            player.drawnCard.targetY = rect.y;
            player.drawnCard.faceUp = false;
        }
        this.audio.play('draw', { volume: 0.2 });
        this.game.flow.applySpeedToCard(player.drawnCard);
    }

    animateOtherDrawnToPosition(player) {
        const rect = this.game.layout.getDrawnCardRectForPlayer(player);
        player.drawnCard.targetX = rect.x;
        player.drawnCard.targetY = rect.y;
        player.drawnCard.targetScale = 0.5;
        const handAngle = player.id === 1 ? Math.PI / 2 : (player.id === 2 ? Math.PI : -Math.PI / 2);
        player.drawnCard.targetRotation = handAngle;
    }

    animateOtherDiscardToPile(player, card) {
        const rect = this.game.layout.getDiscardRect(player);
        card.targetX = rect.x;
        card.targetY = rect.y;
        this.game.flow.applySpeedToCard(card);
    }

    finalizeOtherDiscard(player, card) {
        this.game.state.discardCard(player, card);
        this.audio.play('discard', { volume: 0.2 });
    }

    finalizeOtherDrawnToHand(player) {
        player.hand.push(player.drawnCard);
        player.drawnCard = null;
    }

    updateBotTurn(player) {
        const speedCfg = this.game.flow.getSpeedConfig();

        if (!player.botStarted) {
            player.botStarted = true;
            player.botPhase = 'idle';
            player.botTimer = 0;
            player.botDrawSource = null;
            player.botDiscardCard = null;
        }

        player.botTimer += 1;

        if (player.botPhase === 'idle') {
            if (player.botTimer >= speedCfg.botDelay) {
                player.botPhase = 'draw';
                player.botTimer = 0;

                const canSteal = [];
                for (let i = 0; i < this.game.state.players.length; i++) {
                    const p = this.game.state.players[i];
                    if (p === player) continue;
                    if (p.discardPile.length > 0) {
                        canSteal.push(p);
                    }
                }

                let bestStealValue = -Infinity;
                let bestStealTarget = null;
                for (const target of canSteal) {
                    const card = target.discardPile[target.discardPile.length - 1];
                    const v = this.botCardValue(card, player);
                    if (v > bestStealValue) {
                        bestStealValue = v;
                        bestStealTarget = target;
                    }
                }

                const cfg = HOTPOT.BOT_AI[player.difficulty] || HOTPOT.BOT_AI[2];

                if (bestStealTarget && bestStealValue >= cfg.stealThreshold) {
                    this.animateOtherDraw(player, 'discard', bestStealTarget);
                    player.botDrawSource = 'discard';
                } else {
                    this.animateOtherDraw(player, 'deck');
                    player.botDrawSource = 'deck';
                }
            }
            return;
        }

        if (player.botPhase === 'draw') {
            this.animateOtherDrawnToPosition(player);

            const drawAnimDuration = speedCfg.botDelay + speedCfg.thinkExtra;
            if (player.botTimer >= drawAnimDuration) {
                player.botPhase = 'think';
                player.botTimer = 0;
            }
            return;
        }

        if (player.botPhase === 'think') {
            const thinkDuration = speedCfg.thinkExtra * 2;
            if (player.botTimer >= thinkDuration) {
                player.botPhase = 'discard';
                player.botTimer = 0;

                const allCards = player.getAllCards();
                const scored = allCards.map(c => ({ card: c, value: this.botCardValue(c, player) }));
                scored.sort((a, b) => a.value - b.value);

                const cfg = HOTPOT.BOT_AI[player.difficulty] || HOTPOT.BOT_AI[2];
                const discardIdx = Math.min(cfg.discardIndex, scored.length - 1);
                player.botDiscardCard = scored[discardIdx].card;

                if (this.game.state.canWin(player)) {
                    this.game.flow.handleWin(player);
                    player.botStarted = false;
                    return;
                }
            }
            return;
        }

        if (player.botPhase === 'discard') {
            const isDiscardingDrawnCard = (player.botDiscardCard === player.drawnCard);

            if (isDiscardingDrawnCard) {
                this.animateOtherDiscardToPile(player, player.drawnCard);

                const discardAnimDuration = speedCfg.botDelay + speedCfg.thinkExtra;
                if (player.botTimer >= discardAnimDuration) {
                    this.finalizeOtherDiscard(player, player.drawnCard);
                    this.game.flow.endTurn();
                    player.botStarted = false;
                }
            } else {
                const discardedCard = player.botDiscardCard;
                if (discardedCard) {
                    this.animateOtherDiscardToPile(player, discardedCard);

                    const discardAnimDuration = speedCfg.botDelay + speedCfg.thinkExtra;
                    if (player.botTimer >= discardAnimDuration) {
                        this.finalizeOtherDiscard(player, discardedCard);
                        player.drawnCard.faceUp = false;
                        this.finalizeOtherDrawnToHand(player);
                        this.game.flow.endTurn();
                        player.botStarted = false;
                    }
                }
            }
            return;
        }

        if (player.botPhase === 'end') {
            const endDuration = speedCfg.botDelay + speedCfg.thinkExtra;
            if (player.botTimer >= endDuration) {
                this.game.flow.endTurn();
                player.botStarted = false;
            }
            return;
        }
    }
}
