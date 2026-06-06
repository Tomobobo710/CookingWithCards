// game/rendering/NamePlate.js
// Renders a modern nameplate for each player with emoji avatar, name, difficulty badge, and thinking indicator.
//
// All visual constants live here — tweak anything without hunting through the draw() method.

// ---------- Size & layout ----------
const NAMEPLATE = {
    height: 50,
    borderRadius: 6,
    accentBarWidth: 3,
    minWidth: 100,         // minimum width before going dynamic
    maxWidth: 300,         // maximum width to avoid overflow
    minHeight: 50,
    padding: 10,           // left/right padding from plate edge to content
    bottomPadding: 4,      // gap between plate bottom and thinking indicator
};

// ---------- Avatar ----------
const AVATAR = {
    size: 20,
    emojiGap: 8,           // gap between avatar right edge and name left edge
    yOffset: -1,           // vertical offset from plate center
};

// ---------- Name ----------
const NAME = {
    fontSize: 11,
    weight: 'bold',
    color: '#ffffff',
    yOffset: 0,           // vertical offset from plate center
    badgeGap: 6,          // gap between name end and first badge
};

// ---------- Badges ----------
const BADGE = {
    fontSize: 7,
    weight: 'bold',
    color: '#ffffff',
    height: 13,
    borderRadius: 4,
    textPadding: 8,        // horizontal padding inside badge
    gap: 6,                // gap between badges in the row
    yOffset: 0,            // vertical offset from plate center (row position)
};

// ---------- Thinking indicator ----------
const THINKING = {
    fontSize: 8,
    weight: 'bold',
    dotRadius: 2.5,
    textGap: 2,            // gap between dot and "THINKING" text
    pulseSpeed: 300,       // ms for one full pulse cycle
    pulseMin: 0.7,         // min alpha during pulse
    pulseMax: 1.0,         // max alpha during pulse
    bottomGap: 7,         // gap between plate bottom edge and thinking content
    dotYOffset: 3,         // vertical offset of dot center relative to text baseline
};

// ---------- Colors ----------
const COLORS = {
    bgFill: 'rgba(25, 25, 35, 0.9)',
    bgStroke: 'rgba(255, 255, 255, 0.12)',
    strokeLineWidth: 1,
    localPlayer: '#2196f3',    // blue
    remoteHuman: '#9e9e9e',    // gray
    thinkingMyTurn: '#4caf50', // green
};

const DIFFICULTY_COLORS = {
    1: '#4caf50',  // Easy - green
    2: '#ff9800',  // Medium - orange
    3: '#f44336',  // Hard - red
};

const DIFFICULTY_LABELS = {
    1: 'Easy',
    2: 'Medium',
    3: 'Hard'
};

const NAMEPLATE_EMOJIS = {
    human: ['🧑', '👤', '🧍', '🙋'],
    bot: ['🤖', '👾', '🦾', '🎮', '🕹️']
};

// ---------- End constants ----------

class NamePlateRenderer {
    constructor(game) {
        this.game = game;
        this.ctx = game.gameCtx;
    }

    _measureContent(player) {
        const ctx = this.ctx;
        const savedFont = ctx.font;

        // Measure emoji
        ctx.font = `${AVATAR.size}px Arial`;
        const emojiW = ctx.measureText(this._getAvatar(player, player.isLocal || (player.isHuman && player.name === 'You'))).width;

        // Measure name
        ctx.font = `${NAME.weight} ${NAME.fontSize}px Arial`;
        const nameW = ctx.measureText(player.name).width;

        // Measure badges on the same line as name
        const isLocal = player.isLocal || (player.isHuman && player.name === 'You');
        let badgesW = 0;
        if (isLocal) {
            ctx.font = `${BADGE.weight} ${BADGE.fontSize}px Arial`;
            const badgeW = ctx.measureText('YOU').width + BADGE.textPadding;
            badgesW += badgeW;
        }
        if (!player.isHuman) {
            const diffLabel = DIFFICULTY_LABELS[player.difficulty] || 'Medium';
            ctx.font = `${BADGE.weight} ${BADGE.fontSize}px Arial`;
            const badgeW = ctx.measureText(diffLabel).width + BADGE.textPadding;
            badgesW += badgeW;
        }

        ctx.font = savedFont;
        return { emojiW, nameW, badgesW };
    }

    computeWidth(player) {
        const { emojiW, nameW, badgesW } = this._measureContent(player);
        const totalContent = emojiW + AVATAR.emojiGap + nameW + NAME.badgeGap + badgesW;
        const minWidth = NAMEPLATE.minWidth || 100;
        const maxWidth = NAMEPLATE.maxWidth || 9999;
        const computed = totalContent + NAMEPLATE.padding * 2;
        return Math.max(minWidth, Math.min(maxWidth, computed));
    }

    _getLayoutData(player) {
        const w = this.computeWidth(player);
        const content = this._measureContent(player);
        return { w, ...content };
    }

