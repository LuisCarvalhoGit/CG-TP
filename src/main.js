import * as THREE from 'three'
import { Player } from './player.js'
import { World } from './world.js'
import GUI from 'https://unpkg.com/lil-gui@0.19.1/dist/lil-gui.esm.min.js'
import { OrbitControls } from 'https://unpkg.com/three@0.160.0/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'https://unpkg.com/three@0.160.0/examples/jsm/postprocessing/UnrealBloomPass.js'
import { GLTFExporter } from 'https://unpkg.com/three@0.160.0/examples/jsm/exporters/GLTFExporter.js'

export const loadingManager = new THREE.LoadingManager()
export const textureLoader = new THREE.TextureLoader(loadingManager)
export const audioLoader = new THREE.AudioLoader(loadingManager)

const loadingScreen = document.getElementById('loading-screen')
const loadingBar = document.getElementById('loading-bar')
const loadingText = document.getElementById('loading-text')

loadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
  const progress = (itemsLoaded / itemsTotal) * 100
  if (loadingBar) loadingBar.style.width = progress + '%'
  if (loadingText)
    loadingText.innerText = `A Carregar... ${Math.round(progress)}%`
}

loadingManager.onLoad = function () {
  if (loadingText) loadingText.innerText = 'A compilar shaders...'

  setTimeout(() => {
    const warmupGroup = new THREE.Group()

    if (world && world.mats && world.geos) {
      Object.values(world.mats).forEach(mat => {
        if (Array.isArray(mat))
          mat.forEach(m => warmupGroup.add(new THREE.Mesh(world.geos.crate, m)))
        else warmupGroup.add(new THREE.Mesh(world.geos.crate, mat))
      })
    }
    if (particleSystem && particleSystem.mats && particleSystem.geo) {
      Object.values(particleSystem.mats).forEach(mat => {
        warmupGroup.add(new THREE.Mesh(particleSystem.geo, mat))
      })
    }
    if (charList) charList.forEach(c => new Player(warmupGroup, c.id))
    if (shieldVisual)
      warmupGroup.add(
        new THREE.Mesh(shieldVisual.geometry, shieldVisual.material)
      )

    warmupGroup.traverse(child => {
      if (child.isMesh) {
        child.frustumCulled = false
        child.material.needsUpdate = true
      }
    })

    warmupGroup.position.copy(camera.position)
    warmupGroup.translateZ(-2)
    scene.add(warmupGroup)

    renderer.compile(scene, camera)
    renderer.render(scene, camera)
    scene.remove(warmupGroup)

    if (loadingScreen) {
      loadingScreen.style.opacity = '0'
      loadingScreen.style.transition = 'opacity 0.5s ease'
      setTimeout(() => {
        loadingScreen.style.display = 'none'
      }, 500)
    }

    animate()
  }, 100)
}

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x6eb8ff)
scene.fog = new THREE.Fog(0x6eb8ff, 10, 45)

// ==========================================
// REQUISITO 2: CÂMARA PERSPETIVA E ORTOGRÁFICA
// ==========================================
const aspect = window.innerWidth / window.innerHeight

// FOI REDUZIDO DE 15 PARA 10 PARA BAIXAR/APROXIMAR A CÂMARA TOP-DOWN
const frustumSize = 10

const perspCamera = new THREE.PerspectiveCamera(30, aspect, 0.1, 100)
const orthoCamera = new THREE.OrthographicCamera(
  (frustumSize * aspect) / -2,
  (frustumSize * aspect) / 2,
  frustumSize / 2,
  frustumSize / -2,
  0.1,
  100
)

let camera = perspCamera
scene.add(perspCamera)
scene.add(orthoCamera)

const audioListener = new THREE.AudioListener()
camera.add(audioListener)

const globalSFX = new THREE.Audio(audioListener)
function playSFX (name, volume = 0.5) {
  if (world && world.audioBuffers && world.audioBuffers[name]) {
    if (globalSFX.isPlaying) globalSFX.stop()
    globalSFX.setBuffer(world.audioBuffers[name])
    globalSFX.setVolume(volume)
    globalSFX.play()
  }
}

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: 'high-performance'
})
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

const composer = new EffectComposer(renderer)
const renderScene = new RenderPass(scene, camera)
composer.addPass(renderScene)
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.8,
  0.4,
  0.6
)
composer.addPass(bloomPass)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enabled = false
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.maxDistance = 50

renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.2
document.body.appendChild(renderer.domElement)

