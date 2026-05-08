import * as THREE from 'three';
import { Player } from './player.js';
import { World } from './world.js';
import GUI from 'https://unpkg.com/lil-gui@0.19.1/dist/lil-gui.esm.min.js';
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js';

// ==========================================
// 1. CONFIGURAÇÃO BASE (TURBO MODE)
// ==========================================

const playerBox = new THREE.Box3();
const tempBox = new THREE.Box3();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6eb8ff);
scene.fog = new THREE.Fog(0x6eb8ff, 10, 45);

const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 100);
// NOVO: Adicionar a câmara à cena permite colar-lhe objetos (como o Showcase)
scene.add(camera); 

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(1); 

// ==========================================
// 1.1 CONTROLOS DE CÂMARA LIVRE (FREE ROAM)
// ==========================================
const controls = new OrbitControls(camera, renderer.domElement);
controls.enabled = false; 
controls.enableDamping = true; 
controls.dampingFactor = 0.05;
controls.maxDistance = 50; 

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap; 
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

// ==========================================
// 2. ILUMINAÇÃO OTIMIZADA E LIL-GUI
// ==========================================
const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xfff4e5, 1.8);
directionalLight.position.set(15, 25, -15);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048; 
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 60;
directionalLight.shadow.camera.left = -20;
directionalLight.shadow.camera.right = 20;
directionalLight.shadow.camera.top = 20;
directionalLight.shadow.camera.bottom = -20;
directionalLight.shadow.bias = -0.001; 
scene.add(directionalLight);

const hemisphereLight = new THREE.HemisphereLight(0x7cb9e8, 0x5c4033, 0.6);
scene.add(hemisphereLight);

const gui = new GUI({ title: 'Painel de Iluminação' });
gui.domElement.style.position = 'absolute';
gui.domElement.style.top = '100px'; 
gui.domElement.style.right = '15px';
gui.domElement.style.zIndex = '10000';
gui.domElement.addEventListener('keydown', (e) => e.stopPropagation());

const luzAmbiente = gui.addFolder('Luz Ambiente');
luzAmbiente.addColor({ cor: ambientLight.color.getHex() }, 'cor').onChange(v => ambientLight.color.setHex(v)).name('Cor Base');
luzAmbiente.add(ambientLight, 'intensity', 0, 2).name('Intensidade');

const luzDirecional = gui.addFolder('Luz Direcional (Sol)');
luzDirecional.addColor({ cor: directionalLight.color.getHex() }, 'cor').onChange(v => directionalLight.color.setHex(v)).name('Cor do Sol');
luzDirecional.add(directionalLight, 'intensity', 0, 5).name('Intensidade');
luzDirecional.add(directionalLight.position, 'x', -50, 50).name('Posição X');
luzDirecional.add(directionalLight.position, 'y', 0, 50).name('Posição Y');
luzDirecional.add(directionalLight.position, 'z', -50, 50).name('Posição Z');

const luzHemisferica = gui.addFolder('Luz Hemisférica');
luzHemisferica.addColor({ ceu: hemisphereLight.color.getHex() }, 'ceu').onChange(v => hemisphereLight.color.setHex(v)).name('Cor do Céu');
luzHemisferica.addColor({ chao: hemisphereLight.groundColor.getHex() }, 'chao').onChange(v => hemisphereLight.groundColor.setHex(v)).name('Cor do Chão');
luzHemisferica.add(hemisphereLight, 'intensity', 0, 2).name('Intensidade');

luzAmbiente.close();
luzDirecional.close();
luzHemisferica.close();
gui.hide(); 

// ==========================================
// 2.5 A ZONA DA MORTE
// ==========================================
const stormGroup = new THREE.Group();
const stormGeo = new THREE.BoxGeometry(100, 2, 20); 
const stormMat = new THREE.MeshStandardMaterial({ 
    color: 0xff0000, transparent: true, opacity: 0.6, emissive: 0xff0000, 
    emissiveIntensity: 3.0, depthWrite: false, side: THREE.DoubleSide 
});
const stormWall = new THREE.Mesh(stormGeo, stormMat);
stormWall.position.set(0, 1.0, 10); 
stormGroup.add(stormWall);
scene.add(stormGroup);

// ==========================================
// 3. VARIÁVEIS DE ESTADO E REFERÊNCIAS HTML
// ==========================================
const world = new World(scene);
world.warmupShaders(renderer, camera);

