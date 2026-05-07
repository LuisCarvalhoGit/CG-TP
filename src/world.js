import * as THREE from 'three';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.lanes = [];
        this.laneWidth = 80; 
        this.cars = []; 
        this.logs = []; 
        this.birds = []; 
        this.trains = []; // Array para controlo dos comboios
        this.obstacles = new Set();
        this.furthestZ = -30;

        // Contexto de Áudio para a Sirene Retro (Gerada por Código)
        this.audioCtx = null;

        this.createInitialMap();
        this.createBirds();
    }

    createInitialMap() {
        for (let z = 5; z >= 0; z--) {
            this.createLane(z, 'grass', true);
        }
        for (let z = -1; z >= -30; z--) {
            this.generateProceduralLane(z);
        }
    }

    generateProceduralLane(z) {
        const depth = Math.abs(z);
        let roadProb = 0.4 + (depth * 0.005); 
        let riverProb = 0.15 + (depth * 0.003);
        let trainProb = 0.08 + (depth * 0.002); 

        const rand = Math.random();
        let type = 'grass';
        if (rand < roadProb) type = 'road';
        else if (rand < roadProb + riverProb) type = 'river';
        else if (rand < roadProb + riverProb + trainProb) type = 'railroad'; 

        this.createLane(z, type, false, depth);
    }

    createLane(z, type, isSafeZone, depth = 0) {
        const laneGroup = new THREE.Group();
        laneGroup.position.z = z;

        let groundMat;
        let groundGeo;

        if (type === 'river') {
            groundGeo = new THREE.BoxGeometry(this.laneWidth, 1, 1, 60, 1, 1);
            const positions = groundGeo.attributes.position;
            const originalY = [];
            for (let i = 0; i < positions.count; i++) originalY.push(positions.getY(i));
            groundGeo.userData.originalY = originalY;
            
            groundMat = new THREE.MeshStandardMaterial({ 
                color: 0x1e88e5, 
                roughness: 0.1, 
                metalness: 0.6, 
                flatShading: true 
            });
        } else {
            groundGeo = new THREE.BoxGeometry(this.laneWidth, 1, 1);
            if (type === 'grass') {
                groundMat = new THREE.MeshPhysicalMaterial({ color: 0x4caf50, roughness: 0.8, metalness: 0.1, clearcoat: 0.1, flatShading: true });
            } else if (type === 'road') {
                groundMat = new THREE.MeshPhysicalMaterial({ color: 0x2a2a2a, roughness: 0.6, metalness: 0.3, clearcoat: 0.4, clearcoatRoughness: 0.3, flatShading: true });
            } else if (type === 'railroad') {
                groundMat = new THREE.MeshStandardMaterial({ color: 0x3d3935, roughness: 1.0, flatShading: true });
            }
        }
        
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.position.y = (type === 'river') ? -0.65 : -0.5;
        if (type !== 'river') ground.receiveShadow = true; 
        laneGroup.add(ground);

        if (!isSafeZone) {
            if (type === 'grass') this.addTrees(laneGroup, z);
            else if (type === 'road') this.addCar(laneGroup, depth);
            else if (type === 'river') this.addLog(laneGroup);
            else if (type === 'railroad') this.addRailroad(laneGroup);
        }

        this.scene.add(laneGroup);
        this.lanes.push({ z: z, type: type, group: laneGroup });
    }

    addTrees(laneGroup, laneZ) {
        const numTrees = Math.floor(Math.random() * 4) + 1;
        const occupiedPositions = new Set();
        const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 0.6, 6);
        const trunkMat = new THREE.MeshPhysicalMaterial({ color: 0x4a3020, roughness: 0.9, clearcoat: 0.1 });
        const leafGeo = new THREE.ConeGeometry(0.8, 1.2, 6); 
        const leafMat = new THREE.MeshPhysicalMaterial({ color: 0x2e8b57, roughness: 0.7, clearcoat: 0.2, clearcoatRoughness: 0.5, flatShading: true });

        for (let i = 0; i < numTrees; i++) {
            let x = Math.floor(Math.random() * 30) - 15; 
            if (occupiedPositions.has(x) || (x === 0 && laneGroup.position.z > -5)) continue; 
            occupiedPositions.add(x);
            const tree = new THREE.Group();
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = 0.3; trunk.castShadow = true; trunk.receiveShadow = true;
            for (let j = 0; j < 3; j++) {
                const leaves = new THREE.Mesh(leafGeo, leafMat);
                leaves.position.y = 0.8 + (j * 0.5);
                leaves.scale.set(1 - j * 0.2, 1, 1 - j * 0.2); 
                leaves.castShadow = true; leaves.receiveShadow = true;
                tree.add(leaves);
            }
            tree.add(trunk);
            tree.position.x = x;
            const scale = 0.8 + Math.random() * 0.4;
            tree.scale.set(scale, scale, scale);
            laneGroup.add(tree);
            this.obstacles.add(`${x},${laneZ}`);
        }
    }

    addCar(laneGroup, depth) {
        const direction = Math.random() > 0.5 ? 1 : -1; 
        let baseSpeed = 0.05 + Math.random() * 0.08;
        baseSpeed += (depth * 0.001); 
        let color = [0xe53935, 0x1e88e5, 0xfdd835, 0xffffff, 0x8e24aa][Math.floor(Math.random() * 5)];
        let length = 1.6;
        if (Math.random() > 0.9) { length = 7; baseSpeed *= 1.8; color = 0x212121; }

        const car = new THREE.Group();
        const bodyMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.4, metalness: 0.3, flatShading: true });
        const glassMat = new THREE.MeshStandardMaterial({ 
            color: 0x88ccff, roughness: 0.1, metalness: 0.5, transparent: true, opacity: 0.55, depthWrite: false, flatShading: true 
        });

        const chassis = new THREE.Mesh(new THREE.BoxGeometry(length, 0.35, 0.8), bodyMat);
        chassis.position.y = 0.3; chassis.castShadow = true; chassis.receiveShadow = true;
        const roofLength = length * 0.45;
        const roof = new THREE.Mesh(new THREE.BoxGeometry(roofLength, 0.25, 0.76), bodyMat);
        roof.position.set(length === 7 ? 0 : -0.1, 0.6, 0); 
        const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(roofLength - 0.1, 0.22, 0.78), glassMat);
        sideGlass.position.set(length === 7 ? 0 : -0.1, 0.58, 0);
        const frontWindshield = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.74), glassMat);
        frontWindshield.position.set((length === 7 ? 0 : -0.1) + (roofLength/2) + 0.05, 0.52, 0);
        frontWindshield.rotation.z = -Math.PI / 5; 
        const rearWindshield = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.74), glassMat);
        rearWindshield.position.set((length === 7 ? 0 : -0.1) - (roofLength/2) - 0.05, 0.52, 0);
        rearWindshield.rotation.z = length === 7 ? 0 : Math.PI / 6; 

        const wheelGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.1, 8);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
        [{ x: -length/2+0.3, z: 0.4 }, { x: length/2-0.3, z: 0.4 }, { x: -length/2+0.3, z: -0.4 }, { x: length/2-0.3, z: -0.4 }].forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.rotation.x = Math.PI / 2; wheel.position.set(pos.x, 0.18, pos.z);
            car.add(wheel);
        });

        const lightMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2 });
        const fR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.15), lightMat); fR.position.set(length/2, 0.3, 0.25);
        const fL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.15), lightMat); fL.position.set(length/2, 0.3, -0.25);
        car.add(chassis, roof, sideGlass, frontWindshield, rearWindshield, fR, fL);
        car.position.x = direction === 1 ? -40 : 40; 
        if (direction === -1) car.rotation.y = Math.PI; 
        laneGroup.add(car);
        this.cars.push({ mesh: car, direction: direction, speed: baseSpeed, laneZ: laneGroup.position.z });
    }

    addLog(laneGroup) {
        const direction = Math.random() > 0.5 ? 1 : -1; 
        const speed = 0.03 + Math.random() * 0.05; 
        const numLogs = 5 + Math.floor(Math.random() * 4); 
        let currentX = direction === 1 ? -40 : 40; 

        for (let i = 0; i < numLogs; i++) {
            const length = 2 + Math.random() * 3; 
            const logGroup = new THREE.Group();
            const logGeo = new THREE.CylinderGeometry(0.3, 0.3, length, 8);
            const logMat = new THREE.MeshPhysicalMaterial({ color: 0x4a3020, roughness: 0.6, clearcoat: 0.3, clearcoatRoughness: 0.4 });
            const log = new THREE.Mesh(logGeo, logMat);
            log.rotation.z = Math.PI / 2; log.position.y = -0.1; 
            logGroup.add(log);
            logGroup.position.x = currentX;
            currentX -= direction * (length + 0.5 + Math.random() * 1.5);
            laneGroup.add(logGroup);
            this.logs.push({ mesh: logGroup, direction: direction, speed: speed, laneZ: laneGroup.position.z });
        }
        if (Math.random() > 0.3) {
            const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 8), new THREE.MeshStandardMaterial({ color: 0x4caf50, roughness: 0.9 }));
            pad.position.set((Math.random() * 20) - 10, -0.15, (Math.random() * 0.6) - 0.3);
            laneGroup.add(pad);
        }
    }

    addRailroad(laneGroup) {
        const direction = Math.random() > 0.5 ? 1 : -1; 
        
        // 1. MATERIAIS DA LINHA E DO COMBOIO
        const railMat = new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.8, roughness: 0.2 });
        const tieMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 1.0 });
        const mainBodyMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5, roughness: 0.3 }); 
        const royalBlueMat = new THREE.MeshStandardMaterial({ color: 0x002366, metalness: 0.4, roughness: 0.4 }); 
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 1.0, roughness: 0.1 });    
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8 });

        // --- A. CONSTRUÇÃO DA LINHA (Carris e Dormentes) ---
        const railGeo = new THREE.BoxGeometry(this.laneWidth, 0.05, 0.1);
        const r1 = new THREE.Mesh(railGeo, railMat); r1.position.set(0, 0.025, 0.25);
        const r2 = new THREE.Mesh(railGeo, railMat); r2.position.set(0, 0.025, -0.25);
        laneGroup.add(r1, r2);

        const tieGeo = new THREE.BoxGeometry(0.2, 0.04, 0.8);
        for (let x = -40; x <= 40; x += 1.5) {
            const tie = new THREE.Mesh(tieGeo, tieMat);
            tie.position.set(x, 0.02, 0);
            laneGroup.add(tie);
        }

        // --- B. O COMBOIO REAL (Grupo) ---
        const trainGroup = new THREE.Group();

        // LOCOMOTIVA
        const engine = new THREE.Group();
        const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 3.5, 24), mainBodyMat);
        boiler.rotation.z = Math.PI / 2;
        boiler.position.set(0.2, 0.65, 0);
        
        for(let i = 0; i < 4; i++) {
            const band = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.1, 24), goldMat);
            band.rotation.z = Math.PI / 2;
            band.position.set(-1.0 + (i * 0.9), 0.65, 0);
            engine.add(band);
        }

        const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 0.8, 16), mainBodyMat);
        stack.position.set(1.4, 1.2, 0);
        const stackCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.18, 0.15, 16), goldMat);
        stackCrown.position.set(1.4, 1.6, 0);
        
        const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), goldMat);
        lantern.position.set(1.9, 0.8, 0);
        const glass = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.2), new THREE.MeshStandardMaterial({ color: 0xffffaa, emissive: 0xffffaa, emissiveIntensity: 2 }));
        glass.position.set(2.05, 0.8, 0);
        engine.add(lantern, glass);

        const cab = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.3, 0.9), royalBlueMat);
        cab.position.set(-1.2, 1.0, 0);
        const cabTrim = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.1, 0.95), goldMat);
        cabTrim.position.set(-1.2, 1.6, 0);

        const catcher = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.8, 4), goldMat);
        catcher.rotation.x = Math.PI / 2;
        catcher.rotation.z = Math.PI / 4;
        catcher.position.set(2.2, 0.4, 0);
        
        const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.15, 24);
        for(let i=0; i<4; i++) {
            const wL = new THREE.Mesh(wheelGeo, wheelMat); wL.rotation.x = Math.PI/2; wL.position.set(-1.0 + (i*0.8), 0.4, 0.42);
            const wR = new THREE.Mesh(wheelGeo, wheelMat); wR.rotation.x = Math.PI/2; wR.position.set(-1.0 + (i*0.8), 0.4, -0.42);
            engine.add(wL, wR);
        }
        engine.add(boiler, stack, stackCrown, cab, cabTrim, catcher);
        trainGroup.add(engine);

        // VAGÃO TENDER
        const tender = new THREE.Group();
        const tenderBody = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 0.85), royalBlueMat);
        tenderBody.position.set(-2.8, 0.7, 0);
        const tenderGoldBar = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.1, 0.9), goldMat);
        tenderGoldBar.position.set(-2.8, 1.1, 0);
        tender.add(tenderBody, tenderGoldBar);
        trainGroup.add(tender);

        // CARRUAGENS LONGAS
        const numCarriages = 2; 
        for (let c = 0; c < numCarriages; c++) {
            const carriage = new THREE.Group();
            const offset = -6.5 - (c * 4.5);
            const body = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.1, 0.9), royalBlueMat);
            body.position.set(offset, 0.85, 0);
            const trimTop = new THREE.Mesh(new THREE.BoxGeometry(4.05, 0.05, 0.95), goldMat);
            trimTop.position.set(offset, 1.35, 0);
            const trimBottom = new THREE.Mesh(new THREE.BoxGeometry(4.05, 0.05, 0.95), goldMat);
            trimBottom.position.set(offset, 0.4, 0);

            const winMat = new THREE.MeshStandardMaterial({ color: 0xccf0ff, transparent: true, opacity: 0.6, depthWrite: false });
            for(let j=0; j<7; j++) {
                const win = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.95), winMat);
                win.position.set(offset - 1.5 + (j*0.5), 0.95, 0);
                carriage.add(win);
            }
            carriage.add(body, trimTop, trimBottom);
            trainGroup.add(carriage);
        }

        // --- C. SINALIZAÇÃO ---
        const signalGroup = new THREE.Group();
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5), mainBodyMat);
        pole.position.set(-8, 0.75, -0.4);
        const lBox = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.25), new THREE.MeshStandardMaterial({ color: 0x111111 }));
        lBox.position.set(-8, 1.5, -0.4);
        const rLightMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0 });
        const rL1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.25, 16), rLightMat); rL1.rotation.x = Math.PI/2; rL1.position.set(-8.2, 1.5, -0.4);
        const rL2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.25, 16), rLightMat); rL2.rotation.x = Math.PI/2; rL2.position.set(-7.8, 1.5, -0.4);
        signalGroup.add(pole, lBox, rL1, rL2);
        laneGroup.add(signalGroup);

        trainGroup.position.x = direction === 1 ? -60 : 60;
        if (direction === -1) trainGroup.rotation.y = Math.PI; 
        laneGroup.add(trainGroup);

        this.trains.push({
            mesh: trainGroup, direction: direction, speed: 1.0, 
            laneZ: laneGroup.position.z, state: 'IDLE', timer: 3 + Math.random() * 5, warningLights: [rL1, rL2]
        });
    }

    createBirds() {
        for (let i = 0; i < 6; i++) {
            const bird = new THREE.Group();
            const wMat = new THREE.MeshBasicMaterial({ color: 0x222222 }); 
            const w1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.15), wMat); w1.rotation.y = Math.PI/4; w1.position.set(-0.15, 0, 0.15);
            const w2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.15), wMat); w2.rotation.y = -Math.PI/4; w2.position.set(0.15, 0, 0.15);
            bird.add(w1, w2);
            bird.position.set((Math.random() * 40) - 20, 10 + Math.random() * 5, -10 - Math.random() * 20);
            this.scene.add(bird);
            this.birds.push({ mesh: bird, speed: 0.05 + Math.random() * 0.08, wingOscillation: Math.random() * Math.PI });
        }
    }

    playTrainSiren() {
        if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'square';
        [450, 600, 450, 600, 450].forEach((f, i) => osc.frequency.setValueAtTime(f, this.audioCtx.currentTime + i * 0.3));
        osc.connect(gain); gain.connect(this.audioCtx.destination);
        gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
        osc.start(); osc.stop(this.audioCtx.currentTime + 1.5);
    }

    update(delta, playerZ = 0) {
        this.time = (this.time || 0) + delta;

        this.cars.forEach(car => {
            car.mesh.position.x += car.speed * car.direction * delta * 60;
            if ((car.direction === 1 && car.mesh.position.x > 42) || (car.direction === -1 && car.mesh.position.x < -42)) car.mesh.position.x *= -1;
        });

        this.logs.forEach(log => {
            log.mesh.position.x += log.speed * log.direction * delta * 60;
            if ((log.direction === 1 && log.mesh.position.x > 42) || (log.direction === -1 && log.mesh.position.x < -42)) log.mesh.position.x *= -1;
        });

        this.birds.forEach(bird => {
            bird.mesh.position.x -= bird.speed * delta * 60;
            bird.wingOscillation += delta * 15;
            bird.mesh.position.y += Math.sin(bird.wingOscillation) * 0.01; 
            if (bird.mesh.position.x < -25) {
                bird.mesh.position.set(25, 8 + Math.random() * 6, playerZ - 5 - (Math.random() * 20));
            }
        });

        this.trains.forEach(t => {
            if (t.state === 'IDLE') {
                t.timer -= delta;
                if (t.timer <= 0) { t.state = 'WARNING'; t.timer = 1.8; this.playTrainSiren(); }
            } else if (t.state === 'WARNING') {
                t.timer -= delta;
                const blink = Math.sin(this.time * 25) > 0;
                t.warningLights.forEach((l, i) => l.material.emissiveIntensity = (i === 0 ? blink : !blink) ? 5 : 0);
                if (t.timer <= 0) { 
                    t.state = 'PASSING'; 
                    t.warningLights.forEach(l => l.material.emissiveIntensity = 0);
                    t.mesh.position.x = t.direction === 1 ? -60 : 60;
                }
            } else if (t.state === 'PASSING') {
                t.mesh.position.x += t.speed * t.direction * delta * 60;
                if (Math.abs(t.mesh.position.x) > 60) { t.state = 'IDLE'; t.timer = 4 + Math.random() * 6; }
            }
        });

        this.lanes.forEach(lane => {
            if (lane.type === 'river') {
                const positions = lane.group.children[0].geometry.attributes.position;
                const originalY = lane.group.children[0].geometry.userData.originalY;
                for (let i = 0; i < positions.count; i++) {
                    if (originalY[i] > 0) positions.setY(i, originalY[i] + Math.sin(positions.getX(i) * 0.5 + this.time * 2.5) * 0.08);
                }
                positions.needsUpdate = true;
                lane.group.children[0].geometry.computeVertexNormals();
            }
        });
    }

    updateMap(playerZ) {
        const targetZ = Math.floor(playerZ) - 35; 
        while (this.furthestZ > targetZ) { this.furthestZ--; this.generateProceduralLane(this.furthestZ); }
        const cleanupZ = Math.floor(playerZ) + 30;
        for (let i = this.lanes.length - 1; i >= 0; i--) {
            const lane = this.lanes[i];
            if (lane.z > cleanupZ) {
                this.scene.remove(lane.group);
                for (const obs of this.obstacles) if (obs.endsWith(`,${lane.z}`)) this.obstacles.delete(obs);
                this.cars = this.cars.filter(c => c.laneZ !== lane.z);
                this.logs = this.logs.filter(l => l.laneZ !== lane.z);
                this.trains = this.trains.filter(t => t.laneZ !== lane.z);
                this.lanes.splice(i, 1);
            }
        }
    }

    isObstacle(x, z) { return this.obstacles.has(`${x},${z}`); }

    reset() {
        this.lanes.forEach(lane => this.scene.remove(lane.group));
        this.lanes = []; this.cars = []; this.logs = []; this.trains = [];
        this.obstacles.clear(); this.furthestZ = -30;
        this.createInitialMap();
    }
}