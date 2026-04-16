import * as THREE from 'three';

export function createWorld(scene) {
    const LANES = 10;
    const LANE_WIDTH = 2;

    for (let i = 0; i < LANES; i++) {
        const isGrass = i % 2 === 0;
        const geometry = new THREE.PlaneGeometry(20, LANE_WIDTH);
        const material = new THREE.MeshPhongMaterial({ 
            color: isGrass ? 0x7cfc00 : 0x444444 
        });

        const lane = new THREE.Mesh(geometry, material);
        lane.rotation.x = -Math.PI / 2;
        lane.position.z = i - (LANES / 2);
        lane.receiveShadow = true;
        scene.add(lane);
    }
}