let player = null; 
let gameState = 'MENU'; 
const clock = new THREE.Clock();
let runScore = 0; 
let highScore = localStorage.getItem('crossyRun_highScore') ? parseInt(localStorage.getItem('crossyRun_highScore')) : 0;
let deathLineZ = 5; 
const cameraTarget = new THREE.Vector3(0, 0, 0);
let deathTimer = 0;

// NOVO: Variáveis para o Showcase de Personagens
const charList = [
    { id: 'TIMEKEEPER', name: 'O Cronometrista' },
    { id: 'JUGGERNAUT', name: 'O Juggernaut' },
    { id: 'GHOST', name: 'O Fantasma' }
];
let currentCharIndex = 0;
let menuCharacter = null; // O nosso boneco rotativo

// Referências HTML
const mainMenu = document.getElementById('main-menu');
const gameUI = document.getElementById('game-ui');
const gameOverScreen = document.getElementById('game-over-screen');
const btnStart = document.getElementById('btn-start');
const btnChangeChar = document.getElementById('btn-change-char');
const scoreCounter = document.getElementById('score-counter');
const energyCounter = document.getElementById('energy-counter');
const menuHighScore = document.getElementById('menu-high-score');
const bestScoreCounter = document.getElementById('best-score-counter');
const btnEditLight = document.getElementById('btn-edit-light');
const btnExitEdit = document.getElementById('btn-exit-edit');

// Referências HTML do Showcase
const btnPrevChar = document.getElementById('btn-prev-char');
const btnNextChar = document.getElementById('btn-next-char');
const charNameDisplay = document.getElementById('char-name-display');

// Referências da Barra de Desempenho
const uiFps = document.getElementById('ui-fps');
const uiMs = document.getElementById('ui-ms');
const uiMem = document.getElementById('ui-mem');

if (menuHighScore) menuHighScore.innerText = highScore;

let framesContados = 0;
let ultimoTempoMecanica = performance.now();

// ==========================================
// 3.5 LÓGICA DO SHOWCASE DE SELEÇÃO
// ==========================================
function updateShowcase() {
    // 1. Apaga o ator anterior da lente da câmara
    if (menuCharacter && menuCharacter.mesh) {
        camera.remove(menuCharacter.mesh);
    }
    
    // 2. Cria um novo modelo
    menuCharacter = new Player(scene, charList[currentCharIndex].id);
    
    // 3. O SEGREDO: Remove do mundo normal e "Cola" à câmara
    scene.remove(menuCharacter.mesh); 
    camera.add(menuCharacter.mesh);   

    // 4. Posiciona o boneco à frente da câmara (Centro X, Abaixo Y, Frente Z)
    // X = 2.5 (Move para a direita do ecrã, fugindo do texto central)
    // Y = -0.5 (Ajusta a altura)
    // Z = -6 (Afasta um bocadinho para caber no enquadramento)
    menuCharacter.mesh.position.set(2, -0.5, -6); 
    menuCharacter.mesh.scale.set(1.5, 1.5, 1.5); // Aumentei um pouco a escala para compensar a distância
    menuCharacter.mesh.rotation.x = 0.1; // Inclina a cabeça ligeiramente
    
    // 5. Atualiza o Texto UI
    if (charNameDisplay) charNameDisplay.innerText = charList[currentCharIndex].name;
}

// Inicializa o primeiro herói no showcase
updateShowcase();

if (btnPrevChar) {
    btnPrevChar.addEventListener('click', () => {
        currentCharIndex = (currentCharIndex - 1 + charList.length) % charList.length;
        updateShowcase();
    });
}
if (btnNextChar) {
    btnNextChar.addEventListener('click', () => {
        currentCharIndex = (currentCharIndex + 1) % charList.length;
        updateShowcase();
    });
}

// ==========================================
// 4. LÓGICA DE JOGO E CONTROLOS
// ==========================================
function resetEstadoMundo() {
    world.reset();
    runScore = 0;
    deathLineZ = 5;
    
    if (stormWall) stormWall.position.z = deathLineZ + 11.5;
    
    if (scoreCounter) scoreCounter.innerText = "0";
    if (bestScoreCounter) {
        bestScoreCounter.innerText = highScore;
        bestScoreCounter.style.color = "#FFD700";
    }
}

