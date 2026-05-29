/**
 * HotpotNetworkSession - Host-authoritative online multiplayer session for Hotpot.
 *
 * Host controls: game start, restart, turn skips (on timeout).
 * Guests mirror host state via SyncSystem.
 * Drop-in/drop-out: players join/leave at any time, replaced by bots.
 * 4-player max. Host = room creator (first to join).
 */
class HotpotNetworkSession {
    constructor(networkManager, gameState, game) {
        this.networkManager = networkManager;
        this.gameState = gameState;
        this.game = game;

       // Detect if local player is host
        this.isHost = this.networkManager.isCurrentUserHost();

        // Session state machine
        this.state = "WAITING";
        this.countdownTimer = 3;
        this.countdownFinished = false;
        this.ready = false;
        this.hostWaiting = false;

        // Rematch
        this.rematchState = { localRequested: false };

        // Players: player 0 = local human, players 1-3 = bots or remote humans
        this.localPlayer = null;
        this.localPlayerIndex = 0;
        this.remotePlayers = [];

        // SyncSystem (shared with GUI)
        this.syncSystem = null;
        this._syncReadyToStart = false;

        // Turn timer (60 seconds)
        this.TURN_TIMEOUT = 60;
    }

    start() {
        this.syncSystem = this.game.gui.syncSystem;

      // Detect P2P mode for sync activation
        if (typeof this.networkManager.getDataChannel === 'function') {
            const setupChannelHandler = () => {
                const dc = this.networkManager.getDataChannel();
                if (dc && dc.readyState === 'open' && !dc._hotpotSyncHandlerSet) {
                    dc._hotpotSyncHandlerSet = true;
                    dc.onmessage = (evt) => {
                        try {
                            const message = JSON.parse(evt.data);
                            if (this.syncSystem && message.type === 'syncUpdate') {
                                this.syncSystem.handleSyncUpdate(message);
                            }
                            // Route all other messages to the GUI's custom handler system
                            if (this.game && this.game.gui && message.type !== 'syncUpdate') {
                                const handler = this.game.gui.customMessageHandlers?.get(message.type);
                                if (handler) {
                                    try {
                                        handler(message);
                                    } catch (e) {
                                        console.error(`[NetworkSession] Error in handler '${message.type}':`, e);
                                    }
                                }
                            }
                        } catch (e) {
                            // ignore
                        }
                    };
                }
            };

            // Try immediately (guest case - channel already open)
            setupChannelHandler();

            // Also set up on joinedRoom in case host creates room first
            this.networkManager.on('joinedRoom', () => {
                setupChannelHandler();
            });

            this.networkManager.on('syncUpdate', (msg) => {
                if (this.syncSystem) {
                    this.syncSystem.handleSyncUpdate(msg);
                }
            });

            this._syncReadyToStart = true;
        } else {
            this._syncReadyToStart = true;
        }

        // Listen for join requests (host side)
        this.networkManager.on("joinRequest", (req) => {
            this.networkManager.acceptJoin(req.peerId);
        });

         // Listen for user list updates (get remote usernames)
        this.networkManager.on("userList", (users) => {
            this.updateRemotePlayerNames(users);
            this.checkStartConditions();
        });

        // Listen for remote player actions (draw/discard)
        this.game.gui.registerMessageHandler("playerAction", (message) => {
            this.handlePlayerAction(message);
        });

        // Listen for rematch requests (guest → host)
        this.game.gui.registerMessageHandler("rematch", (message) => {
            if (this.isHost) {
                this._guestWantsRematch = true;
                this.handleRematchRequest(message);
            }
        });

         // Listen for disconnections (only host processes this)
        this.networkManager.on("userLeft", (user) => {
            if (this.isHost) {
                this.handleOpponentLeft(user);
            }
        });

        this.networkManager.on("hostLeft", (message) => {
            this.handleHostLeft(message);
        });

       // Create local player (player 0 = human)
        this.localPlayer = this.game.state.players[0];
        const myUsername = this.game.gui.getUsername();
        this.localPlayer.username = myUsername;
        this.localPlayer.name = myUsername;
        this.localPlayer.isLocal = true;

        // Create remote player placeholders (up to 3 remote players)
        this.remotePlayers = [];
        const positions = HOTPOT.POSITIONS;
        const maxRemote = 3;
        for (let i = 0; i < maxRemote; i++) {
            const remotePlayer = new (this.game.state.players[0].constructor)(
                i + 1,
                'Bot ' + (i + 1),
                false,
                1 + Math.floor(Math.random() * 3)
            );
            remotePlayer.tablePosition = positions[i + 1];
            remotePlayer.isRemote = true;
            remotePlayer.username = 'Player ' + (i + 1);
            this.remotePlayers.push(remotePlayer);
        }

        // Replace bot players with remote placeholders
        this.game.state.players[0] = this.localPlayer;
        this.localPlayer.tablePosition = positions[0];
        for (let i = 0; i < this.remotePlayers.length; i++) {
            this.game.state.players[i + 1] = this.remotePlayers[i];
        }

        // Apply medium speed for online play
        this.game.currentSpeed = 2;
        this.game.applySpeedToAllCards();

        // Joiner is ready immediately; host becomes ready when they click wait
        if (!this.isHost) {
            this.ready = true;
        }

        // Assign player slots from connected users (both host and guest)
        this.assignPlayerSlots();

        // Register sync sources
        this.registerSyncSources();

       // Listen for remote state updates
        this.syncSystem.on("remoteUpdated", () => {
            this.checkStartConditions();
            this.checkRematchConditions();
            this.checkRemoteGameOver();
            this.checkHostWaitingState();
            this.updateRemotePlayerStates();
            this.updateTurnTimer();
        });

        this.syncSystem.on("remoteStale", () => {
            // Remote client stopped responding
        });

        // Activate sync when data channel is ready
        if (this._syncReadyToStart) {
            this.syncSystem.start();
        }

        // Start in WAITING state
        this.state = "WAITING";
        if (this.isHost) {
            this.game.gameState = "waitingMenu";
        } else {
            this.game.gameState = "waitingForHostMenu";
        }

        this.checkStartConditions();
    }