class ParticleSystem {
  constructor (scene) {
    this.scene = scene
    this.particles = []
    this.geo = new THREE.BoxGeometry(0.35, 0.35, 0.35)
    this.mats = {
      dust: new THREE.MeshBasicMaterial({ color: 0xdddddd }),
      water: new THREE.MeshBasicMaterial({ color: 0x4fc3f7 }),
      acid: new THREE.MeshBasicMaterial({ color: 0x39ff14 }),
      blood: new THREE.MeshBasicMaterial({ color: 0xff3333 }),
      metal: new THREE.MeshBasicMaterial({ color: 0x555555 }),
      laser: new THREE.MeshBasicMaterial({ color: 0xff0000 }),
      grass_crumble: new THREE.MeshBasicMaterial({ color: 0x4caf50 }),
      road_crumble: new THREE.MeshBasicMaterial({ color: 0x2a2a2a })
    }
    this.pool = []
    for (let i = 0; i < 1000; i++) {
      const mesh = new THREE.Mesh(this.geo, this.mats.dust)
      mesh.visible = false
      this.scene.add(mesh)
      this.pool.push(mesh)
    }
  }
  spawn (x, y, z, type, count, isFloor = false) {
    for (let i = 0; i < count; i++) {
      if (this.pool.length === 0) return
      const mesh = this.pool.pop()
      let mat = this.mats.dust
      if (type === 'water') mat = this.mats.water
      else if (type === 'acid') mat = this.mats.acid
      else if (type === 'crash')
        mat = Math.random() > 0.5 ? this.mats.blood : this.mats.metal
      else if (type === 'laser') mat = this.mats.laser
      else if (type === 'grass_crumble') mat = this.mats.grass_crumble
      else if (type === 'road_crumble') mat = this.mats.road_crumble
      else if (type === 'metal') mat = this.mats.metal
      mesh.material = mat
      mesh.position.set(
        x + (Math.random() - 0.5) * 0.8,
        y + 0.2,
        z + (Math.random() - 0.5) * 0.8
      )
      mesh.visible = true
      let vx = (Math.random() - 0.5) * 4
      let vy = Math.random() * 5 + 2
      let vz = (Math.random() - 0.5) * 4
      let startScale = 1.0
      if (isFloor) {
        vx = (Math.random() - 0.5) * 2.0
        vy = -(Math.random() * 4 + 2)
        vz = (Math.random() - 0.5) * 2.0
        startScale = Math.random() * 0.8 + 0.8
      } else if (type === 'dust') {
        vx *= 0.3
        vy = Math.random() * 2 + 1
        vz *= 0.3
        startScale = 0.5
      } else if (type === 'crash' || type === 'laser') {
        vx *= 2.5
        vy *= 1.5
        vz *= 2.5
        startScale = 1.5
      }
      mesh.scale.setScalar(startScale)
      this.particles.push({
        mesh,
        vx,
        vy,
        vz,
        life: 1.0,
        decay: Math.random() * 1.5 + 0.8,
        baseScale: startScale
      })
    }
  }
  update (delta) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      let p = this.particles[i]
      p.life -= delta * p.decay
      if (p.life <= 0) {
        p.mesh.visible = false
        this.pool.push(p.mesh)
        this.particles.splice(i, 1)
      } else {
        p.vy -= 18 * delta
        p.mesh.position.x += p.vx * delta
        p.mesh.position.y += p.vy * delta
        p.mesh.position.z += p.vz * delta
        p.mesh.rotation.x += p.vx * delta
        p.mesh.rotation.y += p.vy * delta
        p.mesh.scale.setScalar(Math.max(0, p.life * p.baseScale))
      }
    }
  }
  reset () {
    this.particles.forEach(p => {
      p.mesh.visible = false
      this.pool.push(p.mesh)
    })
    this.particles = []
  }
}
const particleSystem = new ParticleSystem(scene)

let hitStopTimer = 0
let shakeIntensity = 0
function triggerImpact (intensity, duration = 0.1) {
  shakeIntensity = intensity
  hitStopTimer = duration
}

const ambientLight = new THREE.AmbientLight(0xffffff, 0.3)
scene.add(ambientLight)
const directionalLight = new THREE.DirectionalLight(0xfff4e5, 1.8)
directionalLight.position.set(15, 25, -15)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.camera.near = 0.5
directionalLight.shadow.camera.far = 50
directionalLight.shadow.camera.left = -25
directionalLight.shadow.camera.right = 25
directionalLight.shadow.camera.top = 25
directionalLight.shadow.camera.bottom = -25
scene.add(directionalLight)
scene.add(directionalLight.target)
const hemisphereLight = new THREE.HemisphereLight(0x7cb9e8, 0x5c4033, 0.6)
scene.add(hemisphereLight)

const gui = new GUI({ title: 'Painel de Desenvolvimento' })
gui.hide()
const luzAmbiente = gui.addFolder('Luz Ambiente')
luzAmbiente.add(ambientLight, 'visible').name('LIGAR/DESLIGAR')
luzAmbiente
  .addColor({ cor: ambientLight.color.getHex() }, 'cor')
  .onChange(v => ambientLight.color.setHex(v))
  .name('Cor Base')
luzAmbiente.add(ambientLight, 'intensity', 0, 2).name('Intensidade')
const luzDirecional = gui.addFolder('Luz Direcional (Sol)')
luzDirecional.add(directionalLight, 'visible').name('LIGAR/DESLIGAR')
luzDirecional
  .addColor({ cor: directionalLight.color.getHex() }, 'cor')
  .onChange(v => directionalLight.color.setHex(v))
  .name('Cor do Sol')
luzDirecional.add(directionalLight, 'intensity', 0, 5).name('Intensidade')

const world = new World(scene, audioListener)

let player = null
let gameState = 'MENU'
const clock = new THREE.Clock()
let runScore = 0
let totalCoins = parseInt(localStorage.getItem('crossyRun_coins')) || 0
let unlockedChars = JSON.parse(localStorage.getItem('crossyRun_unlocked')) || [
  'TIMEKEEPER'
]
let highScore = localStorage.getItem('crossyRun_highScore')
  ? parseInt(localStorage.getItem('crossyRun_highScore'))
  : 0
let deathLineZ = 5
let deathTimer = 0

