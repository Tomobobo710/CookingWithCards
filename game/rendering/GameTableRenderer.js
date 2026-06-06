// game/GameTableRenderer.js
// Renders the in-table game scene: deck, discards, hands, turn info, game-over overlay.
// Also owns the per-frame card update and the per-frame glow highlighting.

class HotpotGameTableRenderer {
    constructor(game) {
        this.game = game;
        this.gameCtx = game.gameCtx;
        this.input = game.input;
        this.nameplate = new NamePlateRenderer(game);
    }

    // ---------- Update helpers ----------
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

    // ---------- In-table glow highlighting ----------
    setGlowingForLocalPlayer() {
        if (this.game.gameState !== 'playing' && this.game.gameState !== 'gameOver' && this.game.gameState !== 'onlineMultiplayer') {
            // Clear all glows during menus
            for (const player of this.game.state.players) {
                for (const card of player.hand) card.glowing = false;
                if (player.drawnCard) player.drawnCard.glowing = false;
            }
            for (const card of this.game.state.deck) card.glowing = false;
            return;
        }

        // Clear all glows first
        for (const player of this.game.state.players) {
            for (const card of player.hand) card.glowing = false;
            for (const card of player.discardPile) card.glowing = false;
            if (player.drawnCard) player.drawnCard.glowing = false;
        }
        for (const card of this.game.state.deck) card.glowing = false;

        const localPlayer = this.game.flow.findLocalPlayer();

        // Determine if it's local player's turn
        let isLocalTurn = false;
        if (this.game.networkSession && this.game.networkSession.localPlayerIndex !== undefined) {
            isLocalTurn = this.game.networkSession.gameState.currentPlayerIndex === this.game.networkSession.localPlayerIndex;
        } else {
            isLocalTurn = this.game.state.getCurrentPlayer() === localPlayer;
        }

        if (!isLocalTurn) return;

        // Draw phase: discard pile cards are clickable
        if (this.game.turnPhase === 'draw') {
            for (const player of this.game.state.players) {
                if (player === localPlayer) continue;
                if (player.discardPile.length > 0) {
                    const topCard = player.discardPile[player.discardPile.length - 1];
                    topCard.glowing = true;
                }
            }
        }

        // Discard phase: hand cards and drawn card are clickable
        if (this.game.turnPhase === 'discard') {
            for (const card of localPlayer.hand) {
                card.glowing = true;
            }
            if (localPlayer.drawnCard) {
                localPlayer.drawnCard.glowing = true;
            }
        }
    }

