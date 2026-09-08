// scene3d.js
// Motor de renderizado WebGL puro (F5). SpaceScene NO conoce clases ni IDs de
// HTML: recibe el elemento contenedor inyectado, expone comandos
// (createAsteroids, updateScale) y notifica la selección mediante callback.
// Toda interacción con el DOM vive en ui.js.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import {
    ASTEROID,
    CAMERA,
    CONTROLS,
    EARTH,
    LIGHTING,
    SCALE,
    STARFIELD,
} from './constants.js';

export class SpaceScene {
    constructor(container) {
        // Contenedor inyectado por main.js desde ui.js (no buscamos IDs aquí)
        this.container = container;

        this.scene = new THREE.Scene();

        const width = container.clientWidth || window.innerWidth;
        const height = container.clientHeight || window.innerHeight;

        this.camera = new THREE.PerspectiveCamera(
            CAMERA.FOV,
            width / height,
            CAMERA.NEAR,
            CAMERA.FAR,
        );
        this.camera.position.z = CAMERA.Z_POSITION;

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = CONTROLS.DAMPING_FACTOR;

        this.#createStarfield();
        this.setupLights();
        this.createEarth();

        this.asteroids = [];

        // Estado de escala (configurable desde la UI vía updateScale)
        this.sizeMultiplier = SCALE.DEFAULT_SIZE_MULTIPLIER;
        this.distanceDivisor = SCALE.DEFAULT_DISTANCE_DIVISOR;

        // Sistema de raycasting para selección
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.onAsteroidSelected = null;

        this.renderer.domElement.addEventListener('click', (event) => {
            this.#handleClick(event);
        });

        window.addEventListener('resize', () => this.onResize());

        // Recursos compartidos para las rocas (evita fugas de memoria)
        this.sharedGeometry = null;
        this.sharedMaterial = null;

        this.animate();
    }

    #createStarfield() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(STARFIELD.COUNT * 3);

        for (let i = 0; i < STARFIELD.COUNT; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(Math.random() * 2 - 1);
            positions[i * 3] = STARFIELD.RADIUS * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = STARFIELD.RADIUS * Math.cos(phi);
            positions[i * 3 + 2] = STARFIELD.RADIUS * Math.sin(phi) * Math.sin(theta);
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({
            color: STARFIELD.COLOR,
            size: STARFIELD.SIZE,
            transparent: true,
            opacity: STARFIELD.OPACITY,
        });
        this.scene.add(new THREE.Points(geometry, material));
    }

    setupLights() {
        this.scene.add(new THREE.AmbientLight(0xffffff, LIGHTING.AMBIENT_INTENSITY));
        const sunLight = new THREE.DirectionalLight(0xffffff, LIGHTING.SUN_INTENSITY);
        sunLight.position.set(
            LIGHTING.SUN_POSITION.x,
            LIGHTING.SUN_POSITION.y,
            LIGHTING.SUN_POSITION.z,
        );
        this.scene.add(sunLight);
    }

    createEarth() {
        const geometry = new THREE.SphereGeometry(
            EARTH.RADIUS,
            EARTH.SEGMENTS,
            EARTH.SEGMENTS,
        );
        const material = new THREE.MeshStandardMaterial({
            color: EARTH.SOLID_COLOR,
            roughness: EARTH.ROUGHNESS,
            metalness: EARTH.METALNESS,
        });
        this.earthMesh = new THREE.Mesh(geometry, material);
        this.scene.add(this.earthMesh);

        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(
            EARTH.TEXTURE_URL,
            (texture) => {
                this.earthMesh.material.map = texture;
                this.earthMesh.material.color.set(EARTH.TEXTURED_COLOR);
                this.earthMesh.material.needsUpdate = true;
            },
            undefined,
            (error) => {
                console.warn('[SpaceScene] Textura no disponible. Usando color sólido.', error);
            },
        );
    }

    /** Permite a la capa de presentación reaccionar al asteroide clicado. */
    setOnAsteroidSelected(callback) {
        this.onAsteroidSelected = callback;
    }

