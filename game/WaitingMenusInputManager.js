/**
 * WaitingMenusInputManager - Handles input for waiting/lobby menus in Hotpot online multiplayer.
 */
class HotpotWaitingMenusInputManager {
    constructor(game, input) {
        this.game = game;
        this.input = input;
    }

    // ---- Waiting Menu ----

    handleWaitingMenuInput() {
        const menu = this.game.waitingMenu;
        if (!menu.buttonsRegistered) {
            this.registerWaitingMenuButtons();
        }

        const maxIndex = menu.buttons.length - 1;

        for (let i = 0; i < menu.buttons.length; i++) {
            if (this.input.isElementJustPressed(`hotpot_waiting_button_${i}`)) {
                this.executeAction(menu.buttons[i].action);
                return;
            }
        }

        for (let i = 0; i < menu.buttons.length; i++) {
            if (this.input.isElementHovered(`hotpot_waiting_button_${i}`)) {
                if (menu.selectedIndex !== i) { menu.selectedIndex = i; }
                break;
            }
        }

        if (this.input.isLeftMouseButtonJustPressed()) {
            const pointer = this.input.getPointerPosition();
            const buttonWidth = 240, buttonHeight = 60, startY = 380, spacing = 75;
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
        if (this.isConfirm()) { this.executeAction(menu.buttons[menu.selectedIndex].action); }
    }

    // ---- Waiting Canceled Menu ----

    handleWaitingCanceledMenuInput() {
        const menu = this.game.waitingCanceledMenu;
        if (!menu.buttonsRegistered) {
            this.registerWaitingCanceledMenuButtons();
        }

        const maxIndex = menu.buttons.length - 1;

        for (let i = 0; i < menu.buttons.length; i++) {
            if (this.input.isElementJustPressed(`hotpot_waitcancel_button_${i}`)) {
                this.executeAction(menu.buttons[i].action);
                return;
            }
        }

        for (let i = 0; i < menu.buttons.length; i++) {
            if (this.input.isElementHovered(`hotpot_waitcancel_button_${i}`)) {
                if (menu.selectedIndex !== i) { menu.selectedIndex = i; }
                break;
            }
        }

        if (this.input.isLeftMouseButtonJustPressed()) {
            const pointer = this.input.getPointerPosition();
            const buttonWidth = 240, buttonHeight = 60, startY = 300, spacing = 75;
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
        if (this.isConfirm()) { this.executeAction(menu.buttons[menu.selectedIndex].action); }
    }

    // ---- Waiting For Host Menu ----

    handleWaitingForHostMenuInput() {
        const menu = this.game.waitingForHostMenu;
        if (!menu.buttonsRegistered) {
            this.registerWaitingForHostMenuButtons();
        }

        const maxIndex = menu.buttons.length - 1;

        for (let i = 0; i < menu.buttons.length; i++) {
            if (this.input.isElementJustPressed(`hotpot_waithost_button_${i}`)) {
                this.executeAction(menu.buttons[i].action);
                return;
            }
        }

        for (let i = 0; i < menu.buttons.length; i++) {
            if (this.input.isElementHovered(`hotpot_waithost_button_${i}`)) {
                if (menu.selectedIndex !== i) { menu.selectedIndex = i; }
                break;
            }
        }

        if (this.input.isLeftMouseButtonJustPressed()) {
            const pointer = this.input.getPointerPosition();
            const buttonWidth = 240, buttonHeight = 60, startY = 380, spacing = 75;
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
        if (this.isConfirm()) { this.executeAction(menu.buttons[menu.selectedIndex].action); }
    }

    // ---- Opponent Disconnected Menu ----

    handleOpponentDisconnectedInput() {
        const menu = this.game.opponentDisconnectedMenu;
        if (!menu.buttonsRegistered) {
            this.registerOpponentDisconnectedMenuButtons();
        }

        const maxIndex = menu.buttons.length - 1;

        for (let i = 0; i < menu.buttons.length; i++) {
            if (this.input.isElementJustPressed(`hotpot_disconnect_button_${i}`)) {
                this.executeAction(menu.buttons[i].action);
                return;
            }
        }

        for (let i = 0; i < menu.buttons.length; i++) {
            if (this.input.isElementHovered(`hotpot_disconnect_button_${i}`)) {
                if (menu.selectedIndex !== i) { menu.selectedIndex = i; }
                break;
            }
        }

        if (this.input.isLeftMouseButtonJustPressed()) {
            const pointer = this.input.getPointerPosition();
            const buttonWidth = 240, buttonHeight = 60, startY = 300, spacing = 75;
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
        if (this.isConfirm()) { this.executeAction(menu.buttons[menu.selectedIndex].action); }
    }

    // ---- Room Shut Down Menu ----

    handleRoomShutDownInput() {
        const menu = this.game.roomShutDownMenu;
        if (!menu.buttonsRegistered) {
            this.registerRoomShutDownMenuButtons();
        }

        if (this.input.isElementJustPressed("hotpot_roomshutdown_button_0")) {
            this.executeAction("backToLobby");
            return;
        }

        if (this.input.isElementHovered("hotpot_roomshutdown_button_0")) {
            menu.selectedIndex = 0;
        }

        if (this.isConfirm()) { this.executeAction("backToLobby"); }
    }

    // ---- Rematch Pending Menu ----

    handleRematchPendingInput() {
        const menu = this.game.rematchPendingMenu;
        if (!menu.buttonsRegistered) {
            this.registerRematchPendingMenuButtons();
        }

        const maxIndex = menu.buttons.length - 1;

        for (let i = 0; i < menu.buttons.length; i++) {
            if (this.input.isElementJustPressed(`hotpot_rematch_button_${i}`)) {
                this.executeAction(menu.buttons[i].action);
                return;
            }
        }

        for (let i = 0; i < menu.buttons.length; i++) {
            if (this.input.isElementHovered(`hotpot_rematch_button_${i}`)) {
                if (menu.selectedIndex !== i) { menu.selectedIndex = i; }
                break;
            }
        }

        if (this.input.isLeftMouseButtonJustPressed()) {
            const pointer = this.input.getPointerPosition();
            const buttonWidth = 240, buttonHeight = 60, startY = 380, spacing = 75;
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
        if (this.isConfirm()) { this.executeAction(menu.buttons[menu.selectedIndex].action); }
        if (this.isBack()) { this.executeAction(menu.buttons[menu.selectedIndex].action); }
    }

    // ---------- Actions ----------

    executeAction(action) {
        const g = this.game;

        switch (action) {
            case "start":
                if (g.networkSession) {
                    g.networkSession.hostWaiting = true;
                    g.networkSession.startCountdown();
                }
                break;

            case "cancelWaiting":
                this.unregisterWaitingMenuButtons();
                g.gameState = "waitingCanceledMenu";
                g.waitingCanceledMenu.selectedIndex = 0;
                g.waitingCanceledMenu.buttonsRegistered = false;
                if (g.networkSession) {
                    g.networkSession.state = "CANCELLED";
                }
                break;

             case "keepWaiting":
                this.unregisterWaitingCanceledMenuButtons();
                g.gameState = "waitingMenu";
                g.waitingMenu.selectedIndex = 0;
                g.waitingMenu.buttonsRegistered = false;
                if (g.networkSession) {
                    g.networkSession.state = "WAITING";
                }
                break;

            case "returnToLobby":
                if (g.networkSession) { g.networkSession.leave(); g.networkSession = null; }
                g.clearGameState();
                this.unregisterWaitingCanceledMenuButtons();
                g.gameState = "multiplayerLogin";
                break;

            case "cancelJoin":
                if (g.networkSession) { g.networkSession.leave(); g.networkSession = null; }
                g.clearGameState();
                this.unregisterWaitingForHostMenuButtons();
                g.gameState = "multiplayerLogin";
                break;

            case "continue":
                if (g.networkSession) { g.networkSession.continueAfterOpponentDisconnect(); }
                this.unregisterOpponentDisconnectedMenuButtons();
                break;

            case "backToLobby":
                if (g.networkSession) { g.networkSession.leave(); g.networkSession = null; }
                g.clearGameState();
                this.unregisterAllWaitingMenuButtons();
                g.gameState = "multiplayerLogin";
                break;

            case "cancelRematch":
                if (g.networkSession) { g.networkSession.cancelRematch(); }
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

    // ---------- Button Registration ----------

    registerWaitingMenuButtons() {
        if (this.game.waitingMenu.buttonsRegistered) return;
        const buttonWidth = 240, buttonHeight = 60, startY = 380, spacing = 75;
        this.game.waitingMenu.buttons.forEach((button, index) => {
            const x = HOTPOT.WIDTH / 2 - buttonWidth / 2;
            const y = startY + index * spacing;
            this.input.registerElement(`hotpot_waiting_button_${index}`, {
                bounds: () => ({ x, y, width: buttonWidth, height: buttonHeight })
            });
        });
        this.game.waitingMenu.buttonsRegistered = true;
    }

    registerWaitingCanceledMenuButtons() {
        if (this.game.waitingCanceledMenu.buttonsRegistered) return;
        const buttonWidth = 240, buttonHeight = 60, startY = 300, spacing = 75;
        this.game.waitingCanceledMenu.buttons.forEach((button, index) => {
            const x = HOTPOT.WIDTH / 2 - buttonWidth / 2;
            const y = startY + index * spacing;
            this.input.registerElement(`hotpot_waitcancel_button_${index}`, {
                bounds: () => ({ x, y, width: buttonWidth, height: buttonHeight })
            });
        });
        this.game.waitingCanceledMenu.buttonsRegistered = true;
    }

    registerWaitingForHostMenuButtons() {
        if (this.game.waitingForHostMenu.buttonsRegistered) return;
        const buttonWidth = 240, buttonHeight = 60, startY = 380, spacing = 75;
        this.game.waitingForHostMenu.buttons.forEach((button, index) => {
            const x = HOTPOT.WIDTH / 2 - buttonWidth / 2;
            const y = startY + index * spacing;
            this.input.registerElement(`hotpot_waithost_button_${index}`, {
                bounds: () => ({ x, y, width: buttonWidth, height: buttonHeight })
            });
        });
        this.game.waitingForHostMenu.buttonsRegistered = true;
    }

    registerOpponentDisconnectedMenuButtons() {
        if (this.game.opponentDisconnectedMenu.buttonsRegistered) return;
        const buttonWidth = 240, buttonHeight = 60, startY = 300, spacing = 75;
        this.game.opponentDisconnectedMenu.buttons.forEach((button, index) => {
            const x = HOTPOT.WIDTH / 2 - buttonWidth / 2;
            const y = startY + index * spacing;
            this.input.registerElement(`hotpot_disconnect_button_${index}`, {
                bounds: () => ({ x, y, width: buttonWidth, height: buttonHeight })
            });
        });
        this.game.opponentDisconnectedMenu.buttonsRegistered = true;
    }

    registerRoomShutDownMenuButtons() {
        if (this.game.roomShutDownMenu.buttonsRegistered) return;
        const buttonWidth = 240, buttonHeight = 60, startY = 340;
        const x = HOTPOT.WIDTH / 2 - buttonWidth / 2;
        const y = startY;
        this.input.registerElement("hotpot_roomshutdown_button_0", {
            bounds: () => ({ x, y, width: buttonWidth, height: buttonHeight })
        });
        this.game.roomShutDownMenu.buttonsRegistered = true;
    }

    registerRematchPendingMenuButtons() {
        if (this.game.rematchPendingMenu.buttonsRegistered) return;
        const buttonWidth = 240, buttonHeight = 60, startY = 380, spacing = 75;
        this.game.rematchPendingMenu.buttons.forEach((button, index) => {
            const x = HOTPOT.WIDTH / 2 - buttonWidth / 2;
            const y = startY + index * spacing;
            this.input.registerElement(`hotpot_rematch_button_${index}`, {
                bounds: () => ({ x, y, width: buttonWidth, height: buttonHeight })
            });
        });
        this.game.rematchPendingMenu.buttonsRegistered = true;
    }

    unregisterWaitingMenuButtons() {
        if (!this.game.waitingMenu.buttonsRegistered) return;
        this.game.waitingMenu.buttonsRegistered = false;
    }

    unregisterWaitingCanceledMenuButtons() {
        if (!this.game.waitingCanceledMenu.buttonsRegistered) return;
        this.game.waitingCanceledMenu.buttonsRegistered = false;
    }

    unregisterWaitingForHostMenuButtons() {
        if (!this.game.waitingForHostMenu.buttonsRegistered) return;
        this.game.waitingForHostMenu.buttonsRegistered = false;
    }

    unregisterOpponentDisconnectedMenuButtons() {
        if (!this.game.opponentDisconnectedMenu.buttonsRegistered) return;
        this.game.opponentDisconnectedMenu.buttonsRegistered = false;
    }

    unregisterRoomShutDownMenuButtons() {
        if (!this.game.roomShutDownMenu.buttonsRegistered) return;
        this.game.roomShutDownMenu.buttonsRegistered = false;
    }

    unregisterRematchPendingMenuButtons() {
        if (!this.game.rematchPendingMenu.buttonsRegistered) return;
        this.game.rematchPendingMenu.buttonsRegistered = false;
    }

    unregisterAllWaitingMenuButtons() {
        this.unregisterWaitingMenuButtons();
        this.unregisterWaitingCanceledMenuButtons();
        this.unregisterWaitingForHostMenuButtons();
        this.unregisterOpponentDisconnectedMenuButtons();
        this.unregisterRoomShutDownMenuButtons();
        this.unregisterRematchPendingMenuButtons();
    }
}
