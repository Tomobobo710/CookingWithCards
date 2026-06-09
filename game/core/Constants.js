const HOTPOT = {
    WIDTH: 1280,
    HEIGHT: 720,

    POSITIONS: ["S", "W", "N", "E"],

    // ---------- Layout presets ----------
    // Swap with: HOTPOT.LAYOUT = HOTPOT.LAYOUTS.portrait;
    // Add new presets by adding a key to HOTPOT.LAYOUTS.
    LAYOUTS: {
        landscape: null, // filled below
        portrait: null // filled below
    },
    // Active preset — swap at any time: HOTPOT.LAYOUT = HOTPOT.LAYOUTS.portrait
    LAYOUT: null,

    CATEGORIES: {
        Noodles: { color: "#D4B896", icon: "🍜", ingredients: { Rice: "🍚", Wheat: "🌾", Glass: "🧊" } },
        Fish: { color: "#5B9BD5", icon: "🐟", ingredients: { Salmon: "🐠", Tuna: "🐡", Bass: "🐟" } },
        Greens: { color: "#70AD47", icon: "🥦", ingredients: { Spinach: "🍃", Kale: "🥬", "Bok Choy": "🌿" } },
        Spices: { color: "#ED7D31", icon: "🧂", ingredients: { Chili: "🌶️", Anise: "🍬", Cinnamon: "🟤" } },
        Veggies: { color: "#FFC000", icon: "🥒", ingredients: { Carrot: "🥕", Potato: "🥔", Corn: "🌽" } },
        Meat: { color: "#C00000", icon: "🍖", ingredients: { Beef: "🥩", Pork: "🥓", Chicken: "🍗" } },
        Shrooms: { color: "#9B59B6", icon: "🍄", ingredients: { Shiitake: "🌰", Enoki: "🥢", Morel: "🗻" } },
        Carbs: { color: "#A0A0A0", icon: "🍚", ingredients: { "Rice Cake": "🍙", Tofu: "🧈", Dumpling: "🥟" } }
    },

    getCategories() {
        return Object.keys(HOTPOT.CATEGORIES);
    },

    GAME: {
        INITIAL_HAND: 8,
        SETS_TO_WIN: 3,
        COPIES_PER_INGREDIENT: 4,
        TOTAL_CARDS: 96
    },

    COLORS: {
        BACKGROUND: "#1a0f0a",
        UI_BG: "rgba(40, 20, 10, 0.9)",
        UI_BORDER: "#8b4513",
        TEXT: "#f5deb3",
        HIGHLIGHT: "#8B4513",
        SET_COMPLETED: "#90ee90",
        CARD_BG: "#fff8dc",
        PLAYER_PANEL: "rgba(60, 30, 15, 0.8)",
        WIN_BUTTON: "#2e7d32",
        WIN_BUTTON_HOVER: "#388e3c",
        DEBUG_BG: "rgba(0,0,0,0.7)",
        DEBUG_TEXT: "#00ff00",
        GLOW: "#ffd700",
        PLAYER_TURN: "#00ff00",

        PROFILE: {
            colorBackground: "#1a0f0a",
            colorSurface: "#28140a",
            colorSurfaceRaised: "#3c1e0f",
            colorSurfaceOverlay: "#2a150b",
            colorPrimary: "#8b4513",
            colorPrimaryHover: "#a0522d",
            colorPrimaryText: "#f5deb3",
            colorText: "#f5deb3",
            colorTextMuted: "#c4a882",
            colorBorder: "#8b4513",
            colorGhostBg: "rgba(139, 69, 19, 0.15)",
            colorGhostBorder: "rgba(139, 69, 19, 0.4)",
            colorDanger: "#8b0000",
            colorShadow: "#000000",
            colorTextInverse: "#1a0f0a"
        }
    },

    BOT_AI: {
        1: { stealThreshold: 50, discardIndex: 1, desc: "Easy" },
        2: { stealThreshold: 20, discardIndex: 0, desc: "Medium" },
        3: { stealThreshold: -5, discardIndex: 0, desc: "Hard" }
    },

    SPEEDS: {
        1: {
            name: "Slow",
            move: 0.05,
            rotate: 0.05,
            scale: 0.05,
            flip: 0.035,
            botDelay: 120,
            thinkExtra: 240,
            msgDuration: 8
        },
        2: {
            name: "Medium",
            move: 0.1,
            rotate: 0.1,
            scale: 0.1,
            flip: 0.07,
            botDelay: 60,
            thinkExtra: 120,
            msgDuration: 5
        },
        3: {
            name: "Fast",
            move: 0.2,
            rotate: 0.2,
            scale: 0.2,
            flip: 0.14,
            botDelay: 30,
            thinkExtra: 60,
            msgDuration: 3
        },
        4: {
            name: "Ultra",
            move: 0.5,
            rotate: 0.5,
            scale: 0.5,
            flip: 0.35,
            botDelay: 10,
            thinkExtra: 0,
            msgDuration: 1
        }
    }
};

