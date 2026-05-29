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
            // Set up data channel message handler for sync updates
            // The data channel may not be open yet (host creates room before guests join)
            // So we also listen for joinedRoom to catch it when the channel opens
            const setupChannelHandler = () => {
                const dc = this.networkManager.getDataChannel();
                if (dc && dc.readyState === 'open' && !dc._hotpotSyncHandlerSet) {
                    dc._hotpotSyncHandlerSet = true;
                    dc.onmessage = (evt) => {
                        try {
                            const message = JSON.parse(evt.data);
                            if (message.type === 'syncUpdate' && this.syncSystem) {
                                this.syncSystem.handleSyncUpdate(message);
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
        this.localPlayer.username = this.game.gui.getUsername();

        // Create remote player placeholders (up to 3 remote players)
        this.remotePlayers = [];
        const maxRemote = 3;
        for (let i = 0; i < maxRemote; i++) {
            const remotePlayer = new (this.game.state.players[0].constructor)(
                i + 1,
                'Bot ' + (i + 1),
                false,
                1 + Math.floor(Math.random() * 3)
            );
            remotePlayer.isRemote = true;
            remotePlayer.username = 'Player ' + (i + 1);
            this.remotePlayers.push(remotePlayer);
        }

        // Replace bot players with remote placeholders
        this.game.state.players[0] = this.localPlayer;
        for (let i = 0; i < this.remotePlayers.length; i++) {
            this.game.state.players[i + 1] = this.remotePlayers[i];
        }

        // Apply medium speed for online play
        this.game.currentSpeed = 2;
        this.game.applySpeedToAllCards();

        // Reset game state for online play
        this.resetOnlineGame();

        // Joiner is ready immediately; host becomes ready when they click wait
        if (!this.isHost) {
            this.ready = true;
        }

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

        // Sort human hand
        this.game.sortHandByCategory(this.localPlayer);
        this.localPlayer.hasDrawn = false;
        this.localPlayer.drawnCard = null;

        // Apply deal animations
        const humanRects = this.game.getHandCardRects(0);
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
        // Match state: session state, readiness, rematch intent, host waiting, connected usernames
        this.syncSystem.register("match", {
            getFields: () => {
                const users = this.networkManager.getConnectedUsers();
                const usernames = users.map(u => u.username);
                return {
                    state: this.state,
                    ready: this.ready,
                    wantsRematch: this.rematchState.localRequested,
                    hostWaiting: this.hostWaiting,
                    usernames: usernames
                };
            }
        });

        // Game state: phase, current player, round, deck count
        this.syncSystem.register("game", {
            getFields: () => ({
                gamePhase: this.gameState.gamePhase,
                currentPlayerIndex: this.gameState.currentPlayerIndex,
                roundNumber: this.gameState.roundNumber,
                deckCount: this.gameState.deck.length,
                turnTimer: this.game.turnTimer
            })
        });

        // Per-player sync sources
        for (let i = 0; i < this.game.state.players.length; i++) {
            const player = this.game.state.players[i];
            const sourceId = "player_" + i;

            this.syncSystem.register(sourceId, {
                getFields: () => ({
                    hand: player.hand.map(c => ({
                        category: c.category,
                        ingredient: c.ingredient
                    })),
                    drawnCard: player.drawnCard ? {
                        category: player.drawnCard.category,
                        ingredient: player.drawnCard.ingredient
                    } : null,
                    discardPile: player.discardPile.map(c => ({
                        category: c.category,
                        ingredient: c.ingredient
                    })),
                    sets: player.sets.length,
                    won: player.won,
                    score: player.score,
                    turnCount: player.turnCount,
                    turnTimer: player.turnTimer,
                    isRemote: player.isRemote || false,
                    username: player.username || ''
                })
            });
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
                        if (p.isHuman) continue;
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
            this.gameState.discardCard(player, player.drawnCard);
            this.game.audio.play('discard', { volume: 0.2 });
            player.hand.push(player.drawnCard);
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
        console.log("[NetworkSession] Host starting countdown, state=" + this.state);
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
        const humanAlive = !this.game.state.players[0].won;
        return activePlayers.length <= 1 && humanAlive;
    }

     endGame() {
        this.rematchState.localRequested = false;
        this.state = "GAME_OVER";
        this.game.gameState = "gameOver";

        // Flip bot cards for reveal
        if (!this.game._botRevealed) {
            this.game._botRevealed = true;
            for (const p of this.game.state.players) {
                if (p.isHuman) continue;
                for (const card of p.hand) {
                    card.faceUp = false;
                    card.flip();
                }
            }
        }

        const winner = this.game.state.players.find(p => p.won);
        if (!winner || winner.id !== 0) {
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
        this.checkRematchConditions();
        return true;
    }

    cancelRematch() {
        this.rematchState.localRequested = false;
        this.state = "GAME_OVER";
        this.game.gameState = "gameOver";
    }

    checkRematchConditions() {
        if (this.state !== "REMATCH_PENDING" && this.state !== "GAME_OVER") return;

        const remoteMatch = this.syncSystem ? this.syncSystem.getRemote("match") : null;
        const remoteWantsRematch = remoteMatch ? remoteMatch.wantsRematch : false;

        if (this.rematchState.localRequested && remoteWantsRematch) {
            this.startRematch();
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
            }
        } else if (action === "win") {
            player.won = true;
            this.endGame();
            return;
        } else if (action === "drawDiscard") {
            // message.sourcePlayerIndex tells us which discard pile to steal from
            const sourcePlayer = this.game.state.players[message.sourcePlayerIndex];
            if (sourcePlayer && !player.hasDrawn && sourcePlayer.discardPile.length > 0) {
                this.gameState.drawFromDiscard(player, sourcePlayer);
                this.game.applySpeedToCard(player.drawnCard);
                this.game.audio.play('draw', { volume: 0.2 });
            }
        } else if (action === "discard") {
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

            if (cardToDiscard) {
                this.gameState.discardCard(player, cardToDiscard);
                this.game.audio.play('discard', { volume: 0.2 });
                player.hand.push(player.drawnCard);
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
                    for (const c of p.hand) c.highlighted = null;
                    if (p.drawnCard) p.drawnCard.highlighted = null;
                }
            }
        }
    }

  updateRemotePlayerStates() {
        // Sync usernames from match source during WAITING, from player sources during PLAYING
        if (this.state === "WAITING") {
            if (this.isHost) {
                // Host: use connected users list directly
                const users = this.networkManager.getConnectedUsers();
                let remoteIdx = 0;
                for (let i = 1; i < this.game.state.players.length; i++) {
                    const p = this.game.state.players[i];
                    if (remoteIdx < users.length) {
                        const username = users[remoteIdx].username;
                        if (username !== this.localPlayer.username) {
                            p.username = username;
                            p.name = username;
                            p.isRemote = true;
                        }
                        remoteIdx++;
                    }
                }
            } else {
                // Guest: read usernames from host's match source
                const remoteMatch = this.syncSystem ? this.syncSystem.getRemote("match") : null;
                if (remoteMatch && remoteMatch.usernames) {
                    const myUsername = this.game.gui.getUsername();
                    let remoteIdx = 0;
                    for (let i = 1; i < this.game.state.players.length; i++) {
                        const p = this.game.state.players[i];
                        if (remoteIdx < remoteMatch.usernames.length) {
                            const username = remoteMatch.usernames[remoteIdx];
                            if (username !== myUsername) {
                                p.username = username;
                                p.name = username;
                                p.isRemote = true;
                            }
                            remoteIdx++;
                        }
                    }
                }
            }
            return;
        }

        if (this.state === "COUNTDOWN") {
            // Same as WAITING — sync usernames during countdown
            if (this.isHost) {
                const users = this.networkManager.getConnectedUsers();
                let remoteIdx = 0;
                for (let i = 1; i < this.game.state.players.length; i++) {
                    const p = this.game.state.players[i];
                    if (remoteIdx < users.length) {
                        const username = users[remoteIdx].username;
                        if (username !== this.localPlayer.username) {
                            p.username = username;
                            p.name = username;
                            p.isRemote = true;
                        }
                        remoteIdx++;
                    }
                }
            } else {
                const remoteMatch = this.syncSystem ? this.syncSystem.getRemote("match") : null;
                if (remoteMatch && remoteMatch.usernames) {
                    const myUsername = this.game.gui.getUsername();
                    let remoteIdx = 0;
                    for (let i = 1; i < this.game.state.players.length; i++) {
                        const p = this.game.state.players[i];
                        if (remoteIdx < remoteMatch.usernames.length) {
                            const username = remoteMatch.usernames[remoteIdx];
                            if (username !== myUsername) {
                                p.username = username;
                                p.name = username;
                                p.isRemote = true;
                            }
                            remoteIdx++;
                        }
                    }
                }
            }
            return;
        }

        if (this.state !== "PLAYING") return;

        for (let i = 1; i < this.game.state.players.length; i++) {
            const sourceId = "player_" + i;
            const remoteData = this.syncSystem ? this.syncSystem.getRemote(sourceId) : null;
            const localPlayer = this.game.state.players[i];

            if (!remoteData) continue;

            // Update score
            if (typeof remoteData.score === "number") {
                localPlayer.score = remoteData.score;
            }

            // Update turn count
            if (typeof remoteData.turnCount === "number") {
                localPlayer.turnCount = remoteData.turnCount;
            }

            // Update sets count
            if (typeof remoteData.sets === "number") {
                localPlayer.sets = [];
                for (let s = 0; s < remoteData.sets; s++) {
                    localPlayer.sets.push([]);
                }
            }

            // Update username for remote players
            if (remoteData.isRemote && remoteData.username && remoteData.username !== localPlayer.username) {
                localPlayer.username = remoteData.username;
                localPlayer.name = remoteData.username;
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

    updateRemotePlayerNames(users) {
        const myUsername = this.game.gui.getUsername();
        let remoteIdx = 0;

        for (const user of users) {
            if (user.username === myUsername) continue;
            if (remoteIdx < this.remotePlayers.length) {
                this.remotePlayers[remoteIdx].username = user.username;
                this.remotePlayers[remoteIdx].name = user.username;
                this.remotePlayers[remoteIdx].isRemote = true;
                remoteIdx++;
            }
        }

        // Update game state players
        for (let i = 1; i < this.game.state.players.length; i++) {
            const p = this.game.state.players[i];
            if (p.isRemote && p.username) {
                p.name = p.username;
            }
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
            // Host manages its own state
            if (this.state === "WAITING") {
                this.game.gameState = "waitingMenu";
            }
            return;
        }

        // Guest: check remote state from host
        const remoteMatch = this.syncSystem ? this.syncSystem.getRemote("match") : null;
        const remoteState = remoteMatch ? remoteMatch.state : "WAITING";
        console.log("[NetworkSession] Guest checkHostWaitingState: remoteState=" + remoteState + " localState=" + this.state);

        if (remoteState === "WAITING") {
            this.game.gameState = "waitingForHostMenu";
        } else if (remoteState === "COUNTDOWN") {
            this.game.gameState = "onlineMultiplayer";
            if (this.game.countdown) {
                this.game.countdown.active = true;
                this.game.countdown.phase = "countdown";
                this.game.countdown.countdownNumber = 3;
                this.game.countdown.timer = 0;
                this.game.countdown.waitingForOpponent = false;
            }
        } else if (remoteState === "PLAYING") {
            this.game.gameState = "onlineMultiplayer";
        } else if (remoteState === "GAME_OVER") {
            this.game.gameState = "gameOver";
        } else if (remoteState === "REMATCH_PENDING") {
            this.game.gameState = "rematchPending";
        }
    }
}
