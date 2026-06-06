// game/GameFlow.js
// Lifecycle, turn flow, scoring, audio setup, speed, and player setup for Hotpot.

class HotpotGameFlow {
    constructor(game) {
        this.game = game;
        this.audio = game.audio;
    }

    getSpeedConfig() {
        return HOTPOT.SPEEDS[this.game.currentSpeed] || HOTPOT.SPEEDS[2];
    }

    applySpeedToCard(card) {
        const s = this.getSpeedConfig();
        card.moveSpeed = s.move;
        card.rotateSpeed = s.rotate;
        card.scaleSpeed = s.scale;
        card.flipSpeed = s.flip;
    }

    applySpeedToAllCards() {
        for (const player of this.game.state.players) {
            for (const card of player.hand) {
                this.applySpeedToCard(card);
            }
            if (player.drawnCard) {
                this.applySpeedToCard(player.drawnCard);
            }
        }
    }

    setupPlayers(count) {
        const n = count || 4;
        this.game.state.players = [];
        const positions = HOTPOT.POSITIONS;
        this.game.state.players.push(new NetworkedPlayer(0, 'You', true));
        this.game.state.players[0].playerNumber = 0;
        this.game.state.players[0].tablePosition = positions[0];
        for (let i = 1; i < n; i++) {
            const opponent = new NetworkedPlayer(i, 'Bot ' + i, false, 1 + Math.floor(Math.random() * 3));
            opponent.playerNumber = i;
            opponent.tablePosition = positions[i];
            this.game.state.players.push(opponent);
        }
        this.game.playerCount = n;
    }

    setupAudio() {
        this.audio.createSweepSound('draw', { startFreq: 200, endFreq: 400, type: 'sine', duration: 0.2, envelope: { attack: 0.01, decay: 0.1, sustain: 0, release: 0.09 } });
        this.audio.createSweepSound('discard', { startFreq: 300, endFreq: 150, type: 'triangle', duration: 0.15, envelope: { attack: 0.01, decay: 0.09, sustain: 0, release: 0.05 } });
        this.audio.createComplexSound('set_complete', { frequencies: [440, 554, 659], types: ['sine', 'triangle', 'sine'], mix: [0.4, 0.3, 0.3], duration: 0.5, envelope: { attack: 0.02, decay: 0.2, sustain: 0.3, release: 0.28 } });
        this.audio.createComplexSound('win', { frequencies: [523, 659, 784, 1047], types: ['sine', 'sine', 'sine', 'sine'], mix: [0.3, 0.3, 0.2, 0.2], duration: 1.0, envelope: { attack: 0.1, decay: 0.3, sustain: 0.4, release: 0.6 } });
    }

    startGame(playerCount) {
        const n = playerCount || 4;
        this.game.state.reset();
        this.setupPlayers(n);
        const deckRect = this.game.layout.getDeckRect();
        this.game.state.createDeck(deckRect);
        this.game.state.dealInitialHands();
        this.game.state.gamePhase = 'playing';
        this.game.turnPhase = 'draw';
        this.game.bestSets = [];
        this.game._botRevealed = false;

        for (const card of this.game.state.deck) {
            this.applySpeedToCard(card);
        }

        for (const p of this.game.state.players) {
            this.sortHandByCategory(p);
        }
        this.game.state.players[0].hasDrawn = false;
        this.game.state.players[0].drawnCard = null;

        const humanRects = this.game.layout.getHandCardRects(this.game.state.players[0]);
        for (let i = 0; i < this.game.state.players[0].hand.length; i++) {
            const rect = humanRects[i];
            const card = this.game.state.players[0].hand[i];
            card.moveTo(rect.x, rect.y);
            card.rotation = Math.PI * 2;
            card.targetRotation = 0;
        }

        for (let i = 1; i < this.game.state.players.length; i++) {
            const ha = i === 1 ? Math.PI / 2 : (i === 2 ? Math.PI : -Math.PI / 2);
            for (const card of this.game.state.players[i].hand) {
                this.applySpeedToCard(card);
                card.rotation = ha + Math.PI * 2;
                card.targetRotation = ha;
            }
        }
    }

    startSinglePlayer() {
        this.startGame(4);
        this.game.gameState = 'playing';
    }

    clearGameState() {
        this.game.state.reset();
        this.game.turnPhase = 'draw';
        this.game.bestSets = [];
        this.game._otherPlayersRevealed = false;
        this.game.closeSettingsModal();
        this.game.settingsConfirmOpen = false;
    }

