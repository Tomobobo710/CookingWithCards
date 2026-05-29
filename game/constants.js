const HOTPOT = {
    WIDTH: 800,
    HEIGHT: 600,

   CATEGORIES: {
        'Noodles':  { color: '#D4B896', icon: '🍜', ingredients: { 'Rice': '🍚', 'Wheat': '🌾', 'Glass': '🧊' } },
        'Fish':     { color: '#5B9BD5', icon: '🐟', ingredients: { 'Salmon': '🐠', 'Tuna': '🐡', 'Bass': '🐟' } },
        'Greens':   { color: '#70AD47', icon: '🥦', ingredients: { 'Spinach': '🍃', 'Kale': '🥬', 'Bok Choy': '🌿' } },
        'Spices':   { color: '#ED7D31', icon: '🧂', ingredients: { 'Chili': '🌶️', 'Anise': '🍬', 'Cinnamon': '🟤' } },
        'Veggies':  { color: '#FFC000', icon: '🥒', ingredients: { 'Carrot': '🥕', 'Potato': '🥔', 'Corn': '🌽' } },
        'Meat':     { color: '#C00000', icon: '🍖', ingredients: { 'Beef': '🥩', 'Pork': '🥓', 'Chicken': '🍗' } },
        'Shrooms':{ color: '#9B59B6', icon: '🍄', ingredients: { 'Shiitake': '🌰', 'Enoki': '🥢', 'Morel': '🗻' } },
        'Carbs':    { color: '#A0A0A0', icon: '🍚', ingredients: { 'Rice Cake': '🍙', 'Tofu': '🧈', 'Dumpling': '🥟' } }
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
        HIGHLIGHT: '#8B4513',
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
    },

    BOT_AI: {
        1: { stealThreshold: 50, discardIndex: 1, desc: 'Easy' },
        2: { stealThreshold: 20, discardIndex: 0, desc: 'Medium' },
        3: { stealThreshold: -5, discardIndex: 0, desc: 'Hard' }
    },

   SPEEDS: {
        1: { name: 'Slow',   move: 0.05, rotate: 0.05, scale: 0.05, flip: 0.035, botDelay: 120, thinkExtra: 240, msgDuration: 8 },
        2: { name: 'Medium', move: 0.10, rotate: 0.10, scale: 0.10, flip: 0.07,  botDelay: 60,  thinkExtra: 120, msgDuration: 5 },
        3: { name: 'Fast',   move: 0.20, rotate: 0.20, scale: 0.20, flip: 0.14,  botDelay: 30,  thinkExtra: 60,  msgDuration: 3 },
        4: { name: 'Ultra',  move: 0.50, rotate: 0.50, scale: 0.50, flip: 0.35,  botDelay: 10,  thinkExtra: 0,   msgDuration: 1 }
    }
};