    // ---------- Game table render ----------
    drawGameTable() {
        this.setGlowingForLocalPlayer();

        const currentPlayer = this.game.state.getCurrentPlayer();

        this.drawDeck();
        this.drawDiscardPiles();
        this.drawSettingsButton();

        // Find local player index (the one controlling this client)
        let localPlayerIndex = 0;
        if (this.game.networkSession) {
            for (let i = 0; i < this.game.state.players.length; i++) {
                if (this.game.state.players[i].isLocal) { localPlayerIndex = i; break; }
            }
        } else {
            // Single player: player 0 is human
            for (let i = 0; i < this.game.state.players.length; i++) {
                if (this.game.state.players[i].isHuman) { localPlayerIndex = i; break; }
            }
        }

        // Render local player at bottom, remote players at other 3 positions
        const localPlayer = this.game.state.players[localPlayerIndex];
        this.drawLocalPlayerHand(localPlayer);

        // Remote players: position them around the table
        // Fixed visual slots: left(W)=1, top(N)=2, right(E)=3
        // Players fill slots in turn order, starting from the slot after local player (clockwise)
        const visualSlots = [1, 2, 3]; // left, top, right
        let slotIdx = 0;
        // Start filling from the player whose index is next after localPlayerIndex (clockwise)
        for (let offset = 1; offset < this.game.state.players.length; offset++) {
            const remoteIdx = (localPlayerIndex + offset) % this.game.state.players.length;
            if (remoteIdx >= this.game.state.players.length) continue;
            const p = this.game.state.players[remoteIdx];
            const visualPos = visualSlots[slotIdx % visualSlots.length];
            this.drawOtherPlayerHand(p, visualPos);
            slotIdx++;
        }

        // Store player positions for nameplate overlay (drawn last)
        this._nameplatePositions = [];
        slotIdx = 0;
        for (let offset = 1; offset < this.game.state.players.length; offset++) {
            const remoteIdx = (localPlayerIndex + offset) % this.game.state.players.length;
            if (remoteIdx >= this.game.state.players.length) continue;
            this._nameplatePositions.push({ player: this.game.state.players[remoteIdx], index: visualSlots[slotIdx % visualSlots.length] });
            slotIdx++;
        }

        // Draw nameplates on top of everything
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

        // Draw countdown overlay for online multiplayer
        if (this.game.networkSession && this.game.countdown) {
            const cd = this.game.countdown;
            if (cd.active && cd.phase === 'countdown' && cd.countdownNumber) {
                this.gameCtx.fillStyle = 'rgba(0,0,0,0.5)';
                this.gameCtx.fillRect(0, 0, HOTPOT.WIDTH, HOTPOT.HEIGHT);
                this.gameCtx.fillStyle = HOTPOT.COLORS.HIGHLIGHT;
                this.gameCtx.font = 'bold 80px Arial';
                this.gameCtx.textAlign = 'center';
                this.gameCtx.fillText(cd.countdownNumber, HOTPOT.WIDTH / 2, HOTPOT.HEIGHT / 2 + 25);
            } else if (cd.active && cd.phase === 'go') {
                this.gameCtx.fillStyle = 'rgba(0,0,0,0.5)';
                this.gameCtx.fillRect(0, 0, HOTPOT.WIDTH, HOTPOT.HEIGHT);
                this.gameCtx.fillStyle = '#90ee90';
                this.gameCtx.font = 'bold 60px Arial';
                this.gameCtx.textAlign = 'center';
                this.gameCtx.fillText('LET\'S EAT!', HOTPOT.WIDTH / 2, HOTPOT.HEIGHT / 2 + 20);
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
                plateY = 546;
            } else if (index === 3) {
                plateX = HOTPOT.WIDTH - w - 8;
                plateY = 546;
            } else {
                plateX = HOTPOT.WIDTH / 2 - w / 2;
                plateY = 4;
            }
            this.nameplate.draw(player, index, plateX, plateY);
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

        this.gameCtx.fillStyle = isClickable ? '#a00000' : HOTPOT.COLORS.DECK;
        this.gameCtx.fillRect(rect.x, rect.y, rect.w, rect.h);
        this.gameCtx.strokeStyle = HOTPOT.COLORS.UI_BORDER;
        this.gameCtx.lineWidth = 2;
        this.gameCtx.strokeRect(rect.x, rect.y, rect.w, rect.h);

        this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
        this.gameCtx.font = '26px Arial';
        this.gameCtx.textAlign = 'center';
        this.gameCtx.fillText('🀄', rect.x + rect.w / 2, rect.y + rect.h / 2 + 8);

        if (isClickable && this.game.state.deck.length > 0) {
            this.gameCtx.fillStyle = '#ff6666';
            this.gameCtx.font = '11px Arial';
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
                topCard.scaleTo(0.75);
                topCard.draw(this.gameCtx);
            } else {
                this.gameCtx.fillStyle = 'rgba(80,40,20,0.6)';
                this.gameCtx.fillRect(rect.x, rect.y, rect.w, rect.h);
                this.gameCtx.strokeStyle = '#555';
                this.gameCtx.lineWidth = 2;
                this.gameCtx.strokeRect(rect.x, rect.y, rect.w, rect.h);
            }

            if (canClick) {
                this.gameCtx.fillStyle = '#ffcc00';
                this.gameCtx.font = '10px Arial';
            }
        }
    }