const activePowerUps = { magnet: 0, shield: 0, time: 0 }
const shieldVisual = new THREE.Mesh(
  new THREE.SphereGeometry(0.8, 16, 16),
  new THREE.MeshStandardMaterial({
    color: 0x00ffaa,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    emissive: 0x00ffaa
  })
)
shieldVisual.visible = false

const charList = [
  { id: 'TIMEKEEPER', name: 'O Cronometrista', price: 0 },
  { id: 'JUGGERNAUT', name: 'O Juggernaut', price: 50 },
  { id: 'GHOST', name: 'O Fantasma', price: 100 }
]
let currentCharIndex = 0
let menuCharacter = null

const mainMenu = document.getElementById('main-menu')

// NOVO: Movemos a janela principal em HTML para dar espaço à personagem
if (mainMenu) {
  mainMenu.style.left = '30%'
}

const gameUI = document.getElementById('game-ui')
const gameOverScreen = document.getElementById('game-over-screen')
const btnStart = document.getElementById('btn-start')
const btnChangeChar = document.getElementById('btn-change-char')
const scoreCounter = document.getElementById('score-counter')
const energyCounter = document.getElementById('energy-counter')
const menuHighScore = document.getElementById('menu-high-score')
const bestScoreCounter = document.getElementById('best-score-counter')
const btnEditLight = document.getElementById('btn-edit-light')
const btnExitEdit = document.getElementById('btn-exit-edit')
const btnDevTools = document.getElementById('btn-dev-tools')
const btnPrevChar = document.getElementById('btn-prev-char')
const btnNextChar = document.getElementById('btn-next-char')
const charNameDisplay = document.getElementById('char-name-display')
const uiFps = document.getElementById('ui-fps')
const uiMs = document.getElementById('ui-ms')
const uiMem = document.getElementById('ui-mem')
const menuCoinCounter = document.getElementById('menu-coin-counter')
const gameCoinCounter = document.getElementById('game-coin-counter')
if (menuHighScore) menuHighScore.innerText = highScore
if (menuCoinCounter) menuCoinCounter.innerText = totalCoins

let framesContados = 0
let ultimoTempoMecanica = performance.now()
let ultimoTempoFrame = performance.now()

function updateShowcase () {
  if (menuCharacter && menuCharacter.mesh) scene.remove(menuCharacter.mesh)
  menuCharacter = new Player(scene, charList[currentCharIndex].id)

  // Posição ajustada: Mais centralizada (X=1.2) para não desaparecer em ecrãs pequenos
  // E Z=-1 para ficar mesmo à frente da nova câmara
  menuCharacter.mesh.position.set(1.2, 0.1, -1)
  menuCharacter.mesh.scale.set(0.8, 0.8, 0.8)

  if (charNameDisplay)
    charNameDisplay.innerText = charList[currentCharIndex].name

  const charInfo = charList[currentCharIndex]
  if (unlockedChars.includes(charInfo.id)) {
    btnStart.innerText = 'INICIAR JOGO'
    btnStart.style.background = '#FFD700'
  } else {
    btnStart.innerText = `COMPRAR (${charInfo.price} MOEDAS)`
    btnStart.style.background =
      totalCoins >= charInfo.price ? '#00ff00' : '#555555'
  }
}
updateShowcase()

if (btnPrevChar) {
  btnPrevChar.addEventListener('click', () => {
    currentCharIndex =
      (currentCharIndex - 1 + charList.length) % charList.length
    updateShowcase()
  })
}
if (btnNextChar) {
  btnNextChar.addEventListener('click', () => {
    currentCharIndex = (currentCharIndex + 1) % charList.length
    updateShowcase()
  })
}

const devCheats = {
  adicionarMoedas: () => {
    totalCoins += 1000
    localStorage.setItem('crossyRun_coins', totalCoins)
    if (menuCoinCounter) menuCoinCounter.innerText = totalCoins
    if (gameCoinCounter) gameCoinCounter.innerText = totalCoins
    updateShowcase()
    playSFX('powerup', 0.6)
    particleSystem.spawn(0, 0.5, 5, 'dust', 20)
  },
  zerarMoedas: () => {
    totalCoins = 0
    localStorage.setItem('crossyRun_coins', totalCoins)
    if (menuCoinCounter) menuCoinCounter.innerText = totalCoins
    if (gameCoinCounter) gameCoinCounter.innerText = totalCoins
    updateShowcase()
  },
  desbloquearTudo: () => {
    unlockedChars = charList.map(c => c.id)
    localStorage.setItem('crossyRun_unlocked', JSON.stringify(unlockedChars))
    updateShowcase()
    playSFX('jump', 0.5)
  },
  rebloquearTudo: () => { 
    unlockedChars = ['TIMEKEEPER']; // Reset para o estado inicial
    localStorage.setItem('crossyRun_unlocked', JSON.stringify(unlockedChars)); 
    updateShowcase(); 
    playSFX('crash', 0.5); // Feedback sonoro de "bloqueio"
  },
  exportarTodosOsModelos: () => {
    console.log("A preparar a exportação...");
    const exporter = new GLTFExporter();
    
    // Criamos um grupo temporário que VAI para a cena
    const palco = new THREE.Group();
    scene.add(palco);

    const espacamento = 8;
    let x = 0, z = 0;

    // Adiciona um de cada personagem
    charList.forEach(c => {
        const char = new Player(palco, c.id);
        char.mesh.position.set(x, 0, z);
        x += espacamento;
    });

    // Para os objetos do mundo, adicionamos uma instância de cada tipo
    // Se a tua função addCar/etc não aceitar o palco, passa-lhe o 'palco'
    const pData = { cars: [], logs: [], trains: [], conveyors: [], gears: [], chasers: [], coins: [], lasers: [], powerUps: [], obstacleXs: [] };
    
    // Adiciona um exemplar de cada coisa ao palco
    world.addCar(palco, 0, false, pData); 
    world.addLog(palco, pData);
    // ... (podes adicionar aqui os outros, mas só com estes já testas o tamanho)

    // IMPORTANTE: Forçar atualização das matrizes antes de exportar
    palco.updateMatrixWorld(true);

    const options = { binary: true };

    exporter.parse(
        palco,
        (result) => {
            const blob = new Blob([result], { type: 'application/octet-stream' });
            const link = document.createElement('a');
            link.style.display = 'none';
            document.body.appendChild(link);
            link.href = URL.createObjectURL(blob);
            link.download = 'crossy_run_assets.glb';
            link.click();
            
            // Limpeza
            scene.remove(palco);
            document.body.removeChild(link);
            console.log("Exportação concluída!");
        },
        (error) => {
            console.error("Erro na exportação:", error);
            scene.remove(palco);
        },
        options
    );
}

}

