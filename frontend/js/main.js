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

// --- LÓGICA DE NEGOCIO PRINCIPAL ---
async function loadAsteroidsForDate(dateStr) {
    searchBtn.disabled = true;
    try {
        loadingText.textContent = 'Buscando en el espacio profundo...';
        loadingOverlay.classList.remove('hidden');
        app.clearAsteroids();
        const asteroides = await apiClient.fetchAsteroidsByDate(dateStr);
        if (asteroides.length > 0) {
            app.createAsteroids(asteroides);
        } else {
            console.warn(`[App] El espacio está despejado. No hay asteroides registrados para el ${dateStr}.`);
        }
    } catch (error) {
        console.error("[App] Fallo de conexión o renderizado:", error);
        alert("Fallo crítico al conectar con el centro de control (Backend).");
    } finally {
        loadingOverlay.classList.add('hidden');
        searchBtn.disabled = false;
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