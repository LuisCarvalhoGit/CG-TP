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

const stormGeo = new THREE.BoxGeometry(100, 2, 20); 
const stormMat = new THREE.MeshStandardMaterial({ 
    color: 0xff0000, 
    transparent: true, 
    opacity: 0.6, 
    emissive: 0xff0000, 
    emissiveIntensity: 3.0, 
    depthWrite: false,
    side: THREE.DoubleSide 
});

const stormWall = new THREE.Mesh(stormGeo, stormMat);
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

const cameraTarget = new THREE.Vector3(0, 0, 0);

// REFERÊNCIAS HTML
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
    if (player && player.mesh) {
        scene.remove(player.mesh);
    }

    const selectedChar = charSelect.value;
    player = new Player(scene, selectedChar); 
    
    world.reset();
    maxScore = 0;
    deathLineZ = 5;

    stormWall.position.z = deathLineZ + 11.5;
    stormWall.position.y = 1.0;

    if (scoreCounter) scoreCounter.innerText = "0";

    gameState = 'PLAYING';
    mainMenu.style.display = 'none'; 
    gameOverScreen.style.display = 'none';
    gameUI.style.display = 'block';  
    
    atualizarUIEnergia();
    
    if (btnStart) btnStart.blur();
    if (btnChangeChar) btnChangeChar.blur();
}

if (btnStart) btnStart.addEventListener('click', iniciarJogo);

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
    } else if (player.isAbilityActive) {
        energyCounter.innerText = "ATIVO!";
        energyCounter.style.color = "#00ffff"; 
    } else {
        energyCounter.innerText = `${player.jumps}/${player.jumpsToCharge}`;
        energyCounter.style.color = "white";
    }
}

// ==========================================
// 5. CÂMARA E CONTROLOS
// ==========================================
let cameraMode = 'isometric'; 
let transitionProgress = 1; 
const transitionSpeed = 0.03;
const config = { topDown: { x: 0, y: 12, z: 0 }, isometric: { x: 2.5, y: 10, z: 10 } };

