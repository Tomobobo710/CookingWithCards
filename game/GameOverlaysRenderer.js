// game/GameOverlaysRenderer.js
// Renders layers drawn on top of the main game canvas: settings modals,
// plus the separate GUI canvas and debug canvas passes.

class HotpotGameOverlaysRenderer {
    constructor(game) {
        this.game = game;
        this.gameCtx = game.gameCtx;
        this.guiCtx = game.guiCtx;
        this.debugCtx = game.debugCtx;
        this.input = game.input;
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
}