    resetOnlineGame() {
        // Reset all players
        for (const player of this.game.state.players) {
            player.hand = [];
            player.sets = [];
            player.discardPile = [];
            player.won = false;
            player.hasDrawn = false;
            player.drawnCard = null;
            player.score = 0;
            player.turnCount = 0;
            player.turnTimer = 0;
            player.isLocal = false;
            player.isRemote = false;
        }

        // Reset game state
        this.gameState.gamePhase = 'playing';
        this.gameState.currentPlayerIndex = 0;
        this.game.turnPhase = 'draw';
        this.game.bestSets = [];

        // Create and shuffle deck
        const deckRect = this.game.getDeckRect();
        this.gameState.createDeck(deckRect);

        // Deal initial hands
        this.gameState.dealInitialHands();

        // Sort all hands
        for (const p of this.game.state.players) {
            this.game.sortHandByCategory(p);
        }
        this.localPlayer.hasDrawn = false;
        this.localPlayer.drawnCard = null;

        // Apply deal animations
        const humanRects = this.game.getHandCardRects(this.localPlayer);
        for (let i = 0; i < this.localPlayer.hand.length; i++) {
            const rect = humanRects[i];
            const card = this.localPlayer.hand[i];
            card.moveTo(rect.x, rect.y);
            card.rotation = Math.PI * 2;
            card.targetRotation = 0;
        }

        for (let i = 1; i < this.game.state.players.length; i++) {
            const ha = i === 1 ? Math.PI / 2 : (i === 2 ? Math.PI : -Math.PI / 2);
            for (const card of this.game.state.players[i].hand) {
                this.game.applySpeedToCard(card);
                card.rotation = ha + Math.PI * 2;
                card.targetRotation = ha;
            }
        }
    }

  registerSyncSources() {
        // Match state: session state, readiness, rematch intent, host waiting, player slot assignments
        this.syncSystem.register("match", {
            getFields: () => {
                const playerSlots = [];
                for (let i = 1; i < this.game.state.players.length; i++) {
                    const p = this.game.state.players[i];
  if (p.isRemote && p.username) {
                        playerSlots.push({ username: p.username, playerNumber: p.playerNumber, isHuman: p.isHuman });
                    }
                }
 
                return {
                    state: this.state,
                    ready: this.ready,
                    wantsRematch: this.rematchState.localRequested,
                    hostWaiting: this.hostWaiting,
                    playerSlots: playerSlots
                };
            }
        });

        // Game state: phase, current player, round, deck count, countdown
        this.syncSystem.register("game", {
            getFields: () => ({
                gamePhase: this.gameState.gamePhase,
                currentPlayerIndex: this.gameState.currentPlayerIndex,
                roundNumber: this.gameState.roundNumber,
                deckCount: this.gameState.deck.length,
                turnTimer: this.game.turnTimer,
                turnPhase: this.game.turnPhase,
                countdownPhase: this.state === "COUNTDOWN" ? "countdown" : (this.state === "PLAYING" && this.countdown?.phase === "go" ? "go" : "none"),
                countdownRemaining: this.countdownTimer
            })
        });

       // Per-player sync sources — only the host broadcasts player state
        if (this.isHost) {
            for (let i = 0; i < this.game.state.players.length; i++) {
                const player = this.game.state.players[i];
                const sourceId = "player_" + i;

                this.syncSystem.register(sourceId, {
                    getFields: () => ({
                        playerNumber: player.playerNumber ?? player.id,
                        isHuman: player.isHuman,
                        hand: player.hand.map(c => ({ category: c.category, ingredient: c.ingredient })),
                        drawnCard: player.drawnCard ? { category: player.drawnCard.category, ingredient: player.drawnCard.ingredient, drawSourcePlayer: player.drawSourcePlayer } : null,
                        discardPile: player.discardPile.map(c => ({ category: c.category, ingredient: c.ingredient })),
                        lastDiscard: player.lastDiscard || null,
                        sets: player.sets.length,
                        won: player.won,
                        score: player.score,
                        turnCount: player.turnCount,
                        turnTimer: player.turnTimer,
                        username: player.username || ''
                    })
                });
            }
        }
    }

