/**
 * MenuInputManager - Handles all menu navigation and selection logic for Hotpot.
 * Supports keyboard, gamepad, and mouse input.
 */
class HotpotMenuInputManager {
    constructor(game, input) {
        this.game = game;
        this.input = input;
    }

    handleMainMenuInput() {
        const menu = this.game.menuManager.mainMenu;
        if (!menu.buttonsRegistered) {
            this.registerMainMenuButtons();
            this.snapToHover(menu);
        }

        const maxIndex = menu.buttons.length - 1;

        // Mouse clicks
        for (let i = 0; i < menu.buttons.length; i++) {
            if (this.input.isElementJustPressed(`hotpot_main_button_${i}`)) {
                this.executeAction(menu.buttons[i].action);
                return;
            }
        }

        // Mouse hover
        for (let i = 0; i < menu.buttons.length; i++) {
            if (this.input.isElementHovered(`hotpot_main_button_${i}`)) {
                if (menu.selectedIndex !== i) { menu.selectedIndex = i; }
                break;
            }
        }

        // Left mouse click on button bounds
        if (this.input.isLeftMouseButtonJustPressed()) {
            const pointer = this.input.getPointerPosition();
            const buttonWidth = HOTPOT.LAYOUT.MENU_BUTTON_WIDTH, buttonHeight = HOTPOT.LAYOUT.MENU_BUTTON_HEIGHT, startY = HOTPOT.LAYOUT.MENU_BUTTON_START_Y, spacing = HOTPOT.LAYOUT.MENU_BUTTON_SPACING;
            for (let i = 0; i < menu.buttons.length; i++) {
                const x = HOTPOT.WIDTH / 2 - buttonWidth / 2;
                const y = startY + i * spacing;
                if (pointer.x >= x && pointer.x <= x + buttonWidth && pointer.y >= y && pointer.y <= y + buttonHeight) {
                    this.executeAction(menu.buttons[i].action);
                    return;
                }
            }
        }

        // Navigation
        if (this.isDirUp()) { menu.selectedIndex = Math.max(0, menu.selectedIndex - 1); }
        if (this.isDirDown()) { menu.selectedIndex = Math.min(maxIndex, menu.selectedIndex + 1); }

        // Confirm
        if (this.isConfirm()) {
            this.executeAction(menu.buttons[menu.selectedIndex].action);
        }
    }

    handleMultiplayerMenuInput() {
        const menu = this.game.menuManager.multiplayerMenu;
        if (!menu.buttonsRegistered) {
            this.registerMultiplayerMenuButtons();
            this.snapToHover(menu);
        }

        const maxIndex = menu.buttons.length - 1;

        for (let i = 0; i < menu.buttons.length; i++) {
            if (this.input.isElementJustPressed(`hotpot_mp_button_${i}`)) {
                this.executeAction(menu.buttons[i].action);
                return;
            }
        }

        for (let i = 0; i < menu.buttons.length; i++) {
            if (this.input.isElementHovered(`hotpot_mp_button_${i}`)) {
                if (menu.selectedIndex !== i) { menu.selectedIndex = i; }
                break;
            }
        }

        if (this.input.isLeftMouseButtonJustPressed()) {
            const pointer = this.input.getPointerPosition();
            const buttonWidth = HOTPOT.LAYOUT.MENU_BUTTON_WIDTH, buttonHeight = HOTPOT.LAYOUT.MENU_BUTTON_HEIGHT, startY = HOTPOT.LAYOUT.MP_BUTTON_START_Y, spacing = HOTPOT.LAYOUT.MENU_BUTTON_SPACING;
            for (let i = 0; i < menu.buttons.length; i++) {
                const x = HOTPOT.WIDTH / 2 - buttonWidth / 2;
                const y = startY + i * spacing;
                if (pointer.x >= x && pointer.x <= x + buttonWidth && pointer.y >= y && pointer.y <= y + buttonHeight) {
                    this.executeAction(menu.buttons[i].action);
                    return;
                }
            }
        }

        if (this.isDirUp()) { menu.selectedIndex = Math.max(0, menu.selectedIndex - 1); }
        if (this.isDirDown()) { menu.selectedIndex = Math.min(maxIndex, menu.selectedIndex + 1); }

        // Action2 = back
        if (this.isBack()) {
            this.executeAction("back");
            return;
        }

        if (this.isConfirm()) {
            this.executeAction(menu.buttons[menu.selectedIndex].action);
        }
    }

