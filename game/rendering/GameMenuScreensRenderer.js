// game/GameMenuScreensRenderer.js
// Renders the main menu, multiplayer submenu, and all online waiting/lobby screens.

class HotpotGameMenuScreensRenderer {
    constructor(game) {
        this.game = game;
        this.gameCtx = game.gameCtx;
        this.input = game.input;
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
}
