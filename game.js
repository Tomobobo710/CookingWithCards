/**
 * HOTPOT - Based on the Hotpot Minigame from Palia
 * 96 cards, 8 categories, 3 ingredients per category, 4 copies each
 * Build 3 sets (Three-of-a-Kind or Category Set) to win
 * ActionEngineJS implementation
 */

const HOTPOT = {
    WIDTH: 800,
    HEIGHT: 600,

    CATEGORIES: {
        'Noodles':  { color: '#D4B896', icon: '🍜', ingredients: ['Rice Noodles', 'Wheat Noodles', 'Glass Noodles'] },
        'Fish':     { color: '#5B9BD5', icon: '🐟', ingredients: ['Salmon', 'Tuna', 'Bass'] },
        'Greens':   { color: '#70AD47', icon: '🥬', ingredients: ['Spinach', 'Kale', 'Bok Choy'] },
        'Spices':   { color: '#ED7D31', icon: '🌶️', ingredients: ['Chili', 'Star Anise', 'Cinnamon'] },
        'Veggies':  { color: '#FFC000', icon: '🥕', ingredients: ['Carrot', 'Potato', 'Corn'] },
        'Meat':     { color: '#C00000', icon: '🥩', ingredients: ['Beef', 'Pork', 'Chicken'] },
        'Mushrooms':{ color: '#9B59B6', icon: '🍄', ingredients: ['Shiitake', 'Enoki', 'Morel'] },
        'Carbs':    { color: '#A0A0A0', icon: '🍚', ingredients: ['Rice Cake', 'Tofu', 'Dumpling'] }
    },

    getCategories() { return Object.keys(HOTPOT.CATEGORIES); },

    GAME: {
        INITIAL_HAND: 8,
        SETS_TO_WIN: 3,
        COPIES_PER_INGREDIENT: 4,
        TOTAL_CARDS: 96
    },

    COLORS: {
        BACKGROUND: '#1a0f0a',
        UI_BG: 'rgba(40, 20, 10, 0.9)',
        UI_BORDER: '#8b4513',
        TEXT: '#f5deb3',
        HIGHLIGHT: '#ffd700',
        SET_COMPLETED: '#90ee90',
        CARD_BG: '#fff8dc',
        PLAYER_PANEL: 'rgba(60, 30, 15, 0.8)',
        WIN_BUTTON: '#2e7d32',
        WIN_BUTTON_HOVER: '#388e3c',
        DEBUG_BG: 'rgba(0,0,0,0.7)',
        DEBUG_TEXT: '#00ff00'
    },

    CARD_SCALE: 0.75,

    UI: {
        get CARD_WIDTH() { return 80 * HOTPOT.CARD_SCALE; },
        get CARD_HEIGHT() { return 115 * HOTPOT.CARD_SCALE; },
        CARD_SPACING: 6,
        HAND_Y: 475,
        DRAWN_Y: 338,
        CENTER_Y: 220,
        PANEL_WIDTH: 170,
        PANEL_HEIGHT: 110
    }
};

// ---------- Player ----------
class PlayerEntity {
    constructor(id, name, isHuman) {
        this.id = id;
        this.name = name;
        this.isHuman = isHuman;
        this.hand = [];
        this.sets = [];
        this.discardPile = [];
        this.won = false;
        this.hasDrawn = false;
        this.drawnCard = null;
        this.score = 0;
    }

    getAllCards() {
        return this.drawnCard ? [...this.hand, this.drawnCard] : [...this.hand];
    }
}

// ---------- Game State ----------
class GameState {
    constructor() {
        this.deck = [];
        this.players = [];
        this.currentPlayerIndex = 0;
        this.gamePhase = 'start';
        this.roundNumber = 1;
        this.message = '';
        this.messageTimer = 0;
    }

    reset() {
        this.deck = [];
        this.players = [];
        this.currentPlayerIndex = 0;
        this.gamePhase = 'start';
        this.roundNumber = 1;
        this.message = '';
        this.messageTimer = 0;
    }