   handleGameOverMenuInput() {
        const isOnline = !!this.game.networkSession;
        const menu = this.game.menuManager.getGameOverMenu(isOnline);
        if (!menu.buttonsRegistered) {
            this.registerGameOverMenuButtons();
            this.snapToHover(menu);
        }

        const maxIndex = menu.buttons.length - 1;

        for (let i = 0; i < menu.buttons.length; i++) {
            if (this.input.isElementJustPressed(`hotpot_gameover_button_${i}`)) {
                this.executeAction(menu.buttons[i].action);
                return;
            }
        }

        for (let i = 0; i < menu.buttons.length; i++) {
            if (this.input.isElementHovered(`hotpot_gameover_button_${i}`)) {
                if (menu.selectedIndex !== i) { menu.selectedIndex = i; }
                break;
            }
        }

        if (this.input.isLeftMouseButtonJustPressed()) {
            const pointer = this.input.getPointerPosition();
            const buttonWidth = HOTPOT.LAYOUT.GAMEOVER_BUTTON_WIDTH, buttonHeight = HOTPOT.LAYOUT.GAMEOVER_BUTTON_HEIGHT, startY = HOTPOT.LAYOUT.GAMEOVER_BUTTON_START_Y, spacing = HOTPOT.LAYOUT.GAMEOVER_BUTTON_SPACING;
            for (let i = 0; i < menu.buttons.length; i++) {
                const x = HOTPOT.WIDTH / 2 - buttonWidth / 2;
                const y = startY + i * spacing;
                if (pointer.x >= x && pointer.x <= x + buttonWidth && pointer.y >= y && pointer.y <= y + buttonHeight) {
                    this.executeAction(menu.buttons[i].action);
                    return;
                }
            }
        }

        if (this.isDirUp()) { menu.selectedIndex = Math.max(0, menu.selectedIndex - 1); }
        if (this.isDirDown()) { menu.selectedIndex = Math.min(maxIndex, menu.selectedIndex + 1); }

        if (this.isConfirm()) {
            this.executeAction(menu.buttons[menu.selectedIndex].action);
        }
    }

    // ---------- Actions ----------

    executeAction(action) {
        const g = this.game;

        switch (action) {
            case "singlePlayer":
                g.startSinglePlayer();
                this.unregisterMainMenuButtons();
                break;

            case "multiplayer":
                g.menuStack.current = "multiplayer";
                g.menuStack.previous = "main";
                this.unregisterMainMenuButtons();
                g.multiplayerMenu.selectedIndex = 0;
                g.multiplayerMenu.buttonsRegistered = false;
                break;

          case "onlineMultiplayer":
                g.gameState = "multiplayerLogin";
                g.menuStack.previous = "multiplayer";
                g.menuStack.current = null;
                this.unregisterMultiplayerMenuButtons();
                break;

    case "back": {
                // Determine where to go back to
                const current = g.menuStack.current;
                if (current === "multiplayer") {
                    g.menuStack.current = "main";
                    g.menuStack.previous = null;
                    this.unregisterMultiplayerMenuButtons();
                    g.multiplayerMenu.selectedIndex = 0;
                    g.multiplayerMenu.buttonsRegistered = false;
                }
                break;
            }

            case "playAgain":
                // Single player or local multiplayer restart
                g.startSinglePlayer();
                this.unregisterGameOverMenuButtons();
                break;

            case "mainMenu":
                if (g.networkSession) {
                    g.networkSession.leave();
                    g.networkSession = null;
                }
                if (g.gui && g.gui.isConnected()) {
                    g.gui.getNetManager().disconnect();
                    g.gui.currentState = "LOGIN";
                    g.gui.selectedIndex = 0;
                    g.gui.serverStatus = "UNKNOWN";
                    g.gui.serverStatusColor = "#ffff00";
                }
                g.gameState = "menu";
                g.menuStack.current = null;
                this.unregisterGameOverMenuButtons();
                break;

            case "rematch":
                if (g.networkSession) {
                    g.networkSession.requestRematch();
                }
                this.unregisterGameOverMenuButtons();
                break;

            case "backToLobby":
                if (g.networkSession) {
                    g.networkSession.leave();
                    g.networkSession = null;
                }
                g.clearGameState();
                g.gameState = "multiplayerLogin";
                this.unregisterGameOverMenuButtons();
                break;
        }
    }

    // ---------- Helpers ----------

    isDirUp() {
        return this.input.isKeyJustPressed("DirUp") ||
            this.input.isGamepadButtonJustPressed(12, 0) ||
            this.input.isGamepadButtonJustPressed(12, 1) ||
            this.input.isGamepadButtonJustPressed(12, 2) ||
            this.input.isGamepadButtonJustPressed(12, 3);
    }

    isDirDown() {
        return this.input.isKeyJustPressed("DirDown") ||
            this.input.isGamepadButtonJustPressed(13, 0) ||
            this.input.isGamepadButtonJustPressed(13, 1) ||
            this.input.isGamepadButtonJustPressed(13, 2) ||
            this.input.isGamepadButtonJustPressed(13, 3);
    }

    isConfirm() {
        return this.input.isKeyJustPressed("Action1") ||
            this.input.isGamepadButtonJustPressed(0, 0) ||
            this.input.isGamepadButtonJustPressed(0, 1) ||
            this.input.isGamepadButtonJustPressed(0, 2) ||
            this.input.isGamepadButtonJustPressed(0, 3);
    }