    endTurn() {
        const actingPlayer = this.game.state.getCurrentPlayer();
        actingPlayer.hasDrawn = false;

        actingPlayer.drawnCard = null;

        this.sortHandByCategory(actingPlayer);

        this.game.state.currentPlayerIndex = this.game.state.getNextPlayerIndex();

        if (actingPlayer.won) {
            this.game.gameState = 'gameOver';
            this.audio.play('win', { volume: 0.7 });
            return;
        }

        const nextPlayer = this.game.state.getCurrentPlayer();
        nextPlayer.hasDrawn = false;
        nextPlayer.drawnCard = null;

        if (!nextPlayer.isHuman) {
            nextPlayer.botStarted = false;
        }

        this.game.turnPhase = 'draw';
        this.game.bestSets = [];
        for (const p of this.game.state.players) {
            for (const c of p.hand) c.highlighted = null;
            if (p.drawnCard) p.drawnCard.highlighted = null;
        }
    }

    sortHandByCategory(player) {
        const categoryOrder = Object.keys(HOTPOT.CATEGORIES);
        const ingredientOrder = {};
        for (const [cat, data] of Object.entries(HOTPOT.CATEGORIES)) {
            ingredientOrder[cat] = Object.keys(data.ingredients);
        }
        player.hand.sort((a, b) => {
            const catDiff = categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
            if (catDiff !== 0) return catDiff;
            return ingredientOrder[a.category].indexOf(a.ingredient) - ingredientOrder[b.category].indexOf(b.ingredient);
        });
    }

    handleWin(player) {
        const cards = player.getAllCards();
        player.won = true;
        let isMyPlayer = false;
        if (this.game.networkSession && this.game.networkSession.localPlayerIndex !== undefined) {
            isMyPlayer = this.game.networkSession.game.state.players[this.game.networkSession.localPlayerIndex] === player;
        } else {
            isMyPlayer = player.isHuman;
        }
        this.game.state.message = isMyPlayer ? 'You win!' : `${player.name} wins!`;
        this.audio.play('win', { volume: 0.7 });

        // End the game (we're always the host as player 0)
        if (this.game.networkSession) {
            this.game.state.gamePhase = 'gameOver';
            this.game.gameState = 'gameOver';
            this.game.networkSession.endGame();
        } else {
            // Single player / local multiplayer
            this.game.state.gamePhase = 'gameOver';
            this.game.gameState = 'gameOver';
            this.calculateScores();
        }
    }

    calculateScores() {
        for (const p of this.game.state.players) {
            const allCards = p.getAllCards();
            const allSets = this.game.state.findAllPossibleSets(allCards);
            let points = 0;
            const used = new Set();
            function backtrack(start, found) {
                for (let si = start; si < allSets.length; si++) {
                    const setCards = allSets[si];
                    if (setCards.some(c => used.has(c))) continue;
                    for (const c of setCards) used.add(c);
                    let setPoints = 0;
                    const a = setCards[0], b = setCards[1], c = setCards[2];
                    if (a.ingredient === b.ingredient && b.ingredient === c.ingredient) {
                        setPoints = 120;
                    } else {
                        setPoints = 60;
                    }
                    found.push([setCards, setPoints]);
                    backtrack(si + 1, found);
                    found.pop();
                    for (const c of setCards) used.delete(c);
                }
            }
            let bestSets = [];
            let bestPoints = 0;
            function scoreBacktrack(start, found, currentPoints) {
                if (currentPoints > bestPoints) {
                    bestPoints = currentPoints;
                    bestSets = [...found];
                }
                for (let si = start; si < allSets.length; si++) {
                    const setCards = allSets[si];
                    if (setCards.some(c => used.has(c))) continue;
                    let setPoints = 0;
                    const a = setCards[0], b = setCards[1], c = setCards[2];
                    if (a.ingredient === b.ingredient && b.ingredient === c.ingredient) {
                        setPoints = 120;
                    } else {
                        setPoints = 60;
                    }
                    for (const card of setCards) used.add(card);
                    found.push([setCards, setPoints]);
                    scoreBacktrack(si + 1, found, currentPoints + setPoints);
                    found.pop();
                    for (const card of setCards) used.delete(card);
                }
            }
            scoreBacktrack(0, [], 0);
            p.score = bestPoints;
            p.sets = bestSets.map(s => s[0]);
        }
    }

    findLocalPlayer() {
        if (this.game.networkSession && this.game.networkSession.localPlayerIndex !== undefined) {
            return this.game.state.players[this.game.networkSession.localPlayerIndex] || this.game.state.players[0];
        }
        return this.game.state.players[0];
    }
}
