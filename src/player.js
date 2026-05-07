import * as THREE from 'three';

export class Player {
    constructor(scene, type = 'chicken') {
        this.mesh = new THREE.Group();
        this.type = type;
        
        // Selecionar o modelo com base na escolha
        if (this.type === 'chicken') this.createChicken();
        else if (this.type === 'frog') this.createFrog(); // Usar o código que te dei antes
        else if (this.type === 'cat') this.createCat();  // Usar o código que te dei antes

        this.mesh.position.set(0, 0, 5);
        
        // Propriedades de animação e jogo
        this.isMoving = false;
        this.jumpHeight = 0.6;
        this.jumpSpeed = 0.2; 
        
        // --- SISTEMA DE HABILIDADES ---
        this.jumps = 0;
        this.maxJumps = 10;
        this.abilityReady = false;

        this.isInvincible = false;
        
        if (scene) scene.add(this.mesh);
    }

    createChicken() {
        const whiteMat = new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true });
        const orangeMat = new THREE.MeshPhongMaterial({ color: 0xffa500, flatShading: true });
        const redMat = new THREE.MeshPhongMaterial({ color: 0xff0000, flatShading: true });
        const blackMat = new THREE.MeshPhongMaterial({ color: 0x000000, flatShading: true });

        // Corpo (centralizado no Group para rotação correta)
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), whiteMat);
        body.position.y = 0.3; 
        body.castShadow = true;
        this.mesh.add(body);

        // Cabeça
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.35), whiteMat);
        head.position.set(0, 0.65, 0.1);
        this.mesh.add(head);

        // Detalhes (Crista, Bico, Olhos)
        const crest = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.2), redMat);
        crest.position.set(0, 0.9, 0.1);
        this.mesh.add(crest);

        const beak = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.15), orangeMat);
        beak.position.set(0, 0.6, 0.3);
        this.mesh.add(beak);

        const eyeGeom = new THREE.BoxGeometry(0.05, 0.05, 0.05);
        const leftEye = new THREE.Mesh(eyeGeom, blackMat);
        leftEye.position.set(0.12, 0.75, 0.25);
        this.mesh.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeom, blackMat);
        rightEye.position.set(-0.12, 0.75, 0.25);
        this.mesh.add(rightEye);
    }

    createFrog() {
        const greenMat = new THREE.MeshPhongMaterial({ color: 0x4CAF50, flatShading: true });
        const lightGreenMat = new THREE.MeshPhongMaterial({ color: 0x81C784, flatShading: true });
        const whiteMat = new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true });
        const blackMat = new THREE.MeshPhongMaterial({ color: 0x000000, flatShading: true });

        // Corpo
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), greenMat);
        body.position.y = 0.3; 
        body.castShadow = true;
        body.receiveShadow = true;
        this.mesh.add(body);

        // Barriga
        const belly = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.05), lightGreenMat);
        belly.position.set(0, 0.1, 0.35);
        this.mesh.add(belly);

        // Olhos
        const eyeGeom = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const pupilGeom = new THREE.BoxGeometry(0.05, 0.05, 0.05);

        // Olho Esquerdo
        const leftEye = new THREE.Mesh(eyeGeom, whiteMat);
        leftEye.position.set(-0.15, 0.7, 0.15);
        const leftPupil = new THREE.Mesh(pupilGeom, blackMat);
        leftPupil.position.set(-0.15, 0.7, 0.26); // Pupila ligeiramente à frente do olho
        this.mesh.add(leftEye);
        this.mesh.add(leftPupil);

        // Olho Direito
        const rightEye = new THREE.Mesh(eyeGeom, whiteMat);
        rightEye.position.set(0.15, 0.7, 0.15);
        const rightPupil = new THREE.Mesh(pupilGeom, blackMat);
        rightPupil.position.set(0.15, 0.7, 0.26); // Pupila ligeiramente à frente do olho
        this.mesh.add(rightEye);
        this.mesh.add(rightPupil);
    }

    createCat() {
        const orangeMat = new THREE.MeshPhongMaterial({ color: 0xFFA500, flatShading: true });
        const lightOrangeMat = new THREE.MeshPhongMaterial({ color: 0xFFE0B2, flatShading: true });
        const blackMat = new THREE.MeshPhongMaterial({ color: 0x000000, flatShading: true });

        // Corpo (Mais pequeno e baixo)
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.7), orangeMat);
        body.position.y = 0.2; // Assenta no chão
        body.position.z = -0.1; // Corpo ligeiramente recuado
        body.castShadow = true;
        body.receiveShadow = true; // Adicionado para receber sombras tal como a galinha e o sapo
        this.mesh.add(body);

        // Cabeça
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 0.4), orangeMat);
        head.position.set(0, 0.55, 0.15); // Pousada na frente do corpo
        this.mesh.add(head);

        // Focinho
        const snout = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.1), lightOrangeMat);
        snout.position.set(0, 0.45, 0.4); // Centrado na face frontal da cabeça
        this.mesh.add(snout);

        // Nariz (Preto)
        const nose = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.05), blackMat);
        nose.position.set(0, 0.5, 0.46); // Ligeiramente à frente e acima do focinho
        this.mesh.add(nose);

        // Orelhas
        const earGeom = new THREE.BoxGeometry(0.12, 0.15, 0.1);
        
        const leftEar = new THREE.Mesh(earGeom, orangeMat);
        leftEar.position.set(-0.15, 0.78, 0.1); // No topo esquerdo da cabeça
        this.mesh.add(leftEar);

        const rightEar = new THREE.Mesh(earGeom, orangeMat);
        rightEar.position.set(0.15, 0.78, 0.1); // No topo direito da cabeça
        this.mesh.add(rightEar);

        // Cauda
        const tail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.4, 0.1), orangeMat);
        tail.position.set(0, 0.35, -0.45); // Encaixada na traseira do corpo
        tail.rotation.x = -Math.PI / 6; // Inclinada para trás
        this.mesh.add(tail);
    }

    move(direction, world) { 
        if (this.isMoving) return; 
        
        const step = 1;
        const startPos = { x: this.mesh.position.x, z: this.mesh.position.z };
        const endPos = { x: startPos.x, z: startPos.z };

        switch(direction) {
            case 'up':    endPos.z -= step; this.mesh.rotation.y = Math.PI; break;
            case 'down':  endPos.z += step; this.mesh.rotation.y = 0; break;
            case 'left':  endPos.x -= step; this.mesh.rotation.y = -Math.PI / 2; break;
            case 'right': endPos.x += step; this.mesh.rotation.y = Math.PI / 2; break;
        }

        // ==========================================
        // LIMITES DO MAPA (Barreiras Invisíveis)
        // ==========================================
        
        // A. Limite Lateral: Bloqueia a passagem para as paredes laterais da floresta
        if (endPos.x < -14 || endPos.x > 14) {
            return; // Aborta imediatamente o movimento e ignora a tecla
        }

        // B. Limite de Recuo: Impede o jogador de fugir para a floresta atrás do spawn (z=5)
        if (endPos.z > 5) {
            return; // Aborta imediatamente o movimento
        }

        // ==========================================
        // VERIFICAÇÃO DE OBSTÁCULOS (Árvores e Pedras)
        // ==========================================
        if (world && world.isObstacle(endPos.x, endPos.z)) {
            return; 
        }

        this.isMoving = true;

        // Gestão da energia para a Habilidade Especial
        if (direction === 'up' && !this.abilityReady) {
            this.jumps++;
            if (this.jumps >= this.maxJumps) {
                this.abilityReady = true;
            }
        }

        let progress = 0;
        const animateJump = () => {
            progress += this.jumpSpeed;
            
            if (progress <= 1) {
                this.mesh.position.x = startPos.x + (endPos.x - startPos.x) * progress;
                this.mesh.position.z = startPos.z + (endPos.z - startPos.z) * progress;
                
                // Parábola para o arco do salto
                const parabola = Math.sin(progress * Math.PI);
                this.mesh.position.y = parabola * this.jumpHeight;
                
                // Polimento: Efeito Squash e Stretch orgânico
                const scaleY = 1 + parabola * 0.4; // Estica no ar
                const scaleXZ = 1 - parabola * 0.2; // Encolhe para os lados
                this.mesh.scale.set(scaleXZ, scaleY, scaleXZ);
                
                requestAnimationFrame(animateJump);
            } else {
                this.mesh.position.set(endPos.x, 0, endPos.z);
                this.mesh.scale.set(1, 1, 1); // Reset da deformação ao aterrar
                this.isMoving = false; 
            }
        };

        animateJump();
    }

    useAbility() {
        if (!this.abilityReady) return;

        // Ativa modo Invencível temporário (atravessa carros e ignora água)
        this.isInvincible = true;
        
        // Feedback visual: Fica semi-transparente
        this.mesh.traverse((child) => {
            if (child.isMesh) {
                child.material.transparent = true;
                child.material.opacity = 0.5;
            }
        });

        // Termina após 3 segundos
        setTimeout(() => {
            this.isInvincible = false;
            this.mesh.traverse((child) => {
                if (child.isMesh) {
                    child.material.transparent = false;
                    child.material.opacity = 1;
                }
            });
        }, 3000);
        
        this.jumps = 0;
        this.abilityReady = false;
    }
}