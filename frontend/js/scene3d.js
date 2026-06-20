import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class SpaceScene {
    constructor(containerId) {
        // 1. Configuración Base
        this.container = document.getElementById(containerId);


        // 2. Escena
        this.scene = new THREE.Scene();

        // 3. Cámara
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 50;

        // 4. Renderizador
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // 5. Controles
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;

        // 6. Fondo Espacial (encendemos las estrellas primero)
        this.#createStarfield();

        // 7. Iluminación
        this.setupLights();

        // 8. Planeta Tierra
        this.createEarth();

        // 9. Array para almacenar rocas
        this.asteroids = [];

        // 10. Eventos  y Bucle
        window.addEventListener('resize', () => this.onWindowResize());
        this.animate();
    }

    // Sistema de Particulas
    #createStarfield(){
        const STAR_COUNT = 3000;
        // Las colocamos lejos pero dentro del rango visual de la cámara
        const UNIVERSE_RADIUS = 800;

        const geometry = new THREE.BufferGeometry();
        // Array plano de 32 bits directo a la GPU (3 valores por estrella)
        const positions = new Float32Array(STAR_COUNT * 3);

        for (let i = 0; i < STAR_COUNT; i++ ){
            // Coordenadas esféricas uniformes
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);

            // Conversión a cartesianas
            const x = UNIVERSE_RADIUS * Math.sin(phi) * Math.cos(theta);
            const y = UNIVERSE_RADIUS * Math.cos(phi);
            const z = UNIVERSE_RADIUS * Math.sin(phi) * Math.sin(theta);

            // Inyectamos las coordenadas en el bloque correspondiente
            const index = i * 3;
            positions[index] = x;
            positions[index + 1] = y;
            positions[index + 2] = z;
        }

        // Asignamos el array de posiciones a la geometria
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        // Material especializado para puntos
        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 1.5,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true // Atenuación de tamaño par la distancia
        });

        const starfield = new THREE.Points(geometry, material);
        this.scene.add(starfield);
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.05);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
        sunLight.position.set(50, 20, 30);
        this.scene.add(sunLight);
    }

    createEarth() {
        const textureLoader = new THREE.TextureLoader();
        const EARTH_TEXTURE_URL = 'https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg';
        const earthTexture = textureLoader.load(EARTH_TEXTURE_URL);

        const earthGeometry = new THREE.SphereGeometry(10, 64, 64);
        const earthMaterial = new THREE.MeshStandardMaterial({
            map: earthTexture,
            roughness: 0.6,
            metalness: 0.1
        });

        this.earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
        this.scene.add(this.earthMesh);
    }

    createAsteroids(asteroidsData){
        // Constantes de Escala Artística
        const DISTANCE_DIVISOR =200000; // Acerca las rocas al planeta
        const SIZE_MULTIPLIER = 1.5; // Infla el tamaño para visibilidad

        // MMaterial rocoso base que reaccioa a la luz direccional (El sol)
        const asteroidMaterial = new THREE.MeshStandardMaterial({
            color: 0x888888, // Gris espacial
            roughness: 0.8, // Superficie opaca y rocosa
            metalness: 0.2 // Ligeramente metálico para los minerales
        });

        asteroidsData.forEach( ast => {
            // Tamaño: Aseguramos un mínimo de visibilidad usando Math.max
            const visualSize = Math.max(0.3, ast.estimated_diameter_max_km * SIZE_MULTIPLIER);

            // Usamos un Dodecaero con 'detail: 1' para generar una malla poligonal e irregular
            const geometry = new THREE.DodecahedronGeometry(visualSize,1);
            const asteroidMesh = new THREE.Mesh(geometry, asteroidMaterial);

            // Distancia: Radio de la Tierra (10) + un margen para que no choquen + distancia escalada
            const visualDistance = 12 + (ast.miss_distance_km / DISTANCE_DIVISOR);

            // Posicionamiento: Trigonometría esférica aleatoria para redear el planeta
             const theta = Math.random() * Math.PI * 2; // Ángulo horizontal (0 a 360 grados)
             const phi = Math.acos((Math.random() * 2) - 1); // Ángulo vertical

             // Conversión matemática de coordenadas esféricas a cartesianas 3D
             asteroidMesh.position.x = visualDistance * Math.sin(phi) * Math.cos(theta);
             asteroidMesh.position.y = visualDistance * Math.cos(phi);
             asteroidMesh.position.z = visualDistance * Math.sin(phi) * Math.sin(theta);

             // Le damos una rotación aleatoria inicial para qu cada roca se vea única
             asteroidMesh.rotation.set(Math.random(), Math.random(), Math.random());

             // Inserción
             this.scene.add(asteroidMesh);
             this.asteroids.push(asteroidMesh); // Guardamos en memoria
        });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        // Rotación continua de la Tierra
        if (this.earthMesh) {
            this.earthMesh.rotation.y += 0.001;
        }

        // Rotación individual pata cada asteroide para simular deriva espacial
        this.asteroids.forEach(ast => {
            ast.rotation.x += 0.002,
            ast.rotation.y += 0.002
        });

        // Actualizar físicas de cámara y renderizar
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}