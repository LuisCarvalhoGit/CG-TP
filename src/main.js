import * as THREE from 'three';
import { Player } from './player.js';
import { World } from './world.js';

// ==========================================
// 1. CONFIGURAÇÃO BASE
// ==========================================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6eb8ff);
scene.fog = new THREE.Fog(0x6eb8ff, 10, 45);

const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);

// Limita o Pixel Ratio ao máximo de 2. Mantém o jogo nítido mas corta o peso gráfico para metade em ecrãs de alta densidade!
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

// ==========================================
// 2. ILUMINAÇÃO
// ==========================================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xfff4e5, 1.8);
directionalLight.position.set(15, 25, -15);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 4096;
directionalLight.shadow.mapSize.height = 4096;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 60;
directionalLight.shadow.camera.left = -20;
directionalLight.shadow.camera.right = 20;
directionalLight.shadow.camera.top = 20;
directionalLight.shadow.camera.bottom = -20;
directionalLight.shadow.bias = -0.0005; 
scene.add(directionalLight);

const hemisphereLight = new THREE.HemisphereLight(0x7cb9e8, 0x5c4033, 0.6);
scene.add(hemisphereLight);

// ==========================================
// 2.5 A ZONA DA MORTE (Tempestade Battle Royale)
// ==========================================
const stormGroup = new THREE.Group();

// Geometria massiva para a largura e profundidade, mas MUITO BAIXA (altura = 2)
const stormGeo = new THREE.BoxGeometry(100, 2, 20); 

// Material mais agressivo e brilhante (emissiveIntensity aumentado para 3.0)
const stormMat = new THREE.MeshStandardMaterial({ 
    color: 0xff0000, // Vermelho base
    transparent: true, 
    opacity: 0.6, // Mais opaco para parecer mais sólido
    emissive: 0xff0000, // Brilho laser
    emissiveIntensity: 3.0, // Brilho extremamente forte
    depthWrite: false,
    side: THREE.DoubleSide // Desenha os dois lados
});

const stormWall = new THREE.Mesh(stormGeo, stormMat);

// Posição Y = 1.0 (Para a base do cubo de altura 2 ficar no chão y=0)
stormWall.position.set(0, 1.0, 10); 
stormGroup.add(stormWall);
scene.add(stormGroup);

// ==========================================
// 3. VARIÁVEIS DE ESTADO E REFERÊNCIAS
// ==========================================
const world = new World(scene);
let player = null; 
let gameState = 'MENU'; 
const clock = new THREE.Clock();
let maxScore = 0;
let deathLineZ = 5; 

// REFERÊNCIAS HTML (Garante que estes IDs existem no teu index.html)
const mainMenu = document.getElementById('main-menu');
const gameUI = document.getElementById('game-ui');
const gameOverScreen = document.getElementById('game-over-screen');
const btnStart = document.getElementById('btn-start');
const btnChangeChar = document.getElementById('btn-change-char');
const charSelect = document.getElementById('char-select');
const scoreCounter = document.getElementById('score-counter');
const energyCounter = document.getElementById('energy-counter');

// ==========================================
// 4. LÓGICA DE TRANSIÇÃO DE ESTADOS
// ==========================================

function iniciarJogo() {
    // 1. Limpar personagem antigo da cena antes de criar um novo
    if (player && player.mesh) {
        scene.remove(player.mesh);
    }

    // 2. Criar novo personagem com base na seleção atual
    const selectedChar = charSelect.value;
    player = new Player(scene, selectedChar); 
    
    // 3. Reset total do ambiente
    world.reset();
    maxScore = 0;
    deathLineZ = 5;

    // Volta a colocar a Zona da Morte no ponto de partida
    stormWall.position.z = deathLineZ + 11.5;

    stormWall.position.y = 1.0;

    if (scoreCounter) scoreCounter.innerText = "0";

    // 4. Atualizar Interface
    gameState = 'PLAYING';
    mainMenu.style.display = 'none'; 
    gameOverScreen.style.display = 'none';
    gameUI.style.display = 'block';  
    
    atualizarUIEnergia();
    
    // Tirar o foco dos botões para o "Espaço" não clicar neles sozinho
    if (btnStart) btnStart.blur();
    if (btnChangeChar) btnChangeChar.blur();
}

// ÚNICOS Listeners de Botões necessários
if (btnStart) {
    btnStart.addEventListener('click', iniciarJogo);
}

if (btnChangeChar) {
    btnChangeChar.addEventListener('click', () => {
        gameOverScreen.style.display = 'none';
        mainMenu.style.display = 'block';
        gameState = 'MENU';
        btnChangeChar.blur();
    });
}

function atualizarUIEnergia() {
    if (!player || !energyCounter) return;
    if (player.abilityReady) {
        energyCounter.innerText = "PRONTA! (Espaço)";
        energyCounter.style.color = "#FFD700"; 
    } else {
        energyCounter.innerText = `${player.jumps}/${player.maxJumps}`;
        energyCounter.style.color = "white";
    }
}

// ==========================================
// 5. CÂMARA E CONTROLOS
// ==========================================
let cameraMode = 'isometric'; 
let transitionProgress = 1; 
const transitionSpeed = 0.03;
const config = { topDown: { x: 0, y: 12, z: 0 }, isometric: { x: 6, y: 8, z: 7 } };

