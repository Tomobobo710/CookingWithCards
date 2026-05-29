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