    update(deltaTime) {
        this.updateCountdown(deltaTime);

        if (this.state === "PLAYING") {
            this.updatePlaying(deltaTime);
        }
    }

    updatePlaying(deltaTime) {
        // Check for game over
        if (this.checkGameOver()) {
            this.endGame();
            return;
        }

        // Update turn timer and handle bot turns (host authoritative)
        if (this.isHost) {
            const currentPlayer = this.game.state.players[this.gameState.currentPlayerIndex];
            if (currentPlayer) {
                currentPlayer.turnTimer += deltaTime;

                // Bot AI for bot players (not remote humans)
                if (!currentPlayer.isHuman && !currentPlayer.isRemote) {
                    if (currentPlayer.turnTimer >= this.TURN_TIMEOUT) {
                        this.skipTurn();
                        return;
                    }
                    // Run bot turn
                    this.game.updateBotTurn(currentPlayer);
                } else if (currentPlayer.turnTimer >= this.TURN_TIMEOUT) {
                    // Remote human or other — skip turn on timeout
                    this.skipTurn();
                }
            }
        } else {
            // Non-host: check if host ended the game
            const remoteMatch = this.syncSystem ? this.syncSystem.getRemote("match") : null;
            if (remoteMatch && remoteMatch.state === "GAME_OVER") {
                this.game.gameState = "gameOver";
                // Flip bot cards for reveal
                if (!this.game._botRevealed) {
                    this.game._botRevealed = true;
                    for (const p of this.game.state.players) {
                        if (p.isLocal) continue;
                        for (const card of p.hand) {
                            card.faceUp = false;
                            card.flip();
                        }
                    }
                }
                this.game.audio.play('win', { volume: 0.7 });
            }
        }
    }

    skipTurn() {
        const player = this.game.state.players[this.gameState.currentPlayerIndex];
        if (!player || player.isHuman) return;
        // Skip remote players too (they didn't act in time)

        // Auto-draw if needed
        if (!player.hasDrawn) {
            if (this.gameState.deck.length > 0) {
                this.gameState.drawFromDeck(player);
                this.game.audio.play('draw', { volume: 0.2 });
            } else if (this.gameState.deck.length === 0) {
                this.gameState.refillDeckFromDiscards();
                if (this.gameState.deck.length > 0) {
                    this.gameState.drawFromDeck(player);
                    this.game.audio.play('draw', { volume: 0.2 });
                }
            }
        }

        // Auto-discard lowest value card
        if (player.hasDrawn && player.drawnCard) {
            const cardToDiscard = player.drawnCard;
            this.gameState.discardCard(player, cardToDiscard);
            this.game.audio.play('discard', { volume: 0.2 });
            player.drawnCard = null;
        } else if (player.hand.length > 0) {
            const scored = player.hand.map(c => ({
                card: c,
                value: this.game.botCardValue(c, player)
            }));
            scored.sort((a, b) => a.value - b.value);
            const discardCard = scored[0].card;
            this.gameState.discardCard(player, discardCard);
            this.game.audio.play('discard', { volume: 0.2 });
        }

        player.hasDrawn = false;
        player.turnTimer = 0;
        this.gameState.currentPlayerIndex = this.gameState.getNextPlayerIndex();

        const nextPlayer = this.gameState.getCurrentPlayer();
        nextPlayer.hasDrawn = false;
        nextPlayer.drawnCard = null;
        nextPlayer.turnTimer = 0;

        if (!nextPlayer.isHuman) {
            nextPlayer.botStarted = false;
        }

        this.game.turnPhase = 'draw';
        this.game.bestSets = [];
        for (const p of this.game.state.players) {
            this.game.sortHandByCategory(p);
            for (const c of p.hand) c.highlighted = null;
            if (p.drawnCard) p.drawnCard.highlighted = null;
        }
    }

    checkStartConditions() {
        if (this.state !== "WAITING") return;

        const isHost = this.networkManager.isCurrentUserHost();

        // Only the host can start
        if (!isHost) return;

        // Host presses START button → starts game
        if (this.hostWaiting) {
            this.startCountdown();
        }
    }

    startCountdown() {
        this.state = "COUNTDOWN";
        this.countdownTimer = 3;
        this.countdownFinished = false;
        this.game.gameState = "onlineMultiplayer";

        // Reset game state for both players before countdown
        this.resetOnlineGame();

        // Update game countdown state
        if (this.game.countdown) {
            this.game.countdown.active = true;
            this.game.countdown.phase = "countdown";
            this.game.countdown.countdownNumber = 3;
            this.game.countdown.timer = 0;
            this.game.countdown.waitingForOpponent = false;
        }
    }