// --- LÓGICA DO MODO ESTÚDIO ---
if (btnEditLight) {
    btnEditLight.addEventListener('click', () => {
        resetEstadoMundo(); 
        gameState = 'STUDIO';
        mainMenu.style.display = 'none';
        btnExitEdit.style.display = 'block';
        gui.show(); 
        
        // Esconde o jogador e o modelo do showcase
        if (player && player.mesh) player.mesh.visible = false;
        if (menuCharacter && menuCharacter.mesh) menuCharacter.mesh.visible = false; 
        
        controls.enabled = true;
        camera.position.set(4, 2.5, 1);
        controls.target.set(0, 0.5, -8); 
    });
}

if (btnExitEdit) {
    btnExitEdit.addEventListener('click', () => {
        gameState = 'MENU';
        mainMenu.style.display = 'block';
        btnExitEdit.style.display = 'none';
        gui.hide(); 
        
        if (player && player.mesh) player.mesh.visible = true;
        if (menuCharacter && menuCharacter.mesh) menuCharacter.mesh.visible = true; // Mostra novamente
        
        controls.enabled = false; 
    });
}

// --- LÓGICA DE ARRANQUE ---
function iniciarJogo() {
    if (player && player.mesh) scene.remove(player.mesh);
    
    // USA O HERÓI QUE ESTÁ SELECIONADO NO SHOWCASE!
    player = new Player(scene, charList[currentCharIndex].id); 
    
    resetEstadoMundo(); 

    gameState = 'PLAYING';
    mainMenu.style.display = 'none'; 
    gameOverScreen.style.display = 'none';
    gameUI.style.display = 'block';  
    atualizarUIEnergia();
    
    // Esconde o showcase gigante enquanto jogas
    if (menuCharacter && menuCharacter.mesh) menuCharacter.mesh.visible = false; 
    
    if (btnStart) btnStart.blur();
}

if (btnStart) btnStart.addEventListener('click', iniciarJogo);
if (btnChangeChar) {
    btnChangeChar.addEventListener('click', () => {
        resetEstadoMundo(); 
        gameOverScreen.style.display = 'none';
        mainMenu.style.display = 'block';
        gameState = 'MENU';
        
        // Volta a mostrar o troféu
        if (menuCharacter && menuCharacter.mesh) menuCharacter.mesh.visible = true; 
        
        btnChangeChar.blur();
    });
}

function atualizarUIEnergia() {
    if (!player || !energyCounter) return;
    if (player.abilityReady) {
        energyCounter.innerText = "PRONTA! (Espaço)";
        energyCounter.style.color = "#FFD700";
        energyCounter.style.textShadow = "0 0 10px #FFD700";
    } else if (player.isAbilityActive) {
        const timeLeft = Math.max(0, player.abilityTimer).toFixed(1);
        energyCounter.innerText = `ATIVO! (${timeLeft}s)`;
        energyCounter.style.color = "#00ffff"; 
        energyCounter.style.textShadow = "0 0 10px #00ffff"; 
    } else {
        energyCounter.innerText = `${player.jumps}/${player.jumpsToCharge}`;
        energyCounter.style.color = "white";
        energyCounter.style.textShadow = "2px 2px 0 #000";
    }
}

let cameraMode = 'isometric'; 
let transitionProgress = 1; 
const transitionSpeed = 0.03;
const config = { topDown: { x: 0, y: 12, z: 0 }, isometric: { x: 2.5, y: 10, z: 10 } };

