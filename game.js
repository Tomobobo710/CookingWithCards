/**
 * HOTPOT - Based on the Hotpot Minigame from Palia
 * 96 cards, 8 categories, 3 ingredients per category, 4 copies each
 * Build 3 sets (Three-of-a-Kind or Category Set) to win
 * ActionEngineJS implementation
 */
class Game {
    constructor(canvases, input, audio) {
        this.input = input;
        this.audio = audio;

        this.gameCanvas = canvases.gameCanvas;
        this.gameCtx = this.gameCanvas.getContext('2d');
        this.guiCanvas = canvases.guiCanvas;
        this.guiCtx = canvases.guiCtx;
        this.debugCanvas = canvases.debugCanvas;
        this.debugCtx = canvases.debugCtx;

        this.state = new GameState();
        this.gameState = 'menu';
        this.turnPhase = 'draw';
        this.turnTimer = 0;
        this.bestSets = [];
        this._botRevealed = false;
        this.debugEnabled = false;
        this.settingsOpen = false;
        this.currentSpeed = parseInt(localStorage.getItem('hotpot_speed')) || 2;
        this.settingsButtons = [];
        this.msgY = 110;

        // Countdown overlay (used by online multiplayer)
        this.countdown = {
            active: false,
            timer: 0,
            phase: "waiting",
            countdownNumber: 3,
            waitingForOpponent: false
        };

        // Menu system
        this.menuStack = { current: null, previous: null };
        this.menuManager = new HotpotMenuManager(this);
        this.menuInputManager = new HotpotMenuInputManager(this, input);
        this.waitingMenuInputManager = new HotpotWaitingMenusInputManager(this, input);

        // Online multiplayer
        this.gui = null;
        this.networkManager = null;
        this.networkSession = null;
        this.actionNetInputManager = null;
        this.playerCount = 4; // default for local multiplayer
        this.suppressNextFrameMenuNavigate = false;
        this.skipMenuNavigateSound = false;

        // Initialize ActionNetManagerGUI for online multiplayer (P2P)
        this.gui = new ActionNetManagerGUI(canvases, input, audio, {
            mode: 'p2p',
            p2pConfig: {
                gameId: 'hotpot-game-001',
                maxPlayers: 4,
                debug: false
            }
        });
        this.networkManager = this.gui.getNetManager();

        // Wire up ActionNetInputManager to connect GUI events to game
        this.actionNetInputManager = new HotpotActionNetInputManager(this, input);
        this.actionNetInputManager.wireGUIEvents();

        // Menu button references (used in rendering)
        this.menuButton = { id: 'menu_button', x: 300, y: 300, width: 200, height: 60, hovered: false };
        this.restartButton = { id: 'restart_button', x: 300, y: 370, width: 200, height: 60, hovered: false };
        this.eatButton = { id: 'eat_button', x: 300, y: 300, width: 200, height: 50, hovered: false };
        this.settingsButton = { x: HOTPOT.WIDTH - 90, y: 10, w: 80, h: 30, hovered: false };

        // Register eat button for input (Let's Eat / win button)
        this.input.registerElement('eat_button', {
            bounds: () => ({ x: this.eatButton.x, y: this.eatButton.y, width: this.eatButton.width, height: this.eatButton.height })
        });

        // Register restart button for input (game over screen)
        this.input.registerElement('restart_button', {
            bounds: () => ({ x: this.restartButton.x, y: this.restartButton.y, width: this.restartButton.width, height: this.restartButton.height })
        });

        // Register menu button for input (title screen)
        this.input.registerElement('menu_button', {
            bounds: () => ({ x: this.menuButton.x, y: this.menuButton.y, width: this.menuButton.width, height: this.menuButton.height })
        });

        // Aliases for MenuInputManager
        this.mainMenu = this.menuManager.mainMenu;
        this.multiplayerMenu = this.menuManager.multiplayerMenu;
        this.gameOverMenu = this.menuManager.gameOverMenu;
        this.onlineGameOverMenu = this.menuManager.onlineGameOverMenu;
        this.rematchPendingMenu = this.menuManager.rematchPendingMenu;
        this.waitingMenu = this.menuManager.waitingMenu;
        this.waitingCanceledMenu = this.menuManager.waitingCanceledMenu;
        this.waitingForHostMenu = this.menuManager.waitingForHostMenu;
        this.opponentDisconnectedMenu = this.menuManager.opponentDisconnectedMenu;
        this.roomShutDownMenu = this.menuManager.roomShutDownMenu;

        this.setupAudio();

        this.animationTime = 0;
        this.lastTime = performance.now();
    }

    get menuManager() { return this._menuManager; }
    set menuManager(v) { this._menuManager = v; }
    get menuInputManager() { return this._menuInputManager; }
    set menuInputManager(v) { this._menuInputManager = v; }
    get waitingMenuInputManager() { return this._waitingMenuInputManager; }
    set waitingMenuInputManager(v) { this._waitingMenuInputManager = v; }

    getSpeedConfig() {
        return HOTPOT.SPEEDS[this.currentSpeed] || HOTPOT.SPEEDS[2];
    }

    applySpeedToCard(card) {
        const s = this.getSpeedConfig();
        card.moveSpeed = s.move;
        card.rotateSpeed = s.rotate;
        card.scaleSpeed = s.scale;
        card.flipSpeed = s.flip;
    }

