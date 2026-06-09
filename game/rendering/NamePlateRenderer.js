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
    size: 25,
    emojiGap: 10,          // gap between avatar right edge and name left edge
    yOffset: 0,            // vertical offset from plate center
};

// ---------- Name ----------
const NAME = {
    fontSize: 14,
    weight: 'bold',
    color: '#ffffff',
    yOffset: 0,            // vertical offset from plate center
    badgeGap: 8,           // gap between name end and first badge
};

// ---------- Badges ----------
const BADGE = {
    fontSize: 9,
    weight: 'bold',
    color: '#ffffff',
    height: 16,
    borderRadius: 4,
    textPadding: 10,       // horizontal padding inside badge
    gap: 6,                // gap between badges in the row
    yOffset: 0,            // vertical offset from plate center (row position)
    rectYOffset: 1,        // how much the badge rect is shifted up from the content center
};

// ---------- Thinking indicator ----------
const THINKING = {
    fontSize: 10,
    weight: 'bold',
    dotRadius: 3,
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
    human: [
    // Faces
    '😀','😃','😄','😁','😆','😅','😂','🤣','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','☺️','😚','😙',
    '😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶',
    '😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','🥴','😵',
    '🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢',
    '😭','😱','😖','😣','😞','😓','😩','😫','😤','😡','😠','🤬','😈','👿','💀','☠️',

    // People (all genders)
    '👶','🧒','👦','👧','🧑','👱','👨','👩','🧔','🧓','👴','👵',
    '👨‍🦰','👩‍🦰','👨‍🦱','👩‍🦱','👨‍🦳','👩‍🦳','👨‍🦲','👩‍🦲',

    // Gestures / hands
    '👋','🤚','🖐','✋','🖖','👌','🤏','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👍','👎',
    '✊','👊','🤛','🤜','👏','🙌','🤝','🙏','🤲',

    // Body parts
    '👁','👀','👂','🦻','👃','👄','🦷','🦴','🧠',

    // Activities / poses
    '🧍','🧎','🙇',
    '💁','🙅','🙆',
    '🙋','🤦','🤷',
    '🧘','🕺','💃','👯','🚶','🏃',

    // Professions (all genders)
    '👮','🕵️','💂','👷',
    '👨‍⚕️','👩‍⚕️','👨‍🍳','👩‍🍳','👨‍🎓','👩‍🎓',
    '👨‍🏫','👩‍🏫','👨‍🏭','👩‍🏭','👨‍💻','👩‍💻',
    '👨‍🔧','👩‍🔧','👨‍🚀','👩‍🚀','👨‍🚒','👩‍🚒',

    // Couples / families
    '💑','👩‍❤️‍👨','👨‍❤️‍👨','👩‍❤️‍👩',
    '💏','👩‍❤️‍💋‍👨','👨‍❤️‍💋‍👨','👩‍❤️‍💋‍👩',

    // Human-adjacent symbols
    '💘','💝','💖','💗','💓','💞','💕','💟','❣️','💔'
    ],
    bot: ['🤖', '💻', '🦾', '🖨️']
};

