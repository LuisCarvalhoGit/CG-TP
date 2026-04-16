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

    // Opcional: Fazer a câmara seguir o jogador suavemente
    camera.position.z = player.mesh.position.z + 10;
    camera.position.x = player.mesh.position.x + 5;
    camera.lookAt(player.mesh.position);

    renderer.render(scene, camera);
}

// Ajuste de Janela
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();