    draw(player, index, x, y) {
        const ctx = this.ctx;
        const { w, emojiW, nameW } = this._getLayoutData(player);
        this.width = w;
        const h = NAMEPLATE.height;
        const r = NAMEPLATE.borderRadius;

        ctx.save();

        // Set clip to rounded plate bounds — everything drawn after this is clipped
        this._roundRect(ctx, x, y, w, h, r);
        ctx.clip();

        // Background rounded rect
        ctx.fillStyle = COLORS.bgFill;
        this._roundRect(ctx, x, y, w, h, r);
        ctx.fill();

        // Colored accent bar on the side
        const accentColor = this._getAccentColor(player);
        this._roundRect(ctx, x, y, NAMEPLATE.accentBarWidth, h, r);
        ctx.fillStyle = accentColor;
        ctx.fill();

        // Content area
        const contentX = x + w / 2;
        const contentY = y + h / 2;

        // Determine if this is the local player
        const isLocal = player.isLocal || (player.isHuman && player.name === 'You');

        // Emoji avatar
        const avatar = this._getAvatar(player, isLocal);
        ctx.font = `${AVATAR.size}px Arial`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';

        const avatarX = x + NAMEPLATE.padding;
        const avatarY = contentY + AVATAR.yOffset;
        ctx.fillText(avatar, avatarX, avatarY);

        // Name + badges inline on the same line
        ctx.font = `${NAME.weight} ${NAME.fontSize}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillStyle = NAME.color;
        const nameX = x + NAMEPLATE.padding + emojiW + AVATAR.emojiGap;
        const nameY = contentY + NAME.yOffset;
        ctx.fillText(player.name, nameX, nameY);

        // Badges inline after name
        let badgeX = nameX + nameW + NAME.badgeGap;
        const badgeY = contentY + BADGE.yOffset;

        // "YOU" badge for local player
        if (isLocal) {
            this._drawBadge(ctx, badgeX, badgeY, 'YOU', COLORS.localPlayer);
            const youBadgeW = ctx.measureText('YOU').width + BADGE.textPadding;
            badgeX += youBadgeW + BADGE.gap;
        }

        // Difficulty badge for bots
        if (!player.isHuman) {
            const diffLabel = DIFFICULTY_LABELS[player.difficulty] || 'Medium';
            const diffColor = DIFFICULTY_COLORS[player.difficulty] || '#ff9800';
            this._drawBadge(ctx, badgeX, badgeY, diffLabel, diffColor);
        }

        ctx.restore();

        // Draw border on top (outside clip)
        ctx.strokeStyle = COLORS.bgStroke;
        ctx.lineWidth = COLORS.strokeLineWidth;
        this._roundRect(ctx, x, y, w, h, r);
        ctx.stroke();

        // Thinking indicator
        const cp = this.game.state.getCurrentPlayer();
        if (cp === player) {
            const isMyTurn = this.game.networkSession
                ? this.game.networkSession.gameState.currentPlayerIndex === this.game.networkSession.localPlayerIndex
                : player.isHuman;

            const thinkColor = isMyTurn ? COLORS.thinkingMyTurn : accentColor;
            ctx.font = `${THINKING.weight} ${THINKING.fontSize}px Arial`;
            ctx.textAlign = 'left';
            ctx.fillStyle = thinkColor;

 const thinkBaseY = y + h - THINKING.bottomGap;
            const thinkTextY = thinkBaseY + THINKING.dotYOffset;

            // Measure text to calculate positions
            ctx.font = `${THINKING.weight} ${THINKING.fontSize}px Arial`;
            const thinkTextW = ctx.measureText('THINKING').width;

            // Total width: dot diameter + gap + text width
            const totalW = THINKING.dotRadius * 2 + THINKING.textGap + thinkTextW;
            // Group is right-aligned with padding from plate edge
            const groupRight = x + w - NAMEPLATE.padding;
            const groupLeft = groupRight - totalW;

            // Text is right-aligned at the group's right edge
            ctx.textAlign = 'right';
            const thinkTextX = groupRight;

            // Dot center is at group's left edge + dot radius
            const dotX = groupLeft + THINKING.dotRadius;

            // Pulsing dot
            const pulse = Math.sin(Date.now() / THINKING.pulseSpeed) * (THINKING.pulseMax - THINKING.pulseMin) + THINKING.pulseMin;
            ctx.globalAlpha = pulse;
            ctx.beginPath();
            ctx.arc(dotX, thinkBaseY, THINKING.dotRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;

            ctx.fillText('THINKING', thinkTextX, thinkTextY);
        }

        ctx.restore();
    }

    _getAccentColor(player) {
        if (player.isLocal || (player.isHuman && player.name === 'You')) {
            return '#2196f3'; // blue for local/human
        }
        if (!player.isHuman) {
            return DIFFICULTY_COLORS[player.difficulty] || '#ff9800';
        }
        return '#9e9e9e'; // gray for remote human
    }

    _getAvatar(player, isLocal) {
        if (isLocal) {
            return NAMEPLATE_EMOJIS.human[0];
        }
        if (!player.isHuman) {
            const idx = (player.id || 0) % NAMEPLATE_EMOJIS.bot.length;
            return NAMEPLATE_EMOJIS.bot[idx];
        }
        // Remote human players
        const idx = (player.id || 0) % NAMEPLATE_EMOJIS.human.length;
        return NAMEPLATE_EMOJIS.human[idx];
    }

    _drawBadge(ctx, x, y, text, color) {
        ctx.font = `${BADGE.weight} ${BADGE.fontSize}px Arial`;
        const tw = ctx.measureText(text).width;
        const bw = tw + BADGE.textPadding;
        const bh = BADGE.height;

        // Badge background
        ctx.fillStyle = color;
        this._roundRect(ctx, x, y - bh / 2, bw, bh, BADGE.borderRadius);
        ctx.fill();

        // Badge text
        ctx.fillStyle = BADGE.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + bw / 2, y);
    }

    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
}