    createDeck() {
        this.deck = [];
        for (const [catName, catData] of Object.entries(HOTPOT.CATEGORIES)) {
            for (const ingredient of catData.ingredients) {
                for (let copy = 0; copy < HOTPOT.GAME.COPIES_PER_INGREDIENT; copy++) {
                    this.deck.push(new Card(catName, ingredient, null, HOTPOT.CARD_SCALE));
                }
            }
        }
        this.shuffleDeck();
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    dealInitialHands() {
        for (const player of this.players) {
            player.hand = [];
            player.drawnCard = null;
            player.hasDrawn = false;
            player.won = false;
            player.sets = [];
            player.discardPile = [];
            for (let i = 0; i < HOTPOT.GAME.INITIAL_HAND; i++) {
                if (this.deck.length > 0) {
                    player.hand.push(this.deck.pop());
                }
            }
        }
    }

    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    getNextPlayerIndex() {
        return (this.currentPlayerIndex + 1) % this.players.length;
    }

    drawFromDeck(player) {
        if (this.deck.length === 0) return null;
        const card = this.deck.pop();
        player.drawnCard = card;
        player.hasDrawn = true;
        return card;
    }

    drawFromDiscard(player, sourcePlayer) {
        if (sourcePlayer.discardPile.length === 0) return null;
        const card = sourcePlayer.discardPile.pop();
        player.drawnCard = card;
        player.hasDrawn = true;
        return card;
    }

    discardCard(player, card) {
        let removed = false;
        const handIdx = player.hand.indexOf(card);
        if (handIdx !== -1) {
            player.hand.splice(handIdx, 1);
            removed = true;
        } else if (player.drawnCard === card) {
            player.drawnCard = null;
            removed = true;
        }
        if (removed) {
            card.faceUp = true;
            card.scaleTo(0.75);
            // Spin and end at 0° (readable on discard pile)
            const currentMod = ((card.rotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
            const toZero = (2 * Math.PI) - currentMod;
            const extraSpins = Math.PI * 2 * (1 + Math.floor(Math.random() * 1.5));
            card.rotateTo(card.rotation + toZero + extraSpins);
            player.discardPile.push(card);
        }
        return removed;
    }

    findAllPossibleSets(cards) {
        const allSets = [];
        for (let i = 0; i < cards.length; i++) {
            for (let j = i + 1; j < cards.length; j++) {
                for (let k = j + 1; k < cards.length; k++) {
                    const a = cards[i], b = cards[j], c = cards[k];
                    if (a.category === b.category && b.category === c.category) {
                        if (a.ingredient === b.ingredient && b.ingredient === c.ingredient) {
                            allSets.push([a, b, c]);
                        } else if (a.ingredient !== b.ingredient && b.ingredient !== c.ingredient && a.ingredient !== c.ingredient) {
                            allSets.push([a, b, c]);
                        }
                    }
                }
            }
        }
        return allSets;
    }

    findBestSets(cards, needed) {
        const allSets = this.findAllPossibleSets(cards);
        if (allSets.length === 0) return [];

        let best = [];
        const used = new Set();

        function backtrack(start, found) {
            if (found.length > best.length) {
                best = [...found];
            }
            if (best.length >= needed) return true;
            for (let si = start; si < allSets.length; si++) {
                const setCards = allSets[si];
                if (setCards.some(c => used.has(c))) continue;
                for (const c of setCards) used.add(c);
                found.push(setCards);
                if (backtrack(si + 1, found)) return true;
                found.pop();
                for (const c of setCards) used.delete(c);
            }
            return false;
        }

        backtrack(0, []);
        return best;
    }

    canWin(player) {
        const cards = player.getAllCards();
        if (cards.length < HOTPOT.GAME.SETS_TO_WIN * 3) return false;
        return this.findBestSets(cards, HOTPOT.GAME.SETS_TO_WIN).length >= HOTPOT.GAME.SETS_TO_WIN;
    }

    scoreSets(sets) {
        let points = 0;
        for (const set of sets) {
            const a = set[0], b = set[1], c = set[2];
            if (a.ingredient === b.ingredient && b.ingredient === c.ingredient) {
                points += 120;
            } else {
                points += 60;
            }
        }
        return points;
    }
}

// ---------- Game ----------
class Game {
    constructor(canvases, input, audio) {
        this.input = input;
        this.audio = audio;

        this.gameCanvas = canvases.gameCanvas;
        this.gameCtx = this.gameCanvas.getContext('2d');
        this.guiCanvas = canvases.guiCanvas;
        this.guiCtx = canvases.guiCtx;
        this.debugCanvas = canvases.debugCanvas;
        this.debugCtx = canvases.debugCtx;

        this.state = new GameState();
        this.gameState = 'menu';
        this.turnPhase = 'draw';
        this.turnTimer = 0;
        this.bestSets = [];
        this._botRevealed = false;

        this.setupPlayers();
        this.setupUI();
        this.setupAudio();

        this.animationTime = 0;
        this.lastTime = performance.now();
    }

    setupPlayers() {
        this.state.players = [
            new PlayerEntity(0, 'You', true),
            new PlayerEntity(1, 'Bot 1', false),
            new PlayerEntity(2, 'Bot 2', false),
            new PlayerEntity(3, 'Bot 3', false)
        ];
    }

    setupUI() {
        this.menuButton = { id: 'menu_button', x: 300, y: 300, width: 200, height: 60, hovered: false };
        this.input.registerElement('menu_button', {
            bounds: () => ({ x: this.menuButton.x, y: this.menuButton.y, width: this.menuButton.width, height: this.menuButton.height })
        });

        this.restartButton = { id: 'restart_button', x: 300, y: 370, width: 200, height: 60, hovered: false };
        this.input.registerElement('restart_button', {
            bounds: () => ({ x: this.restartButton.x, y: this.restartButton.y, width: this.restartButton.width, height: this.restartButton.height })
        });

        this.eatButton = { id: 'eat_button', x: 300, y: 300, width: 200, height: 50, hovered: false };
        this.input.registerElement('eat_button', {
            bounds: () => ({ x: this.eatButton.x, y: this.eatButton.y, width: this.eatButton.width, height: this.eatButton.height })
        });
    }

    setupAudio() {
        this.audio.createSweepSound('draw', { startFreq: 200, endFreq: 400, type: 'sine', duration: 0.2, envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.09 } });
        this.audio.createSweepSound('discard', { startFreq: 300, endFreq: 150, type: 'triangle', duration: 0.15, envelope: { attack: 0.01, decay: 0.09, sustain: 0, release: 0.05 } });
        this.audio.createComplexSound('set_complete', { frequencies: [440, 554, 659], types: ['sine', 'triangle', 'sine'], mix: [0.4, 0.3, 0.3], duration: 0.5, envelope: { attack: 0.02, decay: 0.2, sustain: 0.3, release: 0.28 } });
        this.audio.createComplexSound('win', { frequencies: [523, 659, 784, 1047], types: ['sine', 'sine', 'sine', 'sine'], mix: [0.3, 0.3, 0.2, 0.2], duration: 1.0, envelope: { attack: 0.1, decay: 0.3, sustain: 0.4, release: 0.6 } });
    }

    startGame() {
        this.state.reset();
        this.setupPlayers();
        this.state.createDeck();
        this.state.dealInitialHands();
        this.state.gamePhase = 'playing';
        this.gameState = 'playing';
        this.turnPhase = 'draw';
        this.turnTimer = 0;

        this.sortHandByCategory(this.state.players[0]);
        this.state.players[0].hasDrawn = false;
        this.state.players[0].drawnCard = null;
        this.bestSets = [];
        this._botRevealed = false;

        // Set bot hand rotations
        for (let i = 1; i < this.state.players.length; i++) {
            const ha = i === 1 ? Math.PI / 2 : (i === 2 ? Math.PI : -Math.PI / 2);
            for (const card of this.state.players[i].hand) {
                card.rotation = ha;
                card.targetRotation = ha;
            }
        }
    }

    // ---------- Update Loop ----------
    action_update() {
        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 1000, 0.25);
        this.lastTime = now;
        this.animationTime += dt;

        this.updateCards();
        this.handleInput();

        if (this.gameState === 'playing') {
            this.updateGameLogic(dt);
        }

        // Game over — reveal all bot hands with a flip
        if (this.gameState === 'gameOver' && !this._botRevealed) {
            this._botRevealed = true;
            for (const p of this.state.players) {
                if (p.isHuman) continue;
                for (const card of p.hand) {
                    card.faceUp = false;
                    card.flip();
                }
            }
        }

        if (this.state.messageTimer > 0) {
            this.state.messageTimer -= dt;
        }
    }

    updateCards() {
        for (const player of this.state.players) {
            for (const card of player.hand) {
                if (card.update) card.update();
            }
            if (player.drawnCard && player.drawnCard.update) {
                player.drawnCard.update();
            }
            for (const set of player.sets) {
                for (const card of set) {
                    if (card.update) card.update();
                }
            }
            for (const card of player.discardPile) {
                if (card.update) card.update();
            }
        }
        for (const card of this.state.deck) {
            if (card.update) card.update();
        }
    }

    // ---------- Input ----------
    handleInput() {
        if (this.gameState === 'menu') {
            this.menuButton.hovered = this.input.isElementHovered('menu_button');
            if (this.input.isElementJustPressed('menu_button')) {
                this.startGame();
            }
            return;
        }

        if (this.gameState === 'gameOver') {
            this.restartButton.hovered = this.input.isElementHovered('restart_button');
            if (this.input.isElementJustPressed('restart_button')) {
                this.startGame();
            }
            return;
        }

        if (this.gameState === 'playing') {
            const player = this.state.getCurrentPlayer();
            if (player.isHuman) {
                if (this.turnPhase === 'draw') {
                    this.handleHumanDraw();
                } else if (this.turnPhase === 'discard') {
                    this.handleHumanDiscard(player);
                }
            }
        }
    }

    handleHumanDraw() {
        if (!this.input.isLeftMouseButtonJustPressed()) return;

        const player = this.state.players[0];
        const pointer = this.input.getPointerPosition();

        const deckRect = this.getDeckRect();
        if (this.pointInRect(pointer, deckRect) && this.state.deck.length > 0) {
            const card = this.state.deck[this.state.deck.length - 1];
            card.moveTo(deckRect.x, deckRect.y, true);
            card.faceUp = false;
            this.state.drawFromDeck(player);
            card.flip();
            this.audio.play('draw', { volume: 0.3 });
            this.afterHumanDraw(player);
            return;
        }

        for (let i = 1; i < this.state.players.length; i++) {
            const other = this.state.players[i];
            if (other.discardPile.length === 0) continue;
            const rect = this.getDiscardRect(i);
            if (this.pointInRect(pointer, rect)) {
                const card = other.discardPile[other.discardPile.length - 1];
                card.moveTo(rect.x, rect.y, true);
                this.state.drawFromDiscard(player, other);
                this.audio.play('draw', { volume: 0.3 });
                this.afterHumanDraw(player);
                return;
            }
        }
    }

    afterHumanDraw(player) {
        this.turnPhase = 'discard';
        this.bestSets = this.state.findBestSets(player.getAllCards(), HOTPOT.GAME.SETS_TO_WIN);

        // Clear previous highlights
        for (const c of player.getAllCards()) c.highlighted = null;
        // Set new highlights
        for (const set of this.bestSets) {
            const type = set[0].ingredient === set[1].ingredient ? 'triple' : 'category';
            for (const c of set) c.highlighted = type;
        }

        if (this.state.canWin(player)) {
            this.state.message = 'You can win! Click "Let\'s Eat!" to end the game!';
            this.state.messageTimer = 5;
        }
    }

    handleHumanDiscard(player) {
        if (!this.input.isLeftMouseButtonJustPressed()) return;

        const pointer = this.input.getPointerPosition();

        if (this.state.canWin(player)) {
            this.eatButton.hovered = this.input.isElementHovered('eat_button');
            if (this.input.isElementJustPressed('eat_button')) {
                this.humanWin(player);
                return;
            }
        }

        const handCards = this.getHandCardRects(0);

        for (let i = 0; i < player.hand.length; i++) {
            if (this.pointInRect(pointer, handCards[i])) {
                this.state.discardCard(player, player.hand[i]);
                this.audio.play('discard', { volume: 0.3 });
                this.endTurn();
                return;
            }
        }

        if (player.drawnCard) {
            const drawnRect = this.getDrawnCardRect();
            if (this.pointInRect(pointer, drawnRect)) {
                this.state.discardCard(player, player.drawnCard);
                this.audio.play('discard', { volume: 0.3 });
                this.endTurn();
            }
        }
    }

    humanWin(player) {
        const cards = player.getAllCards();
        this.state.gamePhase = 'gameOver';
        this.gameState = 'gameOver';
        player.won = true;
        this.state.message = `${player.name} wins!`;
        this.audio.play('win', { volume: 0.7 });
    }

    // ---------- Bot Logic ----------
    updateGameLogic(dt) {
        if (this.state.gamePhase === 'gameOver') {
            if (this.gameState !== 'gameOver') {
                this.gameState = 'gameOver';
                this.audio.play('win', { volume: 0.7 });
            }
            return;
        }

        const player = this.state.getCurrentPlayer();
        if (!player.isHuman) {
            this.updateBotTurn(player);
        }
    }

    updateBotTurn(player) {
        if (!player.botStarted) {
            player.botStarted = true;
            player.botTimer = 0;
        }

        player.botTimer += 1;
        if (player.botTimer < 60) return;

        // — Draw phase —
        const canSteal = [];
        for (let i = 0; i < this.state.players.length; i++) {
            const p = this.state.players[i];
            if (p === player) continue;
            if (p.discardPile.length > 0) {
                canSteal.push(p);
            }
        }

        if (this.state.deck.length > 0 && canSteal.length > 0 && Math.random() < 0.25) {
            const target = canSteal[Math.floor(Math.random() * canSteal.length)];
            this.state.drawFromDiscard(player, target);
        } else if (this.state.deck.length > 0) {
            this.state.drawFromDeck(player);
        } else if (canSteal.length > 0) {
            const target = canSteal[Math.floor(Math.random() * canSteal.length)];
            this.state.drawFromDiscard(player, target);
        } else {
            this.endTurn();
            return;
        }

        this.audio.play('draw', { volume: 0.2 });

        // — Check win —
        if (this.state.canWin(player)) {
            this.state.gamePhase = 'gameOver';
            this.gameState = 'gameOver';
            player.won = true;
            this.state.message = `${player.name} wins!`;
            this.audio.play('win', { volume: 0.7 });
            player.botStarted = false;
            return;
        }

        // — Discard phase: find worst card among hand+drawn —
        const allCards = player.getAllCards();
        const categoryCounts = {};
        for (const c of allCards) {
            categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
        }

        let worstCard = allCards[0];
        let worstScore = Infinity;
        for (const c of allCards) {
            const count = categoryCounts[c.category] || 0;
            if (count < worstScore) {
                worstScore = count;
                worstCard = c;
            }
        }

        this.state.discardCard(player, worstCard);
        this.audio.play('discard', { volume: 0.2 });
        this.endTurn();
        player.botStarted = false;
    }

    // ---------- End Turn ----------
    endTurn() {
        const actingPlayer = this.state.getCurrentPlayer();
        actingPlayer.hasDrawn = false;

        if (actingPlayer.drawnCard) {
            if (!actingPlayer.isHuman) {
                const botIdx = this.state.players.indexOf(actingPlayer);
                const ha = botIdx === 1 ? Math.PI / 2 : (botIdx === 2 ? Math.PI : -Math.PI / 2);
                actingPlayer.drawnCard.rotation = ha;
                actingPlayer.drawnCard.rotateTo(ha + Math.PI * 2 * 3); // 3 full spins → ends at ha
                actingPlayer.drawnCard.scaleTo(0.375);
            }
            actingPlayer.hand.push(actingPlayer.drawnCard);
        }
        actingPlayer.drawnCard = null;

        if (actingPlayer.isHuman) {
            this.sortHandByCategory(actingPlayer);
        }

        this.state.currentPlayerIndex = this.state.getNextPlayerIndex();

        if (actingPlayer.won) {
            this.gameState = 'gameOver';
            this.audio.play('win', { volume: 0.7 });
            return;
        }

        const nextPlayer = this.state.getCurrentPlayer();
        nextPlayer.hasDrawn = false;
        nextPlayer.drawnCard = null;

        if (!nextPlayer.isHuman) {
            nextPlayer.botStarted = false;
        }

        this.turnPhase = 'draw';
        this.bestSets = [];
        // Clear highlights from all cards
        for (const p of this.state.players) {
            for (const c of p.hand) c.highlighted = null;
            if (p.drawnCard) p.drawnCard.highlighted = null;
        }
    }

    // ---------- Hit Testing ----------
    sortHandByCategory(player) {
        const categoryOrder = Object.keys(HOTPOT.CATEGORIES);
        const ingredientOrder = {};
        for (const [cat, data] of Object.entries(HOTPOT.CATEGORIES)) {
            ingredientOrder[cat] = data.ingredients;
        }
        player.hand.sort((a, b) => {
            const catDiff = categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
            if (catDiff !== 0) return catDiff;
            return ingredientOrder[a.category].indexOf(a.ingredient) - ingredientOrder[b.category].indexOf(b.ingredient);
        });
    }

    pointInRect(p, r) {
        return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
    }

    getDeckRect() {
        const cx = HOTPOT.WIDTH / 2;
        const cy = HOTPOT.HEIGHT / 2;
        return { x: cx - HOTPOT.UI.CARD_WIDTH / 2, y: cy - HOTPOT.UI.CARD_HEIGHT / 2, w: HOTPOT.UI.CARD_WIDTH, h: HOTPOT.UI.CARD_HEIGHT };
    }

    getDiscardRect(playerIndex) {
        // Equidistant NESW around screen center, 120px from center
        const cx = HOTPOT.WIDTH / 2;
        const cy = HOTPOT.HEIGHT / 2;
        const dist = 120;
        const hw = HOTPOT.UI.CARD_WIDTH / 2;
        const hh = HOTPOT.UI.CARD_HEIGHT / 2;
        const positions = [
            { x: cx - hw, y: cy + dist - hh },  // South — human
            { x: cx - dist - hw, y: cy - hh },   // West  — bot 1
            { x: cx - hw, y: cy - dist - hh },   // North — bot 2
            { x: cx + dist - hw, y: cy - hh }    // East  — bot 3
        ];
        const pos = positions[playerIndex];
        return { x: pos.x, y: pos.y, w: HOTPOT.UI.CARD_WIDTH, h: HOTPOT.UI.CARD_HEIGHT };
    }

    getHandCardRects(playerIndex) {
        const player = this.state.players[playerIndex];
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
        return { x: HOTPOT.WIDTH / 2 + 35, y: HOTPOT.UI.DRAWN_Y, w: HOTPOT.UI.CARD_WIDTH, h: HOTPOT.UI.CARD_HEIGHT };
    }

    // ---------- Draw ----------
    action_draw() {
        this.drawGameLayer();
        this.drawGUILayer();
        this.drawDebugLayer();
    }

    drawGameLayer() {
        this.gameCtx.fillStyle = HOTPOT.COLORS.BACKGROUND;
        this.gameCtx.fillRect(0, 0, HOTPOT.WIDTH, HOTPOT.HEIGHT);

        if (this.gameState === 'menu') {
            this.drawMenuScreen();
        } else if (this.gameState === 'playing' || this.gameState === 'gameOver') {
            this.drawGameTable();
        }
    }

    drawMenuScreen() {
        this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
        this.gameCtx.font = 'bold 48px Arial';
        this.gameCtx.textAlign = 'center';
        this.gameCtx.fillText('HOTPOT', HOTPOT.WIDTH / 2, 180);

        this.gameCtx.font = '20px Arial';
        this.gameCtx.fillStyle = '#cccccc';
        this.gameCtx.fillText('A Palia-style Set Building Card Game', HOTPOT.WIDTH / 2, 220);

        const btn = this.menuButton;
        this.gameCtx.fillStyle = btn.hovered ? HOTPOT.COLORS.HIGHLIGHT : HOTPOT.COLORS.UI_BG;
        this.gameCtx.fillRect(btn.x, btn.y, btn.width, btn.height);
        this.gameCtx.strokeStyle = HOTPOT.COLORS.UI_BORDER;
        this.gameCtx.lineWidth = 3;
        this.gameCtx.strokeRect(btn.x, btn.y, btn.width, btn.height);
        this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
        this.gameCtx.font = 'bold 24px Arial';
        this.gameCtx.fillText('START GAME', btn.x + btn.width / 2, btn.y + btn.height / 2 + 8);

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
        lines.forEach((l, i) => this.gameCtx.fillText(l, HOTPOT.WIDTH / 2, 390 + i * 22));
    }

    drawGameTable() {
        const currentPlayer = this.state.getCurrentPlayer();

        this.drawDeck();
        this.drawDiscardPiles();

        for (let i = 0; i < this.state.players.length; i++) {
            const p = this.state.players[i];
            if (p.isHuman) {
                this.drawHumanHand(p);
            } else {
                this.drawBotHand(p, i);
            }
        }

        if (this.gameState === 'gameOver') {
            this.drawGameOver();
        } else {
            this.drawTurnInfo(currentPlayer);
            if (currentPlayer && currentPlayer.isHuman) {
                this.drawHumanPrompt(currentPlayer);
            }
        }

        if (this.state.messageTimer > 0) {
            this.drawMessage();
        }
    }

    drawDeck() {
        const rect = this.getDeckRect();
        const player = this.state.getCurrentPlayer();
        const isClickable = player && player.isHuman && this.turnPhase === 'draw' && this.state.deck.length > 0;

        this.gameCtx.fillStyle = isClickable ? '#a00000' : HOTPOT.COLORS.DECK;
        this.gameCtx.fillRect(rect.x, rect.y, rect.w, rect.h);
        this.gameCtx.strokeStyle = HOTPOT.COLORS.UI_BORDER;
        this.gameCtx.lineWidth = 2;
        this.gameCtx.strokeRect(rect.x, rect.y, rect.w, rect.h);

        this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
        this.gameCtx.font = '26px Arial';
        this.gameCtx.textAlign = 'center';
        this.gameCtx.fillText('🀄', rect.x + rect.w / 2, rect.y + rect.h / 2 + 8);

        this.gameCtx.font = '13px Arial';
        this.gameCtx.fillText(`Deck: ${this.state.deck.length}`, rect.x + rect.w / 2, rect.y + rect.h + 18);

        if (isClickable && this.state.deck.length > 0) {
            this.gameCtx.fillStyle = '#ff6666';
            this.gameCtx.font = '11px Arial';
            this.gameCtx.fillText('← click to draw', rect.x + rect.w / 2, rect.y + rect.h + 35);
        }
    }

    drawDiscardPiles() {
        const player = this.state.getCurrentPlayer();
        const isClickable = player && player.isHuman && this.turnPhase === 'draw';

        for (let i = 0; i < this.state.players.length; i++) {
            const p = this.state.players[i];
            const rect = this.getDiscardRect(i);
            const canClick = isClickable && i !== player.id && p.discardPile.length > 0;

            if (p.discardPile.length > 0) {
                const topCard = p.discardPile[p.discardPile.length - 1];
                topCard.moveTo(rect.x, rect.y);
                topCard.draw(this.gameCtx);

                if (canClick) {
                    this.gameCtx.strokeStyle = HOTPOT.COLORS.HIGHLIGHT;
                    this.gameCtx.lineWidth = 4;
                    this.gameCtx.strokeRect(rect.x, rect.y, rect.w, rect.h);
                }
            } else {
                this.gameCtx.fillStyle = 'rgba(80,40,20,0.6)';
                this.gameCtx.fillRect(rect.x, rect.y, rect.w, rect.h);
                this.gameCtx.strokeStyle = '#555';
                this.gameCtx.lineWidth = 2;
                this.gameCtx.strokeRect(rect.x, rect.y, rect.w, rect.h);
            }

            this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
            this.gameCtx.font = '11px Arial';
            this.gameCtx.textAlign = 'center';
            this.gameCtx.fillText(p.name, rect.x + rect.w / 2, rect.y - 6);
            this.gameCtx.fillText(`${p.discardPile.length} discarded`, rect.x + rect.w / 2, rect.y + rect.h + 15);

            if (canClick) {
                this.gameCtx.fillStyle = '#ffcc00';
                this.gameCtx.font = '10px Arial';
                this.gameCtx.fillText('← click to steal', rect.x + rect.w / 2, rect.y + rect.h + 30);
            }
        }
    }

    drawHumanHand(player) {
        const handRects = this.getHandCardRects(0);

        for (let i = 0; i < player.hand.length; i++) {
            const card = player.hand[i];
            const rect = handRects[i];
            card.moveTo(rect.x, rect.y);
            card.draw(this.gameCtx);
        }

        // Draw category group labels
        if (handRects.length > 0) {
            let catStart = 0;
            let curCat = player.hand[0].category;
            for (let i = 1; i <= player.hand.length; i++) {
                const card = i < player.hand.length ? player.hand[i] : null;
                if (!card || card.category !== curCat) {
                    const sx = handRects[catStart].x;
                    const ex = handRects[i - 1].x + HOTPOT.UI.CARD_WIDTH;
                    this.gameCtx.fillStyle = HOTPOT.CATEGORIES[curCat].color;
                    this.gameCtx.font = 'bold 9px Arial';
                    this.gameCtx.textAlign = 'center';
                    this.gameCtx.textBaseline = 'bottom';
                    this.gameCtx.fillText(HOTPOT.CATEGORIES[curCat].icon + ' ' + curCat, (sx + ex) / 2, HOTPOT.UI.HAND_Y - 4);
                    if (i < player.hand.length) { catStart = i; curCat = card.category; }
                }
            }
            this.gameCtx.textBaseline = 'alphabetic';
        }

        if (player.drawnCard) {
            const drawnRect = this.getDrawnCardRect();
            const card = player.drawnCard;
            card.moveTo(drawnRect.x, drawnRect.y);
            card.draw(this.gameCtx);

            this.gameCtx.fillStyle = '#fff';
            this.gameCtx.font = 'bold 12px Arial';
            this.gameCtx.textAlign = 'center';
            this.gameCtx.fillText('DRAWN', drawnRect.x + drawnRect.w / 2, drawnRect.y - 8);
        }

        this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
        this.gameCtx.font = 'bold 14px Arial';
        this.gameCtx.textAlign = 'left';
        this.gameCtx.fillText(`${player.name} — Hand: ${player.hand.length}`, 10, HOTPOT.UI.HAND_Y - 20);

        if (this.bestSets.length > 0) {
            this.gameCtx.fillStyle = '#90ee90';
            this.gameCtx.font = '12px Arial';
            const tripleCount = this.bestSets.filter(s => s[0].ingredient === s[1].ingredient).length;
            const catCount = this.bestSets.filter(s => s[0].ingredient !== s[1].ingredient).length;
            this.gameCtx.textAlign = 'right';
            this.gameCtx.fillText(`Found: ${tripleCount} triple(s), ${catCount} category set(s)`, HOTPOT.WIDTH - 10, HOTPOT.UI.HAND_Y - 20);
        }

        if (player.sets.length > 0) {
            this.gameCtx.fillStyle = '#90ee90';
            this.gameCtx.font = '12px Arial';
            this.gameCtx.textAlign = 'left';
            this.gameCtx.fillText(`Locked sets: ${player.sets.length}`, 10, HOTPOT.UI.HAND_Y - 6);
        }
    }

    drawBotHand(player, index) {
        const cards = player.hand;
        if (cards.length === 0) return;

        const cardScale = 0.375;
        const spacing = 4;
        const fw = 80 * cardScale;
        const fh = 115 * cardScale;

        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            card.scaleTo(cardScale);
            if (this.gameState !== 'gameOver') card.faceUp = false;

            // Set hand angle (starting hand cards); spinning cards keep their animation
            const handAngle = index === 1 ? Math.PI / 2 : (index === 2 ? Math.PI : -Math.PI / 2);
            if (Math.abs(card.rotation - card.targetRotation) < 0.5) {
                card.rotateTo(handAngle);
            }

            let cx, cy;

            if (index === 1) {          // Left — vertical, 90°
                const totalH = cards.length * fh + (cards.length - 1) * spacing;
                const startY = (HOTPOT.HEIGHT - totalH) / 2;
                cx = fw / 2 + 12;
                cy = startY + i * (fh + spacing) + fh / 2;
            } else if (index === 2) {   // Top — horizontal, 180°
                const totalW = cards.length * fw + (cards.length - 1) * spacing;
                const startX = (HOTPOT.WIDTH - totalW) / 2;
                cx = startX + i * (fw + spacing) + fw / 2;
                cy = fh / 2 + 10;
            } else {                    // Right — vertical, 270°
                const totalH = cards.length * fh + (cards.length - 1) * spacing;
                const startY = (HOTPOT.HEIGHT - totalH) / 2;
                cx = HOTPOT.WIDTH - fw / 2 - 12;
                cy = startY + i * (fh + spacing) + fh / 2;
            }

            card.moveTo(cx - fw / 2, cy - fh / 2);
            card.draw(this.gameCtx);
        }

        // Mini info label at each bot's edge
        const info = `${player.name}  ${player.sets.length}set(s)  ${cards.length}crds`;
        this.gameCtx.font = '10px Arial';
        this.gameCtx.textBaseline = 'middle';
        if (index === 1) {
            this.gameCtx.fillStyle = 'rgba(0,0,0,0.7)';
            this.gameCtx.fillRect(0, HOTPOT.HEIGHT - 16, 200, 16);
            this.gameCtx.fillStyle = '#fff';
            this.gameCtx.textAlign = 'left';
            this.gameCtx.fillText(info, 4, HOTPOT.HEIGHT - 8);
        } else if (index === 3) {
            this.gameCtx.fillStyle = 'rgba(0,0,0,0.7)';
            this.gameCtx.fillRect(HOTPOT.WIDTH - 200, HOTPOT.HEIGHT - 16, 200, 16);
            this.gameCtx.fillStyle = '#fff';
            this.gameCtx.textAlign = 'right';
            this.gameCtx.fillText(info, HOTPOT.WIDTH - 4, HOTPOT.HEIGHT - 8);
        } else {
            this.gameCtx.fillStyle = 'rgba(0,0,0,0.7)';
            this.gameCtx.fillRect(HOTPOT.WIDTH / 2 - 100, 0, 200, 16);
            this.gameCtx.fillStyle = '#fff';
            this.gameCtx.textAlign = 'center';
            this.gameCtx.fillText(info, HOTPOT.WIDTH / 2, 8);
        }
        const cp = this.state.getCurrentPlayer();
        if (cp === player) {
            this.gameCtx.fillStyle = HOTPOT.COLORS.HIGHLIGHT;
            this.gameCtx.font = 'bold 10px Arial';
            if (index === 2) {
                this.gameCtx.textAlign = 'center';
                this.gameCtx.fillText('● THINKING', HOTPOT.WIDTH / 2, 18);
            } else {
                this.gameCtx.textAlign = index === 1 ? 'left' : 'right';
                this.gameCtx.fillText('● THINKING', index === 1 ? 4 : HOTPOT.WIDTH - 4, HOTPOT.HEIGHT - 20);
            }
        }
        this.gameCtx.textBaseline = 'alphabetic';
    }

