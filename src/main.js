import * as THREE from 'three';
import { Player } from './player.js';
import { World } from './world.js';

// ==========================================
// 1. CONFIGURAÇÃO BASE DA CENA
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Azul céu

scene.fog = new THREE.Fog(0x87ceeb, 15, 50);

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
directionalLight.shadow.camera.left = -20;
directionalLight.shadow.camera.right = 20;
directionalLight.shadow.camera.top = 20;
directionalLight.shadow.camera.bottom = -20;
scene.add(directionalLight);

const hemisphereLight = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.3);
scene.add(hemisphereLight);

// ==========================================
// 3. VARIÁVEIS DE ESTADO E INTERFACE
// ==========================================
const world = new World(scene);
let player = null; // O jogador só é instanciado depois de escolhido
let gameState = 'MENU'; // 'MENU' ou 'PLAYING'

// Referências aos elementos do DOM (HTML)
const mainMenu = document.getElementById('main-menu');
const gameUI = document.getElementById('game-ui');
const btnStart = document.getElementById('btn-start');
const charSelect = document.getElementById('char-select');
const energyCounter = document.getElementById('energy-counter');

// ==========================================
// 4. LÓGICA DE INÍCIO DE JOGO (MENU)
// ==========================================
if (btnStart) {
    btnStart.addEventListener('click', () => {
        const selectedChar = charSelect.value;
        player = new Player(scene, selectedChar); // Passa o tipo escolhido para o Player
        
        gameState = 'PLAYING';
        mainMenu.style.display = 'none'; // Esconde o menu inicial
        gameUI.style.display = 'block';  // Mostra o UI do jogo (energia)
        
        atualizarUIEnergia();
    });
}

function atualizarUIEnergia() {
    if (!player) return;
    if (energyCounter) {
        if (player.abilityReady) {
            energyCounter.innerText = "PRONTA! (Espaço)";
            energyCounter.style.color = "#FFD700"; // Fica dourado quando pronta
        } else {
            energyCounter.innerText = `${player.jumps}/${player.maxJumps}`;
            energyCounter.style.color = "white";
        }
    }
}

// ==========================================
// 5. LÓGICA DE CÂMARA E TRANSIÇÃO
// ==========================================
let cameraMode = 'isometric'; // 'topDown' ou 'isometric'
let transitionProgress = 1; // 0 = TopDown, 1 = Isometric
const transitionSpeed = 0.03;

const config = {
    topDown: { x: 0, y: 20, z: 0 },
    isometric: { x: 12, y: 15, z: 12 }
};

// ==========================================
// 6. CONTROLOS (Teclado)
// ==========================================
window.addEventListener('keydown', (event) => {
    // Se não estivermos a jogar, ignorar comandos
    if (gameState !== 'PLAYING' || !player) return;

    const key = event.key.toLowerCase();

    // Alternar modo de câmara
    if (key === 'c') {
        cameraMode = (cameraMode === 'topDown') ? 'isometric' : 'topDown';
    }
    
    // Usar Habilidade Especial
    if (key === ' ') { // Barra de Espaço
        if (player.abilityReady) {
            player.useAbility();
            atualizarUIEnergia();
        }
    }
    
    // Movimento do jogador
    switch(key) {
        case 'w': case 'arrowup':    player.move('up', world);    break;
        case 's': case 'arrowdown':  player.move('down', world);  break;
        case 'a': case 'arrowleft':  player.move('left', world);  break;
        case 'd': case 'arrowright': player.move('right', world); break;
    }
    
    // Atualizar UI sempre que o jogador se move (pois pode ter ganho energia)
    atualizarUIEnergia();
});

// ==========================================
// 7. LOOP DE ANIMAÇÃO
// ==========================================
function animate() {
    requestAnimationFrame(animate);

    if (gameState === 'PLAYING' && player) {
        // --- Atualizar Progresso da Transição da Câmara ---
        if (cameraMode === 'isometric' && transitionProgress < 1) {
            transitionProgress += transitionSpeed;
        } else if (cameraMode === 'topDown' && transitionProgress > 0) {
            transitionProgress -= transitionSpeed;
        }
        transitionProgress = Math.max(0, Math.min(1, transitionProgress));

        // --- Interpolação da Câmara ---
        const currentOffset = {
            x: THREE.MathUtils.lerp(config.topDown.x, config.isometric.x, transitionProgress),
            y: THREE.MathUtils.lerp(config.topDown.y, config.isometric.y, transitionProgress),
            z: THREE.MathUtils.lerp(config.topDown.z, config.isometric.z, transitionProgress)
        };

        camera.position.x = player.mesh.position.x + currentOffset.x;
        camera.position.y = player.mesh.position.y + currentOffset.y;
        camera.position.z = player.mesh.position.z + currentOffset.z;
        camera.lookAt(player.mesh.position.x, player.mesh.position.y, player.mesh.position.z);

        world.updateMap(player.mesh.position.z);

        // Atualizar o mundo (carros a mover-se)
        world.update();

        // --- Lógica de Colisão ---
        const playerBox = new THREE.Box3().setFromObject(player.mesh);
        playerBox.expandByScalar(-0.2); 

        for (const carData of world.cars) {
            const carBox = new THREE.Box3().setFromObject(carData.mesh);
            carBox.expandByScalar(-0.1); 

            if (playerBox.intersectsBox(carBox)) {
                console.log("GAME OVER! Foste atropelado!");
                
                // 1. Limpar e reconstruir o mundo!
                world.reset();

                // 2. Colocar o jogador na relva inicial
                player.mesh.position.set(0, 0, 5);
                player.isMoving = false;
                
                // 3. Reset da energia
                player.jumps = 0;
                player.abilityReady = false;
                atualizarUIEnergia();

                // 4. (Opcional e Recomendado) Voltar ao Menu Inicial!
                gameState = 'MENU';
                document.getElementById('main-menu').style.display = 'block';
                document.getElementById('game-ui').style.display = 'none';
            }
        }
    } else {
        // --- Comportamento da Câmara no MENU ---
        // Faz a câmara rodar lentamente à volta do cenário inicial
        const time = Date.now() * 0.0005;
        camera.position.x = Math.sin(time) * 15;
        camera.position.z = Math.cos(time) * 15 + 5;
        camera.position.y = 12;
        camera.lookAt(0, 0, 5);
        
        // Os carros continuam a passar no fundo!
        world.update();
    }

    renderer.render(scene, camera);
}

// ==========================================
// 8. RESPONSIVIDADE (Redimensionar Janela)
// ==========================================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Iniciar o loop
animate();