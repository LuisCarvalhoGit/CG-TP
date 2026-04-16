import * as THREE from 'three';
import { Player } from './player.js';
import { World } from './world.js';

// ==========================================
// 1. CONFIGURAÇÃO BASE DA CENA
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Azul céu

// Câmara com FOV de 40 para o "Efeito Crossy Road" (Achatamento isométrico)
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 1000);

// Renderizador com sombras de alta qualidade
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// ==========================================
// 2. ILUMINAÇÃO (Gold Standard)
// ==========================================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
// Ajustar a área de sombra para cobrir o cenário
directionalLight.shadow.camera.left = -20;
directionalLight.shadow.camera.right = 20;
directionalLight.shadow.camera.top = 20;
directionalLight.shadow.camera.bottom = -20;
scene.add(directionalLight);

const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.3);
scene.add(hemisphereLight);

// ==========================================
// 3. INSTANCIAÇÃO DO MUNDO E JOGADOR
// ==========================================
const world = new World(scene);
const player = new Player(scene);

// ==========================================
// 4. LÓGICA DE CÂMARA E TRANSIÇÃO
// ==========================================
let cameraMode = 'topDown'; // 'topDown' ou 'isometric'
let transitionProgress = 0; // 0 = TopDown, 1 = Isometric
const transitionSpeed = 0.03; // Velocidade da transição da câmara

// Configurações das posições relativas (Offsets)
const config = {
    topDown: { x: 0, y: 20, z: 0 },
    isometric: { x: 12, y: 15, z: 12 } // Diagonal estilo Crossy Road
};

// ==========================================
// 5. CONTROLOS (Teclado)
// ==========================================
window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();

    // Alternar modo de câmara
    if (key === 'c') {
        cameraMode = (cameraMode === 'topDown') ? 'isometric' : 'topDown';
    }
    
    // Movimento do jogador
    switch(key) {
        case 'w': case 'arrowup':    player.move('up');    break;
        case 's': case 'arrowdown':  player.move('down');  break;
        case 'a': case 'arrowleft':  player.move('left');  break;
        case 'd': case 'arrowright': player.move('right'); break;
    }
});

// ==========================================
// 6. LOOP DE ANIMAÇÃO
// ==========================================
function animate() {
    requestAnimationFrame(animate);

    // --- Atualizar Progresso da Transição ---
    if (cameraMode === 'isometric' && transitionProgress < 1) {
        transitionProgress += transitionSpeed;
    } else if (cameraMode === 'topDown' && transitionProgress > 0) {
        transitionProgress -= transitionSpeed;
    }
    
    // Garantir que o valor fica estritamente entre 0 e 1 (Clamp)
    transitionProgress = Math.max(0, Math.min(1, transitionProgress));

    // --- Interpolação (Lerp) dos Offsets da Câmara ---
    const currentOffset = {
        x: THREE.MathUtils.lerp(config.topDown.x, config.isometric.x, transitionProgress),
        y: THREE.MathUtils.lerp(config.topDown.y, config.isometric.y, transitionProgress),
        z: THREE.MathUtils.lerp(config.topDown.z, config.isometric.z, transitionProgress)
    };

    // --- Aplicar Posição à Câmara (Seguindo o Jogador) ---
    camera.position.x = player.mesh.position.x + currentOffset.x;
    camera.position.y = player.mesh.position.y + currentOffset.y;
    camera.position.z = player.mesh.position.z + currentOffset.z;

    // Fazer a câmara olhar sempre para a posição central da galinha
    camera.lookAt(
        player.mesh.position.x, 
        player.mesh.position.y, 
        player.mesh.position.z
    );

    renderer.render(scene, camera);
}

// ==========================================
// 7. RESPONSIVIDADE (Redimensionar Janela)
// ==========================================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Iniciar o jogo
animate();