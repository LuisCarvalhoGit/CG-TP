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
        this.conveyors = []; 
        this.gears = []; 
        this.chasers = []; 
        this.obstacles = new Set();
        this.furthestZ = -30;
        this.audioCtx = null; 
        
        this.lastLaneType = 'grass'; 
        this.currentBiome = 'CLASSIC'; 
        this.lanesUntilBiomeChange = 20; 

        this.initAssets();
        this.createInitialMap();
        this.createBirds();
    }

    initAssets() {
        const createFlannelTexture = () => {
            const size = 4; const data = new Uint8Array(size * size * 3);
            const color1 = [200, 0, 0]; const color2 = [100, 0, 0]; 
            for (let i = 0; i < size * size; i++) {
                const r = Math.floor(i / size); const c = i % size;
                const color = (r % 2 === c % 2) ? color1 : color2;
                data[i * 3] = color[0]; data[i * 3 + 1] = color[1]; data[i * 3 + 2] = color[2];
            }
            const tex = new THREE.DataTexture(data, size, size, THREE.RGBFormat);
            tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
            tex.repeat.set(1, 1); tex.needsUpdate = true; return tex;
        };
        const flannelTex = createFlannelTexture();

        // ==========================================
        // OTIMIZAÇÃO MAX: TODOS os materiais criados UMA vez!
        // ==========================================
        this.mats = {
            grass: new THREE.MeshPhysicalMaterial({ color: 0x4caf50, roughness: 0.9, flatShading: true }),
            road: new THREE.MeshPhysicalMaterial({ color: 0x2a2a2a, roughness: 0.8, metalness: 0.2, flatShading: true }),
            river: new THREE.MeshStandardMaterial({ color: 0x1e88e5, roughness: 0.1, metalness: 0.6, flatShading: true }),
            factoryFloor: new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5, metalness: 0.6, flatShading: true }),
            conveyorBelt: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.9 }), 
            conveyorStripe: new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.5, emissive: 0xffaa00, emissiveIntensity: 0.2 }),
            metalMachine: new THREE.MeshStandardMaterial({ color: 0x444455, metalness: 0.9, roughness: 0.4 }),
            crate: new THREE.MeshStandardMaterial({ color: 0xcc5500, roughness: 0.9, flatShading: true }), 
            acid: new THREE.MeshStandardMaterial({ color: 0x39ff14, emissive: 0x115500, emissiveIntensity: 0.8, roughness: 0.2, flatShading: true }), 
            pallet: new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.8, roughness: 0.7, flatShading: true }), 
            gear: new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.9, roughness: 0.5, flatShading: true }), 
            
            droneEye: new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 1 }), 
            skinMat: new THREE.MeshStandardMaterial({ color: 0xffccaa, roughness: 0.8, flatShading: true }), 
            shirtMat: new THREE.MeshStandardMaterial({ map: flannelTex, roughness: 1.0, flatShading: true }), 
            pantsMat: new THREE.MeshStandardMaterial({ color: 0x1a237e, roughness: 1.0, flatShading: true }), 
            hatMat: new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 1.0, flatShading: true }), 
            beardMat: new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 1.0, flatShading: true }), 
            suspendersMat: new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1.0, flatShading: true }), 
            eyeMat: new THREE.MeshBasicMaterial({ color: 0x111111 }), 
            axeHandleMat: new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 1.0, flatShading: true }),
            axeIronMat: new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.8, roughness: 0.2, flatShading: true }),
            
            gateModuleMat: new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.4 }), 
            gateNeonClassic: new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 1.5, transparent: true, opacity: 0.8 }), 
            gateNeonFactory: new THREE.MeshStandardMaterial({ color: 0xff5500, emissive: 0xff5500, emissiveIntensity: 1.5, transparent: true, opacity: 0.8 }),
            
            railroad: new THREE.MeshStandardMaterial({ color: 0x3d3935, roughness: 1.0, flatShading: true }),
            roadLine: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1.0, flatShading: true }),
            sidewalk: new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 1.0, flatShading: true }), 
            warningYellow: new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.8, flatShading: true }),
            metalPlate: new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8, roughness: 0.4 }),
            trunk: new THREE.MeshPhysicalMaterial({ color: 0x4a3020, roughness: 0.9, clearcoat: 0.1 }),
            pineLeaf: new THREE.MeshPhysicalMaterial({ color: 0x2e8b57, roughness: 0.7, clearcoat: 0.2, flatShading: true }),
            roundLeaf: new THREE.MeshPhysicalMaterial({ color: 0x4caf50, roughness: 0.8, clearcoat: 0.1, flatShading: true }),
            bush: new THREE.MeshPhysicalMaterial({ color: 0x228b22, roughness: 0.9, clearcoat: 0.1, flatShading: true }),
            forestLeaf: new THREE.MeshLambertMaterial({ color: 0x1c5936, flatShading: true }),
            tunnelGranite: new THREE.MeshPhysicalMaterial({ color: 0x555555, roughness: 0.9, metalness: 0.1, clearcoat: 0.1, flatShading: true }),
            tunnelTrim: new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 1.0, roughness: 0.1 }), 
            tunnelInside: new THREE.MeshBasicMaterial({ color: 0x000000 }), 
            wood: new THREE.MeshPhysicalMaterial({ color: 0x4a3020, roughness: 0.6, clearcoat: 0.3 }),
            glass: new THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.1, metalness: 0.5, transparent: true, opacity: 0.55, depthWrite: false, flatShading: true }),
            wheel: new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8 }),
            
            // NOVO: Materiais pré-carregados para Carros e Comboios
            carColors: [
                new THREE.MeshStandardMaterial({ color: 0xe53935, roughness: 0.4, metalness: 0.3, flatShading: true }),
                new THREE.MeshStandardMaterial({ color: 0x1e88e5, roughness: 0.4, metalness: 0.3, flatShading: true }),
                new THREE.MeshStandardMaterial({ color: 0xfdd835, roughness: 0.4, metalness: 0.3, flatShading: true }),
                new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4, metalness: 0.3, flatShading: true }),
                new THREE.MeshStandardMaterial({ color: 0x8e24aa, roughness: 0.4, metalness: 0.3, flatShading: true })
            ],
            carBlack: new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.4, metalness: 0.3, flatShading: true }),
            carLight: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2 }),
            
            trainRail: new THREE.MeshStandardMaterial({ color: 0x777777, metalness: 0.8, roughness: 0.2 }),
            trainTie: new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 1.0 }),
            trainBody: new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5, roughness: 0.3 }),
            trainBlue: new THREE.MeshStandardMaterial({ color: 0x002366, metalness: 0.4, roughness: 0.4 }),
            trainGold: new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 1.0, roughness: 0.1 }),
            trainWin: new THREE.MeshStandardMaterial({ color: 0xccf0ff, transparent: true, opacity: 0.6, depthWrite: false }),
            signalBox: new THREE.MeshStandardMaterial({ color: 0x111111 }),
            signalLight: new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0 }),
            
            birdMat: new THREE.MeshBasicMaterial({ color: 0x222222 })
        };

        // ==========================================
        // OTIMIZAÇÃO MAX: TODAS as geometrias criadas UMA vez!
        // ==========================================
        this.geos = {
            lane: new THREE.BoxGeometry(this.laneWidth, 1, 1), 
            river: new THREE.BoxGeometry(this.laneWidth, 1, 1, 30, 1, 1),
            acid: new THREE.BoxGeometry(this.laneWidth, 1, 1, 30, 1, 1), 
            stripe: new THREE.BoxGeometry(0.6, 0.05, 0.8), roller: new THREE.CylinderGeometry(0.4, 0.4, 1.1, 16), machineWall: new THREE.BoxGeometry(2, 4, 1.5), crate: new THREE.BoxGeometry(0.8, 0.8, 0.8), pallet: new THREE.BoxGeometry(2.5, 0.15, 0.8), gear: new THREE.CylinderGeometry(0.8, 0.8, 0.2, 8), 
            droneBody: new THREE.BoxGeometry(0.6, 0.4, 0.6), droneEye: new THREE.BoxGeometry(0.3, 0.1, 0.1), lumberHead: new THREE.BoxGeometry(0.4, 0.4, 0.4), lumberBeard: new THREE.BoxGeometry(0.45, 0.3, 0.2), lumberBeardSide: new THREE.BoxGeometry(0.1, 0.2, 0.4), lumberHat: new THREE.BoxGeometry(0.42, 0.15, 0.42), lumberHatTop: new THREE.BoxGeometry(0.3, 0.15, 0.3), lumberEye: new THREE.BoxGeometry(0.05, 0.05, 0.02), lumberBody: new THREE.BoxGeometry(0.5, 0.6, 0.3), lumberSuspender: new THREE.BoxGeometry(0.08, 0.61, 0.02), lumberArm: new THREE.BoxGeometry(0.2, 0.55, 0.2).translate(0, -0.25, 0), lumberLeg: new THREE.BoxGeometry(0.22, 0.5, 0.3).translate(0, -0.25, 0), axeHandle: new THREE.BoxGeometry(0.08, 0.8, 0.08), axeHead: new THREE.BoxGeometry(0.1, 0.25, 0.3), axeBlade: new THREE.BoxGeometry(0.02, 0.3, 0.4), 
            gateModule: new THREE.BoxGeometry(1.5, 1.5, 1.5), gateFloorNeon: new THREE.PlaneGeometry(this.laneWidth, 0.2), roadLine: new THREE.BoxGeometry(1.2, 0.02, 0.1), sidewalk: new THREE.BoxGeometry(this.laneWidth, 0.1, 0.3), warningLine: new THREE.BoxGeometry(this.laneWidth, 0.02, 0.15), metalPlate: new THREE.BoxGeometry(this.laneWidth, 0.05, 0.25), 
            trunk: new THREE.CylinderGeometry(0.2, 0.3, 0.6, 12), pineLeaf: new THREE.ConeGeometry(0.8, 1.2, 12), sphereLeaf: new THREE.SphereGeometry(0.7, 16, 16), forestLeaf: new THREE.ConeGeometry(1.2, 1.8, 8), 
            tunnelMainArch: new THREE.CylinderGeometry(1.6, 1.6, 1.2, 24, 1, false, 0, Math.PI), tunnelTrimArch: new THREE.CylinderGeometry(1.65, 1.65, 0.2, 24, 1, false, 0, Math.PI), tunnelWall: new THREE.BoxGeometry(1.4, 3.2, 1.2), pillarBase: new THREE.BoxGeometry(0.6, 1, 0.6), tunnelInterior: new THREE.PlaneGeometry(1.2, 4.0),
            log: new THREE.CylinderGeometry(0.3, 0.3, 1, 16), wheel: new THREE.CylinderGeometry(0.18, 0.18, 0.1, 16),
            
            // NOVO: Geometrias dos Veículos pré-calculadas
            carChassis: new THREE.BoxGeometry(1.6, 0.35, 0.8), carRoof: new THREE.BoxGeometry(0.72, 0.25, 0.76), carGlassSide: new THREE.BoxGeometry(0.62, 0.22, 0.78), carGlassF: new THREE.BoxGeometry(0.25, 0.35, 0.74), carLightGeo: new THREE.BoxGeometry(0.1, 0.15, 0.15),
            truckChassis: new THREE.BoxGeometry(7, 0.35, 0.8), truckRoof: new THREE.BoxGeometry(3.15, 0.25, 0.76), truckGlassSide: new THREE.BoxGeometry(3.05, 0.22, 0.78),
            
            trainRailGeo: new THREE.BoxGeometry(this.laneWidth, 0.05, 0.1), trainTieGeo: new THREE.BoxGeometry(0.2, 0.04, 0.8),
            trainBoiler: new THREE.CylinderGeometry(0.45, 0.45, 3.5, 24), trainBand: new THREE.CylinderGeometry(0.47, 0.47, 0.1, 24), trainStack: new THREE.CylinderGeometry(0.18, 0.12, 0.8, 16), trainStackCrown: new THREE.CylinderGeometry(0.25, 0.18, 0.15, 16), trainLantern: new THREE.BoxGeometry(0.3, 0.3, 0.3), trainLanternGlass: new THREE.BoxGeometry(0.1, 0.2, 0.2), trainCab: new THREE.BoxGeometry(1.2, 1.3, 0.9), trainCabTrim: new THREE.BoxGeometry(1.25, 0.1, 0.95), trainCatcher: new THREE.ConeGeometry(0.6, 0.8, 4), trainTenderBody: new THREE.BoxGeometry(1.8, 0.8, 0.85), trainTenderBar: new THREE.BoxGeometry(1.85, 0.1, 0.9), trainCarriageBody: new THREE.BoxGeometry(4.0, 1.1, 0.9), trainCarTrimTop: new THREE.BoxGeometry(4.05, 0.05, 0.95), trainCarTrimBot: new THREE.BoxGeometry(4.05, 0.05, 0.95), trainWinGeo: new THREE.BoxGeometry(0.35, 0.5, 0.95),
            signalPole: new THREE.CylinderGeometry(0.05, 0.05, 1.5), signalBoxGeo: new THREE.BoxGeometry(0.7, 0.4, 0.25), signalLightGeo: new THREE.CylinderGeometry(0.12, 0.12, 0.25, 16),
            birdWing: new THREE.BoxGeometry(0.4, 0.05, 0.15)
        };

        const rPositions = this.geos.river.attributes.position; const rY = []; for (let i = 0; i < rPositions.count; i++) rY.push(rPositions.getY(i)); this.geos.river.userData.originalY = rY;
        const aPositions = this.geos.acid.attributes.position; const aY = []; for (let i = 0; i < aPositions.count; i++) aY.push(aPositions.getY(i)); this.geos.acid.userData.originalY = aY;
    }

    getElevationAt(z) { return 0; } 
    freezeStaticObject(obj) { obj.updateMatrixWorld(true); obj.matrixAutoUpdate = false; }

    createInitialMap() {
        for (let z = 20; z >= 6; z--) this.createLane(z, 'forest', true); 
        for (let z = 5; z >= 0; z--) this.createLane(z, 'grass', true);
        this.lastLaneType = 'grass';
        for (let z = -1; z >= -30; z--) this.generateProceduralLane(z);
    }

    generateProceduralLane(z) {
        this.lanesUntilBiomeChange--;
        if (this.lanesUntilBiomeChange <= 0) {
            this.currentBiome = this.currentBiome === 'CLASSIC' ? 'FACTORY' : 'CLASSIC';
            this.lanesUntilBiomeChange = 15 + Math.floor(Math.random() * 10); 
            this.createLane(z, 'transition_gate', true, Math.abs(z), this.lastLaneType);
            this.lastLaneType = 'transition_gate';
            return;
        }

        const depth = Math.abs(z); const rand = Math.random(); let type = 'grass';
        if (this.currentBiome === 'CLASSIC') {
            if (rand < 0.35) type = 'road'; else if (rand < 0.55) type = 'river'; else if (rand < 0.65) type = 'railroad'; else type = 'grass';
        } else if (this.currentBiome === 'FACTORY') {
            if (rand < 0.30) type = 'conveyor'; else if (rand < 0.55) type = 'acid_pit'; else if (rand < 0.75) type = 'railroad'; else type = 'factory_floor'; 
        }

        this.createLane(z, type, false, depth, this.lastLaneType);
        this.lastLaneType = type;
    }

    createLane(z, type, isSafeZone, depth = 0, prevType = null) {
        const laneGroup = new THREE.Group(); laneGroup.position.z = z;
        const groundGeo = (type === 'river') ? this.geos.river : (type === 'acid_pit') ? this.geos.acid : this.geos.lane;
        let groundMat = this.mats.grass;
        if (type === 'road') groundMat = this.mats.road; else if (type === 'river') groundMat = this.mats.river; else if (type === 'acid_pit') groundMat = this.mats.acid; else if (type === 'railroad') groundMat = this.mats.railroad; else if (type === 'conveyor') groundMat = this.mats.conveyorBelt; else if (type === 'factory_floor') groundMat = this.mats.factoryFloor; else if (type === 'transition_gate') groundMat = this.mats.factoryFloor; 
        
        const ground = new THREE.Mesh(groundGeo, groundMat); ground.position.y = (type === 'river' || type === 'acid_pit') ? -0.65 : -0.5;  
        if (type !== 'river' && type !== 'acid_pit') { ground.receiveShadow = true; this.freezeStaticObject(ground); }
        laneGroup.add(ground);

        if (prevType) this.createTransition(laneGroup, type, prevType);

        if (type === 'transition_gate') { this.addTransitionGate(laneGroup); this.addFactoryBorders(laneGroup, -40, -15); this.addFactoryBorders(laneGroup, 15, 40); }
        else if (this.currentBiome === 'CLASSIC' || type === 'forest') {
            if (type === 'forest') this.addDenseForest(laneGroup, -40, 40);
            else if (type === 'railroad') { this.addUltraRealisticTunnel(laneGroup, -15.5, 1); this.addUltraRealisticTunnel(laneGroup, 15.5, -1); this.addDenseForest(laneGroup, -40, -18); this.addDenseForest(laneGroup, 18, 40); } 
            else if (type !== 'river' && type !== 'road') { this.addDenseForest(laneGroup, -40, -15); this.addDenseForest(laneGroup, 15, 40); }
        } else if (this.currentBiome === 'FACTORY') {
            if (type === 'railroad') { this.addUltraRealisticTunnel(laneGroup, -15.5, 1); this.addUltraRealisticTunnel(laneGroup, 15.5, -1); this.addFactoryBorders(laneGroup, -40, -18); this.addFactoryBorders(laneGroup, 18, 40); } 
            else if (type !== 'acid_pit') { this.addFactoryBorders(laneGroup, -40, -15); this.addFactoryBorders(laneGroup, 15, 40); }
        }

        if (!isSafeZone && type !== 'transition_gate') {
            if (type === 'grass') { this.addTrees(laneGroup, z); if (Math.random() < 0.12) this.addChaser(laneGroup, type, depth); }
            else if (type === 'factory_floor') { this.addFactoryCrates(laneGroup, z); if (Math.random() < 0.12) this.addChaser(laneGroup, type, depth); }
            else if (type === 'river') this.addLog(laneGroup); else if (type === 'road') this.addCar(laneGroup, depth); else if (type === 'conveyor') this.addConveyorBelt(laneGroup); else if (type === 'acid_pit') this.addPallets(laneGroup); else if (type === 'railroad') this.addRailroad(laneGroup);
        }

        this.scene.add(laneGroup); this.lanes.push({ z: z, type: type, group: laneGroup });
    }

    createTransition(laneGroup, currentType, prevType) {
        const edgeZ = 0.5;
        if (currentType === 'transition_gate' || prevType === 'transition_gate' || currentType === 'factory_floor' || prevType === 'factory_floor' || currentType === 'conveyor' || prevType === 'conveyor' || currentType === 'acid_pit' || prevType === 'acid_pit') {
            if (currentType === prevType) return;
            const metal = new THREE.Mesh(this.geos.metalPlate, this.mats.metalMachine); metal.position.set(0, 0.01, edgeZ); metal.receiveShadow = true; this.freezeStaticObject(metal); laneGroup.add(metal);
            const warning = new THREE.Mesh(this.geos.warningLine, this.mats.warningYellow); warning.position.set(0, 0.02, edgeZ); warning.receiveShadow = true; this.freezeStaticObject(warning); laneGroup.add(warning); return; 
        }
        if (currentType === 'road' && prevType === 'road') {
            for (let x = -40; x <= 40; x += 3) { const line = new THREE.Mesh(this.geos.roadLine, this.mats.roadLine); line.position.set(x, 0.01, edgeZ); line.receiveShadow = true; this.freezeStaticObject(line); laneGroup.add(line); }
        } else if ((currentType === 'road' && prevType === 'grass') || (currentType === 'grass' && prevType === 'road')) {
            const sidewalk = new THREE.Mesh(this.geos.sidewalk, this.mats.sidewalk); sidewalk.position.set(0, 0.05, edgeZ); sidewalk.receiveShadow = true; this.freezeStaticObject(sidewalk); laneGroup.add(sidewalk);
        } else if ((currentType === 'road' && prevType === 'railroad') || (currentType === 'railroad' && prevType === 'road')) {
            const metal = new THREE.Mesh(this.geos.metalPlate, this.mats.metalPlate); metal.position.set(0, 0.01, edgeZ); metal.receiveShadow = true; this.freezeStaticObject(metal); laneGroup.add(metal);
            const warning = new THREE.Mesh(this.geos.warningLine, this.mats.warningYellow); warning.position.set(0, 0.02, edgeZ); warning.receiveShadow = true; this.freezeStaticObject(warning); laneGroup.add(metal, warning);
        }
    }

    addChaser(laneGroup, type, depth) {
        const isFactory = this.currentBiome === 'FACTORY';
        const chaserGroup = new THREE.Group();
        let leftLeg = null, rightLeg = null, leftArm = null, rightArm = null, axeGroup = null;

        if (isFactory) {
            const body = new THREE.Mesh(this.geos.droneBody, this.mats.metalMachine); const eye = new THREE.Mesh(this.geos.droneEye, this.mats.droneEye); eye.position.set(0, 0, 0.35); chaserGroup.add(body, eye); chaserGroup.position.y = 1.0; 
        } else {
            const headGroup = new THREE.Group(); headGroup.position.y = 0.95; const headCube = new THREE.Mesh(this.geos.lumberHead, this.mats.skinMat); const beard = new THREE.Mesh(this.geos.lumberBeard, this.mats.beardMat); beard.position.set(0, -0.1, 0.15); const beardL = new THREE.Mesh(this.geos.lumberBeardSide, this.mats.beardMat); beardL.position.set(-0.2, -0.05, 0); const beardR = new THREE.Mesh(this.geos.lumberBeardSide, this.mats.beardMat); beardR.position.set(0.2, -0.05, 0); const hatRim = new THREE.Mesh(this.geos.lumberHat, this.mats.hatMat); hatRim.position.y = 0.15; const hatTop = new THREE.Mesh(this.geos.lumberHatTop, this.mats.hatMat); hatTop.position.y = 0.3; const eyeL = new THREE.Mesh(this.geos.lumberEye, this.mats.eyeMat); eyeL.position.set(-0.12, 0.05, 0.2); const eyeR = new THREE.Mesh(this.geos.lumberEye, this.mats.eyeMat); eyeR.position.set(0.12, 0.05, 0.2); headGroup.add(headCube, beard, beardL, beardR, hatRim, hatTop, eyeL, eyeR);
            const torsoGroup = new THREE.Group(); torsoGroup.position.y = 0.5; const shirt = new THREE.Mesh(this.geos.lumberBody, this.mats.shirtMat); const suspL = new THREE.Mesh(this.geos.lumberSuspender, this.mats.suspendersMat); suspL.position.set(-0.15, 0, 0.15); const suspR = new THREE.Mesh(this.geos.lumberSuspender, this.mats.suspendersMat); suspR.position.set(0.15, 0, 0.15); torsoGroup.add(shirt, suspL, suspR);
            leftArm = new THREE.Group(); leftArm.position.set(-0.35, 0.75, 0); const lArmMesh = new THREE.Mesh(this.geos.lumberArm, this.mats.shirtMat); leftArm.add(lArmMesh);
            rightArm = new THREE.Group(); rightArm.position.set(0.35, 0.75, 0); const rArmMesh = new THREE.Mesh(this.geos.lumberArm, this.mats.shirtMat); rightArm.add(rArmMesh);
            axeGroup = new THREE.Group(); axeGroup.position.set(0, -0.5, 0.1); axeGroup.rotation.x = -Math.PI/2; const handle = new THREE.Mesh(this.geos.axeHandle, this.mats.axeHandleMat); const axeHeadGroup = new THREE.Group(); axeHeadGroup.position.y = 0.35; const ironHead = new THREE.Mesh(this.geos.axeHead, this.mats.metalMachine); const ironBlade = new THREE.Mesh(this.geos.axeBlade, this.mats.axeIronMat); ironBlade.position.z = 0.2; axeHeadGroup.add(ironHead, ironBlade); axeGroup.add(handle, axeHeadGroup); rightArm.add(axeGroup);
            leftLeg = new THREE.Mesh(this.geos.lumberLeg, this.mats.pantsMat); leftLeg.position.set(-0.15, 0.25, 0); rightLeg = new THREE.Mesh(this.geos.lumberLeg, this.mats.pantsMat); rightLeg.position.set(0.15, 0.25, 0);
            chaserGroup.add(headGroup, torsoGroup, leftArm, rightArm, leftLeg, rightLeg); chaserGroup.position.y = 0.25; 
        }

        chaserGroup.position.x = (Math.random() - 0.5) * 20; chaserGroup.castShadow = true; laneGroup.add(chaserGroup);
        this.chasers.push({ mesh: chaserGroup, laneZ: laneGroup.position.z, state: 'PATROL', patrolDir: Math.random() > 0.5 ? 1 : -1, speed: 0.015 + (depth * 0.0002), chaseTimer: 0, isFactory: isFactory, leftLeg: leftLeg, rightLeg: rightLeg, leftArm: leftArm, rightArm: rightArm, axe: axeGroup });
    }

    addTransitionGate(laneGroup) { const gateGroup = new THREE.Group(); const mL = new THREE.Mesh(this.geos.gateModule, this.mats.gateModuleMat); mL.position.set(-14.5, 0.25, 0); mL.castShadow = true; mL.receiveShadow = true; const mR = new THREE.Mesh(this.geos.gateModule, this.mats.gateModuleMat); mR.position.set(14.5, 0.25, 0); mR.castShadow = true; mR.receiveShadow = true; const neonMat = this.currentBiome === 'CLASSIC' ? this.mats.gateNeonClassic : this.mats.gateNeonFactory; const floorNeon = new THREE.Mesh(this.geos.gateFloorNeon, neonMat); floorNeon.rotation.x = -Math.PI / 2; floorNeon.position.set(0, 0.01, 0); const rectLight = new THREE.RectAreaLight(neonMat.color, 5, this.laneWidth, 1); rectLight.position.set(0, 0.1, 0); rectLight.lookAt(0, -1, 0); gateGroup.add(mL, mR, floorNeon, rectLight); this.freezeStaticObject(gateGroup); laneGroup.add(gateGroup); }
    addFactoryBorders(laneGroup, startX, endX) { for (let x = startX + 1; x <= endX - 1; x += 3) { const wallGroup = new THREE.Group(); const wall = new THREE.Mesh(this.geos.machineWall, this.mats.metalMachine); wall.position.set(0, 1.5, 0); wall.castShadow = true; wall.receiveShadow = true; wallGroup.add(wall); if (Math.random() > 0.3) { const gear = new THREE.Mesh(this.geos.gear, this.mats.gear); gear.rotation.x = Math.PI / 2; gear.position.set(0, 1.5 + (Math.random()*1), x > 0 ? -0.8 : 0.8); wallGroup.add(gear); this.gears.push({ mesh: gear, speed: 0.02 + Math.random() * 0.05, direction: Math.random() > 0.5 ? 1 : -1 }); } else { this.freezeStaticObject(wall); } wallGroup.position.x = x; laneGroup.add(wallGroup); } }
    addFactoryCrates(laneGroup, laneZ) { const numCrates = Math.floor(Math.random() * 6) + 2; const occupiedPositions = new Set(); for (let i = 0; i < numCrates; i++) { let x = Math.floor(Math.random() * 30) - 15; if (occupiedPositions.has(x) || (x === 0 && laneGroup.position.z > -5)) continue; occupiedPositions.add(x); const stackHeight = Math.random() > 0.7 ? 2 : 1; for(let y = 0; y < stackHeight; y++) { const crate = new THREE.Mesh(this.geos.crate, this.mats.crate); crate.position.set(x, 0.4 + (y * 0.82), 0); crate.rotation.y = (Math.random() - 0.5) * 0.2; crate.castShadow = true; crate.receiveShadow = true; this.freezeStaticObject(crate); laneGroup.add(crate); } this.obstacles.add(`${x},${laneZ}`); } }
    
    addConveyorBelt(laneGroup) { const direction = Math.random() > 0.5 ? 1 : -1; const speed = 0.04 + Math.random() * 0.03; const rL = new THREE.Mesh(this.geos.roller, this.mats.metalMachine); rL.rotation.x = Math.PI/2; rL.position.set(-14.5, -0.1, 0); const rR = new THREE.Mesh(this.geos.roller, this.mats.metalMachine); rR.rotation.x = Math.PI/2; rR.position.set(14.5, -0.1, 0); laneGroup.add(rL, rR); const stripes = []; for(let x = -14; x <= 14; x += 2) { const stripe = new THREE.Mesh(this.geos.stripe, this.mats.conveyorStripe); stripe.position.set(x, 0.01, 0); stripe.receiveShadow = true; laneGroup.add(stripe); stripes.push(stripe); } this.conveyors.push({ laneZ: laneGroup.position.z, direction, speed, stripes, rollers: [rL, rR] }); }
    addPallets(laneGroup) { 
        const direction = Math.random() > 0.5 ? 1 : -1; const speed = 0.04 + Math.random() * 0.06; let currentX = -42; 
        while (currentX < 42) { 
            const length = 2.5; const gap = Math.random() > 0.8 ? 5 + Math.random() * 3 : 1.5 + Math.random() * 2; 
            const palletGroup = new THREE.Group(); const pallet = new THREE.Mesh(this.geos.pallet, this.mats.pallet); pallet.position.y = -0.1; pallet.receiveShadow = true; pallet.castShadow = true; 
            this.freezeStaticObject(pallet); palletGroup.add(pallet); palletGroup.position.x = currentX; laneGroup.add(palletGroup); 
            
            // NOVO: Adicionado 'width: 2.5'
            this.logs.push({ mesh: palletGroup, direction: direction, speed: speed, laneZ: laneGroup.position.z, width: 2.5 }); 
            currentX += length + gap; 
        } 
    }

    addUltraRealisticTunnel(laneGroup, x, sideDir) { const tunnelGroup = new THREE.Group(); const leftWall = new THREE.Mesh(this.geos.tunnelWall, this.mats.tunnelGranite); leftWall.position.set(0, 0.8, 1.2); leftWall.receiveShadow = true; leftWall.castShadow = true; const rightWall = new THREE.Mesh(this.geos.tunnelWall, this.mats.tunnelGranite); rightWall.position.set(0, 0.8, -1.2); rightWall.receiveShadow = true; rightWall.castShadow = true; const arch = new THREE.Mesh(this.geos.tunnelMainArch, this.mats.tunnelGranite); arch.rotation.z = Math.PI / 2; arch.position.y = 2.4; arch.receiveShadow = true; arch.castShadow = true; const trim = new THREE.Mesh(this.geos.tunnelTrimArch, this.mats.tunnelTrim); trim.rotation.z = Math.PI / 2; trim.position.set(0.6 * -sideDir, 2.4, 0); trim.castShadow = true; [-1, 1].forEach(sideZ => { const base = new THREE.Mesh(this.geos.pillarBase, this.mats.tunnelGranite); base.position.set(0, 0, sideZ * 1.2); base.receiveShadow = true; tunnelGroup.add(base); }); const interior = new THREE.Mesh(this.geos.tunnelInterior, this.mats.tunnelInside); interior.rotation.y = sideDir * (Math.PI / 2); interior.position.set(sideDir * 0.58, 1.5, 0); tunnelGroup.add(leftWall, rightWall, arch, trim, interior); tunnelGroup.position.x = x; if (sideDir === -1) tunnelGroup.rotation.y = Math.PI; this.freezeStaticObject(tunnelGroup); laneGroup.add(tunnelGroup); }
    addDenseForest(laneGroup, startX, endX) { for (let x = startX; x <= endX; x += 2.0 + Math.random() * 2.0) { const tree = new THREE.Group(); const trunk = new THREE.Mesh(this.geos.trunk, this.mats.trunk); trunk.position.y = 0.4; trunk.castShadow = false; trunk.receiveShadow = false; for (let j = 0; j < 2; j++) { const leaves = new THREE.Mesh(this.geos.forestLeaf, this.mats.forestLeaf); leaves.position.y = 1.0 + (j * 0.7); leaves.scale.set(1 - j * 0.3, 1, 1 - j * 0.3); leaves.castShadow = false; leaves.receiveShadow = false; tree.add(leaves); } tree.add(trunk); tree.position.set(x, 0, (Math.random() * 1.5) - 0.7); const scale = 0.9 + Math.random() * 0.6; tree.scale.set(scale, scale, scale); this.freezeStaticObject(tree); laneGroup.add(tree); } }
    addTrees(laneGroup, laneZ) { const numTrees = Math.floor(Math.random() * 5) + 1; const occupiedPositions = new Set(); for (let i = 0; i < numTrees; i++) { let x = Math.floor(Math.random() * 30) - 15; if (occupiedPositions.has(x) || (x === 0 && laneGroup.position.z > -5)) continue; occupiedPositions.add(x); const vegGroup = new THREE.Group(); const typeSelector = Math.random(); let scale = 0.8 + Math.random() * 0.4; if (typeSelector < 0.4) { const trunk = new THREE.Mesh(this.geos.trunk, this.mats.trunk); trunk.position.y = 0.3; trunk.castShadow = true; trunk.receiveShadow = true; for (let j = 0; j < 3; j++) { const leaves = new THREE.Mesh(this.geos.pineLeaf, this.mats.pineLeaf); leaves.position.y = 0.8 + (j * 0.5); leaves.scale.set(1 - j * 0.2, 1, 1 - j * 0.2); leaves.castShadow = true; leaves.receiveShadow = true; vegGroup.add(leaves); } vegGroup.add(trunk); } else if (typeSelector < 0.7) { const trunk = new THREE.Mesh(this.geos.trunk, this.mats.trunk); trunk.position.y = 0.3; trunk.castShadow = true; trunk.receiveShadow = true; const leaves = new THREE.Mesh(this.geos.sphereLeaf, this.mats.roundLeaf); leaves.position.y = 1.0; leaves.scale.set(1, 0.8 + Math.random() * 0.5, 1); leaves.castShadow = true; leaves.receiveShadow = true; vegGroup.add(trunk, leaves); } else { const bush = new THREE.Mesh(this.geos.sphereLeaf, this.mats.bush); bush.position.y = 0.3; bush.scale.set(1 + Math.random() * 0.5, 0.5 + Math.random() * 0.3, 1 + Math.random() * 0.5); bush.castShadow = true; bush.receiveShadow = true; vegGroup.add(bush); scale = 0.6 + Math.random() * 0.4; } vegGroup.position.x = x; vegGroup.scale.set(scale, scale, scale); this.freezeStaticObject(vegGroup); laneGroup.add(vegGroup); this.obstacles.add(`${x},${laneZ}`); } }
    
    addCar(laneGroup, depth) { 
        const direction = Math.random() > 0.5 ? 1 : -1; 
        let baseSpeed = 0.05 + Math.random() * 0.08; baseSpeed += (depth * 0.001); 
        let isTruck = Math.random() > 0.9;
        
        let bodyMat = isTruck ? this.mats.carBlack : this.mats.carColors[Math.floor(Math.random() * 5)]; 
        let length = isTruck ? 7 : 1.6; 
        if (isTruck) baseSpeed *= 1.8; 
        
        const car = new THREE.Group(); 
        const chassis = new THREE.Mesh(isTruck ? this.geos.truckChassis : this.geos.carChassis, bodyMat); chassis.position.y = 0.3; chassis.castShadow = true; chassis.receiveShadow = true; 
        const roofLength = isTruck ? 3.15 : 0.72; 
        const roof = new THREE.Mesh(isTruck ? this.geos.truckRoof : this.geos.carRoof, bodyMat); roof.position.set(isTruck ? 0 : -0.1, 0.6, 0); 
        const sideGlass = new THREE.Mesh(isTruck ? this.geos.truckGlassSide : this.geos.carGlassSide, this.mats.glass); sideGlass.position.set(isTruck ? 0 : -0.1, 0.58, 0); 
        const fW = new THREE.Mesh(this.geos.carGlassF, this.mats.glass); fW.position.set((isTruck ? 0 : -0.1) + (roofLength/2) + 0.05, 0.52, 0); fW.rotation.z = -Math.PI / 5; 
        const rW = new THREE.Mesh(this.geos.carGlassF, this.mats.glass); rW.position.set((isTruck ? 0 : -0.1) - (roofLength/2) - 0.05, 0.52, 0); rW.rotation.z = isTruck ? 0 : Math.PI / 6; 
        
        [{ x: -length/2+0.3, z: 0.4 }, { x: length/2-0.3, z: 0.4 }, { x: -length/2+0.3, z: -0.4 }, { x: length/2-0.3, z: -0.4 }].forEach(pos => { const wheel = new THREE.Mesh(this.geos.wheel, this.mats.wheel); wheel.rotation.x = Math.PI / 2; wheel.position.set(pos.x, 0.18, pos.z); car.add(wheel); }); 
        
        const fR = new THREE.Mesh(this.geos.carLightGeo, this.mats.carLight); fR.position.set(length/2, 0.3, 0.25); 
        const fL = new THREE.Mesh(this.geos.carLightGeo, this.mats.carLight); fL.position.set(length/2, 0.3, -0.25); 
        
        car.add(chassis, roof, sideGlass, fW, rW, fR, fL); car.position.x = direction === 1 ? -40 : 40; if (direction === -1) car.rotation.y = Math.PI; laneGroup.add(car); 
        
        // NOVO: Adicionado 'width: length' para o motor de colisões matemático
        this.cars.push({ mesh: car, direction: direction, speed: baseSpeed, laneZ: laneGroup.position.z, width: length }); 
    }
    
    addLog(laneGroup) { 
        const direction = Math.random() > 0.5 ? 1 : -1; const speed = 0.03 + Math.random() * 0.05; let currentX = -42; 
        while (currentX < 42) { 
            const length = 2 + Math.random() * 3; const gap = Math.random() > 0.8 ? 4 + Math.random() * 3 : 1 + Math.random() * 2; 
            const logGroup = new THREE.Group(); const log = new THREE.Mesh(this.geos.log, this.mats.wood); log.scale.set(1, length, 1); log.rotation.z = Math.PI / 2; log.position.y = -0.1; log.receiveShadow = true; log.castShadow = true; 
            this.freezeStaticObject(log); logGroup.add(log); logGroup.position.x = currentX; laneGroup.add(logGroup); 
            
            // NOVO: Adicionado 'width: length'
            this.logs.push({ mesh: logGroup, direction: direction, speed: speed, laneZ: laneGroup.position.z, width: length }); 
            currentX += length + gap; 
        } 
    }
    
    // OTIMIZAÇÃO: Sem 'new BoxGeometry' / 'new Material'
    addRailroad(laneGroup) { 
        const direction = Math.random() > 0.5 ? 1 : -1; 
        const r1 = new THREE.Mesh(this.geos.trainRailGeo, this.mats.trainRail); r1.position.set(0, 0.025, 0.25); const r2 = new THREE.Mesh(this.geos.trainRailGeo, this.mats.trainRail); r2.position.set(0, 0.025, -0.25); laneGroup.add(r1, r2); 
        for (let x = -40; x <= 40; x += 1.5) { const tie = new THREE.Mesh(this.geos.trainTieGeo, this.mats.trainTie); tie.position.set(x, 0.02, 0); this.freezeStaticObject(tie); laneGroup.add(tie); } 
        
        const trainGroup = new THREE.Group(); const engine = new THREE.Group(); 
        const boiler = new THREE.Mesh(this.geos.trainBoiler, this.mats.trainBody); boiler.rotation.z = Math.PI / 2; boiler.position.set(0.2, 0.65, 0); 
        for(let i = 0; i < 4; i++) { const band = new THREE.Mesh(this.geos.trainBand, this.mats.trainGold); band.rotation.z = Math.PI / 2; band.position.set(-1.0 + (i * 0.9), 0.65, 0); engine.add(band); } 
        const stack = new THREE.Mesh(this.geos.trainStack, this.mats.trainBody); stack.position.set(1.4, 1.2, 0); 
        const stackCrown = new THREE.Mesh(this.geos.trainStackCrown, this.mats.trainGold); stackCrown.position.set(1.4, 1.6, 0); 
        const lantern = new THREE.Mesh(this.geos.trainLantern, this.mats.trainGold); lantern.position.set(1.9, 0.8, 0); 
        const glass = new THREE.Mesh(this.geos.trainLanternGlass, this.mats.carLight); glass.position.set(2.05, 0.8, 0); engine.add(lantern, glass); 
        const cab = new THREE.Mesh(this.geos.trainCab, this.mats.trainBlue); cab.position.set(-1.2, 1.0, 0); 
        const cabTrim = new THREE.Mesh(this.geos.trainCabTrim, this.mats.trainGold); cabTrim.position.set(-1.2, 1.6, 0); 
        const catcher = new THREE.Mesh(this.geos.trainCatcher, this.mats.trainGold); catcher.rotation.x = Math.PI/2; catcher.rotation.z = Math.PI/4; catcher.position.set(2.2, 0.4, 0); 
        for(let i=0; i<4; i++) { const wL = new THREE.Mesh(this.geos.wheel, this.mats.wheel); wL.rotation.x = Math.PI/2; wL.position.set(-1.0 + (i*0.8), 0.4, 0.42); const wR = new THREE.Mesh(this.geos.wheel, this.mats.wheel); wR.rotation.x = Math.PI/2; wR.position.set(-1.0 + (i*0.8), 0.4, -0.42); engine.add(wL, wR); } 
        engine.add(boiler, stack, stackCrown, cab, cabTrim, catcher); trainGroup.add(engine); 
        
        const tender = new THREE.Group(); const tenderBody = new THREE.Mesh(this.geos.trainTenderBody, this.mats.trainBlue); tenderBody.position.set(-2.8, 0.7, 0); const tBar = new THREE.Mesh(this.geos.trainTenderBar, this.mats.trainGold); tBar.position.set(-2.8, 1.1, 0); tender.add(tenderBody, tBar); trainGroup.add(tender); 
        for (let c = 0; c < 2; c++) { 
            const carriage = new THREE.Group(); const offset = -6.5 - (c * 4.5); 
            const body = new THREE.Mesh(this.geos.trainCarriageBody, this.mats.trainBlue); body.position.set(offset, 0.85, 0); 
            const trimTop = new THREE.Mesh(this.geos.trainCarTrimTop, this.mats.trainGold); trimTop.position.set(offset, 1.35, 0); 
            const trimBottom = new THREE.Mesh(this.geos.trainCarTrimBot, this.mats.trainGold); trimBottom.position.set(offset, 0.4, 0); 
            for(let j=0; j<7; j++) { const win = new THREE.Mesh(this.geos.trainWinGeo, this.mats.trainWin); win.position.set(offset - 1.5 + (j*0.5), 0.95, 0); carriage.add(win); } 
            carriage.add(body, trimTop, trimBottom); trainGroup.add(carriage); 
        } 
        
        const signal = new THREE.Group(); const pole = new THREE.Mesh(this.geos.signalPole, this.mats.trainBody); pole.position.set(-8, 0.75, -0.4); 
        const lBox = new THREE.Mesh(this.geos.signalBoxGeo, this.mats.signalBox); lBox.position.set(-8, 1.5, -0.4); 
        const rL1 = new THREE.Mesh(this.geos.signalLightGeo, this.mats.signalLight); rL1.rotation.x = Math.PI/2; rL1.position.set(-8.2, 1.5, -0.4); 
        const rL2 = new THREE.Mesh(this.geos.signalLightGeo, this.mats.signalLight); rL2.rotation.x = Math.PI/2; rL2.position.set(-7.8, 1.5, -0.4); 
        signal.add(pole, lBox, rL1, rL2); laneGroup.add(signal); 
        trainGroup.position.x = direction === 1 ? -60 : 60; if (direction === -1) trainGroup.rotation.y = Math.PI; laneGroup.add(trainGroup); 
        this.trains.push({ mesh: trainGroup, direction: direction, speed: 1.0, laneZ: laneGroup.position.z, state: 'IDLE', timer: 3 + Math.random() * 5, warningLights: [rL1, rL2] }); 
    }

    animateLiquid(geo, speed, waveHeight) {
        const positions = geo.attributes.position;
        const originalY = geo.userData.originalY;
        for (let i = 0; i < positions.count; i++) {
            if (originalY[i] > 0) { // Apenas a superfície afunda e sobe
                positions.setY(i, originalY[i] + Math.sin(positions.getX(i) * 0.5 + this.time * speed) * waveHeight);
            }
        }
        positions.needsUpdate = true;
        geo.computeVertexNormals(); // Chamado UMA vez por frame em vez de 50!
    }
    
    // OTIMIZAÇÃO: Sem 'new BoxGeometry'
    createBirds() { 
        for (let i = 0; i < 6; i++) { 
            const bird = new THREE.Group(); 
            const w1 = new THREE.Mesh(this.geos.birdWing, this.mats.birdMat); w1.rotation.y = Math.PI/4; w1.position.set(-0.15, 0, 0.15); 
            const w2 = new THREE.Mesh(this.geos.birdWing, this.mats.birdMat); w2.rotation.y = -Math.PI/4; w2.position.set(0.15, 0, 0.15); 
            bird.add(w1, w2); bird.position.set((Math.random() * 40) - 20, 10 + Math.random() * 5, -10 - Math.random() * 20); 
            this.scene.add(bird); this.birds.push({ mesh: bird, speed: 0.05 + Math.random() * 0.08, wingOscillation: Math.random() * Math.PI }); 
        } 
    }
    
    playTrainSiren() { if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)(); if (this.audioCtx.state === 'suspended') this.audioCtx.resume(); const osc = this.audioCtx.createOscillator(); const gain = this.audioCtx.createGain(); osc.type = 'square'; [450, 600, 450, 600, 450].forEach((f, i) => osc.frequency.setValueAtTime(f, this.audioCtx.currentTime + i * 0.3)); osc.connect(gain); gain.connect(this.audioCtx.destination); gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime); osc.start(); osc.stop(this.audioCtx.currentTime + 1.5); }

    update(delta, playerPos) { 
        this.time = (this.time || 0) + delta; const playerZ = playerPos.z || 0;
        
        // NOVO: Animar rios e ácido apenas 1 vez (Mega Otimização)
        this.animateLiquid(this.geos.river, 2.5, 0.08);
        this.animateLiquid(this.geos.acid, 4.0, 0.1);

        this.cars.forEach(car => { car.mesh.position.x += car.speed * car.direction * delta * 60; if ((car.direction === 1 && car.mesh.position.x > 42) || (car.direction === -1 && car.mesh.position.x < -42)) car.mesh.position.x *= -1; });
        this.logs.forEach(log => { log.mesh.position.x += log.speed * log.direction * delta * 60; if ((log.direction === 1 && log.mesh.position.x > 42) || (log.direction === -1 && log.mesh.position.x < -42)) log.mesh.position.x *= -1; });
        this.birds.forEach(bird => { bird.mesh.position.x -= bird.speed * delta * 60; bird.wingOscillation += delta * 15; bird.mesh.position.y += Math.sin(bird.wingOscillation) * 0.01; if (bird.mesh.position.x < -25) bird.mesh.position.set(25, 8 + Math.random() * 6, playerZ - 5 - (Math.random() * 20)); });
        this.conveyors.forEach(c => { c.rollers.forEach(r => r.rotation.y -= c.speed * c.direction * delta * 40); c.stripes.forEach(s => { s.position.x += c.speed * c.direction * delta * 60; if (c.direction === 1 && s.position.x > 14) s.position.x = -14; if (c.direction === -1 && s.position.x < -14) s.position.x = 14; }); });
        this.gears.forEach(g => { g.mesh.rotation.z += g.speed * g.direction * delta * 60; });
        this.trains.forEach(t => { if (t.state === 'IDLE') { t.timer -= delta; if (t.timer <= 0) { t.state = 'WARNING'; t.timer = 1.8; this.playTrainSiren(); } } else if (t.state === 'WARNING') { t.timer -= delta; const blink = Math.sin(this.time * 25) > 0; t.warningLights.forEach((l, i) => l.material.emissiveIntensity = (i === 0 ? blink : !blink) ? 5 : 0); if (t.timer <= 0) { t.state = 'PASSING'; t.warningLights.forEach(l => l.material.emissiveIntensity = 0); t.mesh.position.x = t.direction === 1 ? -60 : 60; } } else if (t.state === 'PASSING') { t.mesh.position.x += t.speed * t.direction * delta * 60; if (Math.abs(t.mesh.position.x) > 60) { t.state = 'IDLE'; t.timer = 4 + Math.random() * 6; } } });
        
        this.chasers.forEach(chaser => {
            const cX = chaser.mesh.position.x; const cZ = chaser.laneZ + chaser.mesh.position.z; const dx = playerPos.x - cX; const dz = playerPos.z - cZ; const dist = Math.sqrt(dx*dx + dz*dz);
            if (chaser.state === 'PATROL') { chaser.mesh.position.x += chaser.speed * chaser.patrolDir * delta * 60; if (chaser.mesh.position.x > 14 || chaser.mesh.position.x < -14) chaser.patrolDir *= -1; chaser.mesh.rotation.y = chaser.patrolDir === 1 ? Math.PI / 2 : -Math.PI / 2; if (dist < 5) { chaser.state = 'CHASE'; chaser.chaseTimer = 4.0; if(chaser.isFactory) chaser.mesh.children[1].material.emissiveIntensity = 6; } } 
            else if (chaser.state === 'CHASE') { chaser.chaseTimer -= delta; const angle = Math.atan2(dx, dz); chaser.mesh.position.x += Math.sin(angle) * chaser.speed * 1.2 * delta * 60; chaser.mesh.position.z += Math.cos(angle) * chaser.speed * 1.2 * delta * 60; chaser.mesh.rotation.y = angle; if (chaser.chaseTimer <= 0 || dist > 12) { chaser.state = 'COOLDOWN'; chaser.chaseTimer = 2.0; if(chaser.isFactory) chaser.mesh.children[1].material.emissiveIntensity = 1; } } 
            else if (chaser.state === 'COOLDOWN') { chaser.chaseTimer -= delta; chaser.mesh.position.z -= chaser.mesh.position.z * delta * 2; if (chaser.chaseTimer <= 0) chaser.state = 'PATROL'; }
            if (!chaser.isFactory) { if (chaser.state === 'PATROL' || chaser.state === 'CHASE') { const swingSpeed = chaser.state === 'CHASE' ? 18 : 10; const swingAngle = Math.sin(this.time * swingSpeed) * 0.7; chaser.leftLeg.rotation.x = swingAngle; chaser.rightLeg.rotation.x = -swingAngle; } else { chaser.leftLeg.rotation.x = 0; chaser.rightLeg.rotation.x = 0; } if (chaser.state === 'CHASE') { chaser.rightArm.rotation.x = -Math.PI / 4 + Math.sin(this.time * 25) * 0.3; chaser.leftArm.rotation.x = Math.sin(this.time * 15) * 0.4; } else if (chaser.state === 'PATROL') { chaser.rightArm.rotation.x = -Math.PI / 5; chaser.leftArm.rotation.x = Math.sin(this.time * 10) * 0.3; } else { chaser.rightArm.rotation.x = -Math.PI / 5; chaser.leftArm.rotation.x = 0; } }
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
                this.cars = this.cars.filter(c => c.laneZ !== lane.z); this.logs = this.logs.filter(l => l.laneZ !== lane.z); this.trains = this.trains.filter(t => t.laneZ !== lane.z); this.conveyors = this.conveyors.filter(c => c.laneZ !== lane.z); this.chasers = this.chasers.filter(c => c.laneZ !== lane.z); 
                this.lanes.splice(i, 1);
            }
        }
    }

    isObstacle(x, z) { return this.obstacles.has(`${x},${z}`); }

    reset() {
        this.lanes.forEach(lane => this.scene.remove(lane.group));
        this.lanes = []; this.cars = []; this.logs = []; this.trains = []; this.conveyors = []; this.gears = []; this.chasers = [];
        this.obstacles.clear(); this.furthestZ = -30;
        this.currentBiome = 'CLASSIC'; this.lanesUntilBiomeChange = 20;
        this.createInitialMap();
    }
}