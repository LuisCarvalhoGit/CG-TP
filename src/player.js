import * as THREE from 'three';

export class Player {
    constructor() {
        this.mesh = new THREE.Group();
        this.createBody();
        this.mesh.position.set(0, 0, 5); // Posição inicial
    }

    createBody() {
        const frogMaterial = new THREE.MeshPhongMaterial({ color: 0x44aa44, flatShading: true });
        const eyeMaterial = new THREE.MeshPhongMaterial({ color: 0xffffff });

        // Corpo Principal
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.8), frogMaterial);
        body.position.y = 0.25;
        body.castShadow = true;
        this.mesh.add(body);

        // Olhos (Complexidade de primitivas)
        const eyeGeom = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const leftEye = new THREE.Mesh(eyeGeom, eyeMaterial);
        leftEye.position.set(0.25, 0.6, 0.25);
        this.mesh.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeom, eyeMaterial);
        rightEye.position.set(-0.25, 0.6, 0.25);
        this.mesh.add(rightEye);
    }

    move(direction) {
        const step = 1;
        switch(direction) {
            case 'up':    this.mesh.position.z -= step; break;
            case 'down':  this.mesh.position.z += step; break;
            case 'left':  this.mesh.position.x -= step; break;
            case 'right': this.mesh.position.x += step; break;
        }
    }
}