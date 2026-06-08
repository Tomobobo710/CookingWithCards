// game/rendering/GameMenuScreensRenderer.js
// Renders the main menu, multiplayer submenu, and all online waiting/lobby screens.

class HotpotGameMenuScreensRenderer {
    constructor(game) {
        this.game = game;
        this.ctx = game.gameCtx;
        this.input = game.input;
    }

    drawMenuScreen() {
        this.ctx.fillStyle = HOTPOT.COLORS.TEXT;
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('HOTPOT', HOTPOT.WIDTH / 2, HOTPOT.LAYOUT.MENU_TITLE_Y);

        this.ctx.font = '20px Arial';
        this.ctx.fillStyle = '#cccccc';
        this.ctx.fillText('A Palia-style Set Building Card Game', HOTPOT.WIDTH / 2, HOTPOT.LAYOUT.MENU_SUBTITLE_Y);

        const menu = this.game.menuManager.mainMenu;
        const buttonWidth = HOTPOT.LAYOUT.MENU_BUTTON_WIDTH;
        const buttonHeight = HOTPOT.LAYOUT.MENU_BUTTON_HEIGHT;
        const startY = HOTPOT.LAYOUT.MENU_BUTTON_START_Y;
        const spacing = HOTPOT.LAYOUT.MENU_BUTTON_SPACING;
        for (let i = 0; i < menu.buttons.length; i++) {
            const x = HOTPOT.WIDTH / 2 - buttonWidth / 2;
            const y = startY + i * spacing;
            const isHovered = this.input.isElementHovered(`hotpot_main_button_${i}`);
            const isSelected = menu.selectedIndex === i;

            this.ctx.fillStyle = (isSelected || isHovered) ? HOTPOT.COLORS.HIGHLIGHT : HOTPOT.COLORS.UI_BG;
            this.ctx.fillRect(x, y, buttonWidth, buttonHeight);
            this.ctx.strokeStyle = HOTPOT.COLORS.UI_BORDER;
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(x, y, buttonWidth, buttonHeight);
            this.ctx.fillStyle = HOTPOT.COLORS.TEXT;
            this.ctx.font = 'bold 24px Arial';
            this.ctx.fillText(menu.buttons[i].text, x + buttonWidth / 2, y + buttonHeight / 2 + 8);
        }

        this.ctx.font = '15px Arial';
        this.ctx.fillStyle = '#888888';
        const lines = [
            'Build 3 sets to win!',
            '96 cards, 8 categories, 3 ingredients each',
            'Three-of-a-Kind (3 same) = 120 pts',
            'Category Set (3 different) = 60 pts',
            '',
            'Draw from deck or steal an opponent\'s discard',
            'Discard 1 card to end your turn'
        ];
        const infoY = HOTPOT.LAYOUT.MENU_INFO_START_Y;
        const lineH = HOTPOT.LAYOUT.MENU_INFO_LINE_HEIGHT;
        lines.forEach((l, i) => this.ctx.fillText(l, HOTPOT.WIDTH / 2, infoY + i * lineH));
    }

    drawMultiplayerMenuScreen() {
        const menu = this.game.menuManager.multiplayerMenu;
        const buttonWidth = HOTPOT.LAYOUT.MENU_BUTTON_WIDTH;
        const buttonHeight = HOTPOT.LAYOUT.MENU_BUTTON_HEIGHT;
        const startY = HOTPOT.LAYOUT.MP_BUTTON_START_Y;
        const spacing = HOTPOT.LAYOUT.MENU_BUTTON_SPACING;

        this.ctx.fillStyle = HOTPOT.COLORS.TEXT;
        this.ctx.font = 'bold 36px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('MULTIPLAYER', HOTPOT.WIDTH / 2, HOTPOT.LAYOUT.MP_TITLE_Y);

        for (let i = 0; i < menu.buttons.length; i++) {
            const x = HOTPOT.WIDTH / 2 - buttonWidth / 2;
            const y = startY + i * spacing;
            const isHovered = this.input.isElementHovered(`hotpot_mp_button_${i}`);
            const isSelected = menu.selectedIndex === i;

            this.ctx.fillStyle = (isSelected || isHovered) ? HOTPOT.COLORS.HIGHLIGHT : HOTPOT.COLORS.UI_BG;
            this.ctx.fillRect(x, y, buttonWidth, buttonHeight);
            this.ctx.strokeStyle = HOTPOT.COLORS.UI_BORDER;
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(x, y, buttonWidth, buttonHeight);
            this.ctx.fillStyle = HOTPOT.COLORS.TEXT;
            this.ctx.font = 'bold 24px Arial';
            this.ctx.fillText(menu.buttons[i].text, x + buttonWidth / 2, y + buttonHeight / 2 + 8);
        }
    }

