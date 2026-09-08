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

export const CONTROLS = {
    DAMPING_FACTOR: 0.05,
};

export const LIGHTING = {
    AMBIENT_INTENSITY: 0.05,
    SUN_INTENSITY: 1.5,
    SUN_POSITION: { x: 50, y: 20, z: 30 },
};

export const EARTH = {
    RADIUS: 10, // radio escénico de la Tierra (unidad base de la escala, F3)
    DIAMETER_KM: 12742, // diámetro real de la Tierra (para normalizar tamaños)
    SEGMENTS: 64,
    SOLID_COLOR: 0x2244aa,
    TEXTURED_COLOR: 0xffffff, // color al aplicar la textura (no tiñe el mapa)
    ROUGHNESS: 0.6,
    METALNESS: 0.1,
    ROTATION_SPEED: 0.001,
    SURFACE_TEXTURE_URL:
        'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg',
    // Capa de nubes lista para recibir textura (F1); opacidad 0 hasta aplicarla.
    CLOUD_RADIUS_SCALE: 1.02, // la envoltura queda ligeramente sobre la superficie
    CLOUD_COLOR: 0xffffff,
    CLOUD_OPACITY: 0.85,
    CLOUD_ROTATION_FACTOR: 1.4, // las nubes derivan un poco más rápido que el suelo
};

export const ASTEROID = {
    GEOMETRY_RADIUS: 1,
    GEOMETRY_DETAIL: 1,
    COLOR: 0x888888,
    ROUGHNESS: 0.8,
    METALNESS: 0.2,
    MIN_VISUAL_RADIUS: 0.25, // radio mínimo renderizado (para que siga siendo clicable)
    MAX_SPIN_SPEED: 0.008, // velocidad máxima de giro propio (rad/fotograma)
};

export const SCALE = {
    DEFAULT_SIZE_MULTIPLIER: 15, // exageración de tamaño (slider), normalizada a default
    DEFAULT_DISTANCE_DIVISOR: 400000, // compresión de distancia (slider)
    // El radio de un asteroide nunca excede esta fracción del radio terrestre.
    MAX_ASTEROID_RADIUS_EARTHS: 0.6,
    // Margen entre la superficie terrestre y el borde del asteroide (unidades 3D).
    SAFETY_GAP: 1.5,
    DISTANCE: {
        // Unidades de radio terrestre que se añaden por cada unidad log10 de distancia
        // normalizada (controla cuán lejos llega el "universo" comprimido).
        EARTHS_PER_LOG: 7,
    },
    SIZE_SLIDER: { MIN: 1, MAX: 100, STEP: 1 },
    DISTANCE_SLIDER: { MIN: 50000, MAX: 800000, STEP: 10000 },
};

export const SKYBOX = {
    // 6 caras del cubemap en orden [+x, -x, +y, -y, +z, -z].
    // Vacío => se genera un cielo procedural de estrellas (canvas) al vuelo.
    // Para usar imágenes reales, copia 6 texturas en frontend/assets/skybox/ y
    // lista aquí sus rutas (p. ej. 'assets/skybox/px.jpg').
    TEXTURES: [],
    FACE_SIZE: 512,
    STARS_PER_FACE: 260,
    BRIGHT_STARS_PER_FACE: 10,
    STAR_COLOR: '#ffffff',
    BACKGROUND: '#04060f',
    // Tinte sutil por cara para dar variedad galáctica al cielo generado.
    FACE_TINTS: ['#101a3c', '#0d1430', '#12102e', '#0a1428', '#0e1230', '#0b1730'],
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
