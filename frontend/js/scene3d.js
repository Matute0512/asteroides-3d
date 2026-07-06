import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class SpaceScene {
    constructor(containerId) {
        // 1. Configuración Base
        this.container = document.getElementById(containerId);


        // 2. Escena
        this.scene = new THREE.Scene();

        // 3. Cámara
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 3000);
        this.camera.position.z = 150;

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

        // Estado inicial de las escalas
        this.sizeMultiplier = 15;
        this.distanceDivisor = 400000;

        // --- SISTEMA DE RAYCASTING BLINDADO ---
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Evento de Clic para Raycasting
        this.renderer.domElement.addEventListener('click', (event) => this.onMouseClick(event));

        // Eventos de UI (Cerrar Panel y Sliders)
        this.setupUIEvents();

        window.addEventListener('resize', () => this.onWindowResize());
        this.animate();

        // Referencias para evitar fugas de memoria
        this.sharedGeometry = null;
        this.sharedMaterial = null;
    }

    #createStarfield() {
        const STAR_COUNT = 3000;
        const UNIVERSE_RADIUS = 1500; // Ampliamos el universo para la cámara lejana
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(STAR_COUNT * 3);

        for (let i = 0; i < STAR_COUNT; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            positions[i * 3] = UNIVERSE_RADIUS * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = UNIVERSE_RADIUS * Math.cos(phi);
            positions[i * 3 + 2] = UNIVERSE_RADIUS * Math.sin(phi) * Math.sin(theta);
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, transparent: true, opacity: 0.8 });
        this.scene.add(new THREE.Points(geometry, material));
    }

    setupLights() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.05));
        const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
        sunLight.position.set(50, 20, 30);
        this.scene.add(sunLight);
    }

    createEarth() {
        const geometry = new THREE.SphereGeometry(10, 64, 64);
        const material = new THREE.MeshStandardMaterial({ color: 0x2244aa, roughness: 0.6, metalness: 0.1 });
        this.earthMesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.earthMesh);

        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            'https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg',
            (texture) => {
                this.earthMesh.material.map = texture;
                this.earthMesh.material.color.set(0xffffff);
                this.earthMesh.material.needsUpdate = true;
            },
            undefined,
            (error) => {
                console.warn('[SpaceScene] Textura no disponible. Usando color sólido.', error);
            }
        );
    }



    // --- Limpieza de Memoria ---
    clearAsteroids() {
        // Recorremos los asteroides actuales
        this.asteroids.forEach(mesh => {
            // Lo quitamos de la escena visual
            this.scene.remove(mesh);
        });

        // Vaciamos el array
        this.asteroids = [];

        // Liberamos los recursos compartidos de una vez
        if (this.sharedGeometry) {
            this.sharedGeometry.dispose();
            this.sharedGeometry = null;
        }
        if (this.sharedMaterial) {
            this.sharedMaterial.dispose();
            this.sharedMaterial = null;
        }

        // Cerramos el panel de información si esta abierto
        document.getElementById('info-panel').classList.add('hidden');
    }
    createAsteroids(asteroidsData) {
        // OPTIMIZACIÓN: Compartimos una única geometría base y un material para todas las rocas
        this.sharedGeometry = new THREE.DodecahedronGeometry(1, 1);
        this.sharedMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8, metalness: 0.2 });

        asteroidsData.forEach(ast => {
            const asteroidMesh = new THREE.Mesh(this.sharedGeometry, this.sharedMaterial);

            // Guardamos el JSON y calculamos órbitas aleatorias persistentes
            asteroidMesh.userData = {
                data: ast,
                theta: Math.random() * Math.PI * 2,
                phi: Math.acos((Math.random() * 2) - 1),
                rotSpeedX: (Math.random() - 0.5) * 0.008,
                rotSpeedY: (Math.random() - 0.5) * 0.008,
            };

            this.scene.add(asteroidMesh);
            this.asteroids.push(asteroidMesh);
        });

        // Aplicamos la posición y escala según los sliders iniciales
        this.updateAsteroidsTransform();
    }

    // --- MAGIA MATEMÁTICA INTERACTIVA ---
    updateAsteroidsTransform() {
        this.asteroids.forEach(mesh => {
            const { data, theta, phi } = mesh.userData;

            // 1. Escalado dinámico usando mesh.scale
            const visualSize = Math.max(0.3, data.estimated_diameter_max_km * this.sizeMultiplier);
            mesh.scale.set(visualSize, visualSize, visualSize);

            // 2. Reposicionamiento dinámico
            const visualDistance = 12 + (data.miss_distance_km / this.distanceDivisor);
            mesh.position.x = visualDistance * Math.sin(phi) * Math.cos(theta);
            mesh.position.y = visualDistance * Math.cos(phi);
            mesh.position.z = visualDistance * Math.sin(phi) * Math.sin(theta);
        });
    }

    // --- EVENTOS DEL SISTEMA Y UI ---
    setupUIEvents() {
        document.getElementById('close-panel').addEventListener('click', () => {
            document.getElementById('info-panel').classList.add('hidden');
        });

        // Evento Slider: Tamaño
        document.getElementById('size-slider').addEventListener('input', (e) => {
            this.sizeMultiplier = parseFloat(e.target.value);
            document.getElementById('size-label').textContent = `${this.sizeMultiplier}x`;
            this.updateAsteroidsTransform(); // Actualiza al instante
        });

        // Evento Slider: Distancia
        document.getElementById('distance-slider').addEventListener('input', (e) => {
            this.distanceDivisor = parseFloat(e.target.value);
            // Formateamos la etiqueta a miles (ej: 400000 -> 400k)
            document.getElementById('dist-label').textContent = `${this.distanceDivisor / 1000}k`;
            this.updateAsteroidsTransform(); // Actualiza al instante
        });
    }

    // --- RAYCASTER MATEMÁTICAMENTE CORREGIDO ---
    onMouseClick(event) {
        // Usamos getBoundingClientRect para evitar fallos si el canvas tiene márgenes
        const rect = this.renderer.domElement.getBoundingClientRect();

        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.asteroids);

        if (intersects.length > 0) {
            // intersects[0] es la roca impactada. Leemos data dentro de userData
            const astData = intersects[0].object.userData.data;
            if (!astData || typeof astData !== 'object') return;
            if (!('name' in astData)) return;

            this.updateUIPanel(astData);
        }
    }

    updateUIPanel(data) {
        const formatter = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });

        document.getElementById('ast-name').textContent = data.name;
        document.getElementById('ast-diameter').textContent = formatter.format(data.estimated_diameter_max_km);
        document.getElementById('ast-velocity').textContent = formatter.format(data.relative_velocity_km_h);
        document.getElementById('ast-distance').textContent = formatter.format(data.miss_distance_km);

        const hazardSpan = document.getElementById('ast-hazard');
        if (data.is_potentially_hazardous) {
            hazardSpan.textContent = "SÍ ⚠️";
            hazardSpan.style.color = "#ef4444";
        } else {
            hazardSpan.textContent = "NO";
            hazardSpan.style.color = "#4ade80";
        }

        document.getElementById('info-panel').classList.remove('hidden');
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.earthMesh) this.earthMesh.rotation.y += 0.001;

        this.asteroids.forEach(mesh => {
            mesh.rotation.x += mesh.userData.rotSpeedX;
            mesh.rotation.y += mesh.userData.rotSpeedY;
        });

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}