    isBack() {
        return this.input.isKeyJustPressed("Action2") ||
            this.input.isGamepadButtonJustPressed(1, 0) ||
            this.input.isGamepadButtonJustPressed(1, 1) ||
            this.input.isGamepadButtonJustPressed(1, 2) ||
            this.input.isGamepadButtonJustPressed(1, 3);
    }

    snapToHover(menu) {
        const pointer = this.input.getPointerPosition();
        const buttonWidth = HOTPOT.LAYOUT.MENU_BUTTON_WIDTH, buttonHeight = HOTPOT.LAYOUT.MENU_BUTTON_HEIGHT;
        const startY = menu === this.game.menuManager.mainMenu ? HOTPOT.LAYOUT.MENU_BUTTON_START_Y : HOTPOT.LAYOUT.MP_BUTTON_START_Y;
        const spacing = HOTPOT.LAYOUT.MENU_BUTTON_SPACING;
        for (let i = 0; i < menu.buttons.length; i++) {
            const x = HOTPOT.WIDTH / 2 - buttonWidth / 2;
            const y = startY + i * spacing;
            if (pointer.x >= x && pointer.x <= x + buttonWidth && pointer.y >= y && pointer.y <= y + buttonHeight) {
                menu.selectedIndex = i;
                break;
            }
        }
    }

    // ---------- Button Registration ----------

    registerMainMenuButtons() {
        if (this.game.mainMenu.buttonsRegistered) return;
        const buttonWidth = HOTPOT.LAYOUT.MENU_BUTTON_WIDTH, buttonHeight = HOTPOT.LAYOUT.MENU_BUTTON_HEIGHT, startY = HOTPOT.LAYOUT.MENU_BUTTON_START_Y, spacing = HOTPOT.LAYOUT.MENU_BUTTON_SPACING;
        this.game.mainMenu.buttons.forEach((button, index) => {
            const x = HOTPOT.WIDTH / 2 - buttonWidth / 2;
            const y = startY + index * spacing;
            this.input.registerElement(`hotpot_main_button_${index}`, {
                bounds: () => ({ x, y, width: buttonWidth, height: buttonHeight })
            });
        });
        this.game.mainMenu.buttonsRegistered = true;
    }

    registerMultiplayerMenuButtons() {
        if (this.game.multiplayerMenu.buttonsRegistered) return;
        const buttonWidth = HOTPOT.LAYOUT.MENU_BUTTON_WIDTH, buttonHeight = HOTPOT.LAYOUT.MENU_BUTTON_HEIGHT, startY = HOTPOT.LAYOUT.MP_BUTTON_START_Y, spacing = HOTPOT.LAYOUT.MENU_BUTTON_SPACING;
        this.game.multiplayerMenu.buttons.forEach((button, index) => {
            const x = HOTPOT.WIDTH / 2 - buttonWidth / 2;
            const y = startY + index * spacing;
            this.input.registerElement(`hotpot_mp_button_${index}`, {
                bounds: () => ({ x, y, width: buttonWidth, height: buttonHeight })
            });
        });
        this.game.multiplayerMenu.buttonsRegistered = true;
    }

    registerGameOverMenuButtons() {
        const isOnline = !!this.game.networkSession;
        const menu = isOnline ? this.game.onlineGameOverMenu : this.game.gameOverMenu;
        if (menu.buttonsRegistered) return;
        const buttonWidth = HOTPOT.LAYOUT.GAMEOVER_BUTTON_WIDTH, buttonHeight = HOTPOT.LAYOUT.GAMEOVER_BUTTON_HEIGHT, startY = HOTPOT.LAYOUT.GAMEOVER_BUTTON_START_Y, spacing = HOTPOT.LAYOUT.GAMEOVER_BUTTON_SPACING;
        menu.buttons.forEach((button, index) => {
            const x = HOTPOT.WIDTH / 2 - buttonWidth / 2;
            const y = startY + index * spacing;
            this.input.registerElement(`hotpot_gameover_button_${index}`, {
                bounds: () => ({ x, y, width: buttonWidth, height: buttonHeight })
            });
        });
        menu.buttonsRegistered = true;
    }

    unregisterMainMenuButtons() {
        if (!this.game.mainMenu.buttonsRegistered) return;
        this.game.mainMenu.buttonsRegistered = false;
    }

    unregisterMultiplayerMenuButtons() {
        if (!this.game.multiplayerMenu.buttonsRegistered) return;
        this.game.multiplayerMenu.buttonsRegistered = false;
    }

    unregisterGameOverMenuButtons() {
        if (this.game.gameOverMenu.buttonsRegistered) this.game.gameOverMenu.buttonsRegistered = false;
        if (this.game.onlineGameOverMenu.buttonsRegistered) this.game.onlineGameOverMenu.buttonsRegistered = false;
    }
}
