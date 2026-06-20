class ApiClient{
    constructor() {
    const isLocal = window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1';

    this.baseUrl = isLocal
        ? 'http://127.0.0.1:8000/api'
        : `${window.location.origin}/api`;
}

    /**
     * Obtine la lista de asteroides para una fecha específica.
     * @param {string} date - Fecha en formato 'YYYY-MM-DD'
     * @returns {Promise<Arry>} Un array de objetos con los datos de los asteroides.
     */
    async fetchAsteroidsByDate(date){
        // Construimos el endpoint limpio
        const endpoint = `${this.baseUrl}/asteroids/?date=${date}`;
        console.log(`[ApiClient] Solicitando asteroides para la fecha: ${date}...`);

        try{
            // Iniciamos la petición HTTP asíncrona
            const response = await fetch(endpoint);

            if(!response.ok){
                throw new Error(`El servidor respondió con un error: HTTP ${response.status}`);
            }

            // Parseamos y retornamos los datos limpios
            const data = await response.json();
            console.log(`[ApiClient] Datos recibidos con éxito: ${data.length} asteroides.`);
            return data;

        } catch (error){
            console.error("[ApiClient] Fallo crítico al conectar con el backend. ¿Está encendido Uvicorn?", error);
            throw error;
        }
    }
}


// Exportamos una instancia única (Singleton) lista para usarse
export const apiClient = new ApiClient();