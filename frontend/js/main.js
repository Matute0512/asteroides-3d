import { SpaceScene } from './scene3d.js';
import {apiClient} from './api_client.js';

// Inicializamos el motor gráfico inyectándolo en el contenedor del HTML
const app = new SpaceScene('scene-container');

// --- REFERENCIAS A LA UI ---
const datePicker = document.getElementById('date-picker');
const searchBtn = document.getElementById('search-btn');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');

// Función de utilidad para obtener la fecha de hoy en formato YYYY-MM-DD
const getTodayString = () => new Date().toISOString().split('T')[0];

let isLoading = false;

// --- LÓGICA DE NEGOCIO PRINCIPAL ---
async function loadAsteroidsForDate(dateStr) {
    if (isLoading) return;
    isLoading = true;

    const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
    if (!isValidDate){
        alert("Fecha inválida. Usa el selector de fecha.");
        return;
    }
    searchBtn.disabled = true;
    try {
        loadingText.textContent = 'Buscando en el espacio profundo...';
        loadingOverlay.classList.remove('hidden');
        const asteroides = await apiClient.fetchAsteroidsByDate(dateStr);

        if (asteroides.length > 0) {
            const MAX_RENDER = 500;
            const safeList = asteroides.slice(0, MAX_RENDER);
            app.createAsteroids(safeList);
            if (asteroides.length > MAX_RENDER) {
                console.warn(`[App] Render limitado: ${asteroides.length} -> ${MAX_RENDER}`);
            }
        } else {
            console.warn(`[App] El espacio está despejado. No hay asteroides registrados para el ${dateStr}.`);
        }
    } catch (error) {
        console.error("[App] Fallo de conexión o renderizado:", error);
        loadingText.textContent = "Error al conectar con el backend.";
    } finally {
        loadingOverlay.classList.add('hidden');
        searchBtn.disabled = false;
        isLoading = false;
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
    const selectedDate = datePicker.value || today;
    datePicker.value = selectedDate;
    // El overlay ya está visible con "Inicializando motor 3D..."
    // loadAsteroidsForDate lo cambia a "Buscando en el espacio profundo..."
    // y lo oculta cuando termina
    loadAsteroidsForDate(selectedDate);
}

bootApplication();