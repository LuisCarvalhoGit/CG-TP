import * as THREE from 'three';
import { Player } from './player.js';
import { World } from './world.js';

// Configuração da Cena
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Azul céu

// Câmara (Perspetiva Isométrica)
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(5, 10, 15);
camera.lookAt(0, 0, 5);

// Renderizador
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
renderer.shadowMap.enabled = true; // Ativar sombras
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// Iluminação (Gold Standard)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
// Refinar qualidade da sombra
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
scene.add(directionalLight);

const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5);
scene.add(hemisphereLight);

// Inicialização dos Objetos
const world = new World(scene);
const player = new Player(scene);

// Controlos de Teclado
window.addEventListener('keydown', (event) => {
    switch(event.key) {
        case 'ArrowUp':    player.move('up');    break;
        case 'ArrowDown':  player.move('down');  break;
        case 'ArrowLeft':  player.move('left');  break;
        case 'ArrowRight': player.move('right'); break;
    }
});

// Loop de Animação
function animate() {
    requestAnimationFrame(animate);
    perspectiveCamera.position.z = player.mesh.position.z + 10;
    perspectiveCamera.lookAt(player.mesh.position);
    renderer.render(scene, activeCamera);
}

// Ajuste de Janela
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();