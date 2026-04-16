import * as THREE from 'three';
import { Player } from './player.js';
import { createWorld } from './world.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

// Configurações comuns
const aspect = window.innerWidth / window.innerHeight;
const d = 20; // Alcance da visão ortográfica

// 1. Câmara de Perspetiva (Atual)
const perspectiveCamera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
perspectiveCamera.position.set(10, 15, 10);
perspectiveCamera.lookAt(0, 0, 0);

// 2. Câmara Ortográfica (Vista de Topo)
const orthographicCamera = new THREE.OrthographicCamera(
    -d * aspect, d * aspect, d, -d, 1, 1000
);
orthographicCamera.position.set(0, 20, 0); // Posicionada no topo
orthographicCamera.lookAt(0, 0, 0);

// Variável para controlar qual câmara está ativa
let activeCamera = perspectiveCamera;

window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'c') {
        if (activeCamera === perspectiveCamera) {
            activeCamera = orthographicCamera;
            console.log("Câmara Ortográfica Ativa");
        } else {
            activeCamera = perspectiveCamera;
            console.log("Câmara de Perspetiva Ativa");
        }
    }
});

window.addEventListener('resize', () => {
    const newAspect = window.innerWidth / window.innerHeight;

    // Atualizar Perspetiva
    perspectiveCamera.aspect = newAspect;
    perspectiveCamera.updateProjectionMatrix();

    // Atualizar Ortográfica
    orthographicCamera.left = -d * newAspect;
    orthographicCamera.right = d * newAspect;
    orthographicCamera.top = d;
    orthographicCamera.bottom = -d;
    orthographicCamera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
});

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Adicionar Luz básica para veres o que estás a fazer
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5, 5, 5);
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040));

// Chamar os módulos
createWorld(scene);
const player = new Player(scene);

camera.position.set(0, 5, 10);
camera.lookAt(0, 0, 0);

function animate() {
    requestAnimationFrame(animate);
    perspectiveCamera.position.z = player.mesh.position.z + 10;
    perspectiveCamera.lookAt(player.mesh.position);
    renderer.render(scene, activeCamera);
}
animate();