import * as THREE from 'three'

export class Player {
  constructor (scene, type = 'TIMEKEEPER') {
    this.scene = scene
    this.type = type

    this.mesh = new THREE.Group()
    this.mesh.position.set(0, 0, 0)
    this.scene.add(this.mesh)

    this.leftArm = null
    this.rightArm = null
    this.leftLeg = null
    this.rightLeg = null

    this.powerMaterials = []
    this.baseScale = 1.0

    this.buildCharacterModel()

    this.isMoving = false
    this.jumpSpeed = 0.15
    this.jumpHeight = 1.2

    this.isAbilityActive = false
    this.abilityTimer = 0
    this.jumps = 0
    this.jumpsToCharge = 15
    this.abilityReady = false

    // NOVO: Lógica de Morte
    this.isDead = false
    this.causeOfDeath = ''
    this.deathProgress = 0
  }

  buildCharacterModel () {
    const yOffset = this.type === 'GHOST' ? 0.55 : 0.4

    if (this.type === 'TIMEKEEPER') {
      const skinMat = new THREE.MeshStandardMaterial({
        color: 0xffccaa,
        roughness: 0.8,
        flatShading: true
      })
      const jacketMat = new THREE.MeshStandardMaterial({
        color: 0xdddddd,
        roughness: 0.9,
        flatShading: true
      })
      const shirtMat = new THREE.MeshStandardMaterial({
        color: 0x111155,
        roughness: 0.9,
        flatShading: true
      })
      const pantsMat = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.9,
        flatShading: true
      })
      const hairMat = new THREE.MeshStandardMaterial({
        color: 0x2e9cca,
        roughness: 0.6,
        flatShading: true
      })
      const neonMat = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 1.0
      })
      this.powerMaterials.push(neonMat)

      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.35, 0.35, 0.35),
        skinMat
      )
      head.position.set(0, 0.45 + yOffset, 0)
      const hair = new THREE.Mesh(
        new THREE.BoxGeometry(0.38, 0.1, 0.38),
        hairMat
      )
      hair.position.set(0, 0.65 + yOffset, 0)
      const vrGoggles = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.12, 0.15),
        neonMat
      )
      vrGoggles.position.set(0, 0.48 + yOffset, 0.15)
      const body = new THREE.Group()
      body.position.set(0, 0.1 + yOffset, 0)
      const chest = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.4, 0.25),
        jacketMat
      )
      const shirt = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.41, 0.26),
        shirtMat
      )
      body.add(chest, shirt)
      this.leftArm = new THREE.Group()
      this.leftArm.position.set(-0.28, 0.25 + yOffset, 0)
      const lArmMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.35, 0.15).translate(0, -0.15, 0),
        jacketMat
      )
      this.leftArm.add(lArmMesh)
      this.rightArm = new THREE.Group()
      this.rightArm.position.set(0.28, 0.25 + yOffset, 0)
      const rArmMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.35, 0.15).translate(0, -0.15, 0),
        jacketMat
      )
      this.rightArm.add(rArmMesh)
      this.leftLeg = new THREE.Group()
      this.leftLeg.position.set(-0.1, -0.1 + yOffset, 0)
      const lLegMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.3, 0.2).translate(0, -0.15, 0),
        pantsMat
      )
      this.leftLeg.add(lLegMesh)
      this.rightLeg = new THREE.Group()
      this.rightLeg.position.set(0.1, -0.1 + yOffset, 0)
      const rLegMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.3, 0.2).translate(0, -0.15, 0),
        pantsMat
      )
      this.rightLeg.add(rLegMesh)
      this.mesh.add(
        head,
        hair,
        vrGoggles,
        body,
        this.leftArm,
        this.rightArm,
        this.leftLeg,
        this.rightLeg
      )
    } else if (this.type === 'JUGGERNAUT') {
      const armorMat = new THREE.MeshStandardMaterial({
        color: 0x555555,
        metalness: 0.6,
        roughness: 0.6,
        flatShading: true
      })
      const darkMat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.9,
        flatShading: true
      })
      const visorMat = new THREE.MeshStandardMaterial({
        color: 0xff4400,
        emissive: 0xff4400,
        emissiveIntensity: 1.2
      })
      this.powerMaterials.push(armorMat)

      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.4, 0.4),
        armorMat
      )
      head.position.set(0, 0.5 + yOffset, 0)
      const visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.1, 0.1),
        visorMat
      )
      visor.position.set(0, 0.52 + yOffset, 0.18)
      const body = new THREE.Group()
      body.position.set(0, 0.1 + yOffset, 0)
      const chest = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.5, 0.4),
        armorMat
      )
      const core = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.3, 0.45),
        darkMat
      )
      body.add(chest, core)
      this.leftArm = new THREE.Group()
      this.leftArm.position.set(-0.4, 0.3 + yOffset, 0)
      const lShoulder = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.2, 0.3).translate(0, 0.05, 0),
        darkMat
      )
      const lArmMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.4, 0.2).translate(0, -0.2, 0),
        armorMat
      )
      this.leftArm.add(lShoulder, lArmMesh)
      this.rightArm = new THREE.Group()
      this.rightArm.position.set(0.4, 0.3 + yOffset, 0)
      const rShoulder = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.2, 0.3).translate(0, 0.05, 0),
        darkMat
      )
      const rArmMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.4, 0.2).translate(0, -0.2, 0),
        armorMat
      )
      this.rightArm.add(rShoulder, rArmMesh)
      this.leftLeg = new THREE.Group()
      this.leftLeg.position.set(-0.15, -0.1 + yOffset, 0)
      const lLegMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.3, 0.3).translate(0, -0.15, 0),
        darkMat
      )
      this.leftLeg.add(lLegMesh)
      this.rightLeg = new THREE.Group()
      this.rightLeg.position.set(0.15, -0.1 + yOffset, 0)
      const rLegMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.25, 0.3, 0.3).translate(0, -0.15, 0),
        darkMat
      )
      this.rightLeg.add(rLegMesh)
      this.mesh.add(
        head,
        visor,
        body,
        this.leftArm,
        this.rightArm,
        this.leftLeg,
        this.rightLeg
      )
    } else if (this.type === 'GHOST') {
      const cloakMat = new THREE.MeshStandardMaterial({
        color: 0xeeeeee,
        roughness: 1.0,
        flatShading: true,
        transparent: true,
        opacity: 0.85
      })
      const voidMat = new THREE.MeshStandardMaterial({
        color: 0x000000,
        roughness: 1.0,
        transparent: true,
        opacity: 0.9
      })
      const eyeMat = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 2.0
      })
      this.powerMaterials.push(cloakMat)

      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.4, 0.4),
        cloakMat
      )
      head.position.set(0, 0.45 + yOffset, 0)
      const face = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.1), voidMat)
      face.position.set(0, 0.45 + yOffset, 0.16)
      const eyeL = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.08, 0.05),
        eyeMat
      )
      eyeL.position.set(-0.08, 0.48 + yOffset, 0.2)
      const eyeR = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.08, 0.05),
        eyeMat
      )
      eyeR.position.set(0.08, 0.48 + yOffset, 0.2)
      const body = new THREE.Group()
      body.position.set(0, 0.0 + yOffset, 0)
      const cloakBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.6, 0.4),
        cloakMat
      )
      const skirt1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.3, 0.3),
        cloakMat
      )
      skirt1.position.set(-0.15, -0.4, 0)
      const skirt2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.2, 0.3),
        cloakMat
      )
      skirt2.position.set(0.15, -0.35, 0)
      body.add(cloakBody, skirt1, skirt2)
      this.leftArm = new THREE.Group()
      this.leftArm.position.set(-0.35, 0.25 + yOffset, 0)
      const lArmMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.4, 0.2).translate(0, -0.15, 0),
        cloakMat
      )
      this.leftArm.add(lArmMesh)
      this.rightArm = new THREE.Group()
      this.rightArm.position.set(0.35, 0.25 + yOffset, 0)
      const rArmMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.4, 0.2).translate(0, -0.15, 0),
        cloakMat
      )
      this.rightArm.add(rArmMesh)
      this.mesh.add(head, face, eyeL, eyeR, body, this.leftArm, this.rightArm)
    }

    this.mesh.traverse(child => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })
  }

  activateAbility () {
    if (!this.abilityReady || this.isAbilityActive || this.isDead) return
    this.isAbilityActive = true
    this.abilityReady = false
    this.jumps = 0
    if (this.type === 'GHOST') {
      this.abilityTimer = 6.0
      this.powerMaterials.forEach(mat => {
        mat.opacity = 0.25
        mat.emissive.setHex(0x222222)
      })
    } else if (this.type === 'JUGGERNAUT') {
      this.abilityTimer = 8.0
      this.baseScale = 1.35
      this.powerMaterials.forEach(mat => {
        mat.metalness = 1.0
        mat.roughness = 0.1
        mat.color.setHex(0xaaaaaa)
      })
    } else if (this.type === 'TIMEKEEPER') {
      this.abilityTimer = 6.0
      this.powerMaterials.forEach(mat => {
        mat.emissiveIntensity = 4.0
      })
    }
  }

  // NOVO: Método que despoleta a animação de morte
  die (cause) {
    if (this.isDead) return
    this.isDead = true
    this.isAbilityActive = false
    this.causeOfDeath = cause
    this.deathProgress = 0

    // Desativa a luz de poder caso estivesse ligada
    if (this.type === 'TIMEKEEPER')
      this.powerMaterials[0].emissiveIntensity = 1.0
  }

  update (delta) {
    // Lógica de Morte
    if (this.isDead) {
      this.deathProgress += delta * 2 // Velocidade da animação (0.5 seg)
      const p = Math.min(this.deathProgress, 1.0)

      if (
        this.causeOfDeath === 'Atropelado!' ||
        this.causeOfDeath === 'Esborrachado pelo Expresso!' ||
        this.causeOfDeath === 'Triturado pelas engrenagens!'
      ) {
        // PANQUECA: Achata no Y, alarga no X e Z
        this.mesh.scale.set(
          this.baseScale * (1 + p * 0.5),
          Math.max(0.05, this.baseScale * (1 - p * 2)),
          this.baseScale * (1 + p * 0.5)
        )
      } else if (
        this.causeOfDeath === 'Afogaste-te!' ||
        this.causeOfDeath === 'Derreteste no Ácido!'
      ) {
        // AFUNDAR: Afunda no chão e encolhe
        this.mesh.position.y -= delta * 1.5
        this.mesh.rotation.x += delta * 2
        this.mesh.scale.setScalar(Math.max(0.1, this.baseScale * (1 - p)))
      } else {
        // VOO DRAMÁTICO: Levou uma machadada ou tiro do Drone
        this.mesh.position.y += delta * 6
        this.mesh.position.z += delta * 4
        this.mesh.rotation.x -= delta * 15
        this.mesh.rotation.y += delta * 10
      }
      return // Impede que o timer de poder corra
    }

    // Lógica Normal de Poder
    if (this.isAbilityActive) {
      this.abilityTimer -= delta
      if (this.type === 'TIMEKEEPER') {
        this.powerMaterials[0].emissiveIntensity =
          2.0 + Math.sin(Date.now() * 0.02) * 2.0
      } else if (this.type === 'GHOST') {
        this.mesh.position.y += Math.sin(Date.now() * 0.01) * 0.005
      }

      if (this.abilityTimer <= 0) {
        this.isAbilityActive = false
        if (this.type === 'GHOST') {
          this.powerMaterials.forEach(mat => {
            mat.opacity = 0.85
            mat.emissive.setHex(0x000000)
          })
        } else if (this.type === 'JUGGERNAUT') {
          this.baseScale = 1.0
          this.powerMaterials.forEach(mat => {
            mat.metalness = 0.6
            mat.roughness = 0.6
            mat.color.setHex(0x555555)
          })
        } else if (this.type === 'TIMEKEEPER') {
          this.powerMaterials[0].emissiveIntensity = 1.0
        }
      }
    }
  }

  move (direction, world) {
    if (this.isMoving || this.isDead) return

    const step = 1
    const startPos = { x: this.mesh.position.x, z: this.mesh.position.z }
    let targetX = startPos.x
    let targetZ = Math.round(startPos.z)

    switch (direction) {
      case 'up':
        targetZ -= step
        this.mesh.rotation.y = Math.PI
        break
      case 'down':
        targetZ += step
        this.mesh.rotation.y = 0
        break
      case 'left':
        targetX -= step
        this.mesh.rotation.y = -Math.PI / 2
        break
      case 'right':
        targetX += step
        this.mesh.rotation.y = Math.PI / 2
        break
    }

    targetX = Math.round(targetX)
    const endPos = { x: targetX, z: targetZ }

    if (endPos.x < -14 || endPos.x > 14) return
    if (endPos.z > 5) return

    const targetElevation = world.getElevationAt(endPos.z)
    const startElevation = world.getElevationAt(startPos.z)
    if (targetElevation - startElevation > 1) return

    const isGhosting = this.type === 'GHOST' && this.isAbilityActive
    if (!isGhosting && world && world.isObstacle(endPos.x, endPos.z)) {
      return
    }

    this.isMoving = true

    if (direction === 'up' && !this.abilityReady && !this.isAbilityActive) {
      this.jumps++
      if (this.jumps >= this.jumpsToCharge) {
        this.abilityReady = true
      }
    }

    let progress = 0
    const animateJump = () => {
      if (this.isDead) return // Cancela o pulo a meio se morrer no ar

      const speedMod =
        this.type === 'TIMEKEEPER' && this.isAbilityActive ? 1.5 : 1.0
      progress += this.jumpSpeed * speedMod

      if (progress <= 1) {
        this.mesh.position.x = startPos.x + (endPos.x - startPos.x) * progress
        this.mesh.position.z = startPos.z + (endPos.z - startPos.z) * progress

        const baseHeight = THREE.MathUtils.lerp(
          startElevation,
          targetElevation,
          progress
        )
        const parabola = Math.sin(progress * Math.PI)
        this.mesh.position.y = baseHeight + parabola * this.jumpHeight

        this.mesh.scale.set(this.baseScale, this.baseScale, this.baseScale)

        const swingAngle = Math.sin(progress * Math.PI * 2) * 0.5
        if (this.leftArm) this.leftArm.rotation.x = -swingAngle
        if (this.rightArm) this.rightArm.rotation.x = swingAngle
        if (this.leftLeg) this.leftLeg.rotation.x = swingAngle
        if (this.rightLeg) this.rightLeg.rotation.x = -swingAngle

        requestAnimationFrame(animateJump)
      } else {
        this.mesh.position.set(endPos.x, targetElevation, endPos.z)
        this.mesh.scale.set(this.baseScale, this.baseScale, this.baseScale)

        if (this.leftArm) this.leftArm.rotation.x = 0
        if (this.rightArm) this.rightArm.rotation.x = 0
        if (this.leftLeg) this.leftLeg.rotation.x = 0
        if (this.rightLeg) this.rightLeg.rotation.x = 0

        this.isMoving = false
      }
    }

    animateJump()
  }
}
