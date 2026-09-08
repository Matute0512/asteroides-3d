// constants.js
// Centralización de los valores mágicos del frontend (F7): radios, límites de
// cámara, colores, divisores, texturas y mensajes reutilizados.
// Este módulo NO importa Three.js ni toca el DOM.

export const CAMERA = {
    FOV: 75,
    NEAR: 0.1,
    FAR: 3000,
    Z_POSITION: 150,
};

export const STARFIELD = {
    COUNT: 3000,
    RADIUS: 1500,
    SIZE: 1.5,
    OPACITY: 0.8,
    COLOR: 0xffffff,
};

export const CONTROLS = {
    DAMPING_FACTOR: 0.05,
};

export const LIGHTING = {
    AMBIENT_INTENSITY: 0.05,
    SUN_INTENSITY: 1.5,
    SUN_POSITION: { x: 50, y: 20, z: 30 },
};

export const EARTH = {
    RADIUS: 10,
    SEGMENTS: 64,
    SOLID_COLOR: 0x2244aa,
    TEXTURED_COLOR: 0xffffff, // color al aplicar la textura (no tiñe el mapa)
    ROUGHNESS: 0.6,
    METALNESS: 0.1,
    ROTATION_SPEED: 0.001,
    TEXTURE_URL:
        'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg',
};

export const ASTEROID = {
    GEOMETRY_RADIUS: 1,
    GEOMETRY_DETAIL: 1,
    COLOR: 0x888888,
    ROUGHNESS: 0.8,
    METALNESS: 0.2,
    MIN_VISUAL_SIZE: 0.3, // tamaño mínimo de una roca en unidades 3D
    ORBIT_MIN_DISTANCE: 12, // radio mínimo de colocación (Tierra=10 + holgura)
    MAX_SPIN_SPEED: 0.008, // velocidad máxima de giro propio (rad/fotograma)
};

export const SCALE = {
    DEFAULT_SIZE_MULTIPLIER: 15,
    DEFAULT_DISTANCE_DIVISOR: 400000,
    SIZE_SLIDER: { MIN: 1, MAX: 100, STEP: 1 },
    DISTANCE_SLIDER: { MIN: 50000, MAX: 800000, STEP: 10000 },
};

export const RENDER = {
    MAX_ASTEROIDS: 500,
};

export const UI = {
    DATE_PATTERN: /^\d{4}-\d{2}-\d{2}$/,
    HAZARD_COLOR: '#ef4444',
    SAFE_COLOR: '#4ade80',
    MESSAGES: {
        INITIALIZING: 'Inicializando motor 3D',
        SEARCHING: 'Buscando en el espacio profundo...',
        INVALID_DATE: 'Fecha inválida. Usa el selector de fecha.',
        LOAD_ERROR: 'Error al conectar con el backend.',
        EMPTY_SPACE: (date) =>
            `El espacio está despejado. No hay asteroides registrados para el ${date}.`,
        RENDER_LIMIT: (shown, total) => `[App] Render limitado: ${total} -> ${shown}`,
    },
};
