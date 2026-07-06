import { SpaceScene } from './scene3d.js';
import {apiClient} from './api_client.js';

// Inicializamos el motor gráfico inyectándolo en el contenedor del HTML
const app = new SpaceScene('scene-container');

// --- REFERENCIAS A LA UI ---
const datePicker = document.getElementById('date-picker');
const searchBtn = document.getElementById('search-btn');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');
const themeToggle = document.getElementById('theme-toggle');
const resultsCount = document.getElementById('results-count');
const countValue = document.getElementById('count-value');

// Función de utilidad para obtener la fecha de hoy en formato YYYY-MM-DD
const getTodayString = () => new Date().toISOString().split('T')[0];

let isLoading = false;
let isDarkMode = true;

// --- SISTEMA DE NOTIFICACIONES (TOAST) ---
/**
 * Muestra una notificación visual en la esquina inferior derecha
 * @param {string} message - Mensaje a mostrar
 * @param {string} type - Tipo de notificación: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duración en milisegundos (default: 4000)
 */
function showNotification(message, type = 'info', duration = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'alert');
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Auto-remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// --- SISTEMA DE TEMA CLARO/OSCURO ---
/**
 * Inicializa el sistema de tema
 */
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    isDarkMode = savedTheme === 'dark';
    applyTheme(isDarkMode);
}

/**
 * Aplica el tema a la aplicación
 * @param {boolean} dark - true para tema oscuro, false para claro
 */
function applyTheme(dark) {
    if (dark) {
        document.documentElement.removeAttribute('data-theme');
        themeToggle.textContent = '🌙';
        themeToggle.title = 'Cambiar a tema claro';
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        themeToggle.textContent = '☀️';
        themeToggle.title = 'Cambiar a tema oscuro';
    }
    localStorage.setItem('theme', dark ? 'dark' : 'light');
}

/**
 * Toggle entre tema claro y oscuro
 */
themeToggle.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    applyTheme(isDarkMode);
    showNotification(
        isDarkMode ? '🌙 Tema oscuro activado' : '☀️ Tema claro activado',
        'info',
        2000
    );
});

// --- LÓGICA DE NEGOCIO PRINCIPAL ---
/**
 * Carga asteroides para una fecha específica
 * @param {string} dateStr - Fecha en formato YYYY-MM-DD
 */
async function loadAsteroidsForDate(dateStr) {
    if (isLoading) return;
    isLoading = true;

    const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
    if (!isValidDate) {
        showNotification('⚠️ Fecha inválida. Usa el selector de fecha.', 'warning');
        isLoading = false;
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
            
            // Limpiar asteroides anteriores
            app.clearAsteroids();
            
            // Crear nuevos asteroides
            app.createAsteroids(safeList);
            
            // Mostrar contador de resultados
            countValue.textContent = asteroides.length;
            resultsCount.classList.remove('hidden');
            
            // Notificación de éxito
            const displayCount = Math.min(asteroides.length, MAX_RENDER);
            showNotification(
                `✅ Se encontraron ${asteroides.length} asteroides (mostrando ${displayCount})`,
                'success',
                3000
            );
            
            if (asteroides.length > MAX_RENDER) {
                console.warn(`[App] Render limitado: ${asteroides.length} -> ${MAX_RENDER}`);
                showNotification(
                    `⚠️ Se muestran ${MAX_RENDER} de ${asteroides.length} asteroides`,
                    'warning',
                    3000
                );
            }
        } else {
            resultsCount.classList.add('hidden');
            showNotification(
                `❌ No hay asteroides registrados para ${dateStr}`,
                'warning',
                3000
            );
            console.warn(`[App] El espacio está despejado para ${dateStr}`);
        }
    } catch (error) {
        console.error("[App] Fallo de conexión o renderizado:", error);
        resultsCount.classList.add('hidden');
        
        // Mensaje de error más específico
        const errorMessage = error.message === 'Failed to fetch'
            ? '❌ No se puede conectar con el servidor. Verifica tu conexión.'
            : '❌ Error al conectar con el backend.';
        
        showNotification(errorMessage, 'error', 4000);
    } finally {
        loadingOverlay.classList.add('hidden');
        searchBtn.disabled = false;
        isLoading = false;
    }
}

// --- EVENTOS DEL USUARIO ---
/**
 * Evento de búsqueda de asteroides
 */
searchBtn.addEventListener('click', (event) => {
    event.preventDefault();
    if (datePicker.value) {
        loadAsteroidsForDate(datePicker.value);
    } else {
        showNotification('⚠️ Por favor selecciona una fecha', 'warning');
    }
});

/**
 * Permitir buscar con Enter en el input de fecha
 */
datePicker.addEventListener('keypress', (event) => {
    if (event.key === 'Enter' && datePicker.value) {
        loadAsteroidsForDate(datePicker.value);
    }
});

// --- BOOTSTRAP (Arranque Inicial) ---
/**
 * Inicializa la aplicación
 */
function bootApplication() {
    // Inicializar tema
    initTheme();
    
    // Establecer fecha por defecto
    const today = getTodayString();
    const selectedDate = datePicker.value || today;
    datePicker.value = selectedDate;
    
    // Cargar asteroides del día
    loadAsteroidsForDate(selectedDate);
    
    console.log('✅ Aplicación iniciada correctamente');
}

bootApplication();