    drawWaitingMenuScreen(title) {
        this.ctx.fillStyle = HOTPOT.COLORS.TEXT;
        this.ctx.font = 'bold 36px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(title, HOTPOT.WIDTH / 2, HOTPOT.LAYOUT.WAITING_TITLE_Y);

        this.ctx.font = '18px Arial';
        this.ctx.fillStyle = '#cccccc';
        this.ctx.fillText('Waiting for other players...', HOTPOT.WIDTH / 2, HOTPOT.LAYOUT.WAITING_SUBTITLE_Y);

        const menu = this.game.waitingMenu;
        const buttonWidth = HOTPOT.LAYOUT.BUTTON_WIDTH;
        const buttonHeight = HOTPOT.LAYOUT.BUTTON_HEIGHT;
        const startY = HOTPOT.LAYOUT.WAITING_BUTTON_START_Y;
        const spacing = HOTPOT.LAYOUT.BUTTON_SPACING;
        for (let i = 0; i < menu.buttons.length; i++) {
            const x = HOTPOT.WIDTH / 2 - buttonWidth / 2;
            const y = startY + i * spacing;
            const isHovered = this.input.isElementHovered(`hotpot_waiting_button_${i}`);
            const isSelected = menu.selectedIndex === i;
            this.ctx.fillStyle = (isSelected || isHovered) ? HOTPOT.COLORS.HIGHLIGHT : HOTPOT.COLORS.UI_BG;
            this.ctx.fillRect(x, y, buttonWidth, buttonHeight);
            this.ctx.strokeStyle = HOTPOT.COLORS.UI_BORDER;
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(x, y, buttonWidth, buttonHeight);
            this.ctx.fillStyle = HOTPOT.COLORS.TEXT;
            this.ctx.font = 'bold 20px Arial';
            this.ctx.fillText(menu.buttons[i].text, x + buttonWidth / 2, y + buttonHeight / 2 + 7);
        }
    }

    drawWaitingCanceledMenuScreen() {
        this.ctx.fillStyle = 'rgba(0,0,0,0.75)';
        this.ctx.fillRect(0, 0, HOTPOT.WIDTH, HOTPOT.HEIGHT);

        this.ctx.fillStyle = HOTPOT.COLORS.TEXT;
        this.ctx.font = 'bold 36px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('MATCH CANCELED', HOTPOT.WIDTH / 2, HOTPOT.LAYOUT.WAITCANCEL_TITLE_Y);

        this.ctx.font = '18px Arial';
        this.ctx.fillStyle = '#cccccc';
        this.ctx.fillText('The room is still open. What would you like to do?', HOTPOT.WIDTH / 2, HOTPOT.LAYOUT.WAITING_SUBTITLE_Y);

        const menu = this.game.waitingCanceledMenu;
        const buttonWidth = HOTPOT.LAYOUT.BUTTON_WIDTH;
        const buttonHeight = HOTPOT.LAYOUT.BUTTON_HEIGHT;
        const startY = HOTPOT.LAYOUT.WAITCANCEL_BUTTON_START_Y;
        const spacing = HOTPOT.LAYOUT.BUTTON_SPACING;
        for (let i = 0; i < menu.buttons.length; i++) {
            const x = HOTPOT.WIDTH / 2 - buttonWidth / 2;
            const y = startY + i * spacing;
            const isHovered = this.input.isElementHovered(`hotpot_waitcancel_button_${i}`);
            const isSelected = menu.selectedIndex === i;
            this.ctx.fillStyle = (isSelected || isHovered) ? HOTPOT.COLORS.HIGHLIGHT : HOTPOT.COLORS.UI_BG;
            this.ctx.fillRect(x, y, buttonWidth, buttonHeight);
            this.ctx.strokeStyle = HOTPOT.COLORS.UI_BORDER;
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(x, y, buttonWidth, buttonHeight);
            this.ctx.fillStyle = HOTPOT.COLORS.TEXT;
            this.ctx.font = 'bold 20px Arial';
            this.ctx.fillText(menu.buttons[i].text, x + buttonWidth / 2, y + buttonHeight / 2 + 7);
        }
    }

