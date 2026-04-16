import * as THREE from 'three';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.createGround();
    }

    createGround() {
        // Criar um chão verde (relva)
        const geometry = new THREE.PlaneGeometry(100, 100);
        const material = new THREE.MeshPhongMaterial({ 
            color: 0x44aa44, 
            side: THREE.DoubleSide 
        });
        
        const ground = new THREE.Mesh(geometry, material);
        
        // Rodar o plano para ficar horizontal (está vertical por defeito)
        ground.rotation.x = -Math.PI / 2;
        
        // Ativar receção de sombras
        ground.receiveShadow = true;
        
        this.scene.add(ground);

        // Opcional: Adicionar uma grelha para ajudar a visualizar o movimento
        const grid = new THREE.GridHelper(100, 100, 0x000000, 0x000000);
        grid.material.opacity = 0.2;
        grid.material.transparent = true;
        this.scene.add(grid);
    }
}