// game/GameRenderer.js
// All rendering for Hotpot: game layer, GUI layer, debug layer, settings modals.

class HotpotGameRenderer {
    constructor(game) {
        this.game = game;
        this.gameCtx = game.gameCtx;
        this.guiCtx = game.guiCtx;
        this.debugCtx = game.debugCtx;
        this.audio = game.audio;
        this.input = game.input;
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

    // ---------- Top-level draw ----------
    drawGameLayer() {
        this.gameCtx.fillStyle = HOTPOT.COLORS.BACKGROUND;
        this.gameCtx.fillRect(0, 0, HOTPOT.WIDTH, HOTPOT.HEIGHT);

        if (this.game.gameState === 'menu' || this.game.menuStack.current === 'multiplayer') {
            if (this.game.menuStack.current === 'multiplayer') {
                this.drawMultiplayerMenuScreen();
            } else {
                this.drawMenuScreen();
            }
        } else if (this.game.gameState === 'playing' || this.game.gameState === 'gameOver') {
            this.drawGameTable();
        } else if (this.game.gameState === 'onlineMultiplayer') {
            this.drawGameTable();
        } else if (this.game.gameState === 'waitingMenu') {
            this.drawGameTable();
            const userCount = this.game.networkManager ? this.game.networkManager.getConnectedUsers().length : 0;
            this.drawWaitingMenuScreen('WAITING FOR PLAYERS (' + userCount + '/4)');
        } else if (this.game.gameState === 'waitingCanceledMenu') {
            this.drawGameTable();
            this.drawWaitingCanceledMenuScreen();
        } else if (this.game.gameState === 'waitingForHostMenu') {
            this.drawGameTable();
            this.drawWaitingForHostMenuScreen();
        } else if (this.game.gameState === 'opponentDisconnected') {
            this.drawGameTable();
            this.drawOpponentDisconnectedMenuScreen();
        } else if (this.game.gameState === 'roomShutDown') {
            this.drawGameTable();
            this.drawRoomShutDownMenuScreen();
        } else if (this.game.gameState === 'rematchPending') {
            this.drawGameTable();
            this.drawRematchPendingMenuScreen();
        }
        // multiplayerLogin: GUI canvas handles rendering
    }

    drawMenuScreen() {
        this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
        this.gameCtx.font = 'bold 48px Arial';
        this.gameCtx.textAlign = 'center';
        this.gameCtx.fillText('HOTPOT', HOTPOT.WIDTH / 2, 180);

        this.gameCtx.font = '20px Arial';
        this.gameCtx.fillStyle = '#cccccc';
        this.gameCtx.fillText('A Palia-style Set Building Card Game', HOTPOT.WIDTH / 2, 220);

        // Draw menu buttons from menu manager
        const menu = this.game.menuManager.mainMenu;
        const buttonWidth = 240, buttonHeight = 60, startY = 250, spacing = 75;
        for (let i = 0; i < menu.buttons.length; i++) {
            const x = HOTPOT.WIDTH / 2 - buttonWidth / 2;
            const y = startY + i * spacing;
            const isHovered = this.input.isElementHovered(`hotpot_main_button_${i}`);
            const isSelected = menu.selectedIndex === i;

            this.gameCtx.fillStyle = (isSelected || isHovered) ? HOTPOT.COLORS.HIGHLIGHT : HOTPOT.COLORS.UI_BG;
            this.gameCtx.fillRect(x, y, buttonWidth, buttonHeight);
            this.gameCtx.strokeStyle = HOTPOT.COLORS.UI_BORDER;
            this.gameCtx.lineWidth = 3;
            this.gameCtx.strokeRect(x, y, buttonWidth, buttonHeight);
            this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
            this.gameCtx.font = 'bold 24px Arial';
            this.gameCtx.fillText(menu.buttons[i].text, x + buttonWidth / 2, y + buttonHeight / 2 + 8);
        }

        this.gameCtx.font = '15px Arial';
        this.gameCtx.fillStyle = '#888888';
        const lines = [
            'Build 3 sets to win!',
            '96 cards, 8 categories, 3 ingredients each',
            'Three-of-a-Kind (3 same) = 120 pts',
            'Category Set (3 different) = 60 pts',
            '',
            'Draw from deck or steal an opponent\'s discard',
            'Discard 1 card to end your turn'
        ];
        lines.forEach((l, i) => this.gameCtx.fillText(l, HOTPOT.WIDTH / 2, 400 + i * 22));
    }

    drawMultiplayerMenuScreen() {
        const menu = this.game.menuManager.multiplayerMenu;
        const buttonWidth = 240, buttonHeight = 60, startY = 220, spacing = 75;

        this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
        this.gameCtx.font = 'bold 36px Arial';
        this.gameCtx.textAlign = 'center';
        this.gameCtx.fillText('MULTIPLAYER', HOTPOT.WIDTH / 2, 150);

        for (let i = 0; i < menu.buttons.length; i++) {
            const x = HOTPOT.WIDTH / 2 - buttonWidth / 2;
            const y = startY + i * spacing;
            const isHovered = this.input.isElementHovered(`hotpot_mp_button_${i}`);
            const isSelected = menu.selectedIndex === i;

            this.gameCtx.fillStyle = (isSelected || isHovered) ? HOTPOT.COLORS.HIGHLIGHT : HOTPOT.COLORS.UI_BG;
            this.gameCtx.fillRect(x, y, buttonWidth, buttonHeight);
            this.gameCtx.strokeStyle = HOTPOT.COLORS.UI_BORDER;
            this.gameCtx.lineWidth = 3;
            this.gameCtx.strokeRect(x, y, buttonWidth, buttonHeight);
            this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
            this.gameCtx.font = 'bold 24px Arial';
            this.gameCtx.fillText(menu.buttons[i].text, x + buttonWidth / 2, y + buttonHeight / 2 + 8);
        }
    }

    drawWaitingMenuScreen(title) {
        this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
        this.gameCtx.font = 'bold 36px Arial';
        this.gameCtx.textAlign = 'center';
        this.gameCtx.fillText(title, HOTPOT.WIDTH / 2, 200);

        this.gameCtx.font = '18px Arial';
        this.gameCtx.fillStyle = '#cccccc';
        this.gameCtx.fillText('Waiting for other players...', HOTPOT.WIDTH / 2, 250);

        const menu = this.game.waitingMenu;
        const buttonWidth = 240, buttonHeight = 60, startY = 380, spacing = 75;
        for (let i = 0; i < menu.buttons.length; i++) {
            const x = HOTPOT.WIDTH / 2 - buttonWidth / 2;
            const y = startY + i * spacing;
            const isHovered = this.input.isElementHovered(`hotpot_waiting_button_${i}`);
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

    drawWaitingCanceledMenuScreen() {
        this.gameCtx.fillStyle = 'rgba(0,0,0,0.75)';
        this.gameCtx.fillRect(0, 0, HOTPOT.WIDTH, HOTPOT.HEIGHT);

        this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
        this.gameCtx.font = 'bold 36px Arial';
        this.gameCtx.textAlign = 'center';
        this.gameCtx.fillText('MATCH CANCELED', HOTPOT.WIDTH / 2, 200);

        this.gameCtx.font = '18px Arial';
        this.gameCtx.fillStyle = '#cccccc';
        this.gameCtx.fillText('The room is still open. What would you like to do?', HOTPOT.WIDTH / 2, 250);

        const menu = this.game.waitingCanceledMenu;
        const buttonWidth = 240, buttonHeight = 60, startY = 300, spacing = 75;
        for (let i = 0; i < menu.buttons.length; i++) {
            const x = HOTPOT.WIDTH / 2 - buttonWidth / 2;
            const y = startY + i * spacing;
            const isHovered = this.input.isElementHovered(`hotpot_waitcancel_button_${i}`);
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

    drawWaitingForHostMenuScreen() {
        this.gameCtx.fillStyle = 'rgba(0,0,0,0.75)';
        this.gameCtx.fillRect(0, 0, HOTPOT.WIDTH, HOTPOT.HEIGHT);

        this.gameCtx.fillStyle = HOTPOT.COLORS.HIGHLIGHT;
        this.gameCtx.font = 'bold 36px Arial';
        this.gameCtx.textAlign = 'center';
        this.gameCtx.fillText('WAITING FOR HOST', HOTPOT.WIDTH / 2, 250);

        this.gameCtx.font = '18px Arial';
        this.gameCtx.fillStyle = '#cccccc';
        this.gameCtx.fillText('The host needs to start the match', HOTPOT.WIDTH / 2, 300);

        const menu = this.game.waitingForHostMenu;
        const buttonWidth = 240, buttonHeight = 60, startY = 380;
        const x = HOTPOT.WIDTH / 2 - buttonWidth / 2;
        const y = startY;
        const isHovered = this.input.isElementHovered('hotpot_waithost_button_0');
        const isSelected = menu.selectedIndex === 0;
        this.gameCtx.fillStyle = (isSelected || isHovered) ? HOTPOT.COLORS.HIGHLIGHT : HOTPOT.COLORS.UI_BG;
        this.gameCtx.fillRect(x, y, buttonWidth, buttonHeight);
        this.gameCtx.strokeStyle = HOTPOT.COLORS.UI_BORDER;
        this.gameCtx.lineWidth = 3;
        this.gameCtx.strokeRect(x, y, buttonWidth, buttonHeight);
        this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
        this.gameCtx.font = 'bold 20px Arial';
        this.gameCtx.fillText(menu.buttons[0].text, x + buttonWidth / 2, y + buttonHeight / 2 + 7);
    }

    drawOpponentDisconnectedMenuScreen() {
        this.gameCtx.fillStyle = 'rgba(0,0,0,0.75)';
        this.gameCtx.fillRect(0, 0, HOTPOT.WIDTH, HOTPOT.HEIGHT);

        this.gameCtx.fillStyle = '#ff6b6b';
        this.gameCtx.font = 'bold 36px Arial';
        this.gameCtx.textAlign = 'center';
        this.gameCtx.fillText('OPPONENT DISCONNECTED', HOTPOT.WIDTH / 2, 200);

        this.gameCtx.font = '18px Arial';
        this.gameCtx.fillStyle = '#cccccc';
        this.gameCtx.fillText('An opponent has left the game.', HOTPOT.WIDTH / 2, 250);

        const menu = this.game.opponentDisconnectedMenu;
        const buttonWidth = 240, buttonHeight = 60, startY = 300, spacing = 75;
        for (let i = 0; i < menu.buttons.length; i++) {
            const x = HOTPOT.WIDTH / 2 - buttonWidth / 2;
            const y = startY + i * spacing;
            const isHovered = this.input.isElementHovered(`hotpot_disconnect_button_${i}`);
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

    drawRoomShutDownMenuScreen() {
        this.gameCtx.fillStyle = 'rgba(0,0,0,0.75)';
        this.gameCtx.fillRect(0, 0, HOTPOT.WIDTH, HOTPOT.HEIGHT);

        this.gameCtx.fillStyle = '#ff6b6b';
        this.gameCtx.font = 'bold 36px Arial';
        this.gameCtx.textAlign = 'center';
        this.gameCtx.fillText('ROOM SHUTDOWN', HOTPOT.WIDTH / 2, 250);

        this.gameCtx.font = '18px Arial';
        this.gameCtx.fillStyle = '#cccccc';
        this.gameCtx.fillText('The host has left the room.', HOTPOT.WIDTH / 2, 300);

        const menu = this.game.roomShutDownMenu;
        const buttonWidth = 240, buttonHeight = 60, startY = 340;
        const x = HOTPOT.WIDTH / 2 - buttonWidth / 2;
        const y = startY;
        const isHovered = this.input.isElementHovered('hotpot_roomshutdown_button_0');
        const isSelected = menu.selectedIndex === 0;
        this.gameCtx.fillStyle = (isSelected || isHovered) ? HOTPOT.COLORS.HIGHLIGHT : HOTPOT.COLORS.UI_BG;
        this.gameCtx.fillRect(x, y, buttonWidth, buttonHeight);
        this.gameCtx.strokeStyle = HOTPOT.COLORS.UI_BORDER;
        this.gameCtx.lineWidth = 3;
        this.gameCtx.strokeRect(x, y, buttonWidth, buttonHeight);
        this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
        this.gameCtx.font = 'bold 20px Arial';
        this.gameCtx.fillText(menu.buttons[0].text, x + buttonWidth / 2, y + buttonHeight / 2 + 7);
    }

    drawRematchPendingMenuScreen() {
        this.gameCtx.fillStyle = 'rgba(0,0,0,0.75)';
        this.gameCtx.fillRect(0, 0, HOTPOT.WIDTH, HOTPOT.HEIGHT);

        this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
        this.gameCtx.font = 'bold 36px Arial';
        this.gameCtx.textAlign = 'center';
        this.gameCtx.fillText('REMATCH PENDING', HOTPOT.WIDTH / 2, 200);

        this.gameCtx.font = '18px Arial';
        this.gameCtx.fillStyle = '#cccccc';
        this.gameCtx.fillText('Waiting for opponent to accept...', HOTPOT.WIDTH / 2, 250);

        const menu = this.game.rematchPendingMenu;
        const buttonWidth = 240, buttonHeight = 60, startY = 380, spacing = 75;
        for (let i = 0; i < menu.buttons.length; i++) {
            const x = HOTPOT.WIDTH / 2 - buttonWidth / 2;
            const y = startY + i * spacing;
            const isHovered = this.input.isElementHovered(`hotpot_rematch_button_${i}`);
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

        let info;
        if (!player.isHuman) {
            const cfgLbl = HOTPOT.BOT_AI[player.difficulty] || HOTPOT.BOT_AI[2];
            info = `${player.name} [${cfgLbl.desc}]`;
        } else {
            info = player.name;
        }
        this.gameCtx.font = '10px Arial';
        this.gameCtx.textBaseline = 'middle';
        if (index === 1) {
            this.gameCtx.fillStyle = 'rgba(0,0,0,0.7)';
            this.gameCtx.fillRect(0, HOTPOT.HEIGHT - 16, 200, 16);
            this.gameCtx.fillStyle = '#fff';
            this.gameCtx.textAlign = 'left';
            this.gameCtx.fillText(info, 4, HOTPOT.HEIGHT - 8);
        } else if (index === 3) {
            this.gameCtx.fillStyle = 'rgba(0,0,0,0.7)';
            this.gameCtx.fillRect(HOTPOT.WIDTH - 200, HOTPOT.HEIGHT - 16, 200, 16);
            this.gameCtx.fillStyle = '#fff';
            this.gameCtx.textAlign = 'right';
            this.gameCtx.fillText(info, HOTPOT.WIDTH - 4, HOTPOT.HEIGHT - 8);
        } else {
            this.gameCtx.fillStyle = 'rgba(0,0,0,0.7)';
            this.gameCtx.fillRect(HOTPOT.WIDTH / 2 - 100, 0, 200, 16);
            this.gameCtx.fillStyle = '#fff';
            this.gameCtx.textAlign = 'center';
            this.gameCtx.fillText(info, HOTPOT.WIDTH / 2, 8);
        }
        const cp = this.game.state.getCurrentPlayer();
        if (cp === player) {
            this.gameCtx.fillStyle = HOTPOT.COLORS.HIGHLIGHT;
            this.gameCtx.font = 'bold 10px Arial';
            if (index === 2) {
                this.gameCtx.textAlign = 'center';
                this.gameCtx.fillText('● THINKING', HOTPOT.WIDTH / 2, 18);
            } else {
                this.gameCtx.textAlign = index === 1 ? 'left' : 'right';
                this.gameCtx.fillText('● THINKING', index === 1 ? 4 : HOTPOT.WIDTH - 4, HOTPOT.HEIGHT - 20);
            }
        }
        this.gameCtx.textBaseline = 'alphabetic';
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

    drawGUILayer() {
        this.guiCtx.clearRect(0, 0, HOTPOT.WIDTH, HOTPOT.HEIGHT);

        // Let ActionNetManagerGUI draw login/lobby UI
        if (this.game.gameState === 'multiplayerLogin' && this.game.gui) {
            this.game.gui.action_draw();
        }
    }

    drawDebugLayer() {
        this.debugCtx.clearRect(0, 0, HOTPOT.WIDTH, HOTPOT.HEIGHT);
        if (!this.game.debugEnabled) return;
        this.debugCtx.fillStyle = HOTPOT.COLORS.DEBUG_BG;
        this.debugCtx.fillRect(5, 5, 220, 160);
        this.debugCtx.fillStyle = HOTPOT.COLORS.DEBUG_TEXT;
        this.debugCtx.font = '11px monospace';
        this.debugCtx.textAlign = 'left';
        const cp = this.game.state.getCurrentPlayer();
        const lines = [
            `State: ${this.game.gameState}`,
            `Phase: ${this.game.state.gamePhase}`,
            `TurnPhase: ${this.game.turnPhase}`,
            `Current: ${cp ? cp.name : 'none'}`,
            `Deck: ${this.game.state.deck.length}`,
            `Round: ${this.game.state.roundNumber}`,
            `P0 hand: ${this.game.state.players[0] ? this.game.state.players[0].hand.length : 0}`,
            `P0 drawn: ${this.game.state.players[0] && this.game.state.players[0].drawnCard ? 'yes' : 'no'}`
        ];
        lines.forEach((l, i) => this.debugCtx.fillText(l, 10, 20 + i * 14));
    }

    drawSettingsModal() {
        this.gameCtx.fillStyle = 'rgba(0,0,0,0.7)';
        this.gameCtx.fillRect(0, 0, HOTPOT.WIDTH, HOTPOT.HEIGHT);

        const modalX = HOTPOT.WIDTH / 2 - 150;
        const modalY = HOTPOT.HEIGHT / 2 - 120;
        const modalW = 300;
        const modalH = 240;

        this.gameCtx.fillStyle = HOTPOT.COLORS.UI_BG;
        this.gameCtx.fillRect(modalX, modalY, modalW, modalH);
        this.gameCtx.strokeStyle = HOTPOT.COLORS.UI_BORDER;
        this.gameCtx.lineWidth = 2;
        this.gameCtx.strokeRect(modalX, modalY, modalW, modalH);

        this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
        this.gameCtx.font = 'bold 20px Arial';
        this.gameCtx.textAlign = 'center';
        this.gameCtx.fillText('Settings', HOTPOT.WIDTH / 2, modalY + 35);

        const speedCfg = this.game.flow.getSpeedConfig();
        this.gameCtx.font = '14px Arial';
        this.gameCtx.fillText(`Speed: ${speedCfg.name}`, HOTPOT.WIDTH / 2, modalY + 70);

        const btnW = 120;
        const btnH = 35;
        const btnY = modalY + 90;

        this.game.settingsButtons = [];

        const speedBtn = { x: HOTPOT.WIDTH / 2 - btnW / 2, y: btnY, w: btnW, h: btnH, hovered: false, action: 'speed' };
        speedBtn.hovered = this.input.isElementHovered('settings_speed');
        this.gameCtx.fillStyle = speedBtn.hovered ? HOTPOT.COLORS.HIGHLIGHT : HOTPOT.COLORS.UI_BORDER;
        this.gameCtx.fillRect(speedBtn.x, speedBtn.y, btnW, btnH);
        this.gameCtx.strokeStyle = '#fff';
        this.gameCtx.lineWidth = 1;
        this.gameCtx.strokeRect(speedBtn.x, speedBtn.y, btnW, btnH);
        this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
        this.gameCtx.font = 'bold 13px Arial';
        this.gameCtx.fillText('Change Speed', speedBtn.x + btnW / 2, speedBtn.y + btnH / 2 + 5);
        this.game.settingsButtons.push(speedBtn);

        const quitBtn = { x: HOTPOT.WIDTH / 2 - btnW / 2, y: btnY + 45, w: btnW, h: btnH, hovered: false, action: 'quit' };
        quitBtn.hovered = this.input.isElementHovered('settings_quit');
        this.gameCtx.fillStyle = quitBtn.hovered ? '#a00000' : '#444';
        this.gameCtx.fillRect(quitBtn.x, quitBtn.y, btnW, btnH);
        this.gameCtx.strokeStyle = '#fff';
        this.gameCtx.lineWidth = 1;
        this.gameCtx.strokeRect(quitBtn.x, quitBtn.y, btnW, btnH);
        this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
        this.gameCtx.font = 'bold 13px Arial';
        this.gameCtx.fillText('Quit Game', quitBtn.x + btnW / 2, quitBtn.y + btnH / 2 + 5);
        this.game.settingsButtons.push(quitBtn);

        const closeBtn = { x: HOTPOT.WIDTH / 2 - btnW / 2, y: btnY + 90, w: btnW, h: btnH, hovered: false, action: 'close' };
        closeBtn.hovered = this.input.isElementHovered('settings_close');
        this.gameCtx.fillStyle = closeBtn.hovered ? '#a00000' : '#444';
        this.gameCtx.fillRect(closeBtn.x, closeBtn.y, btnW, btnH);
        this.gameCtx.strokeStyle = '#fff';
        this.gameCtx.lineWidth = 1;
        this.gameCtx.strokeRect(closeBtn.x, closeBtn.y, btnW, btnH);
        this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
        this.gameCtx.font = 'bold 13px Arial';
        this.gameCtx.fillText('Close', closeBtn.x + btnW / 2, closeBtn.y + btnH / 2 + 5);
        this.game.settingsButtons.push(closeBtn);
    }

    drawSettingsConfirmModal() {
        this.gameCtx.fillStyle = 'rgba(0,0,0,0.55)';
        this.gameCtx.fillRect(0, 0, HOTPOT.WIDTH, HOTPOT.HEIGHT);

        const modalX = HOTPOT.WIDTH / 2 - 200;
        const modalY = HOTPOT.HEIGHT / 2 - 70;
        const modalW = 400;
        const modalH = 140;

        this.gameCtx.fillStyle = 'rgb(40, 20, 10)';
        this.gameCtx.fillRect(modalX, modalY, modalW, modalH);
        this.gameCtx.strokeStyle = HOTPOT.COLORS.UI_BORDER;
        this.gameCtx.lineWidth = 2;
        this.gameCtx.strokeRect(modalX, modalY, modalW, modalH);

        this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
        this.gameCtx.font = 'bold 18px Arial';
        this.gameCtx.textAlign = 'center';
        this.gameCtx.fillText('Quit Game?', HOTPOT.WIDTH / 2, modalY + 30);

        this.gameCtx.font = '13px Arial';
        this.gameCtx.fillStyle = '#cccccc';
        if (this.game.networkSession) {
            this.gameCtx.fillText('You will be disconnected from the online session.', HOTPOT.WIDTH / 2, modalY + 55);
        } else {
            this.gameCtx.fillText('Are you sure you want to quit?', HOTPOT.WIDTH / 2, modalY + 55);
        }

        const btnW = 120;
        const btnH = 35;
        const btnY = modalY + 75;
        const spacing = 20;
        const totalW = btnW * 2 + spacing;
        const startX = HOTPOT.WIDTH / 2 - totalW / 2;

        this.game.settingsConfirmButtons = [];

        const yesBtn = { x: startX, y: btnY, w: btnW, h: btnH, hovered: false, action: 'confirmYes' };
        yesBtn.hovered = this.input.isElementHovered('settings_confirm_yes');
        this.gameCtx.fillStyle = yesBtn.hovered ? '#a00000' : '#444';
        this.gameCtx.fillRect(yesBtn.x, yesBtn.y, btnW, btnH);
        this.gameCtx.strokeStyle = '#fff';
        this.gameCtx.lineWidth = 1;
        this.gameCtx.strokeRect(yesBtn.x, yesBtn.y, btnW, btnH);
        this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
        this.gameCtx.font = 'bold 13px Arial';
        this.gameCtx.fillText('Yes', yesBtn.x + btnW / 2, yesBtn.y + btnH / 2 + 5);
        this.game.settingsConfirmButtons.push(yesBtn);

        const noBtn = { x: startX + btnW + spacing, y: btnY, w: btnW, h: btnH, hovered: false, action: 'confirmNo' };
        noBtn.hovered = this.input.isElementHovered('settings_confirm_no');
        this.gameCtx.fillStyle = noBtn.hovered ? HOTPOT.COLORS.HIGHLIGHT : HOTPOT.COLORS.UI_BORDER;
        this.gameCtx.fillRect(noBtn.x, noBtn.y, btnW, btnH);
        this.gameCtx.strokeStyle = '#fff';
        this.gameCtx.lineWidth = 1;
        this.gameCtx.strokeRect(noBtn.x, noBtn.y, btnW, btnH);
        this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
        this.gameCtx.font = 'bold 13px Arial';
        this.gameCtx.fillText('No', noBtn.x + btnW / 2, noBtn.y + btnH / 2 + 5);
        this.game.settingsConfirmButtons.push(noBtn);
    }
}
