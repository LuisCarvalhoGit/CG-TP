import * as THREE from 'three';

export class Player {
    constructor(scene) {
        this.mesh = new THREE.Group();
        this.createChicken();
        this.mesh.position.set(0, 0, 5);
        
        // Propriedades de animação
        this.isMoving = false;
        this.jumpHeight = 0.6;
        this.jumpSpeed = 0.2; // Velocidade do salto
        
        if (scene) {
            scene.add(this.mesh);
        }
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

    move(direction) {
        if (this.isMoving) return; // Impede múltiplos saltos ao mesmo tempo
        
        this.isMoving = true;
        const step = 1;
        const startPos = { x: this.mesh.position.x, z: this.mesh.position.z };
        const endPos = { x: startPos.x, z: startPos.z };

        // Definir direção e rotação
        switch(direction) {
            case 'up':    endPos.z -= step; this.mesh.rotation.y = Math.PI; break;
            case 'down':  endPos.z += step; this.mesh.rotation.y = 0; break;
            case 'left':  endPos.x -= step; this.mesh.rotation.y = -Math.PI / 2; break;
            case 'right': endPos.x += step; this.mesh.rotation.y = Math.PI / 2; break;
        }

        // Lógica de Animação do Salto (Interpolação simples)
        let progress = 0;
        const animateJump = () => {
            progress += this.jumpSpeed;
            
            if (progress <= 1) {
                // Movimento Linear X e Z
                this.mesh.position.x = startPos.x + (endPos.x - startPos.x) * progress;
                this.mesh.position.z = startPos.z + (endPos.z - startPos.z) * progress;
                
                // Movimento em Arco para o Y (Parábola)
                // y = altura * sin(pi * progresso)
                this.mesh.position.y = Math.sin(progress * Math.PI) * this.jumpHeight;
                
                requestAnimationFrame(animateJump);
            } else {
                // Finalizar movimento
                this.mesh.position.x = endPos.x;
                this.mesh.position.z = endPos.z;
                this.mesh.position.y = 0;
                this.isMoving = false;
            }
        };

        animateJump();
    }
}