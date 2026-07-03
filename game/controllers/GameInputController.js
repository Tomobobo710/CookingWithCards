// game/GameInputController.js
// Input dispatch + local/remote player turn handling for Hotpot.

class HotpotGameInputController {
    constructor(game, input) {
        this.game = game;
        this.input = input;
        this.audio = game.audio;
    }

    // ---------- Input ----------
    handleInput() {
        if (this.input.isKeyJustPressed('ActionDebugToggle')) {
            this.game.debugEnabled = !this.game.debugEnabled;
        }

        if (this.input.isKeyJustPressed('Action3')) {
            this.toggleLayout();
        }

     if (this.game.settingsOpen) {
            if (this.input.isLeftMouseButtonJustPressed()) {
                const pointer = this.input.getPointerPosition();

                if (this.game.profileOpen) {
                    return;
                }

                // Confirmation modal buttons
                if (this.game.settingsConfirmOpen) {
                    for (const btn of this.game.settingsConfirmButtons) {
                       if (this.game.layout.pointInRect(pointer, btn)) {
                            if (btn.action === 'confirmYes') {
                                this.game.settingsConfirmOpen = false;
                                this.game.closeSettingsModal();
                                if (this.game.networkSession) {
                                    this.game.networkSession.leave();
                                    this.game.networkSession = null;
                                }
                                if (this.game.gui && this.game.gui.isConnected()) {
                                    this.game.gui.getNetManager().disconnect();
                                    this.game.gui.currentState = "LOGIN";
                                    this.game.gui.selectedIndex = 0;
                                    this.game.gui.serverStatus = "UNKNOWN";
                                    this.game.gui.serverStatusColor = "#ffff00";
                                }
                                this.game.flow.clearGameState();
                                this.game.gameState = 'menu';
                            } else if (btn.action === 'confirmNo') {
                                this.game.settingsConfirmOpen = false;
                            }
                            return;
                        }
                    }
                    return;
                }

 for (const btn of this.game.settingsButtons) {
                    if (this.game.layout.pointInRect(pointer, btn)) {
                        if (btn.action === 'close') {
                            this.game.closeSettingsModal();
                        } else if (btn.action === 'profile') {
                            this.game.profileOpen = true;
                            return;
                        } else if (btn.action === 'speed') {
                            this.game.currentSpeed = (this.game.currentSpeed % Object.keys(HOTPOT.SPEEDS).length) + 1;
                            localStorage.setItem('hotpot_speed', this.game.currentSpeed);
                            this.game.flow.applySpeedToAllCards();
                        } else if (btn.action === 'quit') {
                            this.game.settingsConfirmOpen = true;
                            return;
                        }
                   return;
                    }
                }

 
            }
            return;
        }

        // Menu navigation
        if (this.game.menuStack.current === 'multiplayer') {
            this.game.menuInputManager.handleMultiplayerMenuInput();
            return;
        }

        if (this.game.gameState === 'menu') {
            this.game.menuInputManager.handleMainMenuInput();
            return;
        }

        if (this.game.gameState === 'gameOver') {
            this.game.menuInputManager.handleGameOverMenuInput();
            return;
        }

        // Online waiting menus
        if (this.game.gameState === 'waitingMenu') {
            this.game.waitingMenuInputManager.handleWaitingMenuInput();
            return;
        }

        if (this.game.gameState === 'waitingCanceledMenu') {
            this.game.waitingMenuInputManager.handleWaitingCanceledMenuInput();
            return;
        }

        if (this.game.gameState === 'waitingForHostMenu') {
            this.game.waitingMenuInputManager.handleWaitingForHostMenuInput();
            return;
        }

        if (this.game.gameState === 'opponentDisconnected') {
            this.game.waitingMenuInputManager.handleOpponentDisconnectedInput();
            return;
        }

        if (this.game.gameState === 'roomShutDown') {
            this.game.waitingMenuInputManager.handleRoomShutDownInput();
            return;
        }

        if (this.game.gameState === 'rematchPending') {
            this.game.waitingMenuInputManager.handleRematchPendingInput();
            return;
        }

        if (this.game.gameState === 'playing' || (this.game.gameState === 'onlineMultiplayer' && this.game.networkSession && this.game.networkSession.isHost)) {
            const localPlayer = this.game.flow.findLocalPlayer();
            const player = this.game.state.getCurrentPlayer();
            if (localPlayer && player.isHuman && localPlayer === player) {
                if (this.game.turnPhase === 'draw') {
                    this.handleLocalPlayerDraw(localPlayer);
                } else if (this.game.turnPhase === 'discard') {
                    this.handleLocalPlayerDiscard(localPlayer);
                }
            }
        }

        if (this.game.gameState === 'onlineMultiplayer' && this.game.networkSession && !this.game.networkSession.isHost) {
            const localPlayer = this.game.networkSession.game.state.players[this.game.networkSession.localPlayerIndex];
            const isMyTurn = this.game.networkSession.gameState.currentPlayerIndex === this.game.networkSession.localPlayerIndex;
            if (localPlayer && localPlayer.isHuman && isMyTurn) {
                if (this.game.turnPhase === 'draw') {
                    this.handleRemotePlayerDraw(localPlayer, this.game.networkSession.localPlayerIndex);
                } else if (this.game.turnPhase === 'discard') {
                    this.handleRemotePlayerDiscard(localPlayer, this.game.networkSession.localPlayerIndex);
                }
            }
        }
    }