    drawSettingsButton() {
        if (this.game.settingsOpen) return;
        const btn = this.game.settingsButton;
        const pointer = this.input.getPointerPosition();
        btn.hovered = pointer.x >= btn.x && pointer.x <= btn.x + btn.w && pointer.y >= btn.y && pointer.y <= btn.y + btn.h;

        this.gameCtx.fillStyle = btn.hovered ? HOTPOT.COLORS.HIGHLIGHT : 'rgba(60,30,15,0.8)';
        this.gameCtx.fillRect(btn.x, btn.y, btn.w, btn.h);
        this.gameCtx.strokeStyle = HOTPOT.COLORS.UI_BORDER;
        this.gameCtx.lineWidth = 1;
        this.gameCtx.strokeRect(btn.x, btn.y, btn.w, btn.h);
        this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
        this.gameCtx.font = 'bold 12px Arial';
        this.gameCtx.textAlign = 'center';
        this.gameCtx.fillText('⚙ Settings', btn.x + btn.w / 2, btn.y + btn.h / 2 + 4);

        if (this.input.isLeftMouseButtonJustPressed() && btn.hovered) {
            this.game.settingsOpen = true;
        }
    }

    drawLocalPlayerHand(player) {
        const handRects = this.game.layout.getHandCardRects(player);

        for (let i = 0; i < player.hand.length; i++) {
            const card = player.hand[i];
            const rect = handRects[i];
            card.scaleTo(HOTPOT.CARD_SCALE);
            card.moveTo(rect.x, rect.y);
            card.draw(this.gameCtx);
        }

        if (handRects.length > 0) {
            let catStart = 0;
            let curCat = player.hand[0].category;
            for (let i = 1; i <= player.hand.length; i++) {
                const card = i < player.hand.length ? player.hand[i] : null;
                if (!card || card.category !== curCat) {
                    const sx = handRects[catStart].x;
                    const ex = handRects[i - 1].x + HOTPOT.UI.CARD_WIDTH;
                    this.gameCtx.fillStyle = HOTPOT.CATEGORIES[curCat].color;
                    this.gameCtx.font = 'bold 9px Arial';
                    this.gameCtx.textAlign = 'center';
                    this.gameCtx.textBaseline = 'bottom';
                    this.gameCtx.fillText(HOTPOT.CATEGORIES[curCat].icon + ' ' + curCat, (sx + ex) / 2, HOTPOT.UI.HAND_Y - 4);
                    if (i < player.hand.length) { catStart = i; curCat = card.category; }
                }
            }
            this.gameCtx.textBaseline = 'alphabetic';
        }

        if (player.drawnCard) {
            const drawnRect = this.game.layout.getDrawnCardRect();
            const card = player.drawnCard;
            card.moveTo(drawnRect.x, drawnRect.y);
            card.scaleTo(0.75);
            card.draw(this.gameCtx);

            this.gameCtx.fillStyle = '#fff';
            this.gameCtx.font = 'bold 12px Arial';
            this.gameCtx.textAlign = 'center';
            this.gameCtx.fillText('DRAWN', drawnRect.x + drawnRect.w / 2, drawnRect.y - 8);
        }

        let playerLabel = '';
        if (this.game.networkSession) {
            for (let i = 0; i < this.game.state.players.length; i++) {
                if (this.game.state.players[i] === player && this.game.state.players[i].isLocal) {
                    playerLabel = player.name + "'s Hand (Player" + i + ")";
                    break;
                }
            }
            if (!playerLabel) {
                playerLabel = player.name === 'You' ? 'Your Hand' : player.name + "'s Hand";
            }
        } else {
            playerLabel = player.name === 'You' ? 'Your Hand' : player.name + "'s Hand";
        }
        this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
        this.gameCtx.font = 'bold 14px Arial';
        this.gameCtx.textAlign = 'center';
        this.gameCtx.fillText(playerLabel, HOTPOT.WIDTH / 2, HOTPOT.HEIGHT - 10);

        if (player.sets.length > 0) {
            this.gameCtx.fillStyle = '#90ee90';
            this.gameCtx.font = '12px Arial';
            this.gameCtx.textAlign = 'left';
            this.gameCtx.fillText(`Locked sets: ${player.sets.length}`, 10, HOTPOT.UI.HAND_Y - 6);
        }
    }