    updateCountdown(deltaTime) {
        const cd = this.game && this.game.countdown ? this.game.countdown : null;
        if (!cd) return;
        if (this.countdownFinished) return;

        // Guest: sync countdown from host's broadcast every frame
        if (!this.isHost && this.state === "COUNTDOWN") {
            const remoteGame = this.syncSystem ? this.syncSystem.getRemote("game") : null;
            if (remoteGame && typeof remoteGame.countdownRemaining === "number") {
                this.countdownTimer = remoteGame.countdownRemaining;
                cd.countdownNumber = Math.max(1, Math.ceil(this.countdownTimer));
            }
            if (cd.phase === "countdown" && this.countdownTimer <= 0) {
                this.startGame();
                cd.phase = "go";
                cd.timer = 0;
                cd.countdownNumber = null;
            }
            return;
        }

        if (cd.active) {
            const inCountdownState = this.state === "COUNTDOWN";
            const inPlayingState = this.state === "PLAYING";

            if (cd.phase === "countdown" && !inCountdownState) {
                cd.active = false;
                cd.phase = "waiting";
                cd.countdownNumber = 3;
                cd.timer = 0;
                cd.waitingForOpponent = false;
                return;
            }

            if (cd.phase === "go" && !inPlayingState) {
                cd.active = false;
                cd.phase = "waiting";
                cd.countdownNumber = 3;
                cd.timer = 0;
                cd.waitingForOpponent = false;
                return;
            }
        }

        if (!cd.active) return;

        if (cd.phase === "countdown") {
            this.countdownTimer -= deltaTime;
            const remaining = Math.max(0, this.countdownTimer);
            if (remaining > 0) {
                cd.countdownNumber = Math.max(1, Math.ceil(remaining));
            }
            cd.timer += deltaTime;

            if (remaining <= 0) {
                this.startGame();
                cd.phase = "go";
                cd.timer = 0;
                cd.countdownNumber = null;
            }
        } else if (cd.phase === "go") {
            cd.timer += deltaTime;
            const GO_DURATION = 0.7;
            if (cd.timer >= GO_DURATION) {
                cd.active = false;
                cd.phase = "waiting";
                cd.countdownNumber = 3;
                cd.timer = 0;
                cd.waitingForOpponent = false;
                this.countdownFinished = true;
            }
        } else {
            cd.active = false;
            cd.phase = "waiting";
            cd.countdownNumber = 3;
            cd.timer = 0;
            cd.waitingForOpponent = false;
        }
    }

    startGame() {
        this.state = "PLAYING";
        this.game.gameState = "onlineMultiplayer";
    }

    checkGameOver() {
        const activePlayers = this.game.state.players.filter(p => !p.won);
        const localPlayer = this.game.state.players.find(p => p.isLocal) || this.game.state.players[0];
        const humanAlive = !localPlayer.won;
        return activePlayers.length <= 1 && humanAlive;
    }

     endGame() {
        this.rematchState.localRequested = false;
        this._guestWantsRematch = false;
        this.state = "GAME_OVER";
        this.game.gameState = "gameOver";

        // Flip bot cards for reveal
        if (!this.game._botRevealed) {
            this.game._botRevealed = true;
            for (const p of this.game.state.players) {
                if (p.isLocal) continue;
                for (const card of p.hand) {
                    card.faceUp = false;
                    card.flip();
                }
            }
        }

        const winner = this.game.state.players.find(p => p.won);
        const localPlayer = this.game.state.players.find(p => p.isLocal) || this.game.state.players[0];
        if (!winner || winner !== localPlayer) {
            // Human lost — flip bot cards
            this.game._botRevealed = false;
        }

        this.game.audio.play('win', { volume: 0.7 });
    }

    requestRematch() {
        if (this.state !== "GAME_OVER") return false;
        this.rematchState.localRequested = true;
        this.state = "REMATCH_PENDING";
        this.game.gameState = "rematchPending";

        if (this.isHost) {
            this.checkRematchConditions();
        } else {
            this.sendRematchRequest();
        }
        return true;
    }

    sendRematchRequest() {
        if (!this.networkManager || !this.networkManager.isInRoom()) return;
        this.networkManager.send({ type: "rematch" });
    }

    handleRematchRequest(message) {
        this.rematchState.localRequested = true;
        this.state = "REMATCH_PENDING";
        this.game.gameState = "rematchPending";
        this.checkRematchConditions();
    }

    cancelRematch() {
        this.rematchState.localRequested = false;
        this.state = "GAME_OVER";
        this.game.gameState = "gameOver";
    }

