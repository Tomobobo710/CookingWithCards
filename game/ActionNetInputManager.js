/**
 * HotpotActionNetInputManager - Wires ActionNetManagerGUI events to Game/NetworkSession.
 */
class HotpotActionNetInputManager {
    constructor(game, input) {
        this.game = game;
        this.input = input;
        this.gui = game.gui;
        this.networkManager = game.networkManager || (this.gui ? this.gui.getNetManager() : null);
        this.session = null;
    }

    wireGUIEvents() {
        this.gui.on("buttonPressed", () => {
            if (!this.game.skipMenuNavigateSound) {
                this.game.playSound("menu_confirm");
            }
        });

        this.gui.on("selectionChanged", (info) => {
            if (this.game.suppressNextFrameMenuNavigate) return;
            if (!this.game.skipMenuNavigateSound) {
                this.game.playSound("menu_navigate");
            }
        });

        this.gui.on("joinedRoom", (roomName) => {
            this.onJoinedRoom(roomName);
        });

        this.gui.on("leftRoom", (roomName) => {
            this.onLeftRoom(roomName);
        });

        this.gui.on("disconnected", () => {
            this.game.suppressNextFrameMenuNavigate = true;
            this.onDisconnected();
        });

        this.gui.on("back", () => {
            this.onBackFromGUI();
        });

        this.gui.on("backToLogin", () => {
            this.onBackToLoginFromGUI();
        });

        this._wired = true;
    }

    onJoinedRoom(roomName) {
        if (!this.networkManager) {
            this.networkManager = this.gui ? this.gui.getNetManager() : null;
        }

        // Setup players array so NetworkSession doesn't crash
        this.game.setupPlayers(4);

        this.game.networkSession = new HotpotNetworkSession(this.networkManager, this.game.state, this.game);
        this.game.networkSession.start();
    }

    onLeftRoom(roomName) {
        if (this.game.networkSession) {
            this.game.networkSession.cleanup();
            this.game.networkSession = null;
        }
        this.game.clearGameState();
        this.game.gameState = "multiplayerLogin";
    }

    onDisconnected() {
        if (this.game.networkSession) {
            this.game.networkSession.cleanup();
            this.game.networkSession = null;
        }
        this.game.clearGameState();
        this.game.gameState = "menu";
    }

    onBackFromGUI() {
        this.game.playSound("menu_back");
        this.game.suppressNextFrameMenuNavigate = true;
        this.game.gameState = "menu";
        this.game.menuStack.current = "multiplayer";
        this.game.multiplayerMenu.selectedIndex = 0;
        this.game.multiplayerMenu.buttonsRegistered = false;
        this.game.skipAction1ThisFrame = true;
    }

    onBackToLoginFromGUI() {
        this.game.playSound("menu_back");
        this.game.suppressNextFrameMenuNavigate = true;
    }
}
