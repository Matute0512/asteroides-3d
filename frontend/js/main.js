import { SpaceScene } from './scene3d.js';
import {apiClient} from './api_client.js';

// Inicializamos el motor gráfico inyectándolo en el contenedor del HTML
const app = new SpaceScene('scene-container');

// --- REFERENCIAS A LA UI ---
const datePicker = document.getElementById('date-picker');
const searchBtn = document.getElementById('search-btn');
const loadingOverlay = document.getElementById('loading-overlay');

// Función de utilidad para obtener la fecha de hoy en formato YYYY-MM-DD
const getTodayString = () => new Date().toISOString().split('T')[0];

// --- LÓGICA DE NEGOCIO PRINCIPAL ---
async function loadAsteroidsForDate(dateStr) {
    try {
        // Mostrar pantalla de carga (Bloque la UI para evitar doble click)
        loadingOverlay.classList.remove('hidden');

        // Limpiar el universo viejo en WebGL
        app.clearAsteroids();

        // Descargar los datos desde el backend (Patrón Cache-Aside)
        const asteroides = await apiClient.fetchAsteroidsByDate(dateStr);

        // Procesar y dibujar si hay resultados
        if (asteroides.length > 0){
            app.createAsteroids(asteroides);
        } else {
            console.warn(`[App] El espacio está despejado. No hay asteroides registrados para el ${dateStr}.`);
        }
    } catch (error){
        console.error("[App] Fallo de conexión o renderizado:", error);
        alert("Fallo crítico al conectar con el centro de control (Backend).");
    } finally {
        // Ocultar la pantalla de carga (Ya sea por éxito o fallo)
        loadingOverlay.classList.add('hidden');
    }

}

// --- EVENTOS DEL USUARIO ---
searchBtn.addEventListener('click', (event) => {
    // Bloqueamos cualquier recarga automática de la página
    event.preventDefault();
    if (datePicker.value){
        loadAsteroidsForDate(datePicker.value);
    }
});

// --- BOOTSTRAP (Arranque Inicial) ---
function bootApplication() {
    const today = getTodayString();
    // Pre-llamamos al input del calendario con la fecha de hoy
    datePicker.value = today;

    // Disparamos la primera búsqueda automáticamente
    loadAsteroidsForDate(today);
}

bootApplication();