window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (gameState === 'GAME_OVER' && (key === ' ' || event.code === 'Space')) { event.preventDefault(); iniciarJogo(); return; }
    if (gameState !== 'PLAYING' || !player) return;

    if (key === 'c') cameraMode = (cameraMode === 'topDown') ? 'isometric' : 'topDown';
    
    if (key === ' ' || event.code === 'Space') { 
        event.preventDefault(); 
        if (player.abilityReady) { player.activateAbility(); atualizarUIEnergia(); }
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
    const agora = performance.now();
    const delta = clock.getDelta();

    // --- ATUALIZADOR DA BARRA DE DESEMPENHO ---
    framesContados++;
    if (agora - ultimoTempoMecanica >= 1000) {
        if (uiFps) {
            uiFps.innerText = framesContados;
            uiFps.style.color = framesContados >= 55 ? '#00ff00' : (framesContados >= 40 ? '#ffa500' : '#ff0000');
        }
        if (uiMem && performance.memory) {
            uiMem.innerText = Math.round(performance.memory.usedJSHeapSize / 1048576) + " MB";
        } else if (uiMem) { uiMem.innerText = "N/A"; }
        framesContados = 0; ultimoTempoMecanica = agora;
    }
    if (uiMs) uiMs.innerText = Math.round(delta * 1000);

    // --- LÓGICA DO JOGO ---
    if (gameState === 'PLAYING' && player) {
        player.update(delta);
        if (player.isAbilityActive || (!player.isAbilityActive && !player.abilityReady)) {
            atualizarUIEnergia();
        }

        const currentZ = -Math.floor(player.mesh.position.z);
        if (currentZ > runScore) { 
            runScore = currentZ; 
            if (scoreCounter) scoreCounter.innerText = runScore; 
            
            if (runScore > highScore) {
                highScore = runScore;
                localStorage.setItem('crossyRun_highScore', highScore);
                if (bestScoreCounter) {
                    bestScoreCounter.innerText = highScore;
                    bestScoreCounter.style.color = "#00ff00"; 
                }
                if (menuHighScore) menuHighScore.innerText = highScore;
            }
        }

        if (cameraMode === 'isometric' && transitionProgress < 1) transitionProgress += transitionSpeed;
        else if (cameraMode === 'topDown' && transitionProgress > 0) transitionProgress -= transitionSpeed;
        transitionProgress = Math.max(0, Math.min(1, transitionProgress));

        const currentOffset = {
            x: THREE.MathUtils.lerp(config.topDown.x, config.isometric.x, transitionProgress),
            y: THREE.MathUtils.lerp(config.topDown.y, config.isometric.y, transitionProgress),
            z: THREE.MathUtils.lerp(config.topDown.z, config.isometric.z, transitionProgress)
        };

        const baseElevation = world.getElevationAt ? world.getElevationAt(player.mesh.position.z) : 0;
        const idealLookAt = new THREE.Vector3(player.mesh.position.x, baseElevation, player.mesh.position.z);
        cameraTarget.lerp(idealLookAt, 8.0 * delta);

        const idealCamPos = new THREE.Vector3(cameraTarget.x + currentOffset.x, cameraTarget.y + currentOffset.y, cameraTarget.z + currentOffset.z);
        camera.position.lerp(idealCamPos, 4.0 * delta);
        camera.lookAt(cameraTarget);

        world.updateMap(player.mesh.position.z);
        let worldDelta = delta;
        if (player.type === 'TIMEKEEPER' && player.isAbilityActive) worldDelta *= 0.15; 
        world.update(worldDelta, player.mesh.position); 

        // --- SISTEMA DE COLISÕES ---
        let isGameOver = false;
        let causeOfDeath = "";

        const px = player.mesh.position.x;
        const pz = player.mesh.position.z;

        deathLineZ -= 0.8 * delta; 
        if (typeof stormWall !== 'undefined' && stormWall) {
            stormWall.position.z = deathLineZ + 11.5;
            stormWall.material.emissiveIntensity = 0.5 + Math.sin(Date.now() * 0.005) * 0.3; 
        }

        if (pz > deathLineZ + 1.5) { isGameOver = true; causeOfDeath = "Engolido pela Tempestade!"; }

        if (!isGameOver) {
            const zTolerance = 0.45;

            for (const car of world.cars) {
                if (Math.abs(pz - car.laneZ) < zTolerance && Math.abs(px - car.mesh.position.x) < (car.width / 2 + 0.3)) {
                    if (player.type === 'JUGGERNAUT' && player.isAbilityActive) {
                        car.speed = 0; car.mesh.position.y += 15 * delta; car.mesh.position.x += car.direction * 10 * delta; car.mesh.rotation.z += 15 * delta;
                    } else { isGameOver = true; causeOfDeath = "Atropelado!"; break; }
                }
            }
            
            if (!isGameOver) {
                for (const train of world.trains) {
                    if (train.state === 'PASSING' && Math.abs(pz - train.laneZ) < zTolerance && Math.abs(px - train.mesh.position.x) < 18) {
                        isGameOver = true; causeOfDeath = "Esborrachado pelo Expresso!"; break; 
                    }
                }
            }

            if (!isGameOver && !player.isMoving) {
                const currentLaneZ = Math.round(pz);
                const conveyor = world.conveyors.find(c => c.laneZ === currentLaneZ);
                if (conveyor) {
                    player.mesh.position.x += conveyor.speed * conveyor.direction * worldDelta * 60;
                    if (Math.abs(player.mesh.position.x) > 14) { isGameOver = true; causeOfDeath = "Triturado pelas engrenagens!"; }
                }
            }

            if (!isGameOver && world.chasers) {
                for (const chaser of world.chasers) {
                    if (chaser.state !== 'DEAD') {
                        const cx = chaser.mesh.position.x; const cz = chaser.laneZ + chaser.mesh.position.z;
                        if (((px - cx) * (px - cx) + (pz - cz) * (pz - cz)) < 0.45) { 
                            if (player.type === 'JUGGERNAUT' && player.isAbilityActive) {
                                chaser.state = 'DEAD'; chaser.mesh.position.y -= 10 * delta; 
                            } else {
                                isGameOver = true; causeOfDeath = chaser.isFactory ? "Desintegrado pelo Drone!" : "Levaste uma machadada do Lenhador!"; break;
                            }
                        }
                    }
                }
            }
            
            if (!isGameOver) {
                const currentLaneZ = Math.round(pz);
                const lane = world.lanes.find(l => l.z === currentLaneZ);
                if (lane && (lane.type === 'river' || lane.type === 'acid_pit') && !player.isMoving) {
                    let onLog = false;
                    for (const log of world.logs) {
                        if (log.laneZ === currentLaneZ && Math.abs(px - log.mesh.position.x) < (log.width / 2 + 0.1)) {
                            onLog = true;
                            player.mesh.position.x += log.speed * log.direction * worldDelta * 60;
                            if (Math.abs(player.mesh.position.x) > 15) { isGameOver = true; causeOfDeath = "Levado pela correnteza!"; }
                            break; 
                        }
                    }
                    if (!onLog) { isGameOver = true; causeOfDeath = lane.type === 'acid_pit' ? "Derreteste no Ácido!" : "Afogaste-te!"; }
                }
            }
        }

        // --- TRANSIÇÃO PARA A MORTE ---
        if (isGameOver) {
            console.log("MORTE:", causeOfDeath);
            if(player.die) player.die(causeOfDeath);
            
            gameState = 'DYING';
            deathTimer = 1.5; 

            let causeElement = document.getElementById('death-reason-text');
            if (!causeElement) {
                causeElement = document.createElement('h2');
                causeElement.id = 'death-reason-text';
                causeElement.style.color = '#FFA500';
                causeElement.style.marginTop = '-10px';
                causeElement.style.marginBottom = '20px';
                causeElement.style.textShadow = '2px 2px 0px #000';
                document.querySelector('#game-over-screen div').insertBefore(causeElement, document.querySelector('#game-over-screen p'));
            }
            causeElement.innerText = causeOfDeath;
        }

    } else if (gameState === 'DYING' && player) {
        // --- ESTADO: A MORRER ---
        player.update(delta); 
        world.update(delta * 0.2, player.mesh.position); 

        deathTimer -= delta;
        if (deathTimer <= 0) {
            gameState = 'GAME_OVER';
            if (typeof gameOverScreen !== 'undefined' && gameOverScreen) gameOverScreen.style.display = 'block';
            if (typeof gameUI !== 'undefined' && gameUI) gameUI.style.display = 'none';
        }

    } else if (gameState === 'STUDIO') {
        // --- MODO ESTÚDIO (Showcase) ---
        controls.update();
        if (world) world.update(delta, {x: 0, y: 0, z: 0});

    } else {
        // --- MODO MENU (Lobby Interativo) ---
        camera.position.lerp(new THREE.Vector3(8, 12, 12), 2.0 * delta);
        camera.lookAt(0, 0, -10);
        if (world) world.update(delta, {x: 0, y: 0, z: 0});
        
        // NOVO: Faz o herói do menu rodar como um Troféu de Exibição
        if (menuCharacter && menuCharacter.mesh.visible) {
            menuCharacter.mesh.rotation.y += delta * 1.5; // Roda a uma velocidade agradável
        }
    }

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();