window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();

    // Lógica de Reinício (Game Over -> Jogar)
    if (gameState === 'GAME_OVER' && (key === ' ' || event.code === 'Space')) {
        event.preventDefault();
        iniciarJogo();
        return;
    }

    if (gameState !== 'PLAYING' || !player) return;

    if (key === 'c') {
        cameraMode = (cameraMode === 'topDown') ? 'isometric' : 'topDown';
    }
    
    if (key === ' ' || event.code === 'Space') { 
        event.preventDefault(); // Impede o scroll da página
        if (player.abilityReady) {
            player.useAbility();
            atualizarUIEnergia();
        }
    }
    
    switch(key) {
        case 'w': case 'arrowup':    player.move('up', world);    break;
        case 's': case 'arrowdown':  player.move('down', world);  break;
        case 'a': case 'arrowleft':  player.move('left', world);  break;
        case 'd': case 'arrowright': player.move('right', world); break;
    }
    atualizarUIEnergia();
});

// ==========================================
// 6. LOOP DE ANIMAÇÃO
// ==========================================
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    if (gameState === 'PLAYING' && player) {
        // --- 1. Pontuação ---
        const currentZ = -Math.floor(player.mesh.position.z) + 5;
        if (currentZ > maxScore) {
            maxScore = currentZ;
            if (scoreCounter) scoreCounter.innerText = maxScore;
        }

        // --- 2. Movimento Suave da Câmara ---
        if (cameraMode === 'isometric' && transitionProgress < 1) transitionProgress += transitionSpeed;
        else if (cameraMode === 'topDown' && transitionProgress > 0) transitionProgress -= transitionSpeed;
        transitionProgress = Math.max(0, Math.min(1, transitionProgress));

        const currentOffset = {
            x: THREE.MathUtils.lerp(config.topDown.x, config.isometric.x, transitionProgress),
            y: THREE.MathUtils.lerp(config.topDown.y, config.isometric.y, transitionProgress),
            z: THREE.MathUtils.lerp(config.topDown.z, config.isometric.z, transitionProgress)
        };

        camera.position.x = player.mesh.position.x + currentOffset.x;
        camera.position.y = player.mesh.position.y + currentOffset.y;
        camera.position.z = player.mesh.position.z + currentOffset.z;
        camera.lookAt(player.mesh.position.x, player.mesh.position.y, player.mesh.position.z);

        // --- 3. Atualizar o Mundo ---
        world.updateMap(player.mesh.position.z);
        world.update(delta, player.mesh.position.z); 

        // --- 4. SISTEMA DE COLISÕES E MORTE ---
        let isGameOver = false;
        let causeOfDeath = "";
        const playerBox = new THREE.Box3().setFromObject(player.mesh);
        playerBox.expandByScalar(-0.2); // Caixa de colisão mais justa

        // A. A Zona (Tempestade Battle Royale)
        deathLineZ -= 0.8 * delta; // A tempestade avança constantemente
        
        // Atualiza a posição visual e faz pulsar
        if (typeof stormWall !== 'undefined' && stormWall) {
            stormWall.position.z = deathLineZ + 11.5;
            stormWall.material.emissiveIntensity = 0.5 + Math.sin(Date.now() * 0.005) * 0.3; 
        }

        // Verifica se o jogador foi engolido
        if (player.mesh.position.z > deathLineZ + 1.5) {
            isGameOver = true;
            causeOfDeath = "Engolido pela Tempestade!";
        }

        // B. Obstáculos Físicos (Se não estiver na animação de invencibilidade)
        if (!player.isInvincible && !isGameOver) {
            
            // Colisão com Carros
            for (const car of world.cars) {
                if (playerBox.intersectsBox(new THREE.Box3().setFromObject(car.mesh))) { 
                    isGameOver = true; causeOfDeath = "Atropelado!"; break; 
                }
            }
            
            // Colisão com Comboios
            if (!isGameOver) {
                for (const train of world.trains) {
                    if (train.state === 'PASSING' && playerBox.intersectsBox(new THREE.Box3().setFromObject(train.mesh))) { 
                        isGameOver = true; causeOfDeath = "Esborrachado pelo Expresso!"; break; 
                    }
                }
            }
            
            // Físicas do Rio e Troncos
            if (!isGameOver) {
                const pZ = Math.round(player.mesh.position.z);
                const lane = world.lanes.find(l => l.z === pZ);
                
                if (lane && lane.type === 'river' && !player.isMoving) {
                    let onLog = false;
                    for (const log of world.logs) {
                        if (log.laneZ === pZ && playerBox.intersectsBox(new THREE.Box3().setFromObject(log.mesh))) {
                            onLog = true;
                            // Move o jogador com a velocidade do tronco
                            player.mesh.position.x += log.speed * log.direction * delta * 60;
                            
                            // Se o tronco o levar para fora do mapa
                            if (Math.abs(player.mesh.position.x) > 15) {
                                isGameOver = true; causeOfDeath = "Levado pela correnteza!";
                            }
                            break; 
                        }
                    }
                    if (!onLog) { 
                        isGameOver = true; causeOfDeath = "Afogaste-te!"; 
                    }
                }
            }
        }

        // --- 5. GESTÃO DO ECRÃ DE DERROTA ---
        if (isGameOver) {
            console.log("GAME OVER:", causeOfDeath);
            gameState = 'GAME_OVER';
            if (typeof gameOverScreen !== 'undefined' && gameOverScreen) gameOverScreen.style.display = 'block';
            if (typeof gameUI !== 'undefined' && gameUI) gameUI.style.display = 'none';
            player.isMoving = false;
        }

    } else {
        // --- 6. MODO MENU (Câmara Cinematográfica) ---
        const time = Date.now() * 0.0005;
        camera.position.x = Math.sin(time) * 15;
        camera.position.z = Math.cos(time) * 15 + 5;
        camera.position.y = 12;
        camera.lookAt(0, 0, 5);
        if (world) world.update(delta, 0); // Garante que pássaros e ondas se movem no fundo
    }

    // Render Final
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();