window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();

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
        event.preventDefault(); 
        if (player.abilityReady) {
            player.activateAbility(); 
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
        player.update(delta);
        if (!player.isAbilityActive && !player.abilityReady) atualizarUIEnergia();

        // --- 1. Pontuação ---
        const currentZ = -Math.floor(player.mesh.position.z) + 5;
        if (currentZ > maxScore) {
            maxScore = currentZ;
            if (scoreCounter) scoreCounter.innerText = maxScore;
        }

        // --- 2. Movimento de Câmara ---
        if (cameraMode === 'isometric' && transitionProgress < 1) transitionProgress += transitionSpeed;
        else if (cameraMode === 'topDown' && transitionProgress > 0) transitionProgress -= transitionSpeed;
        transitionProgress = Math.max(0, Math.min(1, transitionProgress));

        const currentOffset = {
            x: THREE.MathUtils.lerp(config.topDown.x, config.isometric.x, transitionProgress),
            y: THREE.MathUtils.lerp(config.topDown.y, config.isometric.y, transitionProgress),
            z: THREE.MathUtils.lerp(config.topDown.z, config.isometric.z, transitionProgress)
        };

        const baseElevation = world.getElevationAt ? world.getElevationAt(player.mesh.position.z) : 0;
        
        const idealLookAt = new THREE.Vector3(
            player.mesh.position.x, 
            baseElevation,          
            player.mesh.position.z  
        );

        cameraTarget.lerp(idealLookAt, 8.0 * delta);

        const idealCamPos = new THREE.Vector3(
            cameraTarget.x + currentOffset.x,
            cameraTarget.y + currentOffset.y,
            cameraTarget.z + currentOffset.z
        );

        camera.position.lerp(idealCamPos, 4.0 * delta);
        camera.lookAt(cameraTarget);

        // --- 3. Atualizar o Mundo ---
        world.updateMap(player.mesh.position.z);
        
        let worldDelta = delta;
        if (player.type === 'TIMEKEEPER' && player.isAbilityActive) {
            worldDelta *= 0.15; 
        }
        world.update(worldDelta, player.mesh.position); 

        // --- 4. SISTEMA DE COLISÕES E MORTE ---
        let isGameOver = false;
        let causeOfDeath = "";

        // Posição central exata do jogador
        const px = player.mesh.position.x;
        const pz = player.mesh.position.z;

        // A. A Zona (Tempestade Battle Royale)
        deathLineZ -= 0.8 * delta; 
        
        if (typeof stormWall !== 'undefined' && stormWall) {
            stormWall.position.z = deathLineZ + 11.5;
            stormWall.material.emissiveIntensity = 0.5 + Math.sin(Date.now() * 0.005) * 0.3; 
        }

        if (pz > deathLineZ + 1.5) {
            isGameOver = true; causeOfDeath = "Engolido pela Tempestade!";
        }

        if (!isGameOver) {
            
            // Tolerância vertical (Para saber se o obstáculo está na mesma faixa Z que tu)
            const zTolerance = 0.45;

            // B. Colisão com Carros (Matemática AABB 100x mais rápida)
            for (const car of world.cars) {
                // Checa se estão na mesma linha (Z)
                if (Math.abs(pz - car.laneZ) < zTolerance) {
                    // Checa se o X do jogador embate no meio da largura do carro
                    if (Math.abs(px - car.mesh.position.x) < (car.width / 2 + 0.3)) {
                        if (player.type === 'JUGGERNAUT' && player.isAbilityActive) {
                            car.speed = 0; 
                            car.mesh.position.y += 15 * delta; 
                            car.mesh.position.x += car.direction * 10 * delta;
                            car.mesh.rotation.z += 15 * delta;
                        } else {
                            isGameOver = true; causeOfDeath = "Atropelado!"; break; 
                        }
                    }
                }
            }
            
            // C. Colisão com Comboios
            if (!isGameOver) {
                for (const train of world.trains) {
                    if (train.state === 'PASSING' && Math.abs(pz - train.laneZ) < zTolerance) {
                        // O comboio é longo, damos uma tolerância brutal de impacto (18 metros)
                        if (Math.abs(px - train.mesh.position.x) < 18) {
                            isGameOver = true; causeOfDeath = "Esborrachado pelo Expresso!"; break; 
                        }
                    }
                }
            }

            // D. Físicas da Máquina (Fábrica - Tapetes)
            if (!isGameOver && !player.isMoving) {
                const currentLaneZ = Math.round(pz);
                const conveyor = world.conveyors.find(c => c.laneZ === currentLaneZ);
                if (conveyor) {
                    player.mesh.position.x += conveyor.speed * conveyor.direction * worldDelta * 60;
                    if (Math.abs(player.mesh.position.x) > 14) {
                        isGameOver = true; causeOfDeath = "Triturado pelas engrenagens!";
                    }
                }
            }

            // E. Colisão Inimigos (Chasers - Pitágoras Rápido)
            if (!isGameOver && world.chasers) {
                for (const chaser of world.chasers) {
                    if (chaser.state !== 'DEAD') {
                        const cx = chaser.mesh.position.x;
                        const cz = chaser.laneZ + chaser.mesh.position.z;
                        
                        // Cálculo de distância quadrada (mais rápido que usar raízes)
                        const dx = px - cx;
                        const dz = pz - cz;
                        if ((dx * dx + dz * dz) < 0.45) { // Se a distância for menor que ~0.67 metros
                            if (player.type === 'JUGGERNAUT' && player.isAbilityActive) {
                                chaser.state = 'DEAD'; 
                                chaser.mesh.position.y -= 10 * delta; 
                            } else {
                                isGameOver = true;
                                causeOfDeath = chaser.isFactory ? "Desintegrado pelo Drone!" : "Levaste uma machadada do Lenhador!";
                                break;
                            }
                        }
                    }
                }
            }
            
            // F. Físicas do Rio, Troncos e Ácido
            if (!isGameOver) {
                const currentLaneZ = Math.round(pz);
                const lane = world.lanes.find(l => l.z === currentLaneZ);
                
                if (lane && (lane.type === 'river' || lane.type === 'acid_pit') && !player.isMoving) {
                    let onLog = false;
                    for (const log of world.logs) {
                        // Está na mesma faixa?
                        if (log.laneZ === currentLaneZ) {
                            // O X do jogador cai dentro da largura do tronco/palete?
                            if (Math.abs(px - log.mesh.position.x) < (log.width / 2 + 0.1)) {
                                onLog = true;
                                player.mesh.position.x += log.speed * log.direction * worldDelta * 60;
                                
                                if (Math.abs(player.mesh.position.x) > 15) {
                                    isGameOver = true; causeOfDeath = "Levado pela correnteza!";
                                }
                                break; 
                            }
                        }
                    }
                    if (!onLog) { 
                        isGameOver = true; 
                        causeOfDeath = lane.type === 'acid_pit' ? "Derreteste no Ácido!" : "Afogaste-te!"; 
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
        if (world) world.update(delta, {x: 0, y: 0, z: 0}); 
    }

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();