    drawOtherPlayerHand(player, index) {
        const cards = player.hand;
        if (cards.length === 0) return;

        const cardScale = 0.5;
        const spacing = 6;
        const fw = 80 * cardScale;
        const fh = 115 * cardScale;
        const drawnCardPadding = 8;
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
                cx = fw / 2 + 12;
                cy = startY + i * (visualH + spacing) + visualH / 2;
            } else if (index === 2) {
                const totalW = cards.length * fw + (cards.length - 1) * spacing;
                const startX = (HOTPOT.WIDTH - totalW) / 2;
                cx = startX + i * (fw + spacing) + fw / 2;
                cy = fh / 2 + 10;
            } else {
                const visualH = fw;
                const totalH = cards.length * visualH + (cards.length - 1) * spacing;
                const startY = (HOTPOT.HEIGHT - totalH) / 2;
                cx = HOTPOT.WIDTH - fw / 2 - 12;
                cy = startY + i * (visualH + spacing) + visualH / 2;
            }

            card.moveTo(cx - fw / 2, cy - fh / 2);
            card.draw(this.gameCtx);
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
                dcx = fw / 2 + 12 + fw + 8 + fw / 2;
                dcy = (HOTPOT.HEIGHT - totalH) / 2 + (cards.length * fh) / 2;
            } else if (index === 2) {
                dcx = (HOTPOT.WIDTH - totalW) / 2 + (cards.length * fw) / 2;
                dcy = fh / 2 + 10 + fh + 8 + fh / 2;
            } else {
                dcx = HOTPOT.WIDTH - fw / 2 - 12 - fw - 8 - fw / 2;
                dcy = (HOTPOT.HEIGHT - totalH) / 2 + (cards.length * fh) / 2;
            }
            dc.moveTo(dcx - fw / 2, dcy - fh / 2);

            dc.draw(this.gameCtx);
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
        this.gameCtx.fillStyle = HOTPOT.COLORS.HIGHLIGHT;
        this.gameCtx.font = 'bold 16px Arial';
        this.gameCtx.textAlign = 'center';
        this.gameCtx.fillText(label, HOTPOT.WIDTH / 2, this.game.msgY);

        if (isMyTurn && this.game.turnPhase === 'draw') {
            this.gameCtx.fillStyle = '#ffcc66';
            this.gameCtx.font = '13px Arial';
            this.gameCtx.fillText('Click the deck to draw, or click an opponent\'s discard pile to steal', HOTPOT.WIDTH / 2, this.game.msgY + 20);
        } else if (isMyTurn && this.game.turnPhase === 'discard') {
            this.gameCtx.fillStyle = '#ffcc66';
            this.gameCtx.font = '13px Arial';
            this.gameCtx.fillText('Click any card (hand or drawn) to discard it and end your turn', HOTPOT.WIDTH / 2, this.game.msgY + 20);
        }

        // TODO: implement timer — remaining = ???
        // const remaining = 0;
        // this.gameCtx.fillStyle = remaining <= 10 ? '#ff6b6b' : '#ffcc66';
        // this.gameCtx.font = 'bold 14px Arial';
        // this.gameCtx.textAlign = 'center';
        // this.gameCtx.fillText('Time: ' + remaining + 's', HOTPOT.WIDTH / 2, this.game.msgY + 40);

        const localPlayer = this.game.flow.findLocalPlayer();
        if (isMyTurn && this.game.turnPhase === 'discard' && this.game.state.canWin(localPlayer)) {
            this.game.eatButton.hovered = this.input.isElementHovered('eat_button');
            const btn = this.game.eatButton;
            this.gameCtx.fillStyle = btn.hovered ? '#43a047' : '#2e7d32';
            this.gameCtx.fillRect(btn.x, btn.y, btn.width, btn.height);
            this.gameCtx.strokeStyle = '#fff';
            this.gameCtx.lineWidth = 3;
            this.gameCtx.strokeRect(btn.x, btn.y, btn.width, btn.height);
            this.gameCtx.fillStyle = '#fff';
            this.gameCtx.font = 'bold 22px Arial';
            this.gameCtx.textAlign = 'center';
            this.gameCtx.fillText('🍜 LET\'S EAT! 🍜', btn.x + btn.width / 2, btn.y + btn.height / 2 + 8);
        }
    }

    drawHumanPrompt(player) {
    }

    drawGameOver() {
        this.gameCtx.fillStyle = 'rgba(0,0,0,0.75)';
        this.gameCtx.fillRect(0, 0, HOTPOT.WIDTH, HOTPOT.HEIGHT);

        const winner = this.game.state.players.find(p => p.won);

        this.gameCtx.fillStyle = '#ffd700';
        this.gameCtx.font = 'bold 42px Arial';
        this.gameCtx.textAlign = 'center';
        this.gameCtx.fillText(`${winner ? winner.name : 'Nobody'} Wins!`, HOTPOT.WIDTH / 2, 160);

        if (winner) {
            this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
            this.gameCtx.font = 'bold 18px Arial';

            const localPlayer = this.game.flow.findLocalPlayer();
            this.gameCtx.fillText(`Your sets: ${localPlayer.sets.length}`, HOTPOT.WIDTH / 2, 210);

            let y = 250;
            for (const p of this.game.state.players) {
                this.gameCtx.font = '16px Arial';
                this.gameCtx.fillStyle = p.won ? '#ffd700' : '#ccc';
                const setInfo = p.sets.length > 0 ? ` (${p.sets.length} sets)` : '';
                this.gameCtx.fillText(`${p.name}: ${p.score} points${setInfo}`, HOTPOT.WIDTH / 2, y);
                y += 30;
            }
        }

        const menu = this.game.menuManager.getGameOverMenu(!!this.game.networkSession);
        const buttonWidth = 240, buttonHeight = 60, startY = 350, spacing = 75;
        for (let i = 0; i < menu.buttons.length; i++) {
            const x = HOTPOT.WIDTH / 2 - buttonWidth / 2;
            const y = startY + i * spacing;
            const isHovered = this.input.isElementHovered(`hotpot_gameover_button_${i}`);
            const isSelected = menu.selectedIndex === i;

            this.gameCtx.fillStyle = (isSelected || isHovered) ? HOTPOT.COLORS.HIGHLIGHT : HOTPOT.COLORS.UI_BG;
            this.gameCtx.fillRect(x, y, buttonWidth, buttonHeight);
            this.gameCtx.strokeStyle = HOTPOT.COLORS.UI_BORDER;
            this.gameCtx.lineWidth = 3;
            this.gameCtx.strokeRect(x, y, buttonWidth, buttonHeight);
            this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
            this.gameCtx.font = 'bold 20px Arial';
            this.gameCtx.fillText(menu.buttons[i].text, x + buttonWidth / 2, y + buttonHeight / 2 + 7);
        }
    }

    drawMessage() {
        this.gameCtx.fillStyle = 'rgba(0,0,0,0.8)';
        this.gameCtx.fillRect(150, this.game.msgY, 500, 50);
        this.gameCtx.strokeStyle = HOTPOT.COLORS.HIGHLIGHT;
        this.gameCtx.lineWidth = 2;
        this.gameCtx.strokeRect(150, this.game.msgY, 500, 50);
        this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
        this.gameCtx.font = 'bold 16px Arial';
        this.gameCtx.textAlign = 'center';
        this.gameCtx.fillText(this.game.state.message, HOTPOT.WIDTH / 2, this.game.msgY + 30);
    }
}