    drawTurnInfo(currentPlayer) {
        if (!currentPlayer) return;

        const label = currentPlayer.isHuman ? 'YOUR TURN' : `${currentPlayer.name}'s TURN`;
        this.gameCtx.fillStyle = HOTPOT.COLORS.HIGHLIGHT;
        this.gameCtx.font = 'bold 16px Arial';
        this.gameCtx.textAlign = 'center';
        this.gameCtx.fillText(label, HOTPOT.WIDTH / 2, 305);

        if (currentPlayer.isHuman && this.turnPhase === 'draw') {
            this.gameCtx.fillStyle = '#ffcc66';
            this.gameCtx.font = '13px Arial';
            this.gameCtx.fillText('Click the deck to draw, or click an opponent\'s discard pile to steal', HOTPOT.WIDTH / 2, 322);
        } else if (currentPlayer.isHuman && this.turnPhase === 'discard') {
            this.gameCtx.fillStyle = '#ffcc66';
            this.gameCtx.font = '13px Arial';
            this.gameCtx.fillText('Click any card (hand or drawn) to discard it and end your turn', HOTPOT.WIDTH / 2, 322);
        }

        if (currentPlayer.isHuman && this.turnPhase === 'discard' && this.state.canWin(this.state.players[0])) {
            this.eatButton.hovered = this.input.isElementHovered('eat_button');
            const btn = this.eatButton;
            this.gameCtx.fillStyle = btn.hovered ? '#43a047' : '#2e7d32';
            this.gameCtx.fillRect(btn.x, btn.y, btn.width, btn.height);
            this.gameCtx.strokeStyle = '#fff';
            this.gameCtx.lineWidth = 3;
            this.gameCtx.strokeRect(btn.x, btn.y, btn.width, btn.height);
            this.gameCtx.fillStyle = '#fff';
            this.gameCtx.font = 'bold 22px Arial';
            this.gameCtx.textAlign = 'center';
            this.gameCtx.fillText('🍜 LET\'S EAT! 🍜', btn.x + btn.width / 2, btn.y + btn.height / 2 + 8);
        }
    }