    checkRematchConditions() {
        if (this.state !== "REMATCH_PENDING") return;

        if (this.isHost) {
            // Host checks if guest wants rematch via message flag
            if (this.rematchState.localRequested && this._guestWantsRematch) {
                this.startRematch();
            }
        } else {
            // Guest checks if host wants rematch
            if (this.rematchState.localRequested) {
                this.startRematch();
            }
        }
    }

    startRematch() {
        this.resetOnlineGame();
        this.startCountdown();
    }

   checkRemoteGameOver() {
        if (this.state !== "PLAYING") return;

        for (let i = 1; i < this.game.state.players.length; i++) {
            const sourceId = "player_" + i;
            const remotePlayerData = this.syncSystem ? this.syncSystem.getRemote(sourceId) : null;
            const remotePlayer = this.game.state.players[i];

            if (remotePlayerData && remotePlayerData.won && !remotePlayer.won) {
                remotePlayer.won = true;
            }
        }

        // If a remote player won and we're the host, end the game
        if (this.isHost) {
            for (let i = 1; i < this.game.state.players.length; i++) {
                if (this.game.state.players[i].won) {
                    this.endGame();
                    return;
                }
            }
        }
    }

    handlePlayerAction(message) {
        // Only host processes player actions
        if (!this.isHost) return;
        if (this.state !== "PLAYING") return;

        const { playerIndex, action, category, ingredient } = message;

        // Only process actions from remote players (not player 0 who is the local host)
        if (playerIndex === 0) return;

        const player = this.game.state.players[playerIndex];
        if (!player) return;

        if (action === "drawDeck") {
            if (!player.hasDrawn && this.gameState.deck.length > 0) {
                this.gameState.drawFromDeck(player);
                this.game.applySpeedToCard(player.drawnCard);
                this.game.audio.play('draw', { volume: 0.2 });
                this.game.turnPhase = 'discard';
                this.game.bestSets = this.gameState.findBestSets(player.getAllCards(), HOTPOT.GAME.SETS_TO_WIN);
                for (const c of player.getAllCards()) c.highlighted = null;
                for (const set of this.game.bestSets) {
                    const type = set[0].ingredient === set[1].ingredient ? 'triple' : 'category';
                    for (const c of set) c.highlighted = type;
                }
            }
        } else if (action === "drawDiscard") {
            const sourcePlayer = this.game.state.players[message.sourcePlayerIndex];
            if (sourcePlayer && !player.hasDrawn && sourcePlayer.discardPile.length > 0) {
                this.gameState.drawFromDiscard(player, sourcePlayer);
                this.game.applySpeedToCard(player.drawnCard);
                this.game.audio.play('draw', { volume: 0.2 });
                this.game.turnPhase = 'discard';
                this.game.bestSets = this.gameState.findBestSets(player.getAllCards(), HOTPOT.GAME.SETS_TO_WIN);
                for (const c of player.getAllCards()) c.highlighted = null;
                for (const set of this.game.bestSets) {
                    const type = set[0].ingredient === set[1].ingredient ? 'triple' : 'category';
                    for (const c of set) c.highlighted = type;
                }
            }
        } else       if (action === "discard") {
            if (!player.hasDrawn) return;

            // Find the card to discard from the player's hand or drawn card
            let cardToDiscard = null;
            if (player.drawnCard && player.drawnCard.category === category && player.drawnCard.ingredient === ingredient) {
                cardToDiscard = player.drawnCard;
            } else {
                for (const c of player.hand) {
                    if (c.category === category && c.ingredient === ingredient) {
                        cardToDiscard = c;
                        break;
                    }
                }
            }

            if (!cardToDiscard) return;

            const wasDrawnCard = (cardToDiscard === player.drawnCard);
            this.gameState.discardCard(player, cardToDiscard);
            this.game.audio.play('discard', { volume: 0.2 });
            if (!wasDrawnCard) {
                player.hand.push(player.drawnCard);
            }
            player.drawnCard = null;
            player.hasDrawn = false;
            player.turnCount++;

                // Check if player can win after this discard
                if (this.gameState.canWin(player)) {
                    player.won = true;
                    this.endGame();
                    return;
                }

                this.gameState.currentPlayerIndex = this.gameState.getNextPlayerIndex();
                const nextPlayer = this.gameState.getCurrentPlayer();
                nextPlayer.hasDrawn = false;
                nextPlayer.drawnCard = null;
                nextPlayer.turnTimer = 0;

                if (!nextPlayer.isHuman) {
                    nextPlayer.botStarted = false;
                }

                this.game.turnPhase = 'draw';
                this.game.bestSets = [];
                for (const p of this.game.state.players) {
                    this.game.sortHandByCategory(p);
                    for (const c of p.hand) c.highlighted = null;
                    if (p.drawnCard) p.drawnCard.highlighted = null;
                }
            }
        }
    


