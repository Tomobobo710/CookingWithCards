// ---------- Player ----------
class PlayerEntity {
    constructor(id, name, isHuman, difficulty = 2) {
        this.id = id;
        this.name = name;
        this.isHuman = isHuman;
        this.difficulty = difficulty;
        this.hand = [];
        this.sets = [];
        this.discardPile = [];
        this.won = false;
        this.hasDrawn = false;
        this.drawnCard = null;
        this.score = 0;
        this.turnCount = 0;
    }

    getAllCards() {
        return this.drawnCard ? [...this.hand, this.drawnCard] : [...this.hand];
    }
}

// ---------- NetworkedPlayer ----------
// PlayerEntity extended with networking metadata
class NetworkedPlayer extends PlayerEntity {
    constructor(id, name, isHuman, difficulty = 2) {
        super(id, name, isHuman, difficulty);
        // Networking identity — set once, never changed
        this.isLocal = false;    // "this player belongs to the local client"
        this.isRemote = false;   // "this player is on another machine"
        this.playerNumber = id;  // "logical slot 0-3, turn order 0->1->2->3"
        this.tablePosition = null; // 'N', 'E', 'S', 'W' — visual seat
    }
}
