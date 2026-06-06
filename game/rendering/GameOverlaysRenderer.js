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

    getSettingsModalLayout() {
        const isOnline = !!this.game.networkSession;
        const modalX = HOTPOT.WIDTH / 2 - 150;
        const modalY = HOTPOT.HEIGHT / 2 - (isOnline ? 110 : 140);
        const modalW = 300;
        const modalH = isOnline ? 220 : 280;
        const btnW = 120;
        const btnH = 35;
        let btnY = modalY + (isOnline ? 70 : 90);
        const buttons = [];

        if (!isOnline) {
            buttons.push({ id: 'settings_speed', text: 'Change Speed', x: HOTPOT.WIDTH / 2 - btnW / 2, y: btnY, w: btnW, h: btnH, hovered: false, action: 'speed' });
            btnY += 45;
        }

        buttons.push(
            { id: 'settings_profile', text: 'Profile', x: HOTPOT.WIDTH / 2 - btnW / 2, y: btnY, w: btnW, h: btnH, hovered: false, action: 'profile' },
            { id: 'settings_quit', text: 'Quit Game', x: HOTPOT.WIDTH / 2 - btnW / 2, y: btnY + 45, w: btnW, h: btnH, hovered: false, action: 'quit' },
            { id: 'settings_close', text: 'Close', x: HOTPOT.WIDTH / 2 - btnW / 2, y: btnY + 90, w: btnW, h: btnH, hovered: false, action: 'close' }
        );

        return { isOnline, modalX, modalY, modalW, modalH, buttons };
    }

    registerSettingsButtons() {
        if (this.game.settingsButtonsRegistered) return;
        for (const button of this.getSettingsModalLayout().buttons) {
            this.input.registerElement(button.id, {
                bounds: () => ({ x: button.x, y: button.y, width: button.w, height: button.h })
            });
        }
        this.game.settingsButtonsRegistered = true;
    }

    unregisterSettingsButtons() {
        for (const id of ['settings_speed', 'settings_profile', 'settings_quit', 'settings_close']) {
            this.input.removeElement(id);
        }
        this.game.settingsButtonsRegistered = false;
    }

    drawSettingsModal() {
        this.gameCtx.fillStyle = 'rgba(0,0,0,0.7)';
        this.gameCtx.fillRect(0, 0, HOTPOT.WIDTH, HOTPOT.HEIGHT);

        const { isOnline, modalX, modalY, modalW, modalH, buttons } = this.getSettingsModalLayout();

        this.gameCtx.fillStyle = HOTPOT.COLORS.UI_BG;
        this.gameCtx.fillRect(modalX, modalY, modalW, modalH);
        this.gameCtx.strokeStyle = HOTPOT.COLORS.UI_BORDER;
        this.gameCtx.lineWidth = 2;
        this.gameCtx.strokeRect(modalX, modalY, modalW, modalH);

        this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
        this.gameCtx.font = 'bold 20px Arial';
        this.gameCtx.textAlign = 'center';
        this.gameCtx.fillText('Settings', HOTPOT.WIDTH / 2, modalY + 35);

        this.gameCtx.font = '14px Arial';

        this.game.settingsButtons = [];

        const drawButton = (button) => {
            button.hovered = this.input.isElementHovered(button.id);
            this.gameCtx.fillStyle = button.hovered ? HOTPOT.COLORS.HIGHLIGHT : HOTPOT.COLORS.UI_BG;
            this.gameCtx.fillRect(button.x, button.y, button.w, button.h);
            this.gameCtx.strokeStyle = HOTPOT.COLORS.UI_BORDER;
            this.gameCtx.lineWidth = 3;
            this.gameCtx.strokeRect(button.x, button.y, button.w, button.h);
            this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
            this.gameCtx.font = 'bold 13px Arial';
            this.gameCtx.fillText(button.text, button.x + button.w / 2, button.y + button.h / 2 + 5);
            this.game.settingsButtons.push(button);
        };

        if (!isOnline) {
            const speedCfg = this.game.flow.getSpeedConfig();
            this.gameCtx.fillText(`Speed: ${speedCfg.name}`, HOTPOT.WIDTH / 2, modalY + 70);
        }

        buttons.forEach(drawButton);
    }