// ---------- Layout presets ----------
// Define card display
const _c = { CARD_BASE_WIDTH: 80, CARD_BASE_HEIGHT: 115 };
// Helper: add computed getters to a layout preset
function _defLayout(vals) {
    return Object.defineProperties(vals, {
        CARD_WIDTH: {
            get() {
                return vals.CARD_BASE_WIDTH * vals.CARD_SCALE;
            }
        },
        CARD_HEIGHT: {
            get() {
                return vals.CARD_BASE_HEIGHT * vals.CARD_SCALE;
            }
        }
    });
}

// ---- Landscape (1280x720) ----
HOTPOT.LAYOUTS.landscape = _defLayout({
    ..._c,
    CARD_SCALE: 0.85,
    CARD_SPACING: 8,
    HAND_Y: 555,
    HAND_CATEGORY_LABEL_OFFSET: -5,
    DRAWN_Y: 400,
    DRAWN_OFFSET_X: 240,
    CENTER_Y: 260,
    PANEL_WIDTH: 190,
    PANEL_HEIGHT: 120,
    MSG_Y: 135,
    MSG_WIDTH: 580,
    MSG_HEIGHT: 50,
    SETTINGS_BUTTON_RIGHT: 105,
    SETTINGS_BUTTON_Y: 12,
    SETTINGS_BUTTON_W: 90,
    SETTINGS_BUTTON_H: 34,
    EAT_BUTTON_X: 530,
    EAT_BUTTON_Y: 320,
    EAT_BUTTON_WIDTH: 220,
    EAT_BUTTON_HEIGHT: 55,
    MENU_BUTTON_WIDTH: 260,
    MENU_BUTTON_HEIGHT: 65,
    MENU_BUTTON_START_Y: 290,
    MENU_BUTTON_SPACING: 80,
    MENU_TITLE_Y: 200,
    MENU_SUBTITLE_Y: 240,
    MENU_INFO_START_Y: 430,
    MENU_INFO_LINE_HEIGHT: 22,
    MP_TITLE_Y: 160,
    MP_BUTTON_START_Y: 250,
    WAITING_TITLE_Y: 220,
    WAITING_SUBTITLE_Y: 270,
    WAITING_BUTTON_START_Y: 380,
    WAITCANCEL_TITLE_Y: 220,
    WAITCANCEL_BUTTON_START_Y: 310,
    WAITHOST_TITLE_Y: 260,
    WAITHOST_SUBTITLE_Y: 310,
    WAITHOST_BUTTON_START_Y: 390,
    DISCONNECT_TITLE_Y: 220,
    DISCONNECT_SUBTITLE_Y: 270,
    DISCONNECT_BUTTON_START_Y: 310,
    SHUTDOWN_TITLE_Y: 260,
    SHUTDOWN_SUBTITLE_Y: 310,
    SHUTDOWN_BUTTON_START_Y: 350,
    REMATCH_TITLE_Y: 220,
    REMATCH_SUBTITLE_Y: 270,
    REMATCH_BUTTON_START_Y: 380,
    GAMEOVER_TITLE_Y: 180,
    GAMEOVER_WINNER_SCORE_Y: 220,
    GAMEOVER_SCORES_START_Y: 260,
    GAMEOVER_BUTTON_START_Y: 390,
    GAMEOVER_BUTTON_WIDTH: 260,
    GAMEOVER_BUTTON_HEIGHT: 65,
    GAMEOVER_BUTTON_SPACING: 80,
    DISCARD_GAP: 60,
    DISCARD_HORIZONTAL_EXTRA: 14,
    OTHER_CARD_SCALE: 0.5,
    OTHER_CARD_SPACING: 6,
    OTHER_DRAWN_PADDING: 8,
    SIDE_EDGE_OFFSET: 14,
    TOP_OFFSET: 12,
    SETTINGS_MODAL_WIDTH: 320,
    SETTINGS_MODAL_HEIGHT_OFFLINE: 300,
    SETTINGS_MODAL_HEIGHT_ONLINE: 200,
    SETTINGS_BTN_WIDTH: 130,
    SETTINGS_BTN_HEIGHT: 38,
    SETTINGS_BTN_VGAP: 48,
    SETTINGS_SPEED_Y_OFFSET: 110,
    CONFIRM_MODAL_WIDTH: 420,
    CONFIRM_MODAL_HEIGHT: 150,
    CONFIRM_BTN_WIDTH: 130,
    CONFIRM_BTN_HEIGHT: 38,
    CONFIRM_BTN_SPACING: 22,
    PROFILE_MODAL_WIDTH: 460,
    PROFILE_MODAL_HEIGHT: 400,
    BUTTON_WIDTH: 260,
    BUTTON_HEIGHT: 65,
    BUTTON_SPACING: 80,
    TITLE_SCREEN_BUTTON_START_Y: 250
});

