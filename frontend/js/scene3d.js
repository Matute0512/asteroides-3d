// scene3d.js
// Motor de renderizado WebGL puro (F5). SpaceScene NO conoce clases ni IDs de
// HTML: recibe el elemento contenedor inyectado, expone comandos
// (createAsteroids, updateScale) y notifica la selección mediante callback.
// F1: skybox 360° (CubeTextureLoader) y Tierra con soporte de texturas/nubes.
// F3: escala normalizada al radio terrestre con defensa de colisiones.
// F2: trayectorias orbitales (THREE.LineSegments con el mismo radio safeDistance)
//     y animación temporal con THREE.Clock (independiente del FPS).

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import {
    ASTEROID,
    CAMERA,
    CONTROLS,
    EARTH,
    LIGHTING,
    ORBIT,
    SCALE,
    SKYBOX,
} from './constants.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const UP = new THREE.Vector3(0, 0, 1);

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

        // F1: fondo espacial real (cubemap 360°)
        this.#createSkybox();
        this.setupLights();
        this.createEarth();

        this.asteroids = [];

        // F2: reloj para animación independiente del FPS + utilidades orbitales
        this.clock = new THREE.Clock();
        this.orbitDirVec = new THREE.Vector3();
        this.orbitLineMaterial = new THREE.LineBasicMaterial({
            color: ORBIT.COLOR,
            transparent: true,
            opacity: ORBIT.OPACITY,
        });
        this.orbitRings = null; // LineSegments único con todos los anillos orbitales

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

    // ===== F1: SKYBOX 360° =====

    #createSkybox() {
        // Si hay 6 texturas configuradas se usan; si no, se genera un cielo
        // procedural de estrellas (canvas) para no depender de archivos locales.
        if (SKYBOX.TEXTURES.length === 6) {
            new THREE.CubeTextureLoader().load(
                SKYBOX.TEXTURES,
                (texture) => {
                    this.scene.background = texture;
                },
                undefined,
                () => {
                    console.warn(
                        '[SpaceScene] Texturas de skybox no disponibles. Generando cielo procedural.',
                    );
                    this.#loadProceduralSkybox();
                },
            );
            return;
        }
        this.#loadProceduralSkybox();
    }

    #loadProceduralSkybox() {
        const urls = [0, 1, 2, 3, 4, 5].map((faceIndex) => this.#generateSkyFace(faceIndex));
        new THREE.CubeTextureLoader().load(
            urls,
            (texture) => {
                this.scene.background = texture;
            },
            undefined,
            (error) => {
                console.warn('[SpaceScene] No se pudo generar el skybox procedural.', error);
            },
        );
    }

    // Pinta una cara (512×512) del cubemap con estrellas y un tinte galáctico.
    #generateSkyFace(faceIndex) {
        const size = SKYBOX.FACE_SIZE;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = SKYBOX.BACKGROUND;
        ctx.fillRect(0, 0, size, size);

        const tint = SKYBOX.FACE_TINTS[faceIndex % SKYBOX.FACE_TINTS.length];
        const glow = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size * 0.9);
        glow.addColorStop(0, tint);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, size, size);

        for (let i = 0; i < SKYBOX.STARS_PER_FACE; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            const r = 0.4 + Math.random();
            ctx.globalAlpha = 0.35 + Math.random() * 0.65;
            ctx.fillStyle = SKYBOX.STAR_COLOR;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Estrellas brillantes con cruz de difracción
        ctx.strokeStyle = 'rgba(255,255,255,0.8)';
        ctx.lineWidth = 1;
        for (let i = 0; i < SKYBOX.BRIGHT_STARS_PER_FACE; i++) {
            const x = Math.random() * size;
            const y = Math.random() * size;
            ctx.beginPath();
            ctx.moveTo(x - 6, y);
            ctx.lineTo(x + 6, y);
            ctx.moveTo(x, y - 6);
            ctx.lineTo(x, y + 6);
            ctx.stroke();
        }

        return canvas.toDataURL('image/png');
    }

    // ===== Iluminación =====

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

    // ===== F1: TIERRA (soporta texturas de superficie y nubes) =====

    createEarth() {
        const geometry = new THREE.SphereGeometry(
            EARTH.RADIUS,
            EARTH.SEGMENTS,
            EARTH.SEGMENTS,
        );
        this.earthMaterial = new THREE.MeshStandardMaterial({
            color: EARTH.SOLID_COLOR,
            roughness: EARTH.ROUGHNESS,
            metalness: EARTH.METALNESS,
        });
        this.earthMesh = new THREE.Mesh(geometry, this.earthMaterial);
        this.scene.add(this.earthMesh);

        // Envoltura de nubes: lista para recibir una textura con alpha.
        const cloudGeometry = new THREE.SphereGeometry(
            EARTH.RADIUS * EARTH.CLOUD_RADIUS_SCALE,
            EARTH.SEGMENTS,
            EARTH.SEGMENTS,
        );
        this.cloudMaterial = new THREE.MeshStandardMaterial({
            color: EARTH.CLOUD_COLOR,
            transparent: true,
            opacity: 0, // invisible hasta que se aplique una textura de nubes
            depthWrite: false,
        });
        this.cloudMesh = new THREE.Mesh(cloudGeometry, this.cloudMaterial);
        this.scene.add(this.cloudMesh);

        // Superficie por defecto (CDN). Sustituible con setSurfaceTexture().
        this.setSurfaceTexture(EARTH.SURFACE_TEXTURE_URL);
    }

    /** Aplica (o sustituye) la textura de superficie de la Tierra. */
    setSurfaceTexture(url) {
        new THREE.TextureLoader().load(
            url,
            (texture) => {
                this.earthMaterial.map = texture;
                this.earthMaterial.color.set(EARTH.TEXTURED_COLOR);
                this.earthMaterial.needsUpdate = true;
            },
            undefined,
            (error) => {
                console.warn(
                    '[SpaceScene] Textura de superficie no disponible. Usando color sólido.',
                    error,
                );
            },
        );
    }

    /** Aplica una textura de nubes a la envoltura (transparencia incluida). */
    setCloudTexture(url) {
        new THREE.TextureLoader().load(
            url,
            (texture) => {
                this.cloudMaterial.map = texture;
                this.cloudMaterial.opacity = EARTH.CLOUD_OPACITY;
                this.cloudMaterial.needsUpdate = true;
            },
            undefined,
            (error) => {
                console.warn('[SpaceScene] Textura de nubes no disponible.', error);
            },
        );
    }

    /** Permite a la capa de presentación reaccionar al asteroide clicado. */
    setOnAsteroidSelected(callback) {
        this.onAsteroidSelected = callback;
    }

    // ===== Limpieza de memoria =====
    clearAsteroids() {
        this.asteroids.forEach((mesh) => this.scene.remove(mesh));
        this.asteroids = [];

        if (this.orbitRings) {
            this.scene.remove(this.orbitRings);
            this.orbitRings.geometry.dispose();
            this.orbitRings = null;
        }
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

            // F2: plano orbital aleatorio (normal del plano) + fase inicial
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const normal = new THREE.Vector3(
                Math.sin(phi) * Math.cos(theta),
                Math.cos(phi),
                Math.sin(phi) * Math.sin(theta),
            );
            const orbitQuaternion = new THREE.Quaternion().setFromUnitVectors(UP, normal);

            // Guardamos el JSON y parámetros orbitales persistentes
            asteroidMesh.userData = {
                data: ast,
                orbitQuaternion,
                phase: Math.random() * Math.PI * 2,
                radius: 0, // se calcula en updateAsteroidsTransform (safeDistance)
                angularSpeed: 0,
                rotSpeedX: (Math.random() - 0.5) * ASTEROID.MAX_SPIN_SPEED,
                rotSpeedY: (Math.random() - 0.5) * ASTEROID.MAX_SPIN_SPEED,
                visualRadius: 0,
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

    // ===== F3: MATEMÁTICA DE ESCALA (radio terrestre como unidad base) =====
    // Calcula el tamaño/distancias y reconstruye los anillos orbitales con el
    // mismo safeDistance que posiciona a cada asteroide.
    updateAsteroidsTransform() {
        this.asteroids.forEach((mesh) => {
            const { data } = mesh.userData;

            // 1) TAMAÑO: diámetro comprimido en log10 y normalizado al diámetro de
            //    la Tierra; exageración del slider acotada (máx. 0.6× radio terrestre).
            const logRatio =
                Math.log10(1 + data.estimated_diameter_max_km) /
                Math.log10(1 + EARTH.DIAMETER_KM);
            const gain = this.sizeMultiplier / SCALE.DEFAULT_SIZE_MULTIPLIER;
            const radius = clamp(
                EARTH.RADIUS * logRatio * gain,
                ASTEROID.MIN_VISUAL_RADIUS,
                EARTH.RADIUS * SCALE.MAX_ASTEROID_RADIUS_EARTHS,
            );
            mesh.scale.set(radius, radius, radius);
            mesh.userData.visualRadius = radius;

            // 2) DISTANCIA: compresión logarítmica (en radios terrestres).
            const scaledKm = data.miss_distance_km / this.distanceDivisor;
            const logDistance = Math.log10(1 + scaledKm);
            const distance = EARTH.RADIUS * (1 + logDistance * SCALE.DISTANCE.EARTHS_PER_LOG);

            // 3) DEFENSA DE COLISIONES: margen Tierra + radio asteroide + gap.
            const safeDistance = Math.max(
                distance,
                EARTH.RADIUS + radius + SCALE.SAFETY_GAP,
            );

            // F2: la órbita y la velocidad angular se derivan de ese radio exacto.
            mesh.userData.radius = safeDistance;
            mesh.userData.angularSpeed = this.#angularSpeedFor(safeDistance);
        });

        // Reconstruimos los anillos orbitales (una sola geometría LineSegments)
        this.#rebuildOrbitRings();

        // Reposicionamos cada roca sobre su anillo según su fase actual
        this.asteroids.forEach((mesh) => this.#placeAsteroidAtPhase(mesh));
    }

    #angularSpeedFor(radius) {
        const referenceRadius = EARTH.RADIUS * ORBIT.REFERENCE_RADIUS_EARTHS;
        const speed = ORBIT.SPEED_AT_REFERENCE * (referenceRadius / radius);
        return Math.max(speed, ORBIT.MIN_SPEED);
    }

    /** Anillo circular de radio == userData.radius en el plano orbital (normal). */
    #rebuildOrbitRings() {
        if (this.orbitRings) {
            this.scene.remove(this.orbitRings);
            this.orbitRings.geometry.dispose();
            this.orbitRings = null;
        }
        if (this.asteroids.length === 0) return;

        const step = (Math.PI * 2) / ORBIT.SEGMENTS;
        const positions = [];
        const vertex = new THREE.Vector3();
        const ring = [];

        for (const mesh of this.asteroids) {
            const { radius, orbitQuaternion } = mesh.userData;
            ring.length = 0;
            for (let k = 0; k < ORBIT.SEGMENTS; k++) {
                const angle = k * step;
                vertex
                    .set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0)
                    .applyQuaternion(orbitQuaternion);
                ring.push(vertex.x, vertex.y, vertex.z);
            }
            for (let i = 0; i < ORBIT.SEGMENTS; i++) {
                const a = i * 3;
                const b = ((i + 1) % ORBIT.SEGMENTS) * 3;
                positions.push(ring[a], ring[a + 1], ring[a + 2]);
                positions.push(ring[b], ring[b + 1], ring[b + 2]);
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        this.orbitRings = new THREE.LineSegments(geometry, this.orbitLineMaterial);
        this.scene.add(this.orbitRings);
    }

    /** Coloca la roca sobre su anillo en la fase actual (radio exacto de F3). */
    #placeAsteroidAtPhase(mesh) {
        const { radius, phase, orbitQuaternion } = mesh.userData;
        this.orbitDirVec
            .set(Math.cos(phase), Math.sin(phase), 0)
            .applyQuaternion(orbitQuaternion);
        mesh.position.set(
            this.orbitDirVec.x * radius,
            this.orbitDirVec.y * radius,
            this.orbitDirVec.z * radius,
        );
    }

    // ===== Raycasting (selección de asteroides) =====
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

    // ===== F2: ANIMACIÓN TEMPORAL (THREE.Clock, independiente del FPS) =====
    animate() {
        requestAnimationFrame(() => this.animate());

        const dt = this.clock.getDelta();

        if (this.earthMesh) {
            this.earthMesh.rotation.y += dt * EARTH.ROTATION_SPEED;
        }
        if (this.cloudMesh) {
            this.cloudMesh.rotation.y += dt * EARTH.ROTATION_SPEED * EARTH.CLOUD_ROTATION_FACTOR;
        }

        this.asteroids.forEach((mesh) => {
            // Avance orbital y giro propio basados en tiempo real (delta)
            mesh.userData.phase += dt * mesh.userData.angularSpeed;
            this.#placeAsteroidAtPhase(mesh);
            mesh.rotation.x += dt * mesh.userData.rotSpeedX;
            mesh.rotation.y += dt * mesh.userData.rotSpeedY;
        });

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}