    // --- Limpieza de memoria ---
    clearAsteroids() {
        this.asteroids.forEach((mesh) => this.scene.remove(mesh));
        this.asteroids = [];

        if (this.sharedGeometry) {
            this.sharedGeometry.dispose();
            this.sharedGeometry = null;
        }
        if (this.sharedMaterial) {
            this.sharedMaterial.dispose();
            this.sharedMaterial = null;
        }
    }

    createAsteroids(asteroidsData) {
        // OPTIMIZACIÓN: una única geometría y material compartidos para todas las rocas
        this.sharedGeometry = new THREE.DodecahedronGeometry(
            ASTEROID.GEOMETRY_RADIUS,
            ASTEROID.GEOMETRY_DETAIL,
        );
        this.sharedMaterial = new THREE.MeshStandardMaterial({
            color: ASTEROID.COLOR,
            roughness: ASTEROID.ROUGHNESS,
            metalness: ASTEROID.METALNESS,
        });

        asteroidsData.forEach((ast) => {
            const asteroidMesh = new THREE.Mesh(this.sharedGeometry, this.sharedMaterial);

            // Guardamos el JSON y parámetros orbitales aleatorios persistentes
            asteroidMesh.userData = {
                data: ast,
                theta: Math.random() * Math.PI * 2,
                phi: Math.acos(Math.random() * 2 - 1),
                rotSpeedX: (Math.random() - 0.5) * ASTEROID.MAX_SPIN_SPEED,
                rotSpeedY: (Math.random() - 0.5) * ASTEROID.MAX_SPIN_SPEED,
            };

            this.scene.add(asteroidMesh);
            this.asteroids.push(asteroidMesh);
        });

        this.updateAsteroidsTransform();
    }

    /** Actualiza la escala espacial (multiplicador de tamaño / divisor de distancia). */
    updateScale({ sizeMultiplier, distanceDivisor } = {}) {
        if (typeof sizeMultiplier === 'number') {
            this.sizeMultiplier = sizeMultiplier;
        }
        if (typeof distanceDivisor === 'number') {
            this.distanceDivisor = distanceDivisor;
        }
        this.updateAsteroidsTransform();
    }

    // --- Matemática de escala (transform de posición/tamaño de las rocas) ---
    updateAsteroidsTransform() {
        this.asteroids.forEach((mesh) => {
            const { data, theta, phi } = mesh.userData;

            // 1. Escalado dinámico usando mesh.scale
            const visualSize = Math.max(
                ASTEROID.MIN_VISUAL_SIZE,
                data.estimated_diameter_max_km * this.sizeMultiplier,
            );
            mesh.scale.set(visualSize, visualSize, visualSize);

            // 2. Reposicionamiento dinámico
            const visualDistance =
                ASTEROID.ORBIT_MIN_DISTANCE + data.miss_distance_km / this.distanceDivisor;
            mesh.position.x = visualDistance * Math.sin(phi) * Math.cos(theta);
            mesh.position.y = visualDistance * Math.cos(phi);
            mesh.position.z = visualDistance * Math.sin(phi) * Math.sin(theta);
        });
    }

    // --- Raycasting (selección de asteroides) ---
    #handleClick(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();

        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.asteroids);

        if (intersects.length > 0) {
            const astData = intersects[0].object.userData.data;
            if (!astData || typeof astData !== 'object') return;
            if (!('name' in astData)) return;

            // Notificamos a la capa de presentación (ui.js) sin tocar el DOM
            if (typeof this.onAsteroidSelected === 'function') {
                this.onAsteroidSelected(astData);
            }
        }
    }

    onResize() {
        const width = this.container.clientWidth || window.innerWidth;
        const height = this.container.clientHeight || window.innerHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.earthMesh) {
            this.earthMesh.rotation.y += EARTH.ROTATION_SPEED;
        }

        this.asteroids.forEach((mesh) => {
            mesh.rotation.x += mesh.userData.rotSpeedX;
            mesh.rotation.y += mesh.userData.rotSpeedY;
        });

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}