    updateRemotePlayerStates() {
        if (this.isHost) {
            this.assignPlayerSlots();
            return;
        }

       // Guest: use our pre-assigned player index
        const myPlayerIndex = this.localPlayerIndex || 0;

        // Compute screen positions the same way game.js does
        const cx = HOTPOT.WIDTH / 2;
        const cy = HOTPOT.HEIGHT / 2;
        const gap = 50;
        const hw = HOTPOT.UI.CARD_WIDTH / 2;
        const hh = HOTPOT.UI.CARD_HEIGHT / 2;
        const distV = hh + gap;
        const distH = hw + gap / 2 + 12.5;
        const seatMap = { 0: { x: cx - hw, y: cy + distV - hh }, 1: { x: cx - distH - hw, y: cy - hh }, 2: { x: cx - hw, y: cy - distV - hh }, 3: { x: cx + distH - hw, y: cy - hh } };
        const deckRect = { x: cx - hw, y: cy - hh };

        // Sync game state from host
        const remoteGame = this.syncSystem ? this.syncSystem.getRemote("game") : null;
        if (remoteGame) {
            this.gameState.currentPlayerIndex = remoteGame.currentPlayerIndex;
            this.gameState.gamePhase = remoteGame.gamePhase;
            this.game.turnPhase = remoteGame.turnPhase;
        }

       // Sync every player_N source into the corresponding local player slot
        // Each client derives isLocal/tablePosition from playerNumber + own username
        const guestMyUsername = this.isHost ? null : this.game.gui.getUsername();

        // First pass: sync identity and game data from host
        for (let i = 0; i < this.game.state.players.length; i++) {
            const sourceId = "player_" + i;
            const remoteData = this.syncSystem ? this.syncSystem.getRemote(sourceId) : null;
            const localPlayer = this.game.state.players[i];

            if (!remoteData) continue;

            // Sync playerNumber from host
            if (typeof remoteData.playerNumber === "number") {
                localPlayer.playerNumber = remoteData.playerNumber;
            }

            // Sync username and name
            if (remoteData.username) {
                localPlayer.username = remoteData.username;
                localPlayer.name = remoteData.username;
            }

            // Sync isHuman from host
            if (typeof remoteData.isHuman === "boolean") {
                localPlayer.isHuman = remoteData.isHuman;
            }

             // Sync hand cards (preserve card objects to keep positions/animations)
            if (Array.isArray(remoteData.hand)) {
                for (let j = 0; j < remoteData.hand.length; j++) {
                    const hc = remoteData.hand[j];
                    if (j < localPlayer.hand.length) {
                        localPlayer.hand[j].category = hc.category;
                        localPlayer.hand[j].ingredient = hc.ingredient;
                        localPlayer.hand[j].isHotpot = HOTPOT.CATEGORIES[hc.category] ? true : false;
                        if (localPlayer.hand[j].isHotpot) {
                            localPlayer.hand[j].frontColor = HOTPOT.CATEGORIES[hc.category].color;
                            localPlayer.hand[j].suit = hc.category;
                            localPlayer.hand[j].value = hc.ingredient;
                            localPlayer.hand[j].textColor = '#000000';
                        } else {
                            localPlayer.hand[j].frontColor = '#ffffff';
                        }
                    } else {
                        const nc = new Card(hc.category, hc.ingredient, null, 0.5);
                        nc.x = deckRect.x; nc.y = deckRect.y;
                        localPlayer.hand[j] = nc;
                    }
                }
                if (localPlayer.hand.length > remoteData.hand.length) {
                    localPlayer.hand.length = remoteData.hand.length;
                }
            }

           // Sync drawn card (preserve object if possible)
            if (remoteData.drawnCard) {
                if (!localPlayer.drawnCard) {
                    const nc = new Card(remoteData.drawnCard.category, remoteData.drawnCard.ingredient, null, 0.5);
                    const src = remoteData.drawnCard.drawSourcePlayer;
                    if (src === -1) {
                        nc.x = deckRect.x; nc.y = deckRect.y;
                    } else if (typeof src === 'number' && seatMap[src]) {
                        nc.x = seatMap[src].x; nc.y = seatMap[src].y;
                    } else {
                        throw new Error('[NetworkSession] Cannot create drawn card without valid source position');
                    }
                    localPlayer.drawnCard = nc;
                } else {
                    localPlayer.drawnCard.category = remoteData.drawnCard.category;
                    localPlayer.drawnCard.ingredient = remoteData.drawnCard.ingredient;
                    localPlayer.drawnCard.isHotpot = HOTPOT.CATEGORIES[remoteData.drawnCard.category] ? true : false;
                    if (localPlayer.drawnCard.isHotpot) {
                        localPlayer.drawnCard.frontColor = HOTPOT.CATEGORIES[remoteData.drawnCard.category].color;
                        localPlayer.drawnCard.suit = remoteData.drawnCard.category;
                        localPlayer.drawnCard.value = remoteData.drawnCard.ingredient;
                        localPlayer.drawnCard.textColor = '#000000';
                    } else {
                        localPlayer.drawnCard.frontColor = '#ffffff';
                    }
                }
            } else {
                localPlayer.drawnCard = null;
            }

      // Sync discard pile (preserve objects)
            if (Array.isArray(remoteData.discardPile)) {
                while (localPlayer.discardPile.length < remoteData.discardPile.length) {
                    const nc = new Card('', '', null, 0.75);
                    const seat = seatMap[i];
                    nc.x = seat.x; nc.y = seat.y;
                    localPlayer.discardPile.push(nc);
                }
                for (let j = 0; j < remoteData.discardPile.length; j++) {
                    const dc = remoteData.discardPile[j];
                    if (j < localPlayer.discardPile.length) {
                        localPlayer.discardPile[j].category = dc.category;
                        localPlayer.discardPile[j].ingredient = dc.ingredient;
                        localPlayer.discardPile[j].isHotpot = HOTPOT.CATEGORIES[dc.category] ? true : false;
                        if (localPlayer.discardPile[j].isHotpot) {
                            localPlayer.discardPile[j].frontColor = HOTPOT.CATEGORIES[dc.category].color;
                            localPlayer.discardPile[j].suit = dc.category;
                            localPlayer.discardPile[j].value = dc.ingredient;
                            localPlayer.discardPile[j].textColor = '#000000';
                        } else {
                            localPlayer.discardPile[j].frontColor = '#ffffff';
                        }
                    } else {
                        localPlayer.discardPile[j] = new Card(dc.category, dc.ingredient, null, 0.75);
                    }
                }
                if (localPlayer.discardPile.length > remoteData.discardPile.length) {
                    localPlayer.discardPile.length = remoteData.discardPile.length;
                }
            }

            // Sync stats
            if (typeof remoteData.score === "number") localPlayer.score = remoteData.score;
            if (typeof remoteData.turnCount === "number") localPlayer.turnCount = remoteData.turnCount;
            if (typeof remoteData.turnTimer === "number") localPlayer.turnTimer = remoteData.turnTimer;
            if (typeof remoteData.sets === "number") {
                localPlayer.sets = [];
                for (let s = 0; s < remoteData.sets; s++) {
                    localPlayer.sets.push([]);
                }
            }
            if (typeof remoteData.won === "boolean") localPlayer.won = remoteData.won;
        }

        // Second pass: derive isLocal and tablePosition per-client
        // isLocal = player whose username matches this client's username
        // tablePosition: S = local player, then W,N,E filled clockwise by playerNumber
        const localPlayer = this.game.state.players.find(p => p.username === guestMyUsername && p.username !== '');
        if (localPlayer) {
            localPlayer.isLocal = true;
            localPlayer.isRemote = false;
            localPlayer.tablePosition = 'S';
            this.localPlayerIndex = this.game.state.players.indexOf(localPlayer);
            const localNum = localPlayer.playerNumber;

            // Assign positions: S=local, then W(local+1), N(local+2), E(local+3) mod 4
			const positions = HOTPOT.POSITIONS;
            for (const p of this.game.state.players) {
                const offset = ((p.playerNumber - localNum) % 4 + 4) % 4;
                p.tablePosition = positions[offset];
                if (offset !== 0) {
                    p.isLocal = false;
                    p.isRemote = true;
                }
            }
        }
    }

