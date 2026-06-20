import { SpaceScene } from './scene3d.js';
import {apiClient} from './api_client.js';

// Inicializamos el motor gráfico inyectándolo en el contenedor del HTML
const app = new SpaceScene('scene-container');

// Función asincrona temporal para la prueba de integración
async function bootAplication() {
    try {
        // Usamos una fecha constante para nuestra primera prueba visual masiva
        const targetDate = '2026-06-20';
        console.log(`[App] Inicializando simulación para la fecha: ${targetDate}`);

        // Solicitamos los datos a nuestro backend en FastAPI
        const asteroides = await apiClient.fetchAsteroidsByDate(targetDate);

        // Inyectamos el JSON procesado a la escena de Three.js
        app.createAsteroids(asteroides);

        console.log(`[App] Universo poblado con éxito. Renderizando ${asteroides.length} asteroides.`);

    } catch (error) {
        console.error("[App] Fallo crítico durante el arranque de la aplicación:", error);
    }
}

bootAplication();