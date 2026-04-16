import * as THREE from 'three';

export class Player {
    constructor(scene) {
        this.mesh = new THREE.Group();
        this.createChicken();
        this.mesh.position.set(0, 0, 5); // Posição inicial no cenário
        
        if (scene) {
            scene.add(this.mesh); // Adiciona o grupo à cena recebida
        }
    }

    createChicken() {
        // Materiais com cores vivas
        const whiteMat = new THREE.MeshPhongMaterial({ color: 0xffffff, flatShading: true });
        const orangeMat = new THREE.MeshPhongMaterial({ color: 0xffa500, flatShading: true });
        const redMat = new THREE.MeshPhongMaterial({ color: 0xff0000, flatShading: true });
        const blackMat = new THREE.MeshPhongMaterial({ color: 0x000000, flatShading: true });

        // Corpo
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), whiteMat);
        body.position.y = 0.3; // Metade da altura para assentar no plano
        body.castShadow = true;
        this.mesh.add(body);

        // Cabeça
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.35), whiteMat);
        head.position.set(0, 0.65, 0.1);
        this.mesh.add(head);

        // Crista (Vermelha)
        const crest = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.2), redMat);
        crest.position.set(0, 0.9, 0.1);
        this.mesh.add(crest);

        // Bico (Laranja)
        const beak = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.1, 0.15), orangeMat);
        beak.position.set(0, 0.6, 0.3);
        this.mesh.add(beak);

        // Olhos
        const eyeGeom = new THREE.BoxGeometry(0.05, 0.05, 0.05);
        const leftEye = new THREE.Mesh(eyeGeom, blackMat);
        leftEye.position.set(0.12, 0.75, 0.25);
        this.mesh.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeom, blackMat);
        rightEye.position.set(-0.12, 0.75, 0.25);
        this.mesh.add(rightEye);
    }

    move(direction) {
        const step = 1;
        switch(direction) {
            case 'up':    this.mesh.position.z -= step; this.mesh.rotation.y = Math.PI; break;
            case 'down':  this.mesh.position.z += step; this.mesh.rotation.y = 0; break;
            case 'left':  this.mesh.position.x -= step; this.mesh.rotation.y = -Math.PI / 2; break;
            case 'right': this.mesh.position.x += step; this.mesh.rotation.y = Math.PI / 2; break;
        }
    }
}