    drawHumanPrompt(player) {
        // No extra prompt needed; drawTurnInfo handles it
    }

    drawGameOver() {
        this.gameCtx.fillStyle = 'rgba(0,0,0,0.75)';
        this.gameCtx.fillRect(0, 0, HOTPOT.WIDTH, HOTPOT.HEIGHT);

        const winner = this.state.players.find(p => p.won);

        this.gameCtx.fillStyle = '#ffd700';
        this.gameCtx.font = 'bold 42px Arial';
        this.gameCtx.textAlign = 'center';
        this.gameCtx.fillText(`${winner ? winner.name : 'Nobody'} Wins!`, HOTPOT.WIDTH / 2, 160);

        if (winner) {
            this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
            this.gameCtx.font = 'bold 18px Arial';

            const human = this.state.players[0];
            if (human.sets.length > 0 || human.won) {
                this.gameCtx.fillText(`Your sets: ${human.sets.length}`, HOTPOT.WIDTH / 2, 210);
            }

            let y = 250;
            for (const p of this.state.players) {
                this.gameCtx.font = '16px Arial';
                this.gameCtx.fillStyle = p.won ? '#ffd700' : '#ccc';
                const setInfo = p.sets.length > 0 ? ` (${p.sets.length} sets)` : '';
                this.gameCtx.fillText(`${p.name}: ${p.hand.length} cards${setInfo}`, HOTPOT.WIDTH / 2, y);
                y += 30;
            }
        }

        const btn = this.restartButton;
        this.gameCtx.fillStyle = btn.hovered ? HOTPOT.COLORS.HIGHLIGHT : HOTPOT.COLORS.UI_BG;
        this.gameCtx.fillRect(btn.x, btn.y, btn.width, btn.height);
        this.gameCtx.strokeStyle = HOTPOT.COLORS.UI_BORDER;
        this.gameCtx.lineWidth = 3;
        this.gameCtx.strokeRect(btn.x, btn.y, btn.width, btn.height);
        this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
        this.gameCtx.font = 'bold 20px Arial';
        this.gameCtx.fillText('PLAY AGAIN', btn.x + btn.width / 2, btn.y + btn.height / 2 + 7);
    }