const cheatFolder = gui.addFolder('🛠️ Cheats e Extrator (DevTools)')
cheatFolder.add(devCheats, 'adicionarMoedas').name('💰 +1000 Moedas')
cheatFolder.add(devCheats, 'zerarMoedas').name('💸 Ficar Pobre (0)')
cheatFolder.add(devCheats, 'desbloquearTudo').name('🔓 Desbloquear Todos')
cheatFolder.add(devCheats, 'rebloquearTudo').name('🔒 Rebloquear Personagens')
cheatFolder
  .add(devCheats, 'exportarTodosOsModelos')
  .name('📦 Exportar TUDO (GLTF)')

function resetEstadoMundo () {
  world.reset()
  particleSystem.reset()
  runScore = 0
  deathLineZ = 5
  activePowerUps.magnet = 0
  activePowerUps.shield = 0
  activePowerUps.time = 0
  shieldVisual.visible = false
  if (scoreCounter) scoreCounter.innerText = '0'
  if (bestScoreCounter) {
    bestScoreCounter.innerText = highScore
    bestScoreCounter.style.color = '#FFD700'
  }
}

if (btnDevTools) {
  btnDevTools.addEventListener('click', () => {
    if (gui._hidden) {
      gui.show()
      playSFX('jump', 0.3)
    } else {
      gui.hide()
    }
    btnDevTools.blur()
  })
}
if (btnEditLight) {
  btnEditLight.addEventListener('click', () => {
    resetEstadoMundo()
    gameState = 'STUDIO'
    mainMenu.style.display = 'none'
    btnExitEdit.style.display = 'block'
    gui.show()
    if (player && player.mesh) player.mesh.visible = false
    if (menuCharacter && menuCharacter.mesh) menuCharacter.mesh.visible = false
    controls.enabled = true
    camera.position.set(4, 2.5, 1)
    controls.target.set(0, 0.5, -8)
  })
}
if (btnExitEdit) {
  btnExitEdit.addEventListener('click', () => {
    gameState = 'MENU'
    mainMenu.style.display = 'block'
    btnExitEdit.style.display = 'none'
    gui.hide()
    if (player && player.mesh) player.mesh.visible = true
    if (menuCharacter && menuCharacter.mesh) menuCharacter.mesh.visible = true
    controls.enabled = false
  })
}

function iniciarJogo () {
  if (THREE.AudioContext.getContext().state === 'suspended')
    THREE.AudioContext.getContext().resume()
  gui.hide()
  if (menuCharacter && menuCharacter.mesh) scene.remove(menuCharacter.mesh)
  if (player && player.mesh) scene.remove(player.mesh)
  player = new Player(scene, charList[currentCharIndex].id)
  player.mesh.add(shieldVisual)
  resetEstadoMundo()
  gameState = 'PLAYING'
  mainMenu.style.display = 'none'
  gameOverScreen.style.display = 'none'
  gameUI.style.display = 'block'
  if (gameCoinCounter) gameCoinCounter.innerText = totalCoins
  atualizarUIEnergia()
  if (btnStart) btnStart.blur()
}

if (btnStart) {
  btnStart.addEventListener('click', () => {
    const charInfo = charList[currentCharIndex]
    if (unlockedChars.includes(charInfo.id)) {
      iniciarJogo()
    } else {
      if (totalCoins >= charInfo.price) {
        totalCoins -= charInfo.price
        unlockedChars.push(charInfo.id)
        localStorage.setItem('crossyRun_coins', totalCoins)
        localStorage.setItem(
          'crossyRun_unlocked',
          JSON.stringify(unlockedChars)
        )
        if (menuCoinCounter) menuCoinCounter.innerText = totalCoins
        playSFX('powerup', 0.8)
        particleSystem.spawn(0, -0.5, 5, 'dust', 30)
        updateShowcase()
      } else {
        btnStart.innerText = 'MOEDAS INSUFICIENTES!'
        setTimeout(() => updateShowcase(), 1000)
      }
    }
  })
}
if (btnChangeChar) {
  btnChangeChar.addEventListener('click', () => {
    resetEstadoMundo()
    gameOverScreen.style.display = 'none'
    mainMenu.style.display = 'block'
    gameState = 'MENU'
    updateShowcase()
    btnChangeChar.blur()
  })
}

