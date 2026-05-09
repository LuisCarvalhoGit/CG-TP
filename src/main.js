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
scene.add(camera); 

// Adicionar "Ouvidos" à lente da Câmara para o som 3D
const audioListener = new THREE.AudioListener();
camera.add(audioListener);

// Canal de Efeitos Sonoros Global do Jogador
const globalSFX = new THREE.Audio(audioListener);

function playSFX(name, volume = 0.5) {
    if (world && world.audioBuffers && world.audioBuffers[name]) {
        if (globalSFX.isPlaying) globalSFX.stop(); 
        globalSFX.setBuffer(world.audioBuffers[name]);
        globalSFX.setVolume(volume);
        globalSFX.play();
    }
}

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(1); 

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
// 1.5 SISTEMA DE PARTÍCULAS (VFX)
// ==========================================
class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
        this.geo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
        
        // Usamos BasicMaterial porque as partículas devem "brilhar" (não precisam de luz/sombra)
        this.mats = {
            dust: new THREE.MeshBasicMaterial({ color: 0xdddddd }),
            water: new THREE.MeshBasicMaterial({ color: 0x4fc3f7 }),
            acid: new THREE.MeshBasicMaterial({ color: 0x39ff14 }),
            blood: new THREE.MeshBasicMaterial({ color: 0xff3333 }),
            metal: new THREE.MeshBasicMaterial({ color: 0x555555 })
        };
    }
    
    spawn(x, y, z, type, count) {
        for(let i = 0; i < count; i++) {
            let mat = this.mats.dust;
            if(type === 'water') mat = this.mats.water;
            else if(type === 'acid') mat = this.mats.acid;
            else if(type === 'crash') mat = Math.random() > 0.5 ? this.mats.blood : this.mats.metal;
            
            const mesh = new THREE.Mesh(this.geo, mat);
            // Espalha a posição inicial ligeiramente
            mesh.position.set(x + (Math.random()-0.5)*0.8, y + 0.2, z + (Math.random()-0.5)*0.8);
            
            // Física Básica: Vetores de Força
            let vx = (Math.random() - 0.5) * 4;
            let vy = Math.random() * 5 + 2; // Força para cima
            let vz = (Math.random() - 0.5) * 4;
            let startScale = 1.0;
            
            // Comportamentos Diferentes
            if(type === 'dust') {
                vx *= 0.3; vy = Math.random() * 2 + 1; vz *= 0.3; // Poeira não salta muito
                startScale = 0.5;
            } else if(type === 'crash') {
                vx *= 2.5; vy *= 1.5; vz *= 2.5; // Explosão mais violenta
                startScale = 1.5;
            }
            
            mesh.scale.setScalar(startScale);
            this.scene.add(mesh);
            
            // Guarda na lista para atualizar a cada frame
            this.particles.push({ 
                mesh, vx, vy, vz, 
                life: 1.0, 
                decay: Math.random() * 1.5 + 0.8, // Quão rápido desaparece
                baseScale: startScale
            });
        }
    }
    
    update(delta) {
        for(let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i];
            p.life -= delta * p.decay;
            
            if(p.life <= 0) {
                this.scene.remove(p.mesh);
                this.particles.splice(i, 1);
            } else {
                p.vy -= 18 * delta; // Efeito da Gravidade
                p.mesh.position.x += p.vx * delta;
                p.mesh.position.y += p.vy * delta;
                p.mesh.position.z += p.vz * delta;
                
                // Rotação aleatória baseada na velocidade
                p.mesh.rotation.x += p.vx * delta;
                p.mesh.rotation.y += p.vy * delta;
                
                // Encolhe ao estilo voxel (em vez de ficar transparente)
                const currentScale = Math.max(0, p.life * p.baseScale);
                p.mesh.scale.setScalar(currentScale);
            }
        }
    }
    
    reset() {
        this.particles.forEach(p => this.scene.remove(p.mesh));
        this.particles = [];
    }
}

const particleSystem = new ParticleSystem(scene);

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
const world = new World(scene, audioListener);
world.warmupShaders(renderer, camera);

let player = null; 
let gameState = 'MENU'; 
const clock = new THREE.Clock();
let runScore = 0; 
let highScore = localStorage.getItem('crossyRun_highScore') ? parseInt(localStorage.getItem('crossyRun_highScore')) : 0;
let deathLineZ = 5; 
const cameraTarget = new THREE.Vector3(0, 0, 0);
let deathTimer = 0;

const charList = [
    { id: 'TIMEKEEPER', name: 'O Cronometrista' },
    { id: 'JUGGERNAUT', name: 'O Juggernaut' },
    { id: 'GHOST', name: 'O Fantasma' }
];
let currentCharIndex = 0;
let menuCharacter = null; 

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