drawProfileModal() {
        if (!this.game.profileOpen) return;

        if (!this.game.profileActionUI) {
            this.game.profileActionUI = new ActionUI(
                { guiCtx: this.guiCtx, debugCtx: this.debugCtx, gameCanvas: this.game.gameCanvas },
                this.game.input
            );

            const ui = this.game.profileActionUI;
            const t = ui.theme;
            const overlays = this;

            const modalW = 430;
            const modalH = 380;
            const modalX = HOTPOT.WIDTH / 2 - modalW / 2;
            const modalY = HOTPOT.HEIGHT / 2 - modalH / 2;
            const pad = 18;
            const contentX = pad;
            const contentW = modalW - pad * 2;
            const profileLayout = {
                // Explicit positions are canvas/global coordinates.
                avatarX: modalX + contentX,
                avatarY: modalY + 52,
                avatarW: contentW,
                hintX: modalX + contentX,
                hintY: modalY + 102,
                hintW: contentW,
                closeX: modalX + contentX,
                closeY: modalY + modalH - pad - 46,
                closeW: contentW,
                scrollX: modalX + contentX,
                scrollY: modalY + 132,
                scrollW: contentW - 20 - 8
            };

    // Panel — centered on screen
            const panel = new ActionUIPanel({
                x: modalX, y: modalY, width: modalW, height: modalH,
                title: 'Profile', shadow: true, layer: 'gui'
            });
            // Don't register with UI — draw manually to control z-order

            // Current avatar — large centered emoji
            const np = this.game.renderer.table.nameplate;
            const currentAvatar = np ? np.getLocalAvatar() : null;
            this._profileAvatarLabel = new ActionUILabel({
                text: currentAvatar || '😀',
                x: profileLayout.avatarX,
                y: profileLayout.avatarY,
                width: profileLayout.avatarW,
                height: 52,
                fontSize: 54, color: 'text', align: 'center', layer: 'gui'
            });
            ui.add(this._profileAvatarLabel);

            const hintLabel = new ActionUILabel({
                text: 'Click an emoji to change your avatar',
                x: profileLayout.hintX, y: profileLayout.hintY, width: profileLayout.hintW, height: 18,
                fontSize: t.fontSizeSm, color: 'muted', align: 'center', layer: 'gui'
            });
            ui.add(hintLabel);

            // Scrollable grid — each scroller item is one row of 10 emoji buttons
            const scrollX = profileLayout.scrollX;
            const scrollY = profileLayout.scrollY;
            const scrollBarW = 20;
            const scrollGap = 8;
            const scrollW = profileLayout.scrollW;
            const scrollH = 150;
            const cols = 10;
            const cellSize = 34;
            const gridInsetX = 6;
            const rowH = cellSize + 6;
            const emojis = NAMEPLATE_EMOJIS.human;
            const totalRows = Math.ceil(emojis.length / cols);

            // Build emoji row items so the scroller stacks rows, not individual emojis
             this._profileEmojiItems = [];
             for (let row = 0; row < totalRows; row++) {
                 const rowStart = row * cols;
                 this._profileEmojiItems.push({
                     row: row,
                     draw(ctx, y) {
                         const np2 = overlays.game.renderer.table.nameplate;
                         const cur = np2 ? np2.getLocalAvatar() : null;
                         const by = y + 3;
                         const btnW = cellSize - 4;
                         const btnH = cellSize - 4;

                         for (let col = 0; col < cols; col++) {
                             const emojiIndex = rowStart + col;
                             if (emojiIndex >= emojis.length) break;

                             const emoji = emojis[emojiIndex];
                             const isSelected = emoji === cur;
                             const bx = scrollX + gridInsetX + col * cellSize;
                             const pointer = overlays.game.input.getPointerPosition();
                             const isHovered =
                                 pointer.x >= bx && pointer.x <= bx + btnW &&
                                 pointer.y >= by && pointer.y <= by + btnH;

                             if (isSelected) {
                                 ActionUIDrawUtils.fillRoundRect(ctx, bx, by, btnW, btnH, 5, t.colorPrimary);
                             } else if (isHovered) {
                                 ActionUIDrawUtils.fillRoundRect(ctx, bx, by, btnW, btnH, 5, t.withAlpha(t.colorPrimary, 0.25));
                                 ActionUIDrawUtils.strokeRoundRect(ctx, bx, by, btnW, btnH, 5, t.colorPrimary, 1.5);
                             } else {
                                 ActionUIDrawUtils.strokeRoundRect(ctx, bx, by, btnW, btnH, 5, t.colorBorder, 1);
                             }

                             ctx.font = '18px Arial';
                             ctx.textAlign = 'center';
                             ctx.textBaseline = 'middle';
                             ctx.fillStyle = t.colorText;
                             ctx.fillText(emoji, bx + btnW / 2, by + btnH / 2);
                         }
                     }
                 });
             }

             const scroller = new ActionUIScrollableArea({
                 listAreaX: scrollX,
                 listAreaY: scrollY,
                 listAreaWidth: scrollW,
                 listAreaHeight: scrollH,
                 itemHeight: rowH,
                 padding: 2,
                 scrollBarX: scrollX + scrollW + scrollGap,
                 scrollBarY: scrollY,
                 scrollBarTrackHeight: scrollH,
                 scrollBarThumbStartY: scrollY,
                 enableClipping: true,
                 clipBounds: { x: scrollX, y: scrollY, width: scrollW, height: scrollH },
                 backgroundColor: t.colorSurface,
                 borderColor: t.colorBorder,
                 borderWidth: 1,
                 cornerRadius: t.radiusMd,
                 generateItemId: (item, index) => `emoji_row_${index}`,
                 onRegisterItemInput: (itemId, index, bounds, layer = "gui") => {
                     this.game.input.registerElement(itemId, { bounds: () => bounds }, layer);
                 }
             }, this.game.input, this.guiCtx);

            panel._scroller = scroller;

            // Close button
            const closeBtn = new ActionUIButton({
                x: profileLayout.closeX,
                y: profileLayout.closeY,
                width: profileLayout.closeW, height: 34,
                text: 'Close', variant: 'danger',
                fontSize: t.fontSizeSm, layer: 'gui',
                onClick: () => { overlays.game.profileOpen = false; }
            });
            ui.add(closeBtn);

           this._profileCloseBtn = closeBtn;
            this._profilePanel = panel;
            this._profileScroller = scroller;
            this._profileEmojis = emojis;
        }

    // Update & draw every frame
        const ui = this.game.profileActionUI;
        const panel = this._profilePanel;
        const scroller = this._profileScroller;
        const t = ui.theme;
        const cols = 10;
        const totalItems = this._profileEmojiItems.length;
       const np = this.game.renderer.table.nameplate;
        const currentAvatar = np ? np.getLocalAvatar() : null;

        // Update avatar display label
        if (this._profileAvatarLabel) {
            this._profileAvatarLabel.text = currentAvatar || '😀';
        }
        if (this._profileCloseBtn) {
            this._profileCloseBtn._hovered = this.game.input.isElementHovered(this._profileCloseBtn.id, "gui");
        }

        ui.update(0);
        scroller.update(totalItems, 0);
        scroller.refreshItems(this._profileEmojiItems, "gui");

        // Handle emoji clicks by converting the pointer position into a grid cell
        const pointer = this.game.input.getPointerPosition();
        for (let row = 0; row < totalItems; row++) {
            if (this.game.input.isElementJustPressed(`emoji_row_${row}`, "gui")) {
                const col = Math.floor((pointer.x - (scroller.listArea.x + 6)) / 34);
                const emojiIndex = row * cols + col;
                const emoji = this._profileEmojis[emojiIndex];
                if (emoji && np) {
                    np.setLocalAvatar(emoji);
                    localStorage.setItem('hotpot_avatar', emoji);
                }
                break;
            }
        }

        // Draw panel first, then scroll area on top
        panel.draw(this.guiCtx);
        const drawCtx = this.guiCtx;
        scroller.draw(this._profileEmojiItems, (emojiItem, index, screenY) => {
            emojiItem.draw(drawCtx, screenY);
        });
        ui.draw('gui');
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

        // Draw profile UI if open
        if (this.game.profileOpen) {
            this.drawProfileModal();
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