    applySpeedToAllCards() {
        for (const player of this.state.players) {
            for (const card of player.hand) {
                this.applySpeedToCard(card);
            }
            if (player.drawnCard) {
                this.applySpeedToCard(player.drawnCard);
            }
        }
    }

 setupPlayers(count) {
        const n = count || 4;
        this.state.players = [];
        this.state.players.push(new NetworkedPlayer(0, 'You', true));
        for (let i = 1; i < n; i++) {
            this.state.players.push(new NetworkedPlayer(i, 'Bot ' + i, false, 1 + Math.floor(Math.random() * 3)));
        }
        this.playerCount = n;
    }

    setupAudio() {
        this.audio.createSweepSound('draw', { startFreq: 200, endFreq: 400, type: 'sine', duration: 0.2, envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.09 } });
        this.audio.createSweepSound('discard', { startFreq: 300, endFreq: 150, type: 'triangle', duration: 0.15, envelope: { attack: 0.01, decay: 0.09, sustain: 0, release: 0.05 } });
        this.audio.createComplexSound('set_complete', { frequencies: [440, 554, 659], types: ['sine', 'triangle', 'sine'], mix: [0.4, 0.3, 0.3], duration: 0.5, envelope: { attack: 0.02, decay: 0.2, sustain: 0.3, release: 0.28 } });
        this.audio.createComplexSound('win', { frequencies: [523, 659, 784, 1047], types: ['sine', 'sine', 'sine', 'sine'], mix: [0.3, 0.3, 0.2, 0.2], duration: 1.0, envelope: { attack: 0.1, decay: 0.3, sustain: 0.4, release: 0.6 } });
    }

    startGame(playerCount) {
        const n = playerCount || 4;
        this.state.reset();
        this.setupPlayers(n);
        const deckRect = this.getDeckRect();
        this.state.createDeck(deckRect);
        this.state.dealInitialHands();
        this.state.gamePhase = 'playing';
        this.turnPhase = 'draw';
        this.bestSets = [];
        this._botRevealed = false;

        for (const card of this.state.deck) {
            this.applySpeedToCard(card);
        }

        this.sortHandByCategory(this.state.players[0]);
        this.state.players[0].hasDrawn = false;
        this.state.players[0].drawnCard = null;

        const humanRects = this.getHandCardRects(0);
        for (let i = 0; i < this.state.players[0].hand.length; i++) {
            const rect = humanRects[i];
            const card = this.state.players[0].hand[i];
            card.moveTo(rect.x, rect.y);
            card.rotation = Math.PI * 2;
            card.targetRotation = 0;
        }

        for (let i = 1; i < this.state.players.length; i++) {
            const ha = i === 1 ? Math.PI / 2 : (i === 2 ? Math.PI : -Math.PI / 2);
            for (const card of this.state.players[i].hand) {
                this.applySpeedToCard(card);
                card.rotation = ha + Math.PI * 2;
                card.targetRotation = ha;
            }
        }
    }

    startSinglePlayer() {
        this.startGame(4);
        this.gameState = 'playing';
    }

    clearGameState() {
        this.state.reset();
        this.turnPhase = 'draw';
        this.turnTimer = 0;
        this.bestSets = [];
        this._botRevealed = false;
        this.settingsOpen = false;
    }

    // ---------- Update Loop ----------
    action_update() {
        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.25);
        this.lastTime = now;
        this.animationTime += dt;

        this.updateCards();

        // Handle online GUI
        if (this.gameState === 'multiplayerLogin' && this.gui) {
            this.gui.action_update(dt);
            this.handleInput();
            return;
        }

        this.handleInput();

        if (this.gameState === 'playing') {
            this.updateGameLogic(dt);
        }

        if ((this.gameState === 'onlineMultiplayer' || this.gameState === 'rematchPending' || this.gameState === 'waitingMenu') && this.networkSession) {
            this.networkSession.update(dt);
        }

        if (this.gameState === 'gameOver' && !this._botRevealed) {
            this._botRevealed = true;
            for (const p of this.state.players) {
                if (p.isHuman) continue;
                for (const card of p.hand) {
                    card.faceUp = false;
                    card.flip();
                }
            }
        }

        if (this.state.messageTimer > 0) {
            this.state.messageTimer -= dt;
        }
    }

    updateCards() {
        for (const player of this.state.players) {
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
        for (const card of this.state.deck) {
            if (card.update) card.update();
        }
    }

    // ---------- Input ----------
    handleInput() {
        if (this.input.isKeyJustPressed('ActionDebugToggle')) {
            this.debugEnabled = !this.debugEnabled;
        }

        if (this.settingsOpen) {
            if (this.input.isLeftMouseButtonJustPressed()) {
                const pointer = this.input.getPointerPosition();
                for (const btn of this.settingsButtons) {
                    if (this.pointInRect(pointer, btn)) {
                        if (btn.action === 'close') {
                            this.settingsOpen = false;
                        } else if (btn.action === 'speed') {
                            this.currentSpeed = (this.currentSpeed % Object.keys(HOTPOT.SPEEDS).length) + 1;
                            localStorage.setItem('hotpot_speed', this.currentSpeed);
                            this.applySpeedToAllCards();
                        }
                        return;
                    }
                }
            }
            return;
        }

        // Menu navigation
        if (this.menuStack.current === 'multiplayer') {
            this.menuInputManager.handleMultiplayerMenuInput();
            return;
        }

      if (this.gameState === 'menu') {
            this.menuInputManager.handleMainMenuInput();
            return;
        }

        if (this.gameState === 'gameOver') {
            this.menuInputManager.handleGameOverMenuInput();
            return;
        }

        // Online waiting menus
        if (this.gameState === 'waitingMenu') {
            this.waitingMenuInputManager.handleWaitingMenuInput();
            return;
        }

        if (this.gameState === 'waitingCanceledMenu') {
            this.waitingMenuInputManager.handleWaitingCanceledMenuInput();
            return;
        }

        if (this.gameState === 'waitingForHostMenu') {
            this.waitingMenuInputManager.handleWaitingForHostMenuInput();
            return;
        }

        if (this.gameState === 'opponentDisconnected') {
            this.waitingMenuInputManager.handleOpponentDisconnectedInput();
            return;
        }

        if (this.gameState === 'roomShutDown') {
            this.waitingMenuInputManager.handleRoomShutDownInput();
            return;
        }

        if (this.gameState === 'rematchPending') {
            this.waitingMenuInputManager.handleRematchPendingInput();
            return;
        }

        if (this.gameState === 'playing') {
            const player = this.state.getCurrentPlayer();
            if (player.isHuman) {
                if (this.turnPhase === 'draw') {
                    this.handleHumanDraw();
                } else if (this.turnPhase === 'discard') {
                    this.handleHumanDiscard(player);
                }
            }
        }

        if (this.gameState === 'onlineMultiplayer' && this.networkSession && !this.networkSession.isHost) {
            const localPlayer = this.networkSession.game.state.players[this.networkSession.localPlayerIndex];
            const isMyTurn = this.gameState.currentPlayerIndex === this.networkSession.localPlayerIndex;
            if (localPlayer && localPlayer.isHuman && isMyTurn) {
                if (this.turnPhase === 'draw') {
                    this.handleHumanDrawForPlayer(localPlayer);
                } else if (this.turnPhase === 'discard') {
                    this.handleHumanDiscardForPlayer(localPlayer);
                }
            }
        }
    }

    handleHumanDraw() {
        if (!this.input.isLeftMouseButtonJustPressed()) return;

        const player = this.state.players[0];
        const pointer = this.input.getPointerPosition();

        const deckRect = this.getDeckRect();
        if (this.pointInRect(pointer, deckRect)) {
            const card = this.state.deck[this.state.deck.length - 1];
            this.applySpeedToCard(card);
            const drawnRect = this.getDrawnCardRect(player);
            card.moveTo(drawnRect.x, drawnRect.y);
            card.faceUp = false;
            this.state.drawFromDeck(player);
            card.flip();
            this.audio.play('draw', { volume: 0.3 });
            this.afterHumanDraw(player);
            return;
        }

        for (let i = 1; i < this.state.players.length; i++) {
            const other = this.state.players[i];
            if (other.discardPile.length === 0) continue;
            const rect = this.getDiscardRect(i);
            if (this.pointInRect(pointer, rect)) {
                const card = other.discardPile[other.discardPile.length - 1];
                this.applySpeedToCard(card);
                card.moveTo(rect.x, rect.y);
                this.state.drawFromDiscard(player, other);
                this.audio.play('draw', { volume: 0.3 });
                this.afterHumanDraw(player);
                return;
            }
        }
    }

    afterHumanDraw(player) {
        this.turnPhase = 'discard';
        this.bestSets = this.state.findBestSets(player.getAllCards(), HOTPOT.GAME.SETS_TO_WIN);

        for (const c of player.getAllCards()) c.highlighted = null;
        for (const set of this.bestSets) {
            const type = set[0].ingredient === set[1].ingredient ? 'triple' : 'category';
            for (const c of set) c.highlighted = type;
        }

        if (this.state.canWin(player)) {
            this.state.message = 'You can win! Click "Let\'s Eat!" to end the game!';
            this.state.messageTimer = 5;
        }
    }

    handleHumanDiscard(player) {
        if (!this.input.isLeftMouseButtonJustPressed()) return;

        const pointer = this.input.getPointerPosition();

        if (this.state.canWin(player)) {
            this.eatButton.hovered = this.input.isElementHovered('eat_button');
            if (this.input.isElementJustPressed('eat_button')) {
                this.handleWin(player);
                return;
            }
        }

        const handCards = this.getHandCardRects(0);

        for (let i = 0; i < player.hand.length; i++) {
            if (this.pointInRect(pointer, handCards[i])) {
                const card = player.hand[i];
                this.applySpeedToCard(card);
                this.state.discardCard(player, card);
                this.audio.play('discard', { volume: 0.3 });
                this.endTurn();
                return;
            }
        }

        if (player.drawnCard) {
            const drawnRect = this.getDrawnCardRect();
            if (this.pointInRect(pointer, drawnRect)) {
                const card = player.drawnCard;
                this.applySpeedToCard(card);
                this.state.discardCard(player, card);
                this.audio.play('discard', { volume: 0.3 });
                this.endTurn();
            }
        }
    }

    handleHumanDrawForPlayer(player) {
        if (!this.input.isLeftMouseButtonJustPressed()) return;
        const pointer = this.input.getPointerPosition();

        const remoteGame = this.networkSession.syncSystem ? this.networkSession.syncSystem.getRemote("game") : null;
        const deckAvailable = remoteGame ? remoteGame.deckCount > 0 : this.state.deck.length > 0;

        const deckRect = this.getDeckRect();
        if (this.pointInRect(pointer, deckRect) && deckAvailable) {
            this.networkSession.sendPlayerAction(this.networkSession.localPlayerIndex, "drawDeck");
            return;
        }

        for (let i = 1; i < this.state.players.length; i++) {
            const other = this.state.players[i];
            if (other.discardPile.length === 0) continue;
            const rect = this.getDiscardRect(i);
            if (this.pointInRect(pointer, rect)) {
                this.networkSession.sendPlayerAction(this.networkSession.localPlayerIndex, "drawDiscard", { sourcePlayerIndex: i });
                return;
            }
        }
    }

    handleHumanDiscardForPlayer(player) {
        if (!this.input.isLeftMouseButtonJustPressed()) return;
        const pointer = this.input.getPointerPosition();

        if (this.state.canWin(player)) {
            this.eatButton.hovered = this.input.isElementHovered('eat_button');
            if (this.input.isElementJustPressed('eat_button')) {
                this.networkSession.sendPlayerAction(this.networkSession.localPlayerIndex, "win");
                return;
            }
        }

        const handCards = this.getHandCardRects(0);
        for (let i = 0; i < player.hand.length; i++) {
            if (this.pointInRect(pointer, handCards[i])) {
                const card = player.hand[i];
                this.networkSession.sendPlayerAction(this.networkSession.localPlayerIndex, "discard", {
                    category: card.category,
                    ingredient: card.ingredient
                });
                return;
            }
        }

        if (player.drawnCard) {
            const drawnRect = this.getDrawnCardRect();
            if (this.pointInRect(pointer, drawnRect)) {
                this.networkSession.sendPlayerAction(this.networkSession.localPlayerIndex, "discard", {
                    category: player.drawnCard.category,
                    ingredient: player.drawnCard.ingredient
                });
            }
        }
    }

    handleWin(player) {
        const cards = player.getAllCards();
        player.won = true;
        this.state.message = player.isHuman ? 'You win!' : `${player.name} wins!`;
        this.audio.play('win', { volume: 0.7 });

        // End the game (we're always the host as player 0)
        if (this.networkSession) {
            this.state.gamePhase = 'gameOver';
            this.gameState = 'gameOver';
            this.networkSession.endGame();
        } else {
            // Single player / local multiplayer
            this.state.gamePhase = 'gameOver';
            this.gameState = 'gameOver';
        }
    }

    // ---------- Bot Logic ----------
     updateGameLogic(dt) {
        if (this.state.gamePhase === 'gameOver') {
            if (this.gameState !== 'gameOver') {
                this.gameState = 'gameOver';
                this.audio.play('win', { volume: 0.7 });
            }
            return;
        }

        // In online mode, skip bot AI for remote humans (they control their own turns)
        // Bot players still use AI
        if (this.networkSession && this.networkSession.isHost) {
            const player = this.state.getCurrentPlayer();
            if (!player.isHuman && !player.isRemote) {
                this.updateBotTurn(player);
            }
        } else if (!this.networkSession) {
            const player = this.state.getCurrentPlayer();
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

    updateBotTurn(player) {
        if (!player.botStarted) {
            player.botStarted = true;
            player.botTimer = 0;
        }

        player.botTimer += 1;
        const speedCfg = this.getSpeedConfig();
        if (player.botTimer < speedCfg.botDelay + speedCfg.thinkExtra) return;

        player.turnCount++;

        const cfg = HOTPOT.BOT_AI[player.difficulty] || HOTPOT.BOT_AI[2];

        const canSteal = [];
        for (let i = 0; i < this.state.players.length; i++) {
            const p = this.state.players[i];
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

        if (bestStealTarget && bestStealValue >= cfg.stealThreshold) {
            this.state.drawFromDiscard(player, bestStealTarget);
            this.applySpeedToCard(player.drawnCard);
        } else if (this.state.deck.length > 0) {
            this.state.drawFromDeck(player);
            this.applySpeedToCard(player.drawnCard);
        } else {
            this.state.drawFromDeck(player);
            if (!player.drawnCard) {
                this.endTurn();
                return;
            }
            this.applySpeedToCard(player.drawnCard);
        }

        this.audio.play('draw', { volume: 0.2 });

        if (this.state.canWin(player)) {
            this.handleWin(player);
            player.botStarted = false;
            return;
        }

        const allCards = player.getAllCards();
        const scored = allCards.map(c => ({ card: c, value: this.botCardValue(c, player) }));
        scored.sort((a, b) => a.value - b.value);

        const discardIdx = Math.min(cfg.discardIndex, scored.length - 1);
        const discardCard = scored[discardIdx].card;

        this.applySpeedToCard(discardCard);
        this.state.discardCard(player, discardCard);
        this.audio.play('discard', { volume: 0.2 });
        this.endTurn();
        player.botStarted = false;
    }

    endTurn() {
        const actingPlayer = this.state.getCurrentPlayer();
        actingPlayer.hasDrawn = false;

        if (actingPlayer.drawnCard) {
            if (!actingPlayer.isHuman) {
                const botIdx = this.state.players.indexOf(actingPlayer);
                const ha = botIdx === 1 ? Math.PI / 2 : (botIdx === 2 ? Math.PI : -Math.PI / 2);
                this.applySpeedToCard(actingPlayer.drawnCard);
                actingPlayer.drawnCard.rotation = ha + Math.PI * 2 * 3;
                actingPlayer.drawnCard.rotateTo(ha);
                actingPlayer.drawnCard.scaleTo(0.375);
            }
            actingPlayer.hand.push(actingPlayer.drawnCard);
        }
        actingPlayer.drawnCard = null;

        if (actingPlayer.isHuman) {
            this.sortHandByCategory(actingPlayer);
        }

        this.state.currentPlayerIndex = this.state.getNextPlayerIndex();

        if (actingPlayer.won) {
            this.gameState = 'gameOver';
            this.audio.play('win', { volume: 0.7 });
            return;
        }

        const nextPlayer = this.state.getCurrentPlayer();
        nextPlayer.hasDrawn = false;
        nextPlayer.drawnCard = null;

        if (!nextPlayer.isHuman) {
            nextPlayer.botStarted = false;
        }

        this.turnPhase = 'draw';
        this.bestSets = [];
        for (const p of this.state.players) {
            for (const c of p.hand) c.highlighted = null;
            if (p.drawnCard) p.drawnCard.highlighted = null;
        }
    }

    sortHandByCategory(player) {
        const categoryOrder = Object.keys(HOTPOT.CATEGORIES);
        const ingredientOrder = {};
        for (const [cat, data] of Object.entries(HOTPOT.CATEGORIES)) {
            ingredientOrder[cat] = Object.keys(data.ingredients);
        }
        player.hand.sort((a, b) => {
            const catDiff = categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
            if (catDiff !== 0) return catDiff;
            return ingredientOrder[a.category].indexOf(a.ingredient) - ingredientOrder[b.category].indexOf(b.ingredient);
        });
    }

    pointInRect(p, r) {
        return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
    }

    getDeckRect() {
        const cx = HOTPOT.WIDTH / 2;
        const cy = HOTPOT.HEIGHT / 2;
        return { x: cx - HOTPOT.UI.CARD_WIDTH / 2, y: cy - HOTPOT.UI.CARD_HEIGHT / 2, w: HOTPOT.UI.CARD_WIDTH, h: HOTPOT.UI.CARD_HEIGHT };
    }

    getDiscardRect(playerIndex) {
        const cx = HOTPOT.WIDTH / 2;
        const cy = HOTPOT.HEIGHT / 2;
        const gap = 50;
        const hw = HOTPOT.UI.CARD_WIDTH / 2;
        const hh = HOTPOT.UI.CARD_HEIGHT / 2;

        const distV = hh + gap;
        const distH = hw + gap / 2 + 12.5;
        const positions = [
            { x: cx - hw, y: cy + distV - hh },
            { x: cx - distH - hw, y: cy - hh },
            { x: cx - hw, y: cy - distV - hh },
            { x: cx + distH - hw, y: cy - hh }
        ];
        const pos = positions[playerIndex];
        return { x: pos.x, y: pos.y, w: HOTPOT.UI.CARD_WIDTH, h: HOTPOT.UI.CARD_HEIGHT };
    }

    getHandCardRects(playerIndex) {
        const player = this.state.players[playerIndex];
        const cards = player.hand;
        if (cards.length === 0) return [];

        const groups = [];
        let cur = null;
        for (const card of cards) {
            const key = card.category + '|' + card.ingredient;
            if (!cur || cur.key !== key) {
                cur = { category: card.category, ingredient: card.ingredient, cards: [], key };
                groups.push(cur);
            }
            cur.cards.push(card);
        }

        const catGap = 24;
        const ingGap = 10;
        const step = HOTPOT.UI.CARD_WIDTH + HOTPOT.UI.CARD_SPACING;

        let totalW = 0;
        for (let g = 0; g < groups.length; g++) {
            totalW += groups[g].cards.length * step - HOTPOT.UI.CARD_SPACING;
            if (g < groups.length - 1) {
                totalW += groups[g + 1].category === groups[g].category ? ingGap : catGap;
            }
        }

        const startX = (HOTPOT.WIDTH - totalW) / 2;
        const rects = [];
        let x = startX;
        for (let g = 0; g < groups.length; g++) {
            const group = groups[g];
            for (let c = 0; c < group.cards.length; c++) {
                rects.push({ x, y: HOTPOT.UI.HAND_Y, w: HOTPOT.UI.CARD_WIDTH, h: HOTPOT.UI.CARD_HEIGHT });
                x += step;
            }
            x -= HOTPOT.UI.CARD_SPACING;
            if (g < groups.length - 1) {
                x += groups[g + 1].category === group.category ? ingGap : catGap;
            }
        }
        return rects;
    }

    getDrawnCardRect() {
        return { x: HOTPOT.WIDTH / 2 + 200, y: HOTPOT.UI.DRAWN_Y, w: HOTPOT.UI.CARD_WIDTH, h: HOTPOT.UI.CARD_HEIGHT };
    }

    // ---------- Draw ----------
    action_draw() {
        this.drawGameLayer();
        this.drawGUILayer();
        this.drawDebugLayer();
        if (this.settingsOpen) this.drawSettingsModal();
    }

    drawGameLayer() {
        this.gameCtx.fillStyle = HOTPOT.COLORS.BACKGROUND;
        this.gameCtx.fillRect(0, 0, HOTPOT.WIDTH, HOTPOT.HEIGHT);

        if (this.gameState === 'menu' || this.menuStack.current === 'multiplayer') {
            if (this.menuStack.current === 'multiplayer') {
                this.drawMultiplayerMenuScreen();
         } else {
                this.drawMenuScreen();
            }
        } else if (this.gameState === 'playing' || this.gameState === 'gameOver') {
            this.drawGameTable();
        } else if (this.gameState === 'onlineMultiplayer') {
            this.drawGameTable();
         } else if (this.gameState === 'waitingMenu') {
            this.drawGameTable();
            const userCount = this.networkManager ? this.networkManager.getConnectedUsers().length : 0;
            this.drawWaitingMenuScreen('WAITING FOR PLAYERS (' + userCount + '/4)');
        } else if (this.gameState === 'waitingCanceledMenu') {
            this.drawGameTable();
            this.drawWaitingCanceledMenuScreen();
        } else if (this.gameState === 'waitingForHostMenu') {
            this.drawGameTable();
            this.drawWaitingForHostMenuScreen();
        } else if (this.gameState === 'opponentDisconnected') {
            this.drawGameTable();
            this.drawOpponentDisconnectedMenuScreen();
        } else if (this.gameState === 'roomShutDown') {
            this.drawGameTable();
            this.drawRoomShutDownMenuScreen();
        } else if (this.gameState === 'rematchPending') {
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
        const menu = this.menuManager.mainMenu;
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
        const menu = this.menuManager.multiplayerMenu;
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

        const menu = this.waitingMenu;
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

        const menu = this.waitingCanceledMenu;
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

        const menu = this.waitingForHostMenu;
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

        const menu = this.opponentDisconnectedMenu;
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

        const menu = this.roomShutDownMenu;
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

        const menu = this.rematchPendingMenu;
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

    drawGameTable() {
        const currentPlayer = this.state.getCurrentPlayer();

        this.drawDeck();
        this.drawDiscardPiles();
        this.drawSettingsButton();

   // Find local player index (the one controlling this client)
        let localPlayerIndex = 0;
        if (this.networkSession) {
            for (let i = 0; i < this.state.players.length; i++) {
                if (this.state.players[i].isLocal) { localPlayerIndex = i; break; }
            }
        } else {
            // Single player: player 0 is human
            for (let i = 0; i < this.state.players.length; i++) {
                if (this.state.players[i].isHuman) { localPlayerIndex = i; break; }
            }
        }

        // Render local player at bottom, remote players at other 3 positions
        const localPlayer = this.state.players[localPlayerIndex];
        this.drawHumanHand(localPlayer, localPlayerIndex);

        // Remote players: position them around the table
        // Fixed visual slots: left(E)=1, top(N)=2, right(W)=3
        // Players fill slots in turn order, starting from the slot after local player (clockwise)
        const visualSlots = [1, 2, 3]; // left, top, right
        let slotIdx = 0;
        // Start filling from the player whose index is next after localPlayerIndex (clockwise)
        for (let offset = 1; offset < this.state.players.length; offset++) {
            const remoteIdx = (localPlayerIndex + offset) % this.state.players.length;
            if (remoteIdx >= this.state.players.length) continue;
            const p = this.state.players[remoteIdx];
            const visualPos = visualSlots[slotIdx % visualSlots.length];
            this.drawBotHand(p, visualPos);
            slotIdx++;
        }

        if (this.gameState === 'gameOver') {
            this.drawGameOver();
        } else {
            this.drawTurnInfo(currentPlayer);
            let isLocalTurn = false;
            if (this.networkSession && this.networkSession.localPlayerIndex !== undefined) {
                isLocalTurn = this.gameState.currentPlayerIndex === this.networkSession.localPlayerIndex;
            } else {
                isLocalTurn = currentPlayer && currentPlayer.isHuman;
            }
            if (isLocalTurn) {
                this.drawHumanPrompt(currentPlayer);
            }
        }

        if (this.state.messageTimer > 0) {
            this.drawMessage();
        }

        // Draw countdown overlay for online multiplayer
        if (this.networkSession && this.countdown) {
            const cd = this.countdown;
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
        const rect = this.getDeckRect();
        const player = this.state.getCurrentPlayer();
        const isClickable = player && player.isHuman && this.turnPhase === 'draw' && this.state.deck.length > 0;

        this.gameCtx.fillStyle = isClickable ? '#a00000' : HOTPOT.COLORS.DECK;
        this.gameCtx.fillRect(rect.x, rect.y, rect.w, rect.h);
        this.gameCtx.strokeStyle = HOTPOT.COLORS.UI_BORDER;
        this.gameCtx.lineWidth = 2;
        this.gameCtx.strokeRect(rect.x, rect.y, rect.w, rect.h);

        this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
        this.gameCtx.font = '26px Arial';
        this.gameCtx.textAlign = 'center';
        this.gameCtx.fillText('🀄', rect.x + rect.w / 2, rect.y + rect.h / 2 + 8);

        if (isClickable && this.state.deck.length > 0) {
            this.gameCtx.fillStyle = '#ff6666';
            this.gameCtx.font = '11px Arial';
        }
    }

    drawDiscardPiles() {
        const player = this.state.getCurrentPlayer();
        const isClickable = player && player.isHuman && this.turnPhase === 'draw';

        for (let i = 0; i < this.state.players.length; i++) {
            const p = this.state.players[i];
            const rect = this.getDiscardRect(i);
            const canClick = isClickable && i !== player.id && p.discardPile.length > 0;

            if (p.discardPile.length > 0) {
                const topCard = p.discardPile[p.discardPile.length - 1];
                topCard.moveTo(rect.x, rect.y);
                topCard.draw(this.gameCtx);

                if (canClick) {
                    this.gameCtx.strokeStyle = HOTPOT.COLORS.HIGHLIGHT;
                    this.gameCtx.lineWidth = 4;
                    this.gameCtx.strokeRect(rect.x, rect.y, rect.w, rect.h);
                }
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
        if (this.settingsOpen) return;
        const btn = this.settingsButton;
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
            this.settingsOpen = true;
        }
    }

    drawHumanHand(player) {
        const handRects = this.getHandCardRects(0);

        for (let i = 0; i < player.hand.length; i++) {
            const card = player.hand[i];
            const rect = handRects[i];
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
            const drawnRect = this.getDrawnCardRect();
            const card = player.drawnCard;
            card.moveTo(drawnRect.x, drawnRect.y);
            card.draw(this.gameCtx);

            this.gameCtx.fillStyle = '#fff';
            this.gameCtx.font = 'bold 12px Arial';
            this.gameCtx.textAlign = 'center';
            this.gameCtx.fillText('DRAWN', drawnRect.x + drawnRect.w / 2, drawnRect.y - 8);
        }

   let playerLabel = '';
        if (this.networkSession) {
            for (let i = 0; i < this.state.players.length; i++) {
                if (this.state.players[i] === player && this.state.players[i].isLocal) {
                    playerLabel = player.name + "'s Hand (Player" + i + ")";
                    break;
                }
            }
            if (!playerLabel) playerLabel = player.name + "'s Hand";
        } else {
            playerLabel = player.name + "'s Hand";
        }
        this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
        this.gameCtx.font = 'bold 14px Arial';
        this.gameCtx.textAlign = 'center';
        this.gameCtx.fillText(playerLabel, HOTPOT.WIDTH / 2, HOTPOT.HEIGHT - 10);

        if (this.bestSets.length > 0) {
            this.gameCtx.fillStyle = '#90ee90';
            this.gameCtx.font = '12px Arial';
            const tripleCount = this.bestSets.filter(s => s[0].ingredient === s[1].ingredient).length;
            const catCount = this.bestSets.filter(s => s[0].ingredient !== s[1].ingredient).length;
            this.gameCtx.textAlign = 'right';
            this.gameCtx.fillText(`Found: ${tripleCount} triple(s), ${catCount} category set(s)`, HOTPOT.WIDTH - 10, HOTPOT.UI.HAND_Y - 20);
        }

        if (player.sets.length > 0) {
            this.gameCtx.fillStyle = '#90ee90';
            this.gameCtx.font = '12px Arial';
            this.gameCtx.textAlign = 'left';
            this.gameCtx.fillText(`Locked sets: ${player.sets.length}`, 10, HOTPOT.UI.HAND_Y - 6);
        }
    }

    drawBotHand(player, index) {
        const cards = player.hand;
        if (cards.length === 0) return;

        const cardScale = 0.5625;
        const spacing = 6;
        const fw = 80 * cardScale;
        const fh = 115 * cardScale;

        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            card.scaleTo(cardScale);
            if (this.gameState !== 'gameOver') card.faceUp = false;

            const handAngle = index === 1 ? Math.PI / 2 : (index === 2 ? Math.PI : -Math.PI / 2);
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

        const cfgLbl = HOTPOT.BOT_AI[player.difficulty] || HOTPOT.BOT_AI[2];
        const info = player.isRemote ? player.name : `${player.name} [${cfgLbl.desc}]`;
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
        const cp = this.state.getCurrentPlayer();
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
        if (this.networkSession && this.networkSession.localPlayerIndex !== undefined) {
            isMyTurn = this.gameState.currentPlayerIndex === this.networkSession.localPlayerIndex;
        } else {
            isMyTurn = currentPlayer.isHuman;
        }

        const label = isMyTurn ? 'YOUR TURN' : `${currentPlayer.name}'s TURN`;
        this.gameCtx.fillStyle = HOTPOT.COLORS.HIGHLIGHT;
        this.gameCtx.font = 'bold 16px Arial';
        this.gameCtx.textAlign = 'center';
        this.gameCtx.fillText(label, HOTPOT.WIDTH / 2, this.msgY);

        if (isMyTurn && this.turnPhase === 'draw') {
            this.gameCtx.fillStyle = '#ffcc66';
            this.gameCtx.font = '13px Arial';
            this.gameCtx.fillText('Click the deck to draw, or click an opponent\'s discard pile to steal', HOTPOT.WIDTH / 2, this.msgY + 20);
        } else if (isMyTurn && this.turnPhase === 'discard') {
            this.gameCtx.fillStyle = '#ffcc66';
            this.gameCtx.font = '13px Arial';
            this.gameCtx.fillText('Click any card (hand or drawn) to discard it and end your turn', HOTPOT.WIDTH / 2, this.msgY + 20);
        }

        if (isMyTurn && this.networkSession && this.turnPhase === 'discard') {
            const turnTimer = currentPlayer.turnTimer || 0;
            const remaining = Math.max(0, Math.ceil(60 - turnTimer));
            this.gameCtx.fillStyle = remaining <= 10 ? '#ff6b6b' : '#ffcc66';
            this.gameCtx.font = 'bold 14px Arial';
            this.gameCtx.fillText('Time: ' + remaining + 's', HOTPOT.WIDTH / 2, this.msgY + 40);
        }

        if (!isMyTurn && this.networkSession) {
            const turnTimer = currentPlayer.turnTimer || 0;
            const remaining = Math.max(0, Math.ceil(60 - turnTimer));
            this.gameCtx.fillStyle = remaining <= 10 ? '#ff6b6b' : '#ffcc66';
            this.gameCtx.font = 'bold 14px Arial';
            this.gameCtx.textAlign = 'center';
            this.gameCtx.fillText('Time: ' + remaining + 's', HOTPOT.WIDTH / 2, this.msgY + 40);
        }

        if (isMyTurn && this.turnPhase === 'discard' && this.state.canWin(this.state.players[0])) {
            this.eatButton.hovered = this.input.isElementHovered('eat_button');
            const btn = this.eatButton;
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

        const winner = this.state.players.find(p => p.won);

        this.gameCtx.fillStyle = '#ffd700';
        this.gameCtx.font = 'bold 42px Arial';
        this.gameCtx.textAlign = 'center';
        this.gameCtx.fillText(`${winner ? winner.name : 'Nobody'} Wins!`, HOTPOT.WIDTH / 2, 160);

        if (winner) {
            this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
            this.gameCtx.font = 'bold 18px Arial';

            const human = this.state.players[0];
            if (human.sets.length > 0 || human.won) {
                this.gameCtx.fillText(`Your sets: ${human.sets.length}`, HOTPOT.WIDTH / 2, 210);
            }

            let y = 250;
            for (const p of this.state.players) {
                this.gameCtx.font = '16px Arial';
                this.gameCtx.fillStyle = p.won ? '#ffd700' : '#ccc';
                const setInfo = p.sets.length > 0 ? ` (${p.sets.length} sets)` : '';
                this.gameCtx.fillText(`${p.name}: ${p.hand.length} cards${setInfo}`, HOTPOT.WIDTH / 2, y);
                y += 30;
            }
        }

        const menu = this.menuManager.getGameOverMenu(!!this.networkSession);
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
        this.gameCtx.fillRect(150, this.msgY, 500, 50);
        this.gameCtx.strokeStyle = HOTPOT.COLORS.HIGHLIGHT;
        this.gameCtx.lineWidth = 2;
        this.gameCtx.strokeRect(150, this.msgY, 500, 50);
        this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
        this.gameCtx.font = 'bold 16px Arial';
        this.gameCtx.textAlign = 'center';
        this.gameCtx.fillText(this.state.message, HOTPOT.WIDTH / 2, this.msgY + 30);
    }

    drawGUILayer() {
        this.guiCtx.clearRect(0, 0, HOTPOT.WIDTH, HOTPOT.HEIGHT);

        // Let ActionNetManagerGUI draw login/lobby UI
        if (this.gameState === 'multiplayerLogin' && this.gui) {
            this.gui.action_draw();
        }
    }

    drawDebugLayer() {
        this.debugCtx.clearRect(0, 0, HOTPOT.WIDTH, HOTPOT.HEIGHT);
        if (!this.debugEnabled) return;
        this.debugCtx.fillStyle = HOTPOT.COLORS.DEBUG_BG;
        this.debugCtx.fillRect(5, 5, 220, 160);
        this.debugCtx.fillStyle = HOTPOT.COLORS.DEBUG_TEXT;
        this.debugCtx.font = '11px monospace';
        this.debugCtx.textAlign = 'left';
        const cp = this.state.getCurrentPlayer();
        const lines = [
            `State: ${this.gameState}`,
            `Phase: ${this.state.gamePhase}`,
            `TurnPhase: ${this.turnPhase}`,
            `Current: ${cp ? cp.name : 'none'}`,
            `Deck: ${this.state.deck.length}`,
            `Round: ${this.state.roundNumber}`,
            `P0 hand: ${this.state.players[0] ? this.state.players[0].hand.length : 0}`,
            `P0 drawn: ${this.state.players[0] && this.state.players[0].drawnCard ? 'yes' : 'no'}`
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

        const speedCfg = this.getSpeedConfig();
        this.gameCtx.font = '14px Arial';
        this.gameCtx.fillText(`Speed: ${speedCfg.name}`, HOTPOT.WIDTH / 2, modalY + 70);

        const btnW = 120;
        const btnH = 35;
        const btnY = modalY + 90;

        this.settingsButtons = [];

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
        this.settingsButtons.push(speedBtn);

        const closeBtn = { x: HOTPOT.WIDTH / 2 - btnW / 2, y: btnY + 45, w: btnW, h: btnH, hovered: false, action: 'close' };
        closeBtn.hovered = this.input.isElementHovered('settings_close');
        this.gameCtx.fillStyle = closeBtn.hovered ? '#a00000' : '#444';
        this.gameCtx.fillRect(closeBtn.x, closeBtn.y, btnW, btnH);
        this.gameCtx.strokeStyle = '#fff';
        this.gameCtx.lineWidth = 1;
        this.gameCtx.strokeRect(closeBtn.x, closeBtn.y, btnW, btnH);
        this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
        this.gameCtx.font = 'bold 13px Arial';
        this.gameCtx.fillText('Close', closeBtn.x + btnW / 2, closeBtn.y + btnH / 2 + 5);
        this.settingsButtons.push(closeBtn);

        this.gameCtx.font = '11px Arial';
        this.gameCtx.fillStyle = '#888';
        const speedKeys = Object.keys(HOTPOT.SPEEDS);
        let speedX = modalX + 45;
        for (const key of speedKeys) {
            const s = HOTPOT.SPEEDS[key];
            const isActive = key == this.currentSpeed;
            this.gameCtx.fillStyle = isActive ? HOTPOT.COLORS.HIGHLIGHT : '#888';
            this.gameCtx.fillText(`${s.name} (${key})`, speedX, modalY + modalH - 15);
            speedX += 70;
        }
    }
}