    drawWaitingForHostMenuScreen() {
        this.ctx.fillStyle = 'rgba(0,0,0,0.75)';
        this.ctx.fillRect(0, 0, HOTPOT.WIDTH, HOTPOT.HEIGHT);

        this.ctx.fillStyle = HOTPOT.COLORS.HIGHLIGHT;
        this.ctx.font = 'bold 36px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('WAITING FOR HOST', HOTPOT.WIDTH / 2, HOTPOT.LAYOUT.WAITHOST_TITLE_Y);

        this.ctx.font = '18px Arial';
        this.ctx.fillStyle = '#cccccc';
        this.ctx.fillText('The host needs to start the match', HOTPOT.WIDTH / 2, HOTPOT.LAYOUT.WAITHOST_SUBTITLE_Y);

        const menu = this.game.waitingForHostMenu;
        const buttonWidth = HOTPOT.LAYOUT.BUTTON_WIDTH;
        const buttonHeight = HOTPOT.LAYOUT.BUTTON_HEIGHT;
        const startY = HOTPOT.LAYOUT.WAITHOST_BUTTON_START_Y;
        const x = HOTPOT.WIDTH / 2 - buttonWidth / 2;
        const y = startY;
        const isHovered = this.input.isElementHovered('hotpot_waithost_button_0');
        const isSelected = menu.selectedIndex === 0;
        this.ctx.fillStyle = (isSelected || isHovered) ? HOTPOT.COLORS.HIGHLIGHT : HOTPOT.COLORS.UI_BG;
        this.ctx.fillRect(x, y, buttonWidth, buttonHeight);
        this.ctx.strokeStyle = HOTPOT.COLORS.UI_BORDER;
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(x, y, buttonWidth, buttonHeight);
        this.ctx.fillStyle = HOTPOT.COLORS.TEXT;
        this.ctx.font = 'bold 20px Arial';
        this.ctx.fillText(menu.buttons[0].text, x + buttonWidth / 2, y + buttonHeight / 2 + 7);
    }

    drawOpponentDisconnectedMenuScreen() {
        this.ctx.fillStyle = 'rgba(0,0,0,0.75)';
        this.ctx.fillRect(0, 0, HOTPOT.WIDTH, HOTPOT.HEIGHT);

        this.ctx.fillStyle = '#ff6b6b';
        this.ctx.font = 'bold 36px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('OPPONENT DISCONNECTED', HOTPOT.WIDTH / 2, HOTPOT.LAYOUT.DISCONNECT_TITLE_Y);

        this.ctx.font = '18px Arial';
        this.ctx.fillStyle = '#cccccc';
        this.ctx.fillText('An opponent has left the game.', HOTPOT.WIDTH / 2, HOTPOT.LAYOUT.DISCONNECT_SUBTITLE_Y);

        const menu = this.game.opponentDisconnectedMenu;
        const buttonWidth = HOTPOT.LAYOUT.BUTTON_WIDTH;
        const buttonHeight = HOTPOT.LAYOUT.BUTTON_HEIGHT;
        const startY = HOTPOT.LAYOUT.DISCONNECT_BUTTON_START_Y;
        const spacing = HOTPOT.LAYOUT.BUTTON_SPACING;
        for (let i = 0; i < menu.buttons.length; i++) {
            const x = HOTPOT.WIDTH / 2 - buttonWidth / 2;
            const y = startY + i * spacing;
            const isHovered = this.input.isElementHovered(`hotpot_disconnect_button_${i}`);
            const isSelected = menu.selectedIndex === i;
            this.ctx.fillStyle = (isSelected || isHovered) ? HOTPOT.COLORS.HIGHLIGHT : HOTPOT.COLORS.UI_BG;
            this.ctx.fillRect(x, y, buttonWidth, buttonHeight);
            this.ctx.strokeStyle = HOTPOT.COLORS.UI_BORDER;
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(x, y, buttonWidth, buttonHeight);
            this.ctx.fillStyle = HOTPOT.COLORS.TEXT;
            this.ctx.font = 'bold 20px Arial';
            this.ctx.fillText(menu.buttons[i].text, x + buttonWidth / 2, y + buttonHeight / 2 + 7);
        }
    }

