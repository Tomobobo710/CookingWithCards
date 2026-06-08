// game/rendering/GameTableRenderer.js
// Renders the in-table game scene: deck, discards, hands, turn info, game-over overlay.

class HotpotGameTableRenderer {
    constructor(game) {
        this.game = game;
        this.ctx = game.gameCtx;
        this.input = game.input;
        this.nameplate = new NamePlateRenderer(game);
    }

    updateCards() {
        for (const player of this.game.state.players) {
            for (const card of player.hand) {
                if (card.update) card.update();
            }
            if (player.drawnCard && player.drawnCard.update) {
                player.drawnCard.update();
            }
            for (const set of player.sets) {
                for (const card of set) {
                    if (card.update) card.update();
                }
            }
            for (const card of player.discardPile) {
                if (card.update) card.update();
            }
        }
        for (const card of this.game.state.deck) {
            if (card.update) card.update();
        }
    }

    setGlowingForLocalPlayer() {
        if (this.game.gameState !== 'playing' && this.game.gameState !== 'gameOver' && this.game.gameState !== 'onlineMultiplayer') {
            for (const player of this.game.state.players) {
                for (const card of player.hand) card.glowing = false;
                if (player.drawnCard) player.drawnCard.glowing = false;
            }
            for (const card of this.game.state.deck) card.glowing = false;
            return;
        }

        for (const player of this.game.state.players) {
            for (const card of player.hand) card.glowing = false;
            for (const card of player.discardPile) card.glowing = false;
            if (player.drawnCard) player.drawnCard.glowing = false;
        }
        for (const card of this.game.state.deck) card.glowing = false;

        const localPlayer = this.game.flow.findLocalPlayer();

        let isLocalTurn = false;
        if (this.game.networkSession && this.game.networkSession.localPlayerIndex !== undefined) {
            isLocalTurn = this.game.networkSession.gameState.currentPlayerIndex === this.game.networkSession.localPlayerIndex;
        } else {
            isLocalTurn = this.game.state.getCurrentPlayer() === localPlayer;
        }

        if (!isLocalTurn) return;

        if (this.game.turnPhase === 'draw') {
            for (const player of this.game.state.players) {
                if (player === localPlayer) continue;
                if (player.discardPile.length > 0) {
                    const topCard = player.discardPile[player.discardPile.length - 1];
                    topCard.glowing = true;
                }
            }
        }

        if (this.game.turnPhase === 'discard') {
            for (const card of localPlayer.hand) {
                card.glowing = true;
            }
            if (localPlayer.drawnCard) {
                localPlayer.drawnCard.glowing = true;
            }
        }
    }