const btnPrevChar = document.getElementById('btn-prev-char');
const btnNextChar = document.getElementById('btn-next-char');
const charNameDisplay = document.getElementById('char-name-display');

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
    if (menuCharacter && menuCharacter.mesh) {
        camera.remove(menuCharacter.mesh);
    }
    
    menuCharacter = new Player(scene, charList[currentCharIndex].id);
    scene.remove(menuCharacter.mesh); 
    camera.add(menuCharacter.mesh);   

    menuCharacter.mesh.position.set(2.5, -0.5, -6); 
    menuCharacter.mesh.scale.set(1.5, 1.5, 1.5); 
    menuCharacter.mesh.rotation.x = 0.1; 
    
    if (charNameDisplay) charNameDisplay.innerText = charList[currentCharIndex].name;
}

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
    particleSystem.reset(); // LIMPA AS PARTÍCULAS MORTAS!
    runScore = 0;
    deathLineZ = 5;
    
    if (stormWall) stormWall.position.z = deathLineZ + 11.5;
    
    if (scoreCounter) scoreCounter.innerText = "0";
    if (bestScoreCounter) {
        bestScoreCounter.innerText = highScore;
        bestScoreCounter.style.color = "#FFD700";
    }
}

if (btnEditLight) {
    btnEditLight.addEventListener('click', () => {
        resetEstadoMundo(); 
        gameState = 'STUDIO';
        mainMenu.style.display = 'none';
        btnExitEdit.style.display = 'block';
        gui.show(); 
        
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
        if (menuCharacter && menuCharacter.mesh) menuCharacter.mesh.visible = true; 
        
        controls.enabled = false; 
    });
}

function iniciarJogo() {
    if (THREE.AudioContext.getContext().state === 'suspended') {
        THREE.AudioContext.getContext().resume();
    }

    if (player && player.mesh) scene.remove(player.mesh);
    player = new Player(scene, charList[currentCharIndex].id); 
    resetEstadoMundo(); 

    gameState = 'PLAYING';
    mainMenu.style.display = 'none'; 
    gameOverScreen.style.display = 'none';
    gameUI.style.display = 'block';  
    atualizarUIEnergia();
    
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
        if (player.abilityReady) { 
            player.activateAbility(); 
            atualizarUIEnergia(); 
            playSFX('powerup', 0.6);
        }
    }
    
    const wasMoving = player.isMoving;
    
    switch(key) {
        case 'w': case 'arrowup':    player.move('up', world);    break;
        case 's': case 'arrowdown':  player.move('down', world);  break;
        case 'a': case 'arrowleft':  player.move('left', world);  break;
        case 'd': case 'arrowright': player.move('right', world); break;
    }
    
    if (!wasMoving && player.isMoving) {
        playSFX('jump', 0.2);
        // NOVO: Levanta 5 blocos de poeira sempre que salta com sucesso
        particleSystem.spawn(player.mesh.position.x, 0.2, player.mesh.position.z, 'dust', 5);
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

    // NOVO: Atualizar a Física de todas as Partículas
    particleSystem.update(delta);

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
                        // NOVO: Sai faíscas ao esmagar o carro!
                        particleSystem.spawn(px, 1.0, pz, 'crash', 10);
                        playSFX('crash', 0.4);
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
                                particleSystem.spawn(px, 1.0, pz, 'crash', 10);
                                playSFX('crash', 0.4);
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

            // NOVO: Explosão de Partículas com a Morte!
            let pType = 'crash';
            let deathSound = 'crash';
            
            if (causeOfDeath === "Afogaste-te!") { pType = 'water'; deathSound = 'splash'; }
            else if (causeOfDeath === "Derreteste no Ácido!") { pType = 'acid'; deathSound = 'splash'; }
            else if (causeOfDeath === "Engolido pela Tempestade!") { pType = 'dust'; }
            
            // Dispara 30 partículas coloridas consoante a morte
            particleSystem.spawn(player.mesh.position.x, player.mesh.position.y, player.mesh.position.z, pType, 30);
            playSFX(deathSound, 0.7);

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
        player.update(delta); 
        world.update(delta * 0.2, player.mesh.position); 

        deathTimer -= delta;
        if (deathTimer <= 0) {
            gameState = 'GAME_OVER';
            if (typeof gameOverScreen !== 'undefined' && gameOverScreen) gameOverScreen.style.display = 'block';
            if (typeof gameUI !== 'undefined' && gameUI) gameUI.style.display = 'none';
        }

    } else if (gameState === 'STUDIO') {
        controls.update();
        if (world) world.update(delta, {x: 0, y: 0, z: 0});

    } else {
        camera.position.lerp(new THREE.Vector3(8, 12, 12), 2.0 * delta);
        camera.lookAt(0, 0, -10);
        if (world) world.update(delta, {x: 0, y: 0, z: 0});
        
        if (menuCharacter && menuCharacter.mesh.visible) {
            menuCharacter.mesh.rotation.y += delta * 1.5; 
        }
    }

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();