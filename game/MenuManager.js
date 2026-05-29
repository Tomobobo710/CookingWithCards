// game/MenuManager.js
// Central owner of menu definitions for Hotpot.
// Mirrors Tetris style: each menu has selectedIndex, buttons array, buttonsRegistered.

class HotpotMenuManager {
    constructor(game) {
        this.game = game;

        this.mainMenu = {
            selectedIndex: 0,
            buttons: [
                { text: "SINGLE PLAYER", action: "singlePlayer" },
                { text: "MULTIPLAYER", action: "multiplayer" }
            ],
            buttonsRegistered: false
        };

        this.multiplayerMenu = {
            selectedIndex: 0,
            buttons: [
                { text: "LOCAL", action: "localMultiplayer" },
                { text: "ONLINE", action: "onlineMultiplayer" },
                { text: "BACK", action: "back" }
            ],
            buttonsRegistered: false
        };

        this.localMultiplayerMenu = {
            selectedIndex: 0,
            buttons: [
                { text: "2-PLAYER", action: "startTwoPlayer" },
                { text: "3-PLAYER", action: "startThreePlayer" },
                { text: "4-PLAYER", action: "startFourPlayer" },
                { text: "BACK", action: "back" }
            ],
            buttonsRegistered: false
        };

        this.gameOverMenu = {
            selectedIndex: 0,
            buttons: [
                { text: "PLAY AGAIN", action: "playAgain" },
                { text: "MAIN MENU", action: "mainMenu" }
            ],
            buttonsRegistered: false
        };

        this.onlineGameOverMenu = {
            selectedIndex: 0,
            buttons: [
                { text: "REMATCH", action: "rematch" },
                { text: "BACK TO LOBBY", action: "backToLobby" }
            ],
            buttonsRegistered: false
        };

        this.rematchPendingMenu = {
            selectedIndex: 0,
            buttons: [{ text: "Cancel", action: "cancelRematch" }],
            buttonsRegistered: false
        };

        this.waitingMenu = {
            selectedIndex: 0,
            buttons: [{ text: "CANCEL", action: "cancelWaiting" }],
            buttonsRegistered: false
        };

        this.waitingCanceledMenu = {
            selectedIndex: 0,
            buttons: [
                { text: "KEEP WAITING", action: "keepWaiting" },
                { text: "RETURN TO LOBBY", action: "returnToLobby" }
            ],
            buttonsRegistered: false
        };

        this.waitingForHostMenu = {
            selectedIndex: 0,
            buttons: [{ text: "CANCEL", action: "cancelJoin" }],
            buttonsRegistered: false
        };

        this.opponentDisconnectedMenu = {
            selectedIndex: 0,
            buttons: [
                { text: "CONTINUE", action: "continue" },
                { text: "BACK TO LOBBY", action: "backToLobby" }
            ],
            buttonsRegistered: false
        };

        this.roomShutDownMenu = {
            selectedIndex: 0,
            buttons: [{ text: "BACK TO LOBBY", action: "backToLobby" }],
            buttonsRegistered: false
        };
    }

    getMainMenu() { return this.mainMenu; }
    getMultiplayerMenu() { return this.multiplayerMenu; }
    getLocalMultiplayerMenu() { return this.localMultiplayerMenu; }
    getGameOverMenu(isOnline) { return isOnline ? this.onlineGameOverMenu : this.gameOverMenu; }
    getRematchPendingMenu() { return this.rematchPendingMenu; }
    getWaitingMenu() { return this.waitingMenu; }
    getWaitingCanceledMenu() { return this.waitingCanceledMenu; }
    getWaitingForHostMenu() { return this.waitingForHostMenu; }
    getOpponentDisconnectedMenu() { return this.opponentDisconnectedMenu; }
    getRoomShutDownMenu() { return this.roomShutDownMenu; }
}