    updateTurnTimer() {
        if (this.state !== "PLAYING") return;

        // Update local turn timer display from sync data (for non-host)
        if (!this.isHost) {
            const cpIdx = this.gameState.currentPlayerIndex;
            const sourceId = "player_" + cpIdx;
            const remoteData = this.syncSystem ? this.syncSystem.getRemote(sourceId) : null;
            if (remoteData && typeof remoteData.turnTimer === "number") {
                const currentPlayer = this.game.state.players[cpIdx];
                if (currentPlayer) {
                    currentPlayer.turnTimer = remoteData.turnTimer;
                }
            }
        }
    }

  assignPlayerSlots() {
        const users = this.networkManager.getConnectedUsers();
        if (!users || users.length === 0) return;

        // Reset all players
        for (let i = 0; i < this.game.state.players.length; i++) {
            const p = this.game.state.players[i];
            p.playerNumber = i;
            p.username = '';
            p.name = '';
            p.isHuman = false;
        }

        // Map each connected user to a player slot
        let slot = 0;
        for (const user of users) {
            if (slot >= this.game.state.players.length) break;
            const p = this.game.state.players[slot];
            p.playerNumber = slot;
            p.username = user.username;
            p.name = user.username;
            p.isHuman = true;  // real humans, not bots
            slot++;
        }

        // Fill remaining slots with bots
        for (let i = slot; i < this.game.state.players.length; i++) {
            const p = this.game.state.players[i];
            p.playerNumber = i;
            p.name = 'Bot ' + (i + 1);
            p.username = 'Bot ' + (i + 1);
            p.isHuman = false;
        }
    }

