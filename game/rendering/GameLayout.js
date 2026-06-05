// game/GameLayout.js
// Pure geometry / hit-test helpers for the Hotpot board.
// No mutable state; methods only read HOTPOT and the player arg.

class HotpotGameLayout {
    pointInRect(p, r) {
        return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
    }

    getDeckRect() {
        const cx = HOTPOT.WIDTH / 2;
        const cy = HOTPOT.HEIGHT / 2;
        return { x: cx - HOTPOT.UI.CARD_WIDTH / 2, y: cy - HOTPOT.UI.CARD_HEIGHT / 2, w: HOTPOT.UI.CARD_WIDTH, h: HOTPOT.UI.CARD_HEIGHT };
    }

    getDiscardRect(player) {
        const cx = HOTPOT.WIDTH / 2;
        const cy = HOTPOT.HEIGHT / 2;
        const gap = 50;
        const hw = HOTPOT.UI.CARD_WIDTH / 2;
        const hh = HOTPOT.UI.CARD_HEIGHT / 2;

        const distV = hh + gap;
        const distH = hw + gap / 2 + 12.5;
        const positionMap = {
            'S': { x: cx - hw, y: cy + distV - hh },
            'E': { x: cx + distH - hw, y: cy - hh },
            'N': { x: cx - hw, y: cy - distV - hh },
            'W': { x: cx - distH - hw, y: cy - hh }
        };
        const pos = positionMap[player.tablePosition];
        return { x: pos.x, y: pos.y, w: HOTPOT.UI.CARD_WIDTH, h: HOTPOT.UI.CARD_HEIGHT };
    }

    getDrawnCardRectForPlayer(player) {
        const cardScale = 0.5;
        const fw = 80 * cardScale;
        const fh = 115 * cardScale;
        const spacing = 6;

        const cards = player.hand;
        if (cards.length === 0) return { x: 0, y: 0, w: 0, h: 0 };

        const visualH = fh;
        const visualW = fw;
        const totalH = cards.length * visualH + (cards.length - 1) * spacing;
        const totalW = cards.length * visualW + (cards.length - 1) * spacing;

        let cx, cy;

        if (player.tablePosition === 'W') {
            cx = fw / 2 + 12 + fw + 8 + fw / 2;
            cy = (HOTPOT.HEIGHT - totalH) / 2 + (cards.length * visualH) / 2;
        } else if (player.tablePosition === 'N') {
            cx = (HOTPOT.WIDTH - totalW) / 2 + (cards.length * visualW) / 2;
            cy = fh / 2 + 10 + fh + 8 + fh / 2;
        } else if (player.tablePosition === 'E') {
            cx = HOTPOT.WIDTH - fw / 2 - 12 - fw - 8 - fw / 2;
            cy = (HOTPOT.HEIGHT - totalH) / 2 + (cards.length * visualH) / 2;
        } else {
            return this.getDrawnCardRect();
        }

        return { x: cx - fw / 2, y: cy - fh / 2, w: fw, h: fh };
    }

    getHandCardRects(player) {
        const cards = player.hand;
        if (cards.length === 0) return [];

        const groups = [];
        let cur = null;
        for (const card of cards) {
            const key = card.category + '|' + card.ingredient;
            if (!cur || cur.key !== key) {
                cur = { category: card.category, ingredient: card.ingredient, cards: [], key };
                groups.push(cur);
            }
            cur.cards.push(card);
        }

        const catGap = 24;
        const ingGap = 10;
        const step = HOTPOT.UI.CARD_WIDTH + HOTPOT.UI.CARD_SPACING;

        let totalW = 0;
        for (let g = 0; g < groups.length; g++) {
            totalW += groups[g].cards.length * step - HOTPOT.UI.CARD_SPACING;
            if (g < groups.length - 1) {
                totalW += groups[g + 1].category === groups[g].category ? ingGap : catGap;
            }
        }

        const startX = (HOTPOT.WIDTH - totalW) / 2;
        const rects = [];
        let x = startX;
        for (let g = 0; g < groups.length; g++) {
            const group = groups[g];
            for (let c = 0; c < group.cards.length; c++) {
                rects.push({ x, y: HOTPOT.UI.HAND_Y, w: HOTPOT.UI.CARD_WIDTH, h: HOTPOT.UI.CARD_HEIGHT });
                x += step;
            }
            x -= HOTPOT.UI.CARD_SPACING;
            if (g < groups.length - 1) {
                x += groups[g + 1].category === group.category ? ingGap : catGap;
            }
        }
        return rects;
    }

    getDrawnCardRect() {
        return { x: HOTPOT.WIDTH / 2 + 200, y: HOTPOT.UI.DRAWN_Y, w: HOTPOT.UI.CARD_WIDTH, h: HOTPOT.UI.CARD_HEIGHT };
    }

    getHandCardRectsForPlayer(player) {
        return this.getHandCardRects(player);
    }

    getDrawnCardRectForPlayerObj(player) {
        return this.getDrawnCardRectForPlayer(player);
    }
}