function atualizarUIEnergia () {
  if (!player || !energyCounter) return
  let extra = ''
  if (activePowerUps.magnet > 0) extra += ' 🧲'
  if (activePowerUps.time > 0) extra += ' ⏳'
  if (player.abilityReady) {
    energyCounter.innerText = 'PRONTA! (Espaço)' + extra
    energyCounter.style.color = '#FFD700'
    energyCounter.style.textShadow = '0 0 10px #FFD700'
  } else if (player.isAbilityActive) {
    const timeLeft = Math.max(0, player.abilityTimer).toFixed(1)
    energyCounter.innerText = `ATIVO! (${timeLeft}s)` + extra
    energyCounter.style.color = '#00ffff'
    energyCounter.style.textShadow = '0 0 10px #00ffff'
  } else {
    energyCounter.innerText = `${player.jumps}/${player.jumpsToCharge}` + extra
    energyCounter.style.color = 'white'
    energyCounter.style.textShadow = '2px 2px 0 #000'
  }
}

let cameraMode = 'isometric'
let transitionProgress = 1
const transitionSpeed = 0.03

// NOVO: A Câmara Top-Down com menor altura (Y=8) e orientada mais em frente (Z=2)
const config = {
  topDown: { x: 0, y: 8, z: 2 },
  isometric: { x: 2.5, y: 10, z: 10 }
}

window.addEventListener('keydown', event => {
  const key = event.key.toLowerCase()
  if (gameState === 'GAME_OVER' && (key === ' ' || event.code === 'Space')) {
    event.preventDefault()
    iniciarJogo()
    return
  }
  if (gameState !== 'PLAYING' || !player || hitStopTimer > 0) return

  if (key === 'c') {
    cameraMode = cameraMode === 'topDown' ? 'isometric' : 'topDown'
    camera.remove(audioListener)
    if (camera.isPerspectiveCamera) {
      camera = orthoCamera
    } else {
      camera = perspCamera
    }
    camera.add(audioListener)
    renderScene.camera = camera
    controls.object = camera
    playSFX('powerup', 0.4)
  }

  if (key === ' ' || event.code === 'Space') {
    event.preventDefault()
    if (player.abilityReady) {
      player.activateAbility()
      atualizarUIEnergia()
      playSFX('powerup', 0.6)
    }
  }

  const wasMoving = player.isMoving
  switch (key) {
    case 'w':
    case 'arrowup':
      player.move('up', world)
      break
    case 's':
    case 'arrowdown':
      player.move('down', world)
      break
    case 'a':
    case 'arrowleft':
      player.move('left', world)
      break
    case 'd':
    case 'arrowright':
      player.move('right', world)
      break
  }
  if (!wasMoving && player.isMoving) {
    playSFX('jump', 0.2)
    particleSystem.spawn(
      player.mesh.position.x,
      0.2,
      player.mesh.position.z,
      'dust',
      5
    )
  }
  atualizarUIEnergia()
})

const idealLookAt = new THREE.Vector3()
const idealCamPos = new THREE.Vector3()
const cameraTarget = new THREE.Vector3(0, 0, 0)
const fogNormal = new THREE.Color(0x6eb8ff)
const fogBlackout = new THREE.Color(0x050505)