    drawMessage() {
        this.gameCtx.fillStyle = 'rgba(0,0,0,0.8)';
        this.gameCtx.fillRect(150, 260, 500, 50);
        this.gameCtx.strokeStyle = HOTPOT.COLORS.HIGHLIGHT;
        this.gameCtx.lineWidth = 2;
        this.gameCtx.strokeRect(150, 260, 500, 50);
        this.gameCtx.fillStyle = HOTPOT.COLORS.TEXT;
        this.gameCtx.font = 'bold 16px Arial';
        this.gameCtx.textAlign = 'center';
        this.gameCtx.fillText(this.state.message, HOTPOT.WIDTH / 2, 290);
    }

    drawGUILayer() {
        this.guiCtx.clearRect(0, 0, HOTPOT.WIDTH, HOTPOT.HEIGHT);
    }

    drawDebugLayer() {
        this.debugCtx.clearRect(0, 0, HOTPOT.WIDTH, HOTPOT.HEIGHT);
        this.debugCtx.fillStyle = HOTPOT.COLORS.DEBUG_BG;
        this.debugCtx.fillRect(5, 5, 220, 160);
        this.debugCtx.fillStyle = HOTPOT.COLORS.DEBUG_TEXT;
        this.debugCtx.font = '11px monospace';
        this.debugCtx.textAlign = 'left';
        const cp = this.state.getCurrentPlayer();
        const lines = [
            `State: ${this.gameState}`,
            `Phase: ${this.state.gamePhase}`,
            `TurnPhase: ${this.turnPhase}`,
            `Current: ${cp ? cp.name : 'none'}`,
            `Deck: ${this.state.deck.length}`,
            `Round: ${this.state.roundNumber}`,
            `P0 hand: ${this.state.players[0] ? this.state.players[0].hand.length : 0}`,
            `P0 drawn: ${this.state.players[0] && this.state.players[0].drawnCard ? 'yes' : 'no'}`
        ];
        lines.forEach((l, i) => this.debugCtx.fillText(l, 10, 20 + i * 14));
    }
}
