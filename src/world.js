import * as THREE from 'three';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.lanes = [];
        this.laneWidth = 80; 
        this.cars = []; 
        this.logs = []; 
        this.birds = []; 
        this.trains = []; 
        this.obstacles = new Set();
        this.furthestZ = -30;
        this.audioCtx = null; 
        
        // NOVO: Memória de Contexto para as Transições
        this.lastLaneType = 'forest'; 

        this.initAssets();
        this.createInitialMap();
        this.createBirds();
    }

    initAssets() {
        this.mats = {
            grass: new THREE.MeshPhysicalMaterial({ color: 0x4caf50, roughness: 0.9, flatShading: true }),
            road: new THREE.MeshPhysicalMaterial({ color: 0x2a2a2a, roughness: 0.8, metalness: 0.2, flatShading: true }),
            river: new THREE.MeshStandardMaterial({ color: 0x1e88e5, roughness: 0.1, metalness: 0.6, flatShading: true }),
            railroad: new THREE.MeshStandardMaterial({ color: 0x3d3935, roughness: 1.0, flatShading: true }),
            
            // NOVO: Materiais de Transição (Bordas)
            roadLine: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1.0, flatShading: true }),
            sidewalk: new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 1.0, flatShading: true }), // Pedra de Passeio
            warningYellow: new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.8, flatShading: true }),
            metalPlate: new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.4 }),

            trunk: new THREE.MeshPhysicalMaterial({ color: 0x4a3020, roughness: 0.9, clearcoat: 0.1 }),
            pineLeaf: new THREE.MeshPhysicalMaterial({ color: 0x2e8b57, roughness: 0.7, clearcoat: 0.2, flatShading: true }),
            roundLeaf: new THREE.MeshPhysicalMaterial({ color: 0x4caf50, roughness: 0.8, clearcoat: 0.1, flatShading: true }),
            bush: new THREE.MeshPhysicalMaterial({ color: 0x228b22, roughness: 0.9, clearcoat: 0.1, flatShading: true }),
            rock: new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.9, flatShading: true }),
            forestLeaf: new THREE.MeshLambertMaterial({ color: 0x1c5936, flatShading: true }),
            
            tunnelGranite: new THREE.MeshPhysicalMaterial({ color: 0x555555, roughness: 0.9, metalness: 0.1, clearcoat: 0.1, flatShading: true }),
            tunnelTrim: new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 1.0, roughness: 0.1 }), 
            tunnelInside: new THREE.MeshBasicMaterial({ color: 0x000000 }), 
            
            wood: new THREE.MeshPhysicalMaterial({ color: 0x4a3020, roughness: 0.6, clearcoat: 0.3 }),
            glass: new THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.1, metalness: 0.5, transparent: true, opacity: 0.55, depthWrite: false, flatShading: true }),
            wheel: new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8 })
        };

        this.geos = {
            lane: new THREE.BoxGeometry(this.laneWidth, 1, 1), 
            river: new THREE.BoxGeometry(this.laneWidth, 1, 1, 80, 1, 1),
            
            // NOVO: Geometrias de Transição
            roadLine: new THREE.BoxGeometry(1.2, 0.02, 0.1), // Traço da estrada
            sidewalk: new THREE.BoxGeometry(this.laneWidth, 0.1, 0.3), // O Passeio de pedra
            warningLine: new THREE.BoxGeometry(this.laneWidth, 0.02, 0.15), // Linha amarela
            metalPlate: new THREE.BoxGeometry(this.laneWidth, 0.05, 0.25), // Placa de passagem de nível

            trunk: new THREE.CylinderGeometry(0.2, 0.3, 0.6, 12),
            pineLeaf: new THREE.ConeGeometry(0.8, 1.2, 12),
            sphereLeaf: new THREE.SphereGeometry(0.7, 16, 16),
            rock: new THREE.BoxGeometry(0.7, 0.7, 0.7),
            forestLeaf: new THREE.ConeGeometry(1.2, 1.8, 8),
            
            tunnelMainArch: new THREE.CylinderGeometry(1.6, 1.6, 1.2, 24, 1, false, 0, Math.PI), 
            tunnelTrimArch: new THREE.CylinderGeometry(1.65, 1.65, 0.2, 24, 1, false, 0, Math.PI),
            tunnelWall: new THREE.BoxGeometry(1.4, 3.2, 1.2), 
            pillarBase: new THREE.BoxGeometry(0.6, 1, 0.6),
            
            log: new THREE.CylinderGeometry(0.3, 0.3, 1, 16),
            wheel: new THREE.CylinderGeometry(0.18, 0.18, 0.1, 16)
        };

        const positions = this.geos.river.attributes.position;
        const originalY = [];
        for (let i = 0; i < positions.count; i++) originalY.push(positions.getY(i));
        this.geos.river.userData.originalY = originalY;
    }

    createInitialMap() {
        this.lastLaneType = 'forest';
        for (let z = 20; z >= 6; z--) { 
            this.createLane(z, 'forest', true, 0, this.lastLaneType); 
            this.lastLaneType = 'forest'; 
        }
        for (let z = 5; z >= 0; z--) { 
            this.createLane(z, 'grass', true, 0, this.lastLaneType); 
            this.lastLaneType = 'grass'; 
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
        
        // Passa o tipo da faixa anterior para a função de criação
        this.createLane(z, type, false, depth, this.lastLaneType);
        
        // Atualiza a memória
        this.lastLaneType = type;
    }

    createLane(z, type, isSafeZone, depth = 0, prevType = null) {
        const laneGroup = new THREE.Group();
        laneGroup.position.z = z;

        const groundGeo = type === 'river' ? this.geos.river : this.geos.lane;
        let groundMat = this.mats.grass;
        if (type === 'road') groundMat = this.mats.road;
        else if (type === 'river') groundMat = this.mats.river;
        else if (type === 'railroad') groundMat = this.mats.railroad;
        
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.position.y = (type === 'river') ? -0.65 : -0.5;  
        if (type !== 'river') ground.receiveShadow = true; 
        laneGroup.add(ground);

        // ==========================================
        // NOVO: SISTEMA DE TRANSIÇÕES (A "Costura" do Mapa)
        // ==========================================
        if (prevType) {
            this.createTransition(laneGroup, type, prevType);
        }

        // Lógica de Bordas Reais
        if (type === 'forest') {
            this.addDenseForest(laneGroup, -40, 40);
        } else if (type === 'river' || type === 'road') {
            // Limpo
        } else if (type === 'railroad') {
            this.addUltraRealisticTunnel(laneGroup, -15.5, 1); 
            this.addUltraRealisticTunnel(laneGroup, 15.5, -1);
            this.addDenseForest(laneGroup, -40, -18); 
            this.addDenseForest(laneGroup, 18, 40);
        } else {
            this.addDenseForest(laneGroup, -40, -15); 
            this.addDenseForest(laneGroup, 15, 40);   
        }

        // Adicionar obstáculos
        if (!isSafeZone) {
            if (type === 'grass') this.addTrees(laneGroup, z);
            else if (type === 'river') this.addLog(laneGroup);
            else if (type === 'railroad') this.addRailroad(laneGroup);
            else if (type === 'road') this.addCar(laneGroup, depth);
        }

        this.scene.add(laneGroup);
        this.lanes.push({ z: z, type: type, group: laneGroup });
    }

    // ==========================================
    // COSTURA DAS BORDAS (O Level Design)
    // ==========================================
    createTransition(laneGroup, currentType, prevType) {
        // O valor 0.5 coloca o objeto exatamente na linha divisória entre a faixa atual e a de trás
        const edgeZ = 0.5;

        // 1. ESTRADA <-> ESTRADA (Linha Tracejada)
        if (currentType === 'road' && prevType === 'road') {
            for (let x = -40; x <= 40; x += 3) {
                const line = new THREE.Mesh(this.geos.roadLine, this.mats.roadLine);
                line.position.set(x, 0.01, edgeZ); // 0.01 previne z-fighting (bug visual)
                line.receiveShadow = true;
                laneGroup.add(line);
            }
        }
        // 2. ESTRADA <-> RELVA (Passeio de Pedra)
        else if ((currentType === 'road' && prevType === 'grass') || (currentType === 'grass' && prevType === 'road')) {
            const sidewalk = new THREE.Mesh(this.geos.sidewalk, this.mats.sidewalk);
            sidewalk.position.set(0, 0.05, edgeZ); // O passeio é ligeiramente elevado (Y=0.05)
            sidewalk.receiveShadow = true; sidewalk.castShadow = true;
            laneGroup.add(sidewalk);
        }
        // 3. ESTRADA <-> COMBOIO (Passagem de Nível Metálica + Linha Amarela)
        else if ((currentType === 'road' && prevType === 'railroad') || (currentType === 'railroad' && prevType === 'road')) {
            // Placa Metálica no fundo
            const metal = new THREE.Mesh(this.geos.metalPlate, this.mats.metalPlate);
            metal.position.set(0, 0.01, edgeZ);
            metal.receiveShadow = true;
            
            // Linha Amarela de Cuidado por cima do metal
            const warning = new THREE.Mesh(this.geos.warningLine, this.mats.warningYellow);
            warning.position.set(0, 0.02, edgeZ);
            warning.receiveShadow = true;
            
            laneGroup.add(metal, warning);
        }
    }

    addUltraRealisticTunnel(laneGroup, x, sideDir) {
        const tunnelGroup = new THREE.Group();
        const leftWall = new THREE.Mesh(this.geos.tunnelWall, this.mats.tunnelGranite);
        leftWall.position.set(0, 0.8, 1.2); leftWall.receiveShadow = true; leftWall.castShadow = true;
        const rightWall = new THREE.Mesh(this.geos.tunnelWall, this.mats.tunnelGranite);
        rightWall.position.set(0, 0.8, -1.2); rightWall.receiveShadow = true; rightWall.castShadow = true;
        const arch = new THREE.Mesh(this.geos.tunnelMainArch, this.mats.tunnelGranite);
        arch.rotation.z = Math.PI / 2; arch.position.y = 2.4; 
        arch.receiveShadow = true; arch.castShadow = true;
        const trim = new THREE.Mesh(this.geos.tunnelTrimArch, this.mats.tunnelTrim);
        trim.rotation.z = Math.PI / 2; trim.position.set(0.6 * -sideDir, 2.4, 0); 
        trim.castShadow = true;
        [-1, 1].forEach(sideZ => {
            const base = new THREE.Mesh(this.geos.pillarBase, this.mats.tunnelGranite);
            base.position.set(0, 0, sideZ * 1.2); base.receiveShadow = true;
            tunnelGroup.add(base);
        });
        const interior = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 4.0), this.mats.tunnelInside);
        interior.rotation.y = sideDir * (Math.PI / 2);
        interior.position.set(sideDir * 0.58, 1.5, 0); 
        tunnelGroup.add(leftWall, rightWall, arch, trim, interior);
        tunnelGroup.position.x = x;
        if (sideDir === -1) tunnelGroup.rotation.y = Math.PI; 
        laneGroup.add(tunnelGroup);
    }

    addDenseForest(laneGroup, startX, endX) {
        for (let x = startX; x <= endX; x += 2.0 + Math.random() * 2.0) {
            const tree = new THREE.Group();
            const trunk = new THREE.Mesh(this.geos.forestTrunk, this.mats.forestTrunk);
            trunk.position.y = 0.4; 
            trunk.castShadow = false; trunk.receiveShadow = false; 
            for (let j = 0; j < 2; j++) { 
                const leaves = new THREE.Mesh(this.geos.forestLeaf, this.mats.forestLeaf);
                leaves.position.y = 1.0 + (j * 0.7);
                leaves.scale.set(1 - j * 0.3, 1, 1 - j * 0.3); 
                leaves.castShadow = false; leaves.receiveShadow = false;
                tree.add(leaves);
            }
            tree.add(trunk);
            tree.position.set(x, 0, (Math.random() * 1.5) - 0.7);
            const scale = 0.9 + Math.random() * 0.6; 
            tree.scale.set(scale, scale, scale);
            laneGroup.add(tree);
        }
    }

    addTrees(laneGroup, laneZ) {
        const numTrees = Math.floor(Math.random() * 5) + 1;
        const occupiedPositions = new Set();
        for (let i = 0; i < numTrees; i++) {
            let x = Math.floor(Math.random() * 30) - 15; 
            if (occupiedPositions.has(x) || (x === 0 && laneGroup.position.z > -5)) continue; 
            occupiedPositions.add(x);
            const vegGroup = new THREE.Group();
            const typeSelector = Math.random(); 
            let scale = 0.8 + Math.random() * 0.4;
            if (typeSelector < 0.4) {
                const trunk = new THREE.Mesh(this.geos.trunk, this.mats.trunk);
                trunk.position.y = 0.3; trunk.castShadow = true; trunk.receiveShadow = true;
                for (let j = 0; j < 3; j++) {
                    const leaves = new THREE.Mesh(this.geos.pineLeaf, this.mats.pineLeaf);
                    leaves.position.y = 0.8 + (j * 0.5);
                    leaves.scale.set(1 - j * 0.2, 1, 1 - j * 0.2); 
                    leaves.castShadow = true; leaves.receiveShadow = true;
                    vegGroup.add(leaves);
                }
                vegGroup.add(trunk);
            } else if (typeSelector < 0.7) {
                const trunk = new THREE.Mesh(this.geos.trunk, this.mats.trunk);
                trunk.position.y = 0.3; trunk.castShadow = true; trunk.receiveShadow = true;
                const leaves = new THREE.Mesh(this.geos.sphereLeaf, this.mats.roundLeaf);
                leaves.position.y = 1.0;
                leaves.scale.set(1, 0.8 + Math.random() * 0.5, 1); 
                leaves.castShadow = true; leaves.receiveShadow = true;
                vegGroup.add(trunk, leaves);
            } else if (typeSelector < 0.85) {
                const bush = new THREE.Mesh(this.geos.sphereLeaf, this.mats.bush);
                bush.position.y = 0.3;
                bush.scale.set(1 + Math.random() * 0.5, 0.5 + Math.random() * 0.3, 1 + Math.random() * 0.5);
                bush.castShadow = true; bush.receiveShadow = true;
                vegGroup.add(bush);
                scale = 0.6 + Math.random() * 0.4; 
            } else {
                const rock = new THREE.Mesh(this.geos.rock, this.mats.rock);
                rock.position.y = 0.2;
                rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
                rock.scale.set(0.8 + Math.random(), 0.5 + Math.random() * 0.5, 0.8 + Math.random());
                rock.castShadow = true; rock.receiveShadow = true;
                vegGroup.add(rock);
            }
            vegGroup.position.x = x;
            vegGroup.scale.set(scale, scale, scale);
            laneGroup.add(vegGroup);
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
        const chassis = new THREE.Mesh(new THREE.BoxGeometry(length, 0.35, 0.8), bodyMat);
        chassis.position.y = 0.3; chassis.castShadow = true; chassis.receiveShadow = true;
        const roofLength = length * 0.45;
        const roof = new THREE.Mesh(new THREE.BoxGeometry(roofLength, 0.25, 0.76), bodyMat);
        roof.position.set(length === 7 ? 0 : -0.1, 0.6, 0); 
        const sideGlass = new THREE.Mesh(new THREE.BoxGeometry(roofLength - 0.1, 0.22, 0.78), this.mats.glass);
        sideGlass.position.set(length === 7 ? 0 : -0.1, 0.58, 0);
        const fW = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.74), this.mats.glass);
        fW.position.set((length === 7 ? 0 : -0.1) + (roofLength/2) + 0.05, 0.52, 0);
        fW.rotation.z = -Math.PI / 5; 
        const rW = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.74), this.mats.glass);
        rW.position.set((length === 7 ? 0 : -0.1) - (roofLength/2) - 0.05, 0.52, 0);
        rW.rotation.z = length === 7 ? 0 : Math.PI / 6; 
        [{ x: -length/2+0.3, z: 0.4 }, { x: length/2-0.3, z: 0.4 }, { x: -length/2+0.3, z: -0.4 }, { x: length/2-0.3, z: -0.4 }].forEach(pos => {
            const wheel = new THREE.Mesh(this.geos.wheel, this.mats.wheel);
            wheel.rotation.x = Math.PI / 2; wheel.position.set(pos.x, 0.18, pos.z);
            car.add(wheel);
        });
        const lMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2 });
        const fR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.15), lMat); fR.position.set(length/2, 0.3, 0.25);
        const fL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 0.15), lMat); fL.position.set(length/2, 0.3, -0.25);
        car.add(chassis, roof, sideGlass, fW, rW, fR, fL);
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
            const log = new THREE.Mesh(this.geos.log, this.mats.wood);
            log.scale.set(1, length, 1);
            log.rotation.z = Math.PI / 2; log.position.y = -0.1; 
            log.receiveShadow = true; log.castShadow = true;
            logGroup.add(log);
            logGroup.position.x = currentX;
            currentX -= direction * (length + 0.5 + Math.random() * 1.5);
            laneGroup.add(logGroup);
            this.logs.push({ mesh: logGroup, direction: direction, speed: speed, laneZ: laneGroup.position.z });
        }
    }

    addRailroad(laneGroup) {
        const direction = Math.random() > 0.5 ? 1 : -1; 
        const railMat = new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.8, roughness: 0.2 });
        const tieMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 1.0 });
        const mainBodyMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5, roughness: 0.3 }); 
        const royalBlueMat = new THREE.MeshStandardMaterial({ color: 0x002366, metalness: 0.4, roughness: 0.4 }); 
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 1.0, roughness: 0.1 });    
        const rGeo = new THREE.BoxGeometry(this.laneWidth, 0.05, 0.1);
        const r1 = new THREE.Mesh(rGeo, railMat); r1.position.set(0, 0.025, 0.25);
        const r2 = new THREE.Mesh(rGeo, railMat); r2.position.set(0, 0.025, -0.25);
        laneGroup.add(r1, r2);
        for (let x = -40; x <= 40; x += 1.5) {
            const tie = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 0.8), tieMat);
            tie.position.set(x, 0.02, 0);
            laneGroup.add(tie);
        }
        const trainGroup = new THREE.Group();
        const engine = new THREE.Group();
        const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 3.5, 24), mainBodyMat);
        boiler.rotation.z = Math.PI / 2; boiler.position.set(0.2, 0.65, 0);
        for(let i = 0; i < 4; i++) {
            const band = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.1, 24), goldMat);
            band.rotation.z = Math.PI / 2; band.position.set(-1.0 + (i * 0.9), 0.65, 0); engine.add(band);
        }
        const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 0.8, 16), mainBodyMat); stack.position.set(1.4, 1.2, 0);
        const stackCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.18, 0.15, 16), goldMat); stackCrown.position.set(1.4, 1.6, 0);
        const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), goldMat); lantern.position.set(1.9, 0.8, 0);
        const glass = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.2), new THREE.MeshStandardMaterial({ color: 0xffffaa, emissive: 0xffffaa, emissiveIntensity: 2 }));
        glass.position.set(2.05, 0.8, 0);
        engine.add(lantern, glass);
        const cab = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.3, 0.9), royalBlueMat); cab.position.set(-1.2, 1.0, 0);
        const cabTrim = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.1, 0.95), goldMat); cabTrim.position.set(-1.2, 1.6, 0);
        const catcher = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.8, 4), goldMat); catcher.rotation.x = Math.PI/2; catcher.rotation.z = Math.PI/4; catcher.position.set(2.2, 0.4, 0);
        for(let i=0; i<4; i++) {
            const wL = new THREE.Mesh(this.geos.wheel, this.mats.wheel); wL.rotation.x = Math.PI/2; wL.position.set(-1.0 + (i*0.8), 0.4, 0.42);
            const wR = new THREE.Mesh(this.geos.wheel, this.mats.wheel); wR.rotation.x = Math.PI/2; wR.position.set(-1.0 + (i*0.8), 0.4, -0.42);
            engine.add(wL, wR);
        }
        engine.add(boiler, stack, stackCrown, cab, cabTrim, catcher); trainGroup.add(engine);
        const tender = new THREE.Group();
        const tenderBody = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 0.85), royalBlueMat); tenderBody.position.set(-2.8, 0.7, 0);
        const tBar = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.1, 0.9), goldMat); tBar.position.set(-2.8, 1.1, 0);
        tender.add(tenderBody, tBar); trainGroup.add(tender);
        for (let c = 0; c < 2; c++) {
            const carriage = new THREE.Group(); const offset = -6.5 - (c * 4.5);
            const body = new THREE.Mesh(new THREE.BoxGeometry(4.0, 1.1, 0.9), royalBlueMat); body.position.set(offset, 0.85, 0);
            const trimTop = new THREE.Mesh(new THREE.BoxGeometry(4.05, 0.05, 0.95), goldMat); trimTop.position.set(offset, 1.35, 0);
            const trimBottom = new THREE.Mesh(new THREE.BoxGeometry(4.05, 0.05, 0.95), goldMat); trimBottom.position.set(offset, 0.4, 0);
            const wMat = new THREE.MeshStandardMaterial({ color: 0xccf0ff, transparent: true, opacity: 0.6, depthWrite: false });
            for(let j=0; j<7; j++) {
                const win = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 0.95), wMat); win.position.set(offset - 1.5 + (j*0.5), 0.95, 0); carriage.add(win);
            }
            carriage.add(body, trimTop, trimBottom); trainGroup.add(carriage);
        }
        const signal = new THREE.Group();
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.5), mainBodyMat); pole.position.set(-8, 0.75, -0.4);
        const lBox = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.4, 0.25), new THREE.MeshStandardMaterial({ color: 0x111111 })); lBox.position.set(-8, 1.5, -0.4);
        const rLightMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0 });
        const rL1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.25, 16), rLightMat); rL1.rotation.x = Math.PI/2; rL1.position.set(-8.2, 1.5, -0.4);
        const rL2 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.25, 16), rLightMat); rL2.rotation.x = Math.PI/2; rL2.position.set(-7.8, 1.5, -0.4);
        signal.add(pole, lBox, rL1, rL2); laneGroup.add(signal);
        trainGroup.position.x = direction === 1 ? -60 : 60;
        if (direction === -1) trainGroup.rotation.y = Math.PI; 
        laneGroup.add(trainGroup);
        this.trains.push({
            mesh: trainGroup, direction: direction, speed: 1.0, laneZ: laneGroup.position.z, state: 'IDLE', timer: 3 + Math.random() * 5, warningLights: [rL1, rL2]
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
        const osc = this.audioCtx.createOscillator(); const gain = this.audioCtx.createGain();
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
            if (bird.mesh.position.x < -25) bird.mesh.position.set(25, 8 + Math.random() * 6, playerZ - 5 - (Math.random() * 20));
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
                    t.state = 'PASSING'; t.warningLights.forEach(l => l.material.emissiveIntensity = 0);
                    t.mesh.position.x = t.direction === 1 ? -60 : 60;
                }
            } else if (t.state === 'PASSING') {
                t.mesh.position.x += t.speed * t.direction * delta * 60;
                if (Math.abs(t.mesh.position.x) > 60) { t.state = 'IDLE'; t.timer = 4 + Math.random() * 6; }
            }
        });
        this.lanes.forEach(lane => {
            if (lane.type === 'river') {
                const waterMesh = lane.group.children[0];
                const positions = waterMesh.geometry.attributes.position;
                const originalY = waterMesh.geometry.userData.originalY;
                for (let i = 0; i < positions.count; i++) {
                    if (originalY[i] > 0) positions.setY(i, originalY[i] + Math.sin(positions.getX(i) * 0.5 + this.time * 2.5) * 0.08);
                }
                positions.needsUpdate = true; waterMesh.geometry.computeVertexNormals();
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