function animate () {
  requestAnimationFrame(animate)
  const agora = performance.now()
  const delta = clock.getDelta()
  const msReais = agora - ultimoTempoFrame
  ultimoTempoFrame = agora

  if (uiMs) uiMs.innerText = Math.round(msReais)

  framesContados++
  if (agora - ultimoTempoMecanica >= 1000) {
    if (uiFps) {
      uiFps.innerText = framesContados
      uiFps.style.color =
        framesContados >= 55
          ? '#00ff00'
          : framesContados >= 40
          ? '#ffa500'
          : '#ff0000'
    }
    if (uiMem) {
      if (
        performance &&
        performance.memory &&
        performance.memory.usedJSHeapSize > 0
      ) {
        uiMem.innerText =
          Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB'
      } else {
        uiMem.innerText = 'N/A'
        uiMem.style.color = '#888'
      }
    }
    framesContados = 0
    ultimoTempoMecanica = agora
  }

  particleSystem.update(delta)

  if (hitStopTimer > 0) {
    hitStopTimer -= delta
  } else if (gameState === 'PLAYING' && player) {
    if (activePowerUps.magnet > 0) activePowerUps.magnet -= delta
    if (activePowerUps.time > 0) activePowerUps.time -= delta
    atualizarUIEnergia()

    player.update(delta)
    if (
      player.isAbilityActive ||
      (!player.isAbilityActive && !player.abilityReady)
    )
      atualizarUIEnergia()

    const currentZ = -Math.floor(player.mesh.position.z)
    if (currentZ > runScore) {
      runScore = currentZ
      if (scoreCounter) scoreCounter.innerText = runScore
      if (runScore > highScore) {
        highScore = runScore
        localStorage.setItem('crossyRun_highScore', highScore)
        if (bestScoreCounter) {
          bestScoreCounter.innerText = highScore
          bestScoreCounter.style.color = '#00ff00'
        }
        if (menuHighScore) menuHighScore.innerText = highScore
      }
    }

    const currentLaneZ = Math.round(player.mesh.position.z)
    const currentLaneObj = world.lanes.find(l => l.z === currentLaneZ)
    const activeEvent = currentLaneObj ? currentLaneObj.event : 'NONE'
    const isBlackout = activeEvent === 'BLACKOUT'
    const targetDir = isBlackout ? 0.0 : 1.8
    const targetAmb = isBlackout ? 0.05 : 0.3
    const targetHem = isBlackout ? 0.05 : 0.6
    const targetFog = isBlackout ? fogBlackout : fogNormal

    directionalLight.intensity = THREE.MathUtils.lerp(
      directionalLight.intensity,
      targetDir,
      delta * 3
    )
    ambientLight.intensity = THREE.MathUtils.lerp(
      ambientLight.intensity,
      targetAmb,
      delta * 3
    )
    hemisphereLight.intensity = THREE.MathUtils.lerp(
      hemisphereLight.intensity,
      targetHem,
      delta * 3
    )
    scene.fog.color.lerp(targetFog, delta * 3)
    scene.background.lerp(targetFog, delta * 3)

    if (cameraMode === 'isometric' && transitionProgress < 1)
      transitionProgress += transitionSpeed
    else if (cameraMode === 'topDown' && transitionProgress > 0)
      transitionProgress -= transitionSpeed
    transitionProgress = Math.max(0, Math.min(1, transitionProgress))

    const targetX = THREE.MathUtils.lerp(
      0,
      player.mesh.position.x,
      transitionProgress
    )
    const lookAheadZ = THREE.MathUtils.lerp(-3, 0, transitionProgress)

    const baseElevation = world.getElevationAt
      ? world.getElevationAt(player.mesh.position.z)
      : 0
    idealLookAt.set(targetX, baseElevation, player.mesh.position.z + lookAheadZ)
    cameraTarget.lerp(idealLookAt, 8.0 * delta)

    directionalLight.position.set(
      cameraTarget.x + 15,
      cameraTarget.y + 25,
      cameraTarget.z - 15
    )
    directionalLight.target.position.copy(cameraTarget)
    directionalLight.target.updateMatrixWorld()

    const cx = THREE.MathUtils.lerp(
      config.topDown.x,
      config.isometric.x,
      transitionProgress
    )
    const cy = THREE.MathUtils.lerp(
      config.topDown.y,
      config.isometric.y,
      transitionProgress
    )
    const cz = THREE.MathUtils.lerp(
      config.topDown.z,
      config.isometric.z,
      transitionProgress
    )
    idealCamPos.set(
      cameraTarget.x + cx,
      cameraTarget.y + cy,
      cameraTarget.z + cz
    )

    camera.position.lerp(idealCamPos, 4.0 * delta)
    camera.lookAt(cameraTarget)

    world.updateMap(player.mesh.position.z)
    let worldDelta = delta
    if (player.type === 'TIMEKEEPER' && player.isAbilityActive)
      worldDelta *= 0.15
    if (activePowerUps.time > 0) worldDelta = 0
    world.update(worldDelta, player.mesh.position)

    let isGameOver = false
    let causeOfDeath = ''
    const px = player.mesh.position.x
    const pz = player.mesh.position.z

    deathLineZ -= 0.8 * delta
    world.lanes.forEach(lane => {
      const distanceBehind = lane.z - deathLineZ
      if (distanceBehind > 2.0) {
        lane.group.visible = false
      } else if (distanceBehind > 0.2) {
        if (!lane.crumbled) {
          lane.crumbled = true
          let pType = 'grass_crumble'
          if (lane.type === 'road' || lane.type === 'railroad')
            pType = 'road_crumble'
          else if (lane.type === 'river') pType = 'water'
          else if (lane.type === 'acid_pit') pType = 'acid'
          else if (
            lane.type === 'factory_floor' ||
            lane.type === 'conveyor' ||
            lane.type === 'transition_gate'
          )
            pType = 'metal'
          if (lane.group.children[0]) {
            lane.group.children[0].visible = false
            lane.group.children[0].castShadow = false
          }
          for (let x = -20; x <= 20; x += 1.2) {
            particleSystem.spawn(x, -0.5, lane.z, pType, 1, true)
          }
        }
        lane.group.position.y -= delta * 15
        lane.group.rotation.x += delta * 2
        lane.group.rotation.z += delta * 2
      }
    })

    if (pz > deathLineZ + 1.0) {
      isGameOver = true
      causeOfDeath = 'O chão desapareceu!'
    }

    const coinRadius = activePowerUps.magnet > 0 ? 6.0 : 0.8
    world.coins.forEach(c => {
      if (
        !c.collected &&
        Math.sqrt(
          Math.pow(px - c.mesh.position.x, 2) + Math.pow(pz - c.laneZ, 2)
        ) < coinRadius
      ) {
        c.collected = true
        c.mesh.visible = false
        totalCoins++
        localStorage.setItem('crossyRun_coins', totalCoins)
        if (gameCoinCounter) gameCoinCounter.innerText = totalCoins
        if (menuCoinCounter) menuCoinCounter.innerText = totalCoins
        playSFX('jump', 0.2)
        particleSystem.spawn(c.mesh.position.x, 0.5, c.laneZ, 'dust', 5)
      }
    })

    world.powerUps.forEach(p => {
      if (
        !p.collected &&
        Math.sqrt(
          Math.pow(px - p.mesh.position.x, 2) + Math.pow(pz - p.laneZ, 2)
        ) < 0.8
      ) {
        p.collected = true
        p.mesh.visible = false
        playSFX('powerup', 0.8)
        triggerImpact(0.2, 0.05)
        particleSystem.spawn(px, 1.0, pz, 'dust', 20)
        if (p.type === 'MAGNET') activePowerUps.magnet = 10
        else if (p.type === 'TIME') activePowerUps.time = 4
        else if (p.type === 'SHIELD') {
          activePowerUps.shield = 1
          shieldVisual.visible = true
        }
      }
    })

    if (!isGameOver) {
      const zTolerance = 0.45
      for (const car of world.cars) {
        if (car.isDestroyed) continue;

        if (
          Math.abs(pz - car.laneZ) < zTolerance &&
          Math.abs(px - car.mesh.position.x) < car.width / 2 + 0.3
        ) {
          if (player.type === 'GHOST' && player.isAbilityActive) {
            continue;
          } else if (player.type === 'JUGGERNAUT' && player.isAbilityActive) {
            car.speed = 0
            car.isDestroyed = true 
            car.mesh.position.y += 15 * delta
            car.mesh.position.x += car.direction * 10 * delta
            car.mesh.rotation.z += 15 * delta
            particleSystem.spawn(px, 1.0, pz, 'crash', 15)
            playSFX('crash', 0.5)
            triggerImpact(0.4, 0.1)
          } else if (activePowerUps.shield > 0) {
            activePowerUps.shield = 0
            shieldVisual.visible = false
            car.speed = 0
            car.isDestroyed = true 
            car.mesh.position.y += 15 * delta
            particleSystem.spawn(px, 1.0, pz, 'crash', 15)
            playSFX('crash', 0.6)
            triggerImpact(0.5, 0.15)
          } else {
            isGameOver = true
            causeOfDeath = 'Atropelado!'
            break
          }
        }
      }
      if (!isGameOver) {
        for (const train of world.trains) {
          
          const isHittingX = train.direction === 1 
            ? (px < train.mesh.position.x + 3 && px > train.mesh.position.x - 14) // Movimento para a direita
            : (px > train.mesh.position.x - 3 && px < train.mesh.position.x + 14); // Movimento para a esquerda

          if (
            train.state === 'PASSING' &&
            Math.abs(pz - train.laneZ) < zTolerance &&
            isHittingX
          ) {
            if (player.type === 'GHOST' && player.isAbilityActive) {
              continue;
            } else if (activePowerUps.shield > 0) {
              activePowerUps.shield = 0
              shieldVisual.visible = false
              train.state = 'IDLE'
              train.mesh.position.x = 200
              particleSystem.spawn(px, 1.0, pz, 'crash', 25)
              playSFX('crash', 0.8)
              triggerImpact(0.8, 0.2)
            } else {
              isGameOver = true
              causeOfDeath = 'Esborrachado pelo Expresso!'
              break
            }
          }
        }
      }
      if (!isGameOver && !player.isMoving) {
        const conveyor = world.conveyors.find(c => c.laneZ === currentLaneZ)
        if (conveyor && activePowerUps.time <= 0) {
          player.mesh.position.x +=
            conveyor.speed * conveyor.direction * delta * 60
          if (Math.abs(player.mesh.position.x) > 14) {
            isGameOver = true
            causeOfDeath = 'Triturado pelas engrenagens!'
          }
        }
      }
      if (!isGameOver && world.chasers) {
        for (const chaser of world.chasers) {
          if (
            chaser.state !== 'DEAD' &&
            (px - chaser.mesh.position.x) * (px - chaser.mesh.position.x) +
              (pz - (chaser.laneZ + chaser.mesh.position.z)) *
                (pz - (chaser.laneZ + chaser.mesh.position.z)) <
              0.45
          ) {
            if (
              (player.type === 'JUGGERNAUT' && player.isAbilityActive) ||
              activePowerUps.shield > 0
            ) {
              chaser.state = 'DEAD'
              chaser.mesh.position.y -= 10 * delta
              particleSystem.spawn(px, 1.0, pz, 'crash', 15)
              playSFX('crash', 0.4)
              triggerImpact(0.4, 0.1)
              if (activePowerUps.shield > 0) {
                activePowerUps.shield = 0
                shieldVisual.visible = false
              }
            } else {
              isGameOver = true
              causeOfDeath = chaser.isFactory
                ? 'Desintegrado pelo Drone!'
                : 'Levaste uma machadada do Lenhador!'
              break
            }
          }
        }
      }
      if (!isGameOver && currentLaneObj) {
        if (
          (currentLaneObj.type === 'river' ||
            currentLaneObj.type === 'acid_pit' ||
            currentLaneObj.type === 'abyss_gap') &&
          !player.isMoving
        ) {
          let onPlatform = false
          for (const log of world.logs) {
            if (
              log.laneZ === currentLaneZ &&
              Math.abs(px - log.mesh.position.x) < log.width / 2 + 0.1
            ) {
              onPlatform = true
              if (activePowerUps.time <= 0)
                player.mesh.position.x +=
                  log.speed * log.direction * worldDelta * 60
              player.mesh.position.y = log.mesh.position.y + 0.28
              if (Math.abs(player.mesh.position.x) > 15) {
                isGameOver = true
                causeOfDeath = 'Caíste no Abismo!'
              }
              break
            }
          }
          if (!onPlatform) {
            isGameOver = true
            causeOfDeath =
              currentLaneObj.type === 'acid_pit'
                ? 'Derreteste no Ácido!'
                : currentLaneObj.type === 'abyss_gap'
                ? 'Caíste no Abismo!'
                : 'Afogaste-te!'
          }
        } else if (currentLaneObj.type === 'laser' && !player.isMoving) {
          const laser = world.lasers.find(l => l.laneZ === currentLaneZ)
          if (laser && laser.isOn) {
            if ((player.type === 'JUGGERNAUT' || player.type === 'GHOST') && player.isAbilityActive) {
            } else if (activePowerUps.shield > 0) {
              activePowerUps.shield = 0
              shieldVisual.visible = false
              laser.isOn = false
              triggerImpact(0.3, 0.1)
            } else {
              isGameOver = true
              causeOfDeath = 'Frito pelos Lasers!'
            }
          }
        }
      }
    }

    if (isGameOver) {
      if (player.die) player.die(causeOfDeath)
      gameState = 'DYING'
      deathTimer = 1.5
      let pType = 'crash'
      let deathSound = 'crash'
      if (causeOfDeath === 'Afogaste-te!') {
        pType = 'water'
        deathSound = 'splash'
      } else if (causeOfDeath === 'Derreteste no Ácido!') {
        pType = 'acid'
        deathSound = 'splash'
      } else if (causeOfDeath === 'Frito pelos Lasers!') {
        pType = 'laser'
        deathSound = 'crash'
      } else if (
        causeOfDeath === 'Caíste no Abismo!' ||
        causeOfDeath === 'O chão desapareceu!'
      ) {
        pType = 'none'
        deathSound = 'jump'
      }

      triggerImpact(0.8, 0.15)
      if (pType !== 'none')
        particleSystem.spawn(
          player.mesh.position.x,
          player.mesh.position.y,
          player.mesh.position.z,
          pType,
          30
        )
      playSFX(deathSound, 0.7)

      let causeElement = document.getElementById('death-reason-text')
      if (!causeElement) {
        causeElement = document.createElement('h2')
        causeElement.id = 'death-reason-text'
        causeElement.style.color = '#FFA500'
        causeElement.style.marginTop = '-10px'
        causeElement.style.marginBottom = '20px'
        causeElement.style.textShadow = '2px 2px 0px #000'
        document
          .querySelector('#game-over-screen div')
          .insertBefore(
            causeElement,
            document.querySelector('#game-over-screen p')
          )
      }
      causeElement.innerText = causeOfDeath
    }
  } else if (gameState === 'DYING' && player) {
    player.update(delta)
    world.update(delta * 0.2, player.mesh.position)
    deathTimer -= delta
    const causeElement = document.getElementById('death-reason-text')
    if (
      causeElement &&
      (causeElement.innerText === 'Caíste no Abismo!' ||
        causeElement.innerText === 'O chão desapareceu!')
    ) {
      player.mesh.position.y -= delta * 15
      player.mesh.rotation.x += delta * 5
    }
    if (deathTimer <= 0) {
      gameState = 'GAME_OVER'
      if (gameOverScreen) gameOverScreen.style.display = 'block'
      if (gameUI) gameUI.style.display = 'none'
    }
  } else if (gameState === 'STUDIO') {
    controls.update()
    if (world) world.update(delta, { x: 0, y: 0, z: 0 })
  } else {
    
    // Câmara próxima do chão (Y=0.5) e mais para a frente (Z=2)
    camera.position.lerp(new THREE.Vector3(0, 0.5, 2), 2.0 * delta)

    // A olhar totalmente em frente (Z=-10) paralelamente ao chão
    camera.lookAt(0, 0.5, -10)

    if (world) world.update(delta, { x: 0, y: 0, z: 0 })

    // Rotação contínua da personagem selecionada
    if (menuCharacter && menuCharacter.mesh) {
      menuCharacter.mesh.rotation.y -= delta * 1.2
    }

    directionalLight.intensity = THREE.MathUtils.lerp(
      directionalLight.intensity,
      1.8,
      delta * 3
    )
    ambientLight.intensity = THREE.MathUtils.lerp(
      ambientLight.intensity,
      0.3,
      delta * 3
    )
    hemisphereLight.intensity = THREE.MathUtils.lerp(
      hemisphereLight.intensity,
      0.6,
      delta * 3
    )
    scene.fog.color.lerp(fogNormal, delta * 3)
    scene.background.lerp(fogNormal, delta * 3)
  }

  if (shakeIntensity > 0) {
    const sx = (Math.random() - 0.5) * shakeIntensity
    const sy = (Math.random() - 0.5) * shakeIntensity
    camera.position.x += sx
    camera.position.y += sy
    composer.render()
    camera.position.x -= sx
    camera.position.y -= sy
    shakeIntensity *= 0.85
    if (shakeIntensity < 0.01) shakeIntensity = 0
  } else {
    composer.render()
  }
}

window.addEventListener('resize', () => {
  const aspect = window.innerWidth / window.innerHeight
  perspCamera.aspect = aspect
  perspCamera.updateProjectionMatrix()
  orthoCamera.left = (-frustumSize * aspect) / 2
  orthoCamera.right = (frustumSize * aspect) / 2
  orthoCamera.top = frustumSize / 2
  orthoCamera.bottom = -frustumSize / 2
  orthoCamera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
  composer.setSize(window.innerWidth, window.innerHeight)
})