    handleLocalPlayerDraw(player) {
        if (!this.input.isLeftMouseButtonJustPressed()) return;

        const pointer = this.input.getPointerPosition();

        const deckRect = this.game.layout.getDeckRect();
        if (this.game.layout.pointInRect(pointer, deckRect)) {
            const card = this.game.state.deck[this.game.state.deck.length - 1];
            this.game.flow.applySpeedToCard(card);
            const drawnRect = this.game.layout.getDrawnCardRect(player);
            card.moveTo(drawnRect.x, drawnRect.y);
            card.faceUp = false;
            this.game.state.drawFromDeck(player);
            card.flip();
            this.audio.play('draw', { volume: 0.3 });
            this.afterLocalPlayerDraw(player);
            return;
        }

        for (let i = 1; i < this.game.state.players.length; i++) {
            const other = this.game.state.players[i];
            if (other.discardPile.length === 0) continue;
            const rect = this.game.layout.getDiscardRect(other);
            if (this.game.layout.pointInRect(pointer, rect)) {
                const card = other.discardPile[other.discardPile.length - 1];
                this.game.flow.applySpeedToCard(card);
                card.moveTo(rect.x, rect.y);
                this.game.state.drawFromDiscard(player, other);
                if (other.discardPile.length > 0) {
                    const revealed = other.discardPile[other.discardPile.length - 1];
                    this.game.flow.applySpeedToCard(revealed);
                    revealed.faceUp = false;
                    revealed.flip();
                }
                this.audio.play('draw', { volume: 0.3 });
                this.afterLocalPlayerDraw(player);
                return;
            }
        }
    }

    afterLocalPlayerDraw(player) {
        this.game.turnPhase = 'discard';
        this.game.bestSets = this.game.state.findBestSets(player.getAllCards(), HOTPOT.GAME.SETS_TO_WIN);

        for (const c of player.getAllCards()) {
            c.highlighted = null;
            c._showArrows = false;
        }
        for (const c of player.discardPile) c.highlighted = null;

        if (!player.drawnCard) return;

        const drawnCard = player.drawnCard;
        const allCards = player.getAllCards();
        const allSets = this.game.state.findAllPossibleSets(allCards);

        for (const set of allSets) {
            if (!set.includes(drawnCard)) continue;
            const type = set[0].ingredient === set[1].ingredient ? 'triple' : 'category';
            for (const c of set) {
                c.highlighted = type;
                c._showArrows = true;
            }
        }

        if (this.game.state.canWin(player)) {
            this.game.state.message = 'You can win! Click "Let\'s Eat!" to end the game!';
            this.game.state.messageTimer = 5;
        }
    }