    drawGameTable() {
        this.setGlowingForLocalPlayer();

        const currentPlayer = this.game.state.getCurrentPlayer();

        this.drawDeck();
        this.drawDiscardPiles();
        this.drawSettingsButton();

        let localPlayerIndex = 0;
        if (this.game.networkSession) {
            for (let i = 0; i < this.game.state.players.length; i++) {
                if (this.game.state.players[i].isLocal) { localPlayerIndex = i; break; }
            }
        } else {
            for (let i = 0; i < this.game.state.players.length; i++) {
                if (this.game.state.players[i].isHuman) { localPlayerIndex = i; break; }
            }
        }

        const localPlayer = this.game.state.players[localPlayerIndex];
        this.drawLocalPlayerHand(localPlayer);

        const visualSlots = [1, 2, 3];
        let slotIdx = 0;
        for (let offset = 1; offset < this.game.state.players.length; offset++) {
            const remoteIdx = (localPlayerIndex + offset) % this.game.state.players.length;
            if (remoteIdx >= this.game.state.players.length) continue;
            const p = this.game.state.players[remoteIdx];
            const visualPos = visualSlots[slotIdx % visualSlots.length];
            this.drawOtherPlayerHand(p, visualPos);
            slotIdx++;
        }

        this._nameplatePositions = [];
        slotIdx = 0;
        for (let offset = 1; offset < this.game.state.players.length; offset++) {
            const remoteIdx = (localPlayerIndex + offset) % this.game.state.players.length;
            if (remoteIdx >= this.game.state.players.length) continue;
            this._nameplatePositions.push({ player: this.game.state.players[remoteIdx], index: visualSlots[slotIdx % visualSlots.length] });
            slotIdx++;
        }

        this.drawNameplateOverlay();

        if (this.game.gameState === 'gameOver') {
            this.drawGameOver();
        } else {
            this.drawTurnInfo(currentPlayer);
            let isLocalTurn = false;
            if (this.game.networkSession && this.game.networkSession.localPlayerIndex !== undefined) {
                isLocalTurn = this.game.networkSession.gameState.currentPlayerIndex === this.game.networkSession.localPlayerIndex;
            } else {
                isLocalTurn = currentPlayer && currentPlayer.isHuman;
            }
            if (isLocalTurn) {
                this.drawHumanPrompt(currentPlayer);
            }
        }

        if (this.game.state.messageTimer > 0) {
            this.drawMessage();
        }

        if (this.game.networkSession && this.game.countdown) {
            const cd = this.game.countdown;
            if (cd.active && cd.phase === 'countdown' && cd.countdownNumber) {
                this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
                this.ctx.fillRect(0, 0, HOTPOT.WIDTH, HOTPOT.HEIGHT);
                this.ctx.fillStyle = HOTPOT.COLORS.HIGHLIGHT;
                this.ctx.font = 'bold 80px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(cd.countdownNumber, HOTPOT.WIDTH / 2, HOTPOT.HEIGHT / 2 + 25);
            } else if (cd.active && cd.phase === 'go') {
                this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
                this.ctx.fillRect(0, 0, HOTPOT.WIDTH, HOTPOT.HEIGHT);
                this.ctx.fillStyle = '#90ee90';
                this.ctx.font = 'bold 60px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('LET\'S EAT!', HOTPOT.WIDTH / 2, HOTPOT.HEIGHT / 2 + 20);
            }
        }
    }

    drawNameplateOverlay() {
        if (!this._nameplatePositions) return;
        for (const { player, index } of this._nameplatePositions) {
            const w = this.nameplate.computeWidth(player);
            let plateX, plateY;
            if (index === 1) {
                plateX = 8;
                plateY = HOTPOT.HEIGHT / 2 - NAMEPLATE.height / 2;
            } else if (index === 3) {
                plateX = HOTPOT.WIDTH - w - 8;
                plateY = HOTPOT.HEIGHT / 2 - NAMEPLATE.height / 2;
            } else {
                plateX = HOTPOT.WIDTH / 2 - w / 2;
                plateY = 4;
            }
            this.nameplate.draw(player, index, plateX, plateY);
        }

        const localPlayer = this.game.flow.findLocalPlayer();
        if (localPlayer) {
            const displayName = localPlayer.isLocal ? (localPlayer.name === 'You' ? 'You' : localPlayer.name) : localPlayer.name;
            const tempPlayer = { name: displayName, isHuman: true, isLocal: true, isRemote: false, difficulty: 2 };
            const w = this.nameplate.computeWidth(tempPlayer);
            const plateX = HOTPOT.WIDTH / 2 - w / 2;
            const plateY = HOTPOT.HEIGHT - NAMEPLATE.height - 4;
            this.nameplate.draw(tempPlayer, 0, plateX, plateY);
        }
    }

    drawDeck() {
        const rect = this.game.layout.getDeckRect();
        const player = this.game.state.getCurrentPlayer();
        let isMyTurn = false;
        let deckLength = this.game.state.deck.length;
        if (this.game.networkSession && !this.game.networkSession.isHost) {
            isMyTurn = this.game.networkSession.gameState.currentPlayerIndex === this.game.networkSession.localPlayerIndex;
            const remoteGame = this.game.networkSession.syncSystem ? this.game.networkSession.syncSystem.getRemote("game") : null;
            if (remoteGame && typeof remoteGame.deckCount === "number") {
                deckLength = remoteGame.deckCount;
            }
        } else {
            const localPlayer = this.game.flow.findLocalPlayer();
            isMyTurn = player === localPlayer;
        }
        const isClickable = isMyTurn && this.game.turnPhase === 'draw' && deckLength > 0;

        this.ctx.fillStyle = isClickable ? '#a00000' : HOTPOT.COLORS.DECK;
        this.ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        this.ctx.strokeStyle = HOTPOT.COLORS.UI_BORDER;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);

        this.ctx.fillStyle = HOTPOT.COLORS.TEXT;
        this.ctx.font = '26px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('🀄', rect.x + rect.w / 2, rect.y + rect.h / 2 + 8);

        if (isClickable && this.game.state.deck.length > 0) {
            this.ctx.fillStyle = '#ff6666';
            this.ctx.font = '11px Arial';
        }
    }

    drawDiscardPiles() {
        const player = this.game.state.getCurrentPlayer();
        let isMyTurn = false;
        if (this.game.networkSession && this.game.networkSession.localPlayerIndex !== undefined) {
            isMyTurn = this.game.networkSession.gameState.currentPlayerIndex === this.game.networkSession.localPlayerIndex;
        } else {
            isMyTurn = player && player.isHuman;
        }
        const isClickable = isMyTurn && this.game.turnPhase === 'draw';

        for (let i = 0; i < this.game.state.players.length; i++) {
            const p = this.game.state.players[i];
            const rect = this.game.layout.getDiscardRect(p);
            const canClick = isClickable && i !== player.id && p.discardPile.length > 0;

            if (p.discardPile.length > 0) {
                const topCard = p.discardPile[p.discardPile.length - 1];
                topCard.moveTo(rect.x, rect.y);
                topCard.scaleTo(HOTPOT.LAYOUT.CARD_SCALE);
                topCard.draw(this.ctx);
            } else {
                this.ctx.fillStyle = 'rgba(80,40,20,0.6)';
                this.ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
                this.ctx.strokeStyle = '#555';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
            }

            if (canClick) {
                this.ctx.fillStyle = '#ffcc00';
                this.ctx.font = '10px Arial';
            }
        }
    }

    drawSettingsButton() {
        if (this.game.settingsOpen) return;
        const btn = this.game.settingsButton;
        const pointer = this.input.getPointerPosition();
        btn.hovered = pointer.x >= btn.x && pointer.x <= btn.x + btn.w && pointer.y >= btn.y && pointer.y <= btn.y + btn.h;

        this.ctx.fillStyle = btn.hovered ? HOTPOT.COLORS.HIGHLIGHT : 'rgba(60,30,15,0.8)';
        this.ctx.fillRect(btn.x, btn.y, btn.w, btn.h);
        this.ctx.strokeStyle = HOTPOT.COLORS.UI_BORDER;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(btn.x, btn.y, btn.w, btn.h);
        this.ctx.fillStyle = HOTPOT.COLORS.TEXT;
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('\u2699 Settings', btn.x + btn.w / 2, btn.y + btn.h / 2 + 4);

        if (this.input.isLeftMouseButtonJustPressed() && btn.hovered) {
            this.game.openSettingsModal();
        }
    }

    drawLocalPlayerHand(player) {
        const handRects = this.game.layout.getHandCardRects(player);

        for (let i = 0; i < player.hand.length; i++) {
            const card = player.hand[i];
            const rect = handRects[i];
            card.scaleTo(HOTPOT.LAYOUT.CARD_SCALE);
            card.moveTo(rect.x, rect.y);
            card.draw(this.ctx);
        }

        if (handRects.length > 0) {
            let catStart = 0;
            let curCat = player.hand[0].category;
            for (let i = 1; i <= player.hand.length; i++) {
                const card = i < player.hand.length ? player.hand[i] : null;
                if (!card || card.category !== curCat) {
                    const sx = handRects[catStart].x;
                    const ex = handRects[i - 1].x + HOTPOT.LAYOUT.CARD_WIDTH;
                    this.ctx.fillStyle = HOTPOT.CATEGORIES[curCat].color;
                    this.ctx.font = 'bold 9px Arial';
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'bottom';
                    this.ctx.fillText(HOTPOT.CATEGORIES[curCat].icon + ' ' + curCat, (sx + ex) / 2, HOTPOT.LAYOUT.HAND_Y - 4);
                    if (i < player.hand.length) { catStart = i; curCat = card.category; }
                }
            }
            this.ctx.textBaseline = 'alphabetic';
        }

        if (player.drawnCard) {
            const drawnRect = this.game.layout.getDrawnCardRect();
            const card = player.drawnCard;
            card.moveTo(drawnRect.x, drawnRect.y);
            card.scaleTo(HOTPOT.LAYOUT.CARD_SCALE);
            card.draw(this.ctx);

            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('DRAWN', drawnRect.x + drawnRect.w / 2, drawnRect.y - 8);
        }

        if (player.sets.length > 0) {
            this.ctx.fillStyle = '#90ee90';
            this.ctx.font = '12px Arial';
            this.ctx.textAlign = 'left';
            this.ctx.fillText(`Locked sets: ${player.sets.length}`, 10, HOTPOT.LAYOUT.HAND_Y - 6);
        }
    }

    drawOtherPlayerHand(player, index) {
        const cards = player.hand;
        if (cards.length === 0) return;

        const cardScale = HOTPOT.LAYOUT.OTHER_CARD_SCALE;
        const spacing = HOTPOT.LAYOUT.OTHER_CARD_SPACING;
        const fw = HOTPOT.LAYOUT.CARD_BASE_WIDTH * cardScale;
        const fh = HOTPOT.LAYOUT.CARD_BASE_HEIGHT * cardScale;
        const handAngle = index === 1 ? Math.PI / 2 : (index === 2 ? Math.PI : -Math.PI / 2);

        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            card.scaleTo(cardScale);
            if (this.game.gameState !== 'gameOver') card.faceUp = false;

            if (Math.abs(card.rotation - card.targetRotation) < 0.5) {
                card.rotateTo(handAngle);
            }

            let cx, cy;

            if (index === 1) {
                const visualH = fw;
                const totalH = cards.length * visualH + (cards.length - 1) * spacing;
                const startY = (HOTPOT.HEIGHT - totalH) / 2;
                cx = fw / 2 + HOTPOT.LAYOUT.SIDE_EDGE_OFFSET;
                cy = startY + i * (visualH + spacing) + visualH / 2;
            } else if (index === 2) {
                const totalW = cards.length * fw + (cards.length - 1) * spacing;
                const startX = (HOTPOT.WIDTH - totalW) / 2;
                cx = startX + i * (fw + spacing) + fw / 2;
                cy = fh / 2 + HOTPOT.LAYOUT.TOP_OFFSET;
            } else {
                const visualH = fw;
                const totalH = cards.length * visualH + (cards.length - 1) * spacing;
                const startY = (HOTPOT.HEIGHT - totalH) / 2;
                cx = HOTPOT.WIDTH - fw / 2 - HOTPOT.LAYOUT.SIDE_EDGE_OFFSET;
                cy = startY + i * (visualH + spacing) + visualH / 2;
            }

            card.moveTo(cx - fw / 2, cy - fh / 2);
            card.draw(this.ctx);
        }

        if (player.drawnCard) {
            const dc = player.drawnCard;
            dc.scaleTo(cardScale);
            if (this.game.gameState !== 'gameOver') dc.faceUp = false;
            dc.rotateTo(handAngle);

            const totalH = cards.length * fh + (cards.length - 1) * spacing;
            const totalW = cards.length * fw + (cards.length - 1) * spacing;

            let dcx, dcy;
            if (index === 1) {
                dcx = fw / 2 + HOTPOT.LAYOUT.SIDE_EDGE_OFFSET + fw + HOTPOT.LAYOUT.OTHER_DRAWN_PADDING + fw / 2;
                dcy = (HOTPOT.HEIGHT - totalH) / 2 + (cards.length * fh) / 2;
            } else if (index === 2) {
                dcx = (HOTPOT.WIDTH - totalW) / 2 + (cards.length * fw) / 2;
                dcy = fh / 2 + HOTPOT.LAYOUT.TOP_OFFSET + fh + HOTPOT.LAYOUT.OTHER_DRAWN_PADDING + fh / 2;
            } else {
                dcx = HOTPOT.WIDTH - fw / 2 - HOTPOT.LAYOUT.SIDE_EDGE_OFFSET - fw - HOTPOT.LAYOUT.OTHER_DRAWN_PADDING - fw / 2;
                dcy = (HOTPOT.HEIGHT - totalH) / 2 + (cards.length * fh) / 2;
            }
            dc.moveTo(dcx - fw / 2, dcy - fh / 2);

            dc.draw(this.ctx);
        }
    }

    drawTurnInfo(currentPlayer) {
        if (!currentPlayer) return;

        let isMyTurn = false;
        if (this.game.networkSession && this.game.networkSession.localPlayerIndex !== undefined) {
            isMyTurn = this.game.networkSession.gameState.currentPlayerIndex === this.game.networkSession.localPlayerIndex;
        } else {
            isMyTurn = currentPlayer.isHuman;
        }

        const label = isMyTurn ? 'YOUR TURN' : `${currentPlayer.name}'s TURN`;
        this.ctx.fillStyle = HOTPOT.COLORS.HIGHLIGHT;
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(label, HOTPOT.WIDTH / 2, this.game.msgY);

        if (isMyTurn && this.game.turnPhase === 'draw') {
            this.ctx.fillStyle = '#ffcc66';
            this.ctx.font = '13px Arial';
            this.ctx.fillText('Click the deck to draw, or click an opponent\'s discard pile to steal', HOTPOT.WIDTH / 2, this.game.msgY + 20);
        } else if (isMyTurn && this.game.turnPhase === 'discard') {
            this.ctx.fillStyle = '#ffcc66';
            this.ctx.font = '13px Arial';
            this.ctx.fillText('Click any card (hand or drawn) to discard it and end your turn', HOTPOT.WIDTH / 2, this.game.msgY + 20);
        }

        const localPlayer = this.game.flow.findLocalPlayer();
        if (isMyTurn && this.game.turnPhase === 'discard' && this.game.state.canWin(localPlayer)) {
            this.game.eatButton.hovered = this.input.isElementHovered('eat_button');
            const btn = this.game.eatButton;
            this.ctx.fillStyle = btn.hovered ? '#43a047' : '#2e7d32';
            this.ctx.fillRect(btn.x, btn.y, btn.width, btn.height);
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(btn.x, btn.y, btn.width, btn.height);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 22px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('\uD83C\uDF5C LET\'S EAT! \uD83C\uDF5C', btn.x + btn.width / 2, btn.y + btn.height / 2 + 8);
        }
    }

    drawHumanPrompt(player) {
    }

    drawGameOver() {
        this.ctx.fillStyle = 'rgba(0,0,0,0.75)';
        this.ctx.fillRect(0, 0, HOTPOT.WIDTH, HOTPOT.HEIGHT);

        const winner = this.game.state.players.find(p => p.won);

        this.ctx.fillStyle = '#ffd700';
        this.ctx.font = 'bold 42px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${winner ? winner.name : 'Nobody'} Wins!`, HOTPOT.WIDTH / 2, HOTPOT.LAYOUT.GAMEOVER_TITLE_Y);

        if (winner) {
            this.ctx.fillStyle = HOTPOT.COLORS.TEXT;
            this.ctx.font = 'bold 18px Arial';

            const localPlayer = this.game.flow.findLocalPlayer();
            this.ctx.fillText(`Your sets: ${localPlayer.sets.length}`, HOTPOT.WIDTH / 2, HOTPOT.LAYOUT.GAMEOVER_WINNER_SCORE_Y);

            let y = HOTPOT.LAYOUT.GAMEOVER_SCORES_START_Y;
            for (const p of this.game.state.players) {
                this.ctx.font = '16px Arial';
                this.ctx.fillStyle = p.won ? '#ffd700' : '#ccc';
                const setInfo = p.sets.length > 0 ? ` (${p.sets.length} sets)` : '';
                this.ctx.fillText(`${p.name}: ${p.score} points${setInfo}`, HOTPOT.WIDTH / 2, y);
                y += 30;
            }
        }

        const menu = this.game.menuManager.getGameOverMenu(!!this.game.networkSession);
        const buttonWidth = HOTPOT.LAYOUT.GAMEOVER_BUTTON_WIDTH;
        const buttonHeight = HOTPOT.LAYOUT.GAMEOVER_BUTTON_HEIGHT;
        const startY = HOTPOT.LAYOUT.GAMEOVER_BUTTON_START_Y;
        const spacing = HOTPOT.LAYOUT.GAMEOVER_BUTTON_SPACING;
        for (let i = 0; i < menu.buttons.length; i++) {
            const x = HOTPOT.WIDTH / 2 - buttonWidth / 2;
            const y = startY + i * spacing;
            const isHovered = this.input.isElementHovered(`hotpot_gameover_button_${i}`);
            const isSelected = menu.selectedIndex === i;

            this.ctx.fillStyle = (isSelected || isHovered) ? HOTPOT.COLORS.HIGHLIGHT : HOTPOT.COLORS.UI_BG;
            this.ctx.fillRect(x, y, buttonWidth, buttonHeight);
            this.ctx.strokeStyle = HOTPOT.COLORS.UI_BORDER;
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(x, y, buttonWidth, buttonHeight);
            this.ctx.fillStyle = HOTPOT.COLORS.TEXT;
            this.ctx.font = 'bold 20px Arial';
            this.ctx.fillText(menu.buttons[i].text, x + buttonWidth / 2, y + buttonHeight / 2 + 7);
        }
    }

    drawMessage() {
        const msgX = HOTPOT.WIDTH / 2 - HOTPOT.LAYOUT.MSG_WIDTH / 2;
        this.ctx.fillStyle = 'rgba(0,0,0,0.8)';
        this.ctx.fillRect(msgX, this.game.msgY, HOTPOT.LAYOUT.MSG_WIDTH, HOTPOT.LAYOUT.MSG_HEIGHT);
        this.ctx.strokeStyle = HOTPOT.COLORS.HIGHLIGHT;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(msgX, this.game.msgY, HOTPOT.LAYOUT.MSG_WIDTH, HOTPOT.LAYOUT.MSG_HEIGHT);
        this.ctx.fillStyle = HOTPOT.COLORS.TEXT;
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.game.state.message, HOTPOT.WIDTH / 2, this.game.msgY + 30);
    }
}