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

    createDeck(deckRect) {
        this.deck = [];
        for (const [catName, catData] of Object.entries(HOTPOT.CATEGORIES)) {
            for (const ingredient of Object.keys(catData.ingredients)) {
                for (let copy = 0; copy < HOTPOT.GAME.COPIES_PER_INGREDIENT; copy++) {
                    const card = new Card(catName, ingredient, null, HOTPOT.LAYOUT.CARD_SCALE);
                    card.x = deckRect.x;
                    card.y = deckRect.y;
                    card.targetX = deckRect.x;
                    card.targetY = deckRect.y;
                    this.deck.push(card);
                }
            }
        }
        this.shuffleDeck();
    }

    shuffleDeck(arr) {
        const deck = arr || this.deck;
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
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
                    const card = this.deck.pop();
                    card.moveTo(HOTPOT.WIDTH / 2, HOTPOT.HEIGHT / 2);
                    player.hand.push(card);
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
        if (this.deck.length === 0) {
            this.refillDeckFromDiscards();
        }
        if (this.deck.length === 0) return null;
        const card = this.deck.pop();
        card.faceUp = false;
        player.drawnCard = card;
        player.hasDrawn = true;
        player.drawSourcePlayer = -1;
        return card;
    }

    refillDeckFromDiscards() {
        const reshuffle = [];
        for (const p of this.players) {
            if (p.discardPile.length <= 1) continue;
            reshuffle.push(...p.discardPile.splice(0, p.discardPile.length - 1));
        }
        this.shuffleDeck(reshuffle);
        this.deck = reshuffle;
    }

    drawFromDiscard(player, sourcePlayer) {
        if (sourcePlayer.discardPile.length === 0) return null;
        const card = sourcePlayer.discardPile.pop();
        player.drawnCard = card;
        player.hasDrawn = true;
        player.drawSourcePlayer = sourcePlayer.id;
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
            player.drawSourcePlayer = undefined;
            removed = true;
        }
        if (removed) {
            if (player.isRemote || !player.isHuman) {
                card.faceUp = false;
                card.flip();
            } else {
                card.faceUp = true;
            }
            card.scaleTo(0.75);
            const currentMod = ((card.rotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
            const toZero = (2 * Math.PI) - currentMod;
            const extraSpins = Math.PI * 2 * (1 + Math.floor(Math.random() * 1.5));
              card.rotateTo(card.rotation + toZero + extraSpins);
            if (player.discardPile.length >= 1) {
                const covered = player.discardPile[player.discardPile.length - 1];
                covered.flip();
            }
            player.discardPile.push(card);
            player.lastDiscard = { category: card.category, ingredient: card.ingredient, source: handIdx >= 0 ? 'hand' : 'drawnCard', handIndex: handIdx >= 0 ? handIdx : -1 };
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