// ---- Portrait (720x1280) — placeholder, tune per-orientation ----
HOTPOT.LAYOUTS.portrait = _defLayout({
    ..._c,
    CARD_SCALE: 0.65,
    CARD_SPACING: 6,
    HAND_Y: 1050,
    HAND_CATEGORY_LABEL_OFFSET: -5,
    DRAWN_Y: 700,
    DRAWN_OFFSET_X: 0,
    CENTER_Y: 500,
    PANEL_WIDTH: 160,
    PANEL_HEIGHT: 100,
    MSG_Y: 300,
    MSG_WIDTH: 400,
    MSG_HEIGHT: 50,
    SETTINGS_BUTTON_RIGHT: 60,
    SETTINGS_BUTTON_Y: 12,
    SETTINGS_BUTTON_W: 50,
    SETTINGS_BUTTON_H: 34,
    EAT_BUTTON_X: 250,
    EAT_BUTTON_Y: 600,
    EAT_BUTTON_WIDTH: 220,
    EAT_BUTTON_HEIGHT: 55,
    MENU_BUTTON_WIDTH: 260,
    MENU_BUTTON_HEIGHT: 65,
    MENU_BUTTON_START_Y: 550,
    MENU_BUTTON_SPACING: 80,
    MENU_TITLE_Y: 420,
    MENU_SUBTITLE_Y: 480,
    MENU_INFO_START_Y: 750,
    MENU_INFO_LINE_HEIGHT: 22,
    MP_TITLE_Y: 350,
    MP_BUTTON_START_Y: 480,
    WAITING_TITLE_Y: 420,
    WAITING_SUBTITLE_Y: 480,
    WAITING_BUTTON_START_Y: 650,
    WAITCANCEL_TITLE_Y: 420,
    WAITCANCEL_BUTTON_START_Y: 560,
    WAITHOST_TITLE_Y: 480,
    WAITHOST_SUBTITLE_Y: 540,
    WAITHOST_BUTTON_START_Y: 660,
    DISCONNECT_TITLE_Y: 420,
    DISCONNECT_SUBTITLE_Y: 480,
    DISCONNECT_BUTTON_START_Y: 560,
    SHUTDOWN_TITLE_Y: 480,
    SHUTDOWN_SUBTITLE_Y: 540,
    SHUTDOWN_BUTTON_START_Y: 620,
    REMATCH_TITLE_Y: 420,
    REMATCH_SUBTITLE_Y: 480,
    REMATCH_BUTTON_START_Y: 650,
    GAMEOVER_TITLE_Y: 380,
    GAMEOVER_WINNER_SCORE_Y: 430,
    GAMEOVER_SCORES_START_Y: 490,
    GAMEOVER_BUTTON_START_Y: 680,
    GAMEOVER_BUTTON_WIDTH: 260,
    GAMEOVER_BUTTON_HEIGHT: 65,
    GAMEOVER_BUTTON_SPACING: 80,
    DISCARD_GAP: 80,
    DISCARD_HORIZONTAL_EXTRA: 10,
    OTHER_CARD_SCALE: 0.4,
    OTHER_CARD_SPACING: 4,
    OTHER_DRAWN_PADDING: 6,
    SIDE_EDGE_OFFSET: 10,
    TOP_OFFSET: 8,
    SETTINGS_MODAL_WIDTH: 300,
    SETTINGS_MODAL_HEIGHT_OFFLINE: 280,
    SETTINGS_MODAL_HEIGHT_ONLINE: 200,
    SETTINGS_BTN_WIDTH: 130,
    SETTINGS_BTN_HEIGHT: 38,
    SETTINGS_BTN_VGAP: 48,
    SETTINGS_SPEED_Y_OFFSET: 110,
    CONFIRM_MODAL_WIDTH: 340,
    CONFIRM_MODAL_HEIGHT: 130,
    CONFIRM_BTN_WIDTH: 120,
    CONFIRM_BTN_HEIGHT: 35,
    CONFIRM_BTN_SPACING: 20,
    PROFILE_MODAL_WIDTH: 400,
    PROFILE_MODAL_HEIGHT: 360,
    BUTTON_WIDTH: 260,
    BUTTON_HEIGHT: 65,
    BUTTON_SPACING: 80,
    TITLE_SCREEN_BUTTON_START_Y: 500
});

// Activate landscape by default
HOTPOT.LAYOUT = HOTPOT.LAYOUTS.landscape;