    handleLocalPlayerDiscard(player) {
        if (!this.input.isLeftMouseButtonJustPressed()) return;

        const pointer = this.input.getPointerPosition();

        if (this.game.state.canWin(player)) {
            this.game.eatButton.hovered = this.input.isElementHovered('eat_button');
            if (this.input.isElementJustPressed('eat_button')) {
                this.game.flow.handleWin(player);
                return;
            }
        }

        const handCards = this.game.layout.getHandCardRectsForPlayer(player);

        for (let i = 0; i < player.hand.length; i++) {
            if (this.game.layout.pointInRect(pointer, handCards[i])) {
                const card = player.hand[i];
                this.game.flow.applySpeedToCard(card);
                this.game.state.discardCard(player, card);
                this.audio.play('discard', { volume: 0.3 });
                if (player.drawnCard) {
                    player.hand.push(player.drawnCard);
                    player.drawnCard = null;
                }
                this.game.flow.endTurn();
                return;
            }
        }

        if (player.drawnCard) {
            const drawnRect = this.game.layout.getDrawnCardRectForPlayerObj(player);
            if (this.game.layout.pointInRect(pointer, drawnRect)) {
                const card = player.drawnCard;
                this.game.flow.applySpeedToCard(card);
                this.game.state.discardCard(player, card);
                this.audio.play('discard', { volume: 0.3 });
                player.drawnCard = null;
                this.game.flow.endTurn();
            }
        }
    }

    handleRemotePlayerDraw(player, playerIndex) {
        if (!this.input.isLeftMouseButtonJustPressed()) return;
        const pointer = this.input.getPointerPosition();

        const remoteGame = this.game.networkSession.syncSystem ? this.game.networkSession.syncSystem.getRemote("game") : null;
        const deckAvailable = remoteGame ? remoteGame.deckCount > 0 : this.game.state.deck.length > 0;

        const deckRect = this.game.layout.getDeckRect();
        if (this.game.layout.pointInRect(pointer, deckRect) && deckAvailable) {
            this.game.networkSession.sendPlayerAction(this.game.networkSession.localPlayerIndex, "drawDeck");
            return;
        }

        for (let i = 0; i < this.game.state.players.length; i++) {
            if (i === playerIndex) continue; // can't draw from your own discard pile
            const other = this.game.state.players[i];
            if (other.discardPile.length === 0) continue;
            const rect = this.game.layout.getDiscardRect(other);
            if (this.game.layout.pointInRect(pointer, rect)) {
                this.game.networkSession.sendPlayerAction(playerIndex, "drawDiscard", { sourcePlayerIndex: i });
                return;
            }
        }
    }

    handleRemotePlayerDiscard(player, playerIndex) {
        if (!this.input.isLeftMouseButtonJustPressed()) return;
        const pointer = this.input.getPointerPosition();

        if (this.game.state.canWin(player)) {
            this.game.eatButton.hovered = this.input.isElementHovered('eat_button');
            if (this.input.isElementJustPressed('eat_button')) {
                this.game.networkSession.sendPlayerAction(playerIndex, "win");
                return;
            }
        }

        const handCards = this.game.layout.getHandCardRectsForPlayer(player);
        for (let i = 0; i < player.hand.length; i++) {
            if (this.game.layout.pointInRect(pointer, handCards[i])) {
                const card = player.hand[i];
                this.game.networkSession.sendPlayerAction(playerIndex, "discard", {
                    category: card.category,
                    ingredient: card.ingredient
                });
                return;
            }
        }

        if (player.drawnCard) {
            const drawnRect = this.game.layout.getDrawnCardRectForPlayerObj(player);
            if (this.game.layout.pointInRect(pointer, drawnRect)) {
                this.game.networkSession.sendPlayerAction(playerIndex, "discard", {
                    category: player.drawnCard.category,
                    ingredient: player.drawnCard.ingredient
                });
            }
        }
    }

    toggleLayout() {
        const isLandscape = HOTPOT.WIDTH > HOTPOT.HEIGHT;
        HOTPOT.WIDTH = isLandscape ? 720 : 1280;
        HOTPOT.HEIGHT = isLandscape ? 1280 : 720;
        HOTPOT.LAYOUT = isLandscape ? HOTPOT.LAYOUTS.portrait : HOTPOT.LAYOUTS.landscape;

        for (const canvas of [this.game.gameCanvas, this.game.guiCanvas, this.game.debugCanvas]) {
            canvas.width = HOTPOT.WIDTH;
            canvas.height = HOTPOT.HEIGHT;
        }

        const container = this.game.gameCanvas.parentElement;
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        const scale = Math.min(cw / HOTPOT.WIDTH, ch / HOTPOT.HEIGHT);
        for (const canvas of [this.game.gameCanvas, this.game.guiCanvas, this.game.debugCanvas]) {
            canvas.style.width = `${HOTPOT.WIDTH * scale}px`;
            canvas.style.height = `${HOTPOT.HEIGHT * scale}px`;
        }
    }
}
