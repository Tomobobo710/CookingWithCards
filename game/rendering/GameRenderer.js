// game/GameRenderer.js
// Orchestrator: top-level draw dispatch + per-frame card update.
// Heavy lifting is split across:
//   HotpotGameTableRenderer        — in-table scene
//   HotpotGameMenuScreensRenderer  — menu/lobby screens
//   HotpotGameOverlaysRenderer     — settings modals, GUI/debug layers

class HotpotGameRenderer {
    constructor(game) {
        this.game = game;
        this.gameCtx = game.gameCtx;
        this.guiCtx = game.guiCtx;
        this.debugCtx = game.debugCtx;
        this.audio = game.audio;
        this.input = game.input;

        this.table = new HotpotGameTableRenderer(game);
        this.menus = new HotpotGameMenuScreensRenderer(game);
        this.overlays = new HotpotGameOverlaysRenderer(game);
    }

    // ---------- Per-frame card update ----------
    updateCards() {
        this.table.updateCards();
    }

    // ---------- Top-level draw ----------
    drawGameLayer() {
        this.gameCtx.fillStyle = HOTPOT.COLORS.BACKGROUND;
        this.gameCtx.fillRect(0, 0, HOTPOT.WIDTH, HOTPOT.HEIGHT);

        if (this.game.gameState === 'menu' || this.game.menuStack.current === 'multiplayer') {
            if (this.game.menuStack.current === 'multiplayer') {
                this.menus.drawMultiplayerMenuScreen();
            } else {
                this.menus.drawMenuScreen();
            }
        } else if (this.game.gameState === 'playing' || this.game.gameState === 'gameOver') {
            this.table.drawGameTable();
        } else if (this.game.gameState === 'onlineMultiplayer') {
            this.table.drawGameTable();
        } else if (this.game.gameState === 'waitingMenu') {
            this.table.drawGameTable();
            const userCount = this.game.networkManager ? this.game.networkManager.getConnectedUsers().length : 0;
            this.menus.drawWaitingMenuScreen('WAITING FOR PLAYERS (' + userCount + '/4)');
        } else if (this.game.gameState === 'waitingCanceledMenu') {
            this.table.drawGameTable();
            this.menus.drawWaitingCanceledMenuScreen();
        } else if (this.game.gameState === 'waitingForHostMenu') {
            this.table.drawGameTable();
            this.menus.drawWaitingForHostMenuScreen();
        } else if (this.game.gameState === 'opponentDisconnected') {
            this.table.drawGameTable();
            this.menus.drawOpponentDisconnectedMenuScreen();
        } else if (this.game.gameState === 'roomShutDown') {
            this.table.drawGameTable();
            this.menus.drawRoomShutDownMenuScreen();
        } else if (this.game.gameState === 'rematchPending') {
            this.table.drawGameTable();
            this.menus.drawRematchPendingMenuScreen();
        }
        // multiplayerLogin: GUI canvas handles rendering
    }

    drawGUILayer() {
        this.overlays.drawGUILayer();
    }

    drawDebugLayer() {
        this.overlays.drawDebugLayer();
    }

    drawSettingsModal() {
        this.overlays.drawSettingsModal();
    }

    drawSettingsConfirmModal() {
        this.overlays.drawSettingsConfirmModal();
    }

    }