    drawRoomShutDownMenuScreen() {
        this.ctx.fillStyle = 'rgba(0,0,0,0.75)';
        this.ctx.fillRect(0, 0, HOTPOT.WIDTH, HOTPOT.HEIGHT);

        this.ctx.fillStyle = '#ff6b6b';
        this.ctx.font = 'bold 36px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('ROOM SHUTDOWN', HOTPOT.WIDTH / 2, HOTPOT.LAYOUT.SHUTDOWN_TITLE_Y);

        this.ctx.font = '18px Arial';
        this.ctx.fillStyle = '#cccccc';
        this.ctx.fillText('The host has left the room.', HOTPOT.WIDTH / 2, HOTPOT.LAYOUT.SHUTDOWN_SUBTITLE_Y);

        const menu = this.game.roomShutDownMenu;
        const buttonWidth = HOTPOT.LAYOUT.BUTTON_WIDTH;
        const buttonHeight = HOTPOT.LAYOUT.BUTTON_HEIGHT;
        const startY = HOTPOT.LAYOUT.SHUTDOWN_BUTTON_START_Y;
        const x = HOTPOT.WIDTH / 2 - buttonWidth / 2;
        const y = startY;
        const isHovered = this.input.isElementHovered('hotpot_roomshutdown_button_0');
        const isSelected = menu.selectedIndex === 0;
        this.ctx.fillStyle = (isSelected || isHovered) ? HOTPOT.COLORS.HIGHLIGHT : HOTPOT.COLORS.UI_BG;
        this.ctx.fillRect(x, y, buttonWidth, buttonHeight);
        this.ctx.strokeStyle = HOTPOT.COLORS.UI_BORDER;
        this.ctx.lineWidth = 3;
        this.ctx.strokeRect(x, y, buttonWidth, buttonHeight);
        this.ctx.fillStyle = HOTPOT.COLORS.TEXT;
        this.ctx.font = 'bold 20px Arial';
        this.ctx.fillText(menu.buttons[0].text, x + buttonWidth / 2, y + buttonHeight / 2 + 7);
    }

    drawRematchPendingMenuScreen() {
        this.ctx.fillStyle = 'rgba(0,0,0,0.75)';
        this.ctx.fillRect(0, 0, HOTPOT.WIDTH, HOTPOT.HEIGHT);

        this.ctx.fillStyle = HOTPOT.COLORS.TEXT;
        this.ctx.font = 'bold 36px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('REMATCH PENDING', HOTPOT.WIDTH / 2, HOTPOT.LAYOUT.REMATCH_TITLE_Y);

        this.ctx.font = '18px Arial';
        this.ctx.fillStyle = '#cccccc';
        this.ctx.fillText('Waiting for opponent to accept...', HOTPOT.WIDTH / 2, HOTPOT.LAYOUT.REMATCH_SUBTITLE_Y);

        const menu = this.game.rematchPendingMenu;
        const buttonWidth = HOTPOT.LAYOUT.BUTTON_WIDTH;
        const buttonHeight = HOTPOT.LAYOUT.BUTTON_HEIGHT;
        const startY = HOTPOT.LAYOUT.REMATCH_BUTTON_START_Y;
        const spacing = HOTPOT.LAYOUT.BUTTON_SPACING;
        for (let i = 0; i < menu.buttons.length; i++) {
            const x = HOTPOT.WIDTH / 2 - buttonWidth / 2;
            const y = startY + i * spacing;
            const isHovered = this.input.isElementHovered(`hotpot_rematch_button_${i}`);
            const isSelected = menu.selectedIndex === i;
            this.ctx.fillStyle = (isSelected || isHovered) ? HOTPOT.COLORS.HIGHLIGHT : HOTPOT.COLORS.UI_BG;
            this.ctx.fillRect(x, y, buttonWidth, buttonHeight);
            this.ctx.strokeStyle = HOTPOT.COLORS.UI_BORDER;
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(x, y, buttonWidth, buttonHeight);
            this.ctx.fillStyle = HOTPOT.COLORS.TEXT;
            this.ctx.font = 'bold 20px Arial';
            this.ctx.fillText(menu.buttons[i].text, x + buttonWidth / 2, y + buttonHeight / 2 + 7);
        }
    }
}