// ui.js
// Capa de presentación (F5): TODA la lectura/escritura del DOM vive aquí
// (getElementById, listeners, textos, telemetría y estados globales).
// Ni scene3d.js ni main.js manipulan el DOM directamente.

import { UI as UI_CONST } from './constants.js';

// Captura única de referencias (los módulos ES se ejecutan tras parsear el HTML)
const el = (id) => document.getElementById(id);

const elements = {
    sceneContainer: el('scene-container'),
    datePicker: el('date-picker'),
    searchBtn: el('search-btn'),
    loadingOverlay: el('loading-overlay'),
    loadingText: el('loading-text'),
    statusMessage: el('app-status'),
    infoPanel: el('info-panel'),
    closeBtn: el('close-panel'),
    astName: el('ast-name'),
    astDiameter: el('ast-diameter'),
    astVelocity: el('ast-velocity'),
    astDistance: el('ast-distance'),
    astHazard: el('ast-hazard'),
    sizeSlider: el('size-slider'),
    sizeLabel: el('size-label'),
    distanceSlider: el('distance-slider'),
    distanceLabel: el('dist-label'),
};

const formatNumber = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });

export const ui = {
    // --- Elemento de montaje de la escena WebGL ---
    get sceneContainerElement() {
        return elements.sceneContainer;
    },

    // --- Fecha y búsqueda ---
    getSelectedDate() {
        return elements.datePicker.value;
    },

    setSelectedDate(value) {
        elements.datePicker.value = value;
    },

    // --- Estados globales (carga, errores, botones) ---
    showLoading(text) {
        elements.loadingText.textContent = text ?? '';
        elements.loadingOverlay.classList.remove('hidden');
    },

    hideLoading() {
        elements.loadingOverlay.classList.add('hidden');
    },

    setSearchDisabled(disabled) {
        elements.searchBtn.disabled = disabled;
    },

    /** Reemplaza los alert() intrusivos por una línea de estado accesible. */
    setStatus(message) {
        elements.statusMessage.textContent = message ?? '';
        elements.statusMessage.hidden = !message;
    },

    // --- Panel de telemetría (info) ---
    setInfoVisible(visible) {
        elements.infoPanel.classList.toggle('hidden', !visible);
    },

    showTelemetry(data) {
        elements.astName.textContent = data.name;
        elements.astDiameter.textContent = formatNumber.format(data.estimated_diameter_max_km);
        elements.astVelocity.textContent = formatNumber.format(data.relative_velocity_km_h);
        elements.astDistance.textContent = formatNumber.format(data.miss_distance_km);

        const hazardous = Boolean(data.is_potentially_hazardous);
        elements.astHazard.textContent = hazardous ? 'SÍ ⚠️' : 'NO';
        elements.astHazard.style.color = hazardous
            ? UI_CONST.HAZARD_COLOR
            : UI_CONST.SAFE_COLOR;

        this.setInfoVisible(true);
    },

    // --- Cableado de eventos del usuario ---
    init({ onSearch, onSizeChange, onDistanceChange }) {
        elements.searchBtn.addEventListener('click', (event) => {
            onSearch(event);
        });

        elements.closeBtn.addEventListener('click', () => {
            this.setInfoVisible(false);
        });

        elements.sizeSlider.addEventListener('input', () => {
            const value = Number(elements.sizeSlider.value);
            elements.sizeLabel.textContent = `${value}x`;
            onSizeChange(value);
        });

        elements.distanceSlider.addEventListener('input', () => {
            const value = Number(elements.distanceSlider.value);
            elements.distanceLabel.textContent = `${Math.round(value / 1000)}k`;
            onDistanceChange(value);
        });

        // Sincroniza las etiquetas con el valor real de los sliders del HTML
        elements.sizeLabel.textContent = `${elements.sizeSlider.value}x`;
        elements.distanceLabel.textContent = `${Math.round(elements.distanceSlider.value / 1000)}k`;
    },
};
