/**
 * HOTPOT - Based on the Hotpot Minigame from Palia
 * 96 cards, 8 categories, 3 ingredients per category, 4 copies each
 * Build 3 sets (Three-of-a-Kind or Category Set) to win
 * ActionEngineJS implementation
 *
 * Slim shell: setup + lifecycle + delegations.
 * Heavy logic lives in collaborator classes:
 *   HotpotGameLayout, HotpotGameFlow, HotpotGameBotController,
 *   HotpotGameInputController, HotpotGameRenderer.
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
        this.bestSets = [];
        this._otherPlayersRevealed = false;
        this.debugEnabled = false;
        this.settingsOpen = false;
        this.settingsConfirmOpen = false;
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

        // Collaborator instances
        this.layout = new HotpotGameLayout();
        this.flow = new HotpotGameFlow(this);
        this.bots = new HotpotGameBotController(this);
        this.gameInputController = new HotpotGameInputController(this, input);
        this.renderer = new HotpotGameRenderer(this);

        this.flow.setupAudio();

        this.animationTime = 0;
        this.lastTime = performance.now();
    }

    get menuManager() { return this._menuManager; }
    set menuManager(v) { this._menuManager = v; }
    get menuInputManager() { return this._menuInputManager; }
    set menuInputManager(v) { this._menuInputManager = v; }
    get waitingMenuInputManager() { return this._waitingMenuInputManager; }
    set waitingMenuInputManager(v) { this._waitingMenuInputManager = v; }

    // ---------- Update Loop ----------
    action_update() {
        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.25);
        this.lastTime = now;
        this.animationTime += dt;

        this.renderer.updateCards();
        Card.glowPhase += 0.04;

        // Handle online GUI
        if (this.gameState === 'multiplayerLogin' && this.gui) {
            this.gui.action_update(dt);
            this.gameInputController.handleInput();
            return;
        }

        this.gameInputController.handleInput();

        if (this.gameState === 'playing') {
            this.bots.updateGameLogic(dt);
        }

        if ((this.gameState === 'onlineMultiplayer' || this.gameState === 'rematchPending' || this.gameState === 'waitingMenu') && this.networkSession) {
            this.networkSession.update(dt);
        }

        if (this.gameState === 'gameOver' && !this._otherPlayersRevealed) {
            this._otherPlayersRevealed = true;
            let skipLocal = false;
            if (this.networkSession && this.networkSession.localPlayerIndex !== undefined) {
                skipLocal = true;
            }
            for (const p of this.state.players) {
                if (skipLocal && p.isLocal) continue;
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

    // ---------- Draw ----------
    action_draw() {
        this.renderer.drawGameLayer();
        this.renderer.drawGUILayer();
        this.renderer.drawDebugLayer();
        if (this.settingsOpen) {
            this.renderer.drawSettingsModal();
            if (this.settingsConfirmOpen) this.renderer.drawSettingsConfirmModal();
        }
    }

    // ---------- Delegations for external callers ----------
    // (NetworkSession, MenuInputManager, etc. call these on `this.game`)

    getSpeedConfig() { return this.flow.getSpeedConfig(); }
    applySpeedToCard(card) { return this.flow.applySpeedToCard(card); }
    applySpeedToAllCards() { return this.flow.applySpeedToAllCards(); }
    setupPlayers(count) { return this.flow.setupPlayers(count); }
    setupAudio() { return this.flow.setupAudio(); }
    startGame(playerCount) { return this.flow.startGame(playerCount); }
    startSinglePlayer() { return this.flow.startSinglePlayer(); }
    clearGameState() { return this.flow.clearGameState(); }
    endTurn() { return this.flow.endTurn(); }
    sortHandByCategory(player) { return this.flow.sortHandByCategory(player); }
    handleWin(player) { return this.flow.handleWin(player); }
    calculateScores() { return this.flow.calculateScores(); }
    findLocalPlayer() { return this.flow.findLocalPlayer(); }
    updateGameLogic(dt) { return this.bots.updateGameLogic(dt); }
    botCardValue(card, player) { return this.bots.botCardValue(card, player); }
    updateBotTurn(player) { return this.bots.updateBotTurn(player); }
    getDeckRect() { return this.layout.getDeckRect(); }
    getHandCardRects(player) { return this.layout.getHandCardRects(player); }
}
