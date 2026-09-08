// main.js
// Controlador/compositor del frontend: une la capa de datos (apiClient),
// la de presentación (ui) y el motor WebGL (SpaceScene). No toca el DOM.

import { SpaceScene } from './scene3d.js';
import { apiClient } from './api_client.js';
import { ui } from './ui.js';
import { RENDER, UI as UI_CONST } from './constants.js';

// Inicializamos el motor gráfico inyectándole el contenedor desde la capa UI
const scene = new SpaceScene(ui.sceneContainerElement);

// La selección por raycast se notifica a la capa de presentación
scene.setOnAsteroidSelected((asteroid) => ui.showTelemetry(asteroid));

let isLoading = false;

// --- LÓGICA DE NEGOCIO PRINCIPAL ---
async function loadAsteroidsForDate(dateStr) {
    if (isLoading) return;
    isLoading = true;

    const isValidDate = UI_CONST.DATE_PATTERN.test(dateStr);
    if (!isValidDate) {
        ui.setStatus(UI_CONST.MESSAGES.INVALID_DATE);
        isLoading = false;
        return;
    }

    ui.setSearchDisabled(true);
    try {
        ui.showLoading(UI_CONST.MESSAGES.SEARCHING);
        const asteroides = await apiClient.fetchAsteroidsByDate(dateStr);

        // Sustituimos el contenido anterior por el resultado de esta búsqueda,
        // aunque venga vacío: la escena siempre queda coherente con los datos.
        scene.clearAsteroids();

        if (asteroides.length > 0) {
            const safeList = asteroides.slice(0, RENDER.MAX_ASTEROIDS);
            scene.createAsteroids(safeList);
            if (asteroides.length > RENDER.MAX_ASTEROIDS) {
                console.warn(UI_CONST.MESSAGES.RENDER_LIMIT(safeList.length, asteroides.length));
            }
        } else {
            console.warn(UI_CONST.MESSAGES.EMPTY_SPACE(dateStr));
        }
    } catch (error) {
        console.error('[App] Fallo de conexión o renderizado:', error);
        ui.setStatus(UI_CONST.MESSAGES.LOAD_ERROR);
    } finally {
        ui.hideLoading();
        ui.setSearchDisabled(false);
        isLoading = false;
    }
}

// --- CABLEADO DE EVENTOS (delegado a la capa UI) ---
function bootApplication() {
    // Fecha de hoy en formato YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    const selectedDate = ui.getSelectedDate() || today;
    ui.setSelectedDate(selectedDate);

    ui.init({
        onSearch: (event) => {
            event.preventDefault();
            if (ui.getSelectedDate()) {
                loadAsteroidsForDate(ui.getSelectedDate());
            }
        },
        onSizeChange: (value) => scene.updateScale({ sizeMultiplier: value }),
        onDistanceChange: (value) => scene.updateScale({ distanceDivisor: value }),
    });

    // El overlay ya está visible con "Inicializando motor 3D..."
    loadAsteroidsForDate(selectedDate);
}

bootApplication();