    handleOpponentLeft(user) {
        const currentState = this.state;

        if (currentState === "WAITING" || currentState === "CANCELLED") {
            // Just replace with bot
            this.replacePlayerWithBot(user);
            return;
        }

        if (currentState === "PLAYING") {
            // Replace with bot, game continues
            this.replacePlayerWithBot(user);
            return;
        }

        if (currentState === "GAME_OVER" || currentState === "REMATCH_PENDING") {
            this.replacePlayerWithBot(user);
            return;
        }

        this.replacePlayerWithBot(user);
    }

    continueAfterOpponentDisconnect() {
        // Replace disconnected player with a bot
        // The bot will play automatically during its turn

        // Transition back to PLAYING state
        this.state = "PLAYING";
        this.game.gameState = "onlineMultiplayer";

        // Reset the bot player
        for (const p of this.game.state.players) {
            if (!p.isRemote && !p.isHuman) {
                p.gameOver = false;
                p.score = 0;
                p.turnTimer = 0;
                p.botStarted = false;
            }
        }

        // Clear any countdown overlay
        if (this.game.countdown) {
            this.game.countdown.active = false;
            this.game.countdown.phase = "waiting";
        }
    }

    replacePlayerWithBot(user) {
        // Find the remote player that left and replace with bot
        for (let i = 0; i < this.remotePlayers.length; i++) {
            if (this.remotePlayers[i].username === user.username ||
                this.remotePlayers[i].name === user.username) {
                // Replace with bot
                const botPlayer = new (this.game.state.players[0].constructor)(
                    i + 1,
                    'Bot ' + (i + 1),
                    false,
                    1 + Math.floor(Math.random() * 3)
                );
                botPlayer.isRemote = false;
                this.remotePlayers[i] = botPlayer;
                this.game.state.players[i + 1] = botPlayer;
                break;
            }
        }
    }

    handleHostLeft(message) {
        if (this.networkManager.isCurrentUserHost()) return;

        // Host left — show room shutdown screen
        this.game.gameState = "roomShutDown";
        this.game.roomShutDownMenu.selectedIndex = 0;
        this.game.roomShutDownMenu.buttonsRegistered = false;
    }

    leave() {
        if (this.networkManager && this.networkManager.isInRoom()) {
            this.networkManager.leaveRoom();
        }
        this.cleanup();
    }

     sendPlayerAction(playerIndex, action, data = {}) {
        // Only non-host clients send actions
        if (this.isHost) return;

        const message = {
            type: "playerAction",
            playerIndex: playerIndex,
            action: action,
            ...data
        };

        if (this.networkManager && this.networkManager.isInRoom()) {
            this.networkManager.send(message);
        }
    }

    cleanup() {
        if (this.game && this.game.gui) {
            this.game.gui.unregisterMessageHandler("playerAction");
        }
        this.syncSystem = null;
        this.localPlayer = null;
        this.remotePlayers = [];
    }

    checkHostWaitingState() {
        const isHost = this.networkManager.isCurrentUserHost();

        if (isHost) {
            if (this.state === "WAITING") {
                this.game.gameState = "waitingMenu";
            }
            return;
        }

       // Guest: check remote state from host
        const remoteMatch = this.syncSystem ? this.syncSystem.getRemote("match") : null;
        const remoteState = remoteMatch ? remoteMatch.state : "WAITING";

        // Only react to state changes, not every frame
        if (remoteState === this._lastGuestRemoteState) return;
        this._lastGuestRemoteState = remoteState;

        if (remoteState === "WAITING") {
            this.game.gameState = "waitingForHostMenu";
        } else if (remoteState === "COUNTDOWN") {
            this.state = "COUNTDOWN";
            this.game.gameState = "onlineMultiplayer";
            // Start countdown synced from host
            const remoteGame = this.syncSystem ? this.syncSystem.getRemote("game") : null;
            if (this.game.countdown) {
                this.game.countdown.active = true;
                this.game.countdown.phase = "countdown";
                if (remoteGame && typeof remoteGame.countdownRemaining === "number") {
                    this.countdownTimer = remoteGame.countdownRemaining;
                    this.game.countdown.countdownNumber = Math.max(1, Math.ceil(this.countdownTimer));
                } else {
                    this.countdownTimer = 3;
                    this.game.countdown.countdownNumber = 3;
                }
                this.game.countdown.timer = 0;
                this.game.countdown.waitingForOpponent = false;
            }
        } else if (remoteState === "PLAYING") {
            // Only transition if we haven't already
            if (this.game.countdown && this.game.countdown.phase !== "waiting") {
                this.game.countdown.active = false;
                this.game.countdown.phase = "waiting";
            }
            this.game.gameState = "onlineMultiplayer";
        } else if (remoteState === "GAME_OVER") {
            this.game.gameState = "gameOver";
        } else if (remoteState === "REMATCH_PENDING") {
            this.game.gameState = "rematchPending";
        }
    }
}