const LOCAL_AVATAR_KEY = 'hotpot_avatar';

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

       // Wifi badge for remote humans only
        const isRemoteHuman = player.isRemote && player.isHuman;
        if (isRemoteHuman) {
            ctx.font = `${BADGE.fontSize + 2}px Arial`;
            const emojiW = ctx.measureText('📶').width;
            badgesW += emojiW + BADGE.textPadding;
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

        const cp = this.game.state.getCurrentPlayer();
        let isMyTurn = false;
        if (this.game.networkSession && this.game.networkSession.localPlayerIndex !== undefined) {
            isMyTurn = this.game.networkSession.gameState.currentPlayerIndex === this.game.networkSession.localPlayerIndex;
        } else {
            isMyTurn = cp && cp.isHuman;
        }

        const isLocalPlayer = player.isLocal || (player.isHuman && player.name === 'You');
        const isCurrentTurnPlayer = isLocalPlayer ? isMyTurn : cp === player;

        if (isCurrentTurnPlayer) {
            const pulse = 0.5 + 0.5 * Math.sin(Card.glowPhase);
            ctx.save();
            ctx.shadowColor = HOTPOT.COLORS.PLAYER_TURN;
            ctx.shadowBlur = 8 + pulse * 14;
            this._roundRect(ctx, x - 2, y - 2, w + 4, h + 4, r + 2);
            ctx.strokeStyle = HOTPOT.COLORS.PLAYER_TURN;
            ctx.globalAlpha = 0.4 + pulse * 0.4;
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        }

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
        const isLocalForAvatar = player.isLocal || (player.isHuman && player.name === 'You');

        // Emoji avatar
        const avatar = this._getAvatar(player, isLocalForAvatar);
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
        if (isLocalForAvatar) {
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

        // Wifi badge for remote human players only
        if (player.isRemote && player.isHuman) {
            this._drawEmojiBadge(ctx, badgeX, badgeY, '📶', COLORS.localPlayer);
            const wifiW = ctx.measureText('📶').width + BADGE.textPadding;
            badgeX += wifiW + BADGE.gap;
        }

        ctx.restore();

        // Draw border on top (outside clip)
        ctx.strokeStyle = COLORS.bgStroke;
        ctx.lineWidth = COLORS.strokeLineWidth;
        this._roundRect(ctx, x, y, w, h, r);
        ctx.stroke();

        // Thinking indicator
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
            const saved = typeof localStorage !== 'undefined' && localStorage.getItem(LOCAL_AVATAR_KEY);
            if (saved && NAMEPLATE_EMOJIS.human.includes(saved)) {
                return saved;
            }
            // Pick random and save for next time
            const idx = Math.floor(Math.random() * NAMEPLATE_EMOJIS.human.length);
            const emoji = NAMEPLATE_EMOJIS.human[idx];
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(LOCAL_AVATAR_KEY, emoji);
            }
            return emoji;
        }
        if (!player.isHuman) {
            // Prefer synced avatar from host (player.avatar); fall back to locally generated
            if (player.avatar && NAMEPLATE_EMOJIS.bot.includes(player.avatar)) {
                player._avatar = player.avatar; // keep _avatar in sync so local renders stay consistent
                return player._avatar;
            }
            if (!player._avatar) {
                const idx = Math.floor(Math.random() * NAMEPLATE_EMOJIS.bot.length);
                player._avatar = NAMEPLATE_EMOJIS.bot[idx];
            }
            return player._avatar;
        }
        // Remote human players
        if (player.avatar && NAMEPLATE_EMOJIS.human.includes(player.avatar)) {
            return player.avatar;
        }
        // No avatar known yet — show placeholder until sync arrives
        return '❓';
    }

    setLocalAvatar(emoji) {
        if (typeof localStorage !== 'undefined' && NAMEPLATE_EMOJIS.human.includes(emoji)) {
            localStorage.setItem(LOCAL_AVATAR_KEY, emoji);
        }
    }

    getLocalAvatar() {
        if (typeof localStorage !== 'undefined') {
            const saved = localStorage.getItem(LOCAL_AVATAR_KEY);
            if (saved && NAMEPLATE_EMOJIS.human.includes(saved)) {
                return saved;
            }
        }
        return null;
    }

_drawEmojiBadge(ctx, x, y, emoji, color) {
        const emojiSize = BADGE.fontSize + 2;
        ctx.font = `${emojiSize}px Arial`;
        const tw = ctx.measureText(emoji).width;
        const bw = tw + BADGE.textPadding;
        const bh = BADGE.height;

        // Badge background (shifted up by BADGE.rectYOffset)
        const rectY = y - BADGE.rectYOffset;
        ctx.fillStyle = color;
        this._roundRect(ctx, x, rectY - bh / 2, bw, bh, BADGE.borderRadius);
        ctx.fill();

        // Emoji (centered on y)
        ctx.fillStyle = BADGE.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(emoji, x + bw / 2, y);
    }

_drawBadge(ctx, x, y, text, color) {
        const fontSize = BADGE.fontSize;
        ctx.font = `${BADGE.weight} ${fontSize}px Arial`;
        const tw = ctx.measureText(text).width;
        const bw = tw + BADGE.textPadding;
        const bh = BADGE.height;

        // Badge background (shifted up by BADGE.rectYOffset)
        const rectY = y - BADGE.rectYOffset;
        ctx.fillStyle = color;
        this._roundRect(ctx, x, rectY - bh / 2, bw, bh, BADGE.borderRadius);
        ctx.fill();

        // Badge text (centered on y)
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
