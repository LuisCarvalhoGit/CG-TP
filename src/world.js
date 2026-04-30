import * as THREE from 'three';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.lanes = [];
        this.laneWidth = 80; // Largura do mundo (para os carros terem espaço para aparecer e desaparecer)
        this.cars = []; // Lista para atualizar os carros em cada frame
        this.obstacles = new Set();
        this.furthestZ = -30;

        this.createInitialMap();
    }

    createInitialMap() {
        // 1. Criar as primeiras faixas de relva "seguras" onde a galinha começa
        for (let z = 5; z >= 0; z--) {
            this.createLane(z, 'grass', true);
        }
        
        // 2. Gerar faixas aleatórias para a frente do jogador
        for (let z = -1; z >= -30; z--) {
            // 40% probabilidade de relva, 60% probabilidade de estrada
            const type = Math.random() > 0.4 ? 'road' : 'grass';
            this.createLane(z, type, false);
        }
    }

    createLane(z, type, isSafeZone) {
        const laneGroup = new THREE.Group();
        laneGroup.position.z = z;

        // --- Base da Faixa (O "Chão") ---
        const groundColor = type === 'grass' ? 0x66cc66 : 0x444444; // Verde ou Cinzento escuro
        const groundGeo = new THREE.BoxGeometry(this.laneWidth, 1, 1);
        const groundMat = new THREE.MeshPhongMaterial({ color: groundColor, flatShading: true });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        
        ground.position.y = -0.5; // Baixar a face superior para o nível Y=0
        ground.receiveShadow = true;
        laneGroup.add(ground);

        // --- Adicionar Elementos (Árvores ou Carros) ---
        if (!isSafeZone) {
            if (type === 'grass') {
                this.addTrees(laneGroup, z);
            } else if (type === 'road') {
                this.addCar(laneGroup);
            }
        }

        this.scene.add(laneGroup);
        this.lanes.push({ z: z, type: type, group: laneGroup });
    }

    // ==========================================
    // GERAÇÃO DE ÁRVORES (Relva)
    // ==========================================
    addTrees(laneGroup, laneZ) {
        const numTrees = Math.floor(Math.random() * 4) + 1; // 1 a 4 árvores
        const occupiedPositions = new Set();

        for (let i = 0; i < numTrees; i++) {
            // Posição X aleatória baseada em inteiros (para respeitar a grelha)
           let x = Math.floor(Math.random() * 50) - 25; 
            
            // Evitar sobreposições e evitar meter árvores exatamenteno X=0 no início
            if (occupiedPositions.has(x) || (x === 0 && laneGroup.position.z > -5)) continue; 
            occupiedPositions.add(x);

            const tree = this.createTreeMesh();
            tree.position.x = x;
            laneGroup.add(tree);

            this.obstacles.add(`${x},${laneZ}`);
        }
    }

    createTreeMesh() {
        const tree = new THREE.Group();
        
        // Tronco
        const trunk = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.6, 0.4), 
            new THREE.MeshPhongMaterial({ color: 0x5c4033, flatShading: true })
        );
        trunk.position.y = 0.3;
        trunk.castShadow = true; trunk.receiveShadow = true;
        tree.add(trunk);

        // Folhas (Copa)
        const leaves = new THREE.Mesh(
            new THREE.BoxGeometry(1.2, 1.2, 1.2), 
            new THREE.MeshPhongMaterial({ color: 0x2e8b57, flatShading: true })
        );
        leaves.position.y = 1.2;
        leaves.castShadow = true; leaves.receiveShadow = true;
        tree.add(leaves);

        return tree;
    }

    // ==========================================
    // GERAÇÃO DE CARROS (Estrada)
    // ==========================================
    addCar(laneGroup) {
        const direction = Math.random() > 0.5 ? 1 : -1; // 1 = Direita, -1 = Esquerda
        const speed = 0.05 + Math.random() * 0.08; // Velocidade aleatória
        
        // Cores aleatórias para os carros
        const colors = [0xff4444, 0x4444ff, 0xffff44, 0xffffff, 0xff8800];
        const color = colors[Math.floor(Math.random() * colors.length)];

        const car = this.createCarMesh(color);
        
        // Posicionar na ponta da estrada
        const startX = 40;
        car.position.x = direction === 1 ? -startX : startX; 
        
        // Virar o modelo do carro na direção em que se move
        if (direction === -1) car.rotation.y = Math.PI;

        laneGroup.add(car);

        // Adicionar à lista de atualização para animar no loop
        this.cars.push({ 
            mesh: car, 
            direction: direction, 
            speed: speed, 
            laneZ: laneGroup.position.z // Precisamos disto para limpar os carros antigos mais tarde
        });
    }

    createCarMesh(color) {
        const car = new THREE.Group();

        // Chassi do carro
        const body = new THREE.Mesh(
            new THREE.BoxGeometry(1.4, 0.5, 0.8), 
            new THREE.MeshPhongMaterial({ color: color, flatShading: true })
        );
        body.position.y = 0.35;
        body.castShadow = true; body.receiveShadow = true;
        car.add(body);

        // Cabine / Vidros
        const cabin = new THREE.Mesh(
            new THREE.BoxGeometry(0.7, 0.4, 0.7), 
            new THREE.MeshPhongMaterial({ color: 0xccccff, flatShading: true })
        );
        cabin.position.set(-0.15, 0.8, 0); // Ligeiramente recuado
        cabin.castShadow = true; cabin.receiveShadow = true;
        car.add(cabin);

        return car;
    }

    // ==========================================
    // ANIMAÇÃO (Chamada todos os frames)
    // ==========================================
    update() {
        // Mover todos os carros ativos
        this.cars.forEach(carData => {
            carData.mesh.position.x += carData.speed * carData.direction;

            // Se o carro sair do mapa de um lado, reaparece do outro ("Wrap around")
            const limit = 42;
            if (carData.direction === 1 && carData.mesh.position.x > limit) {
                carData.mesh.position.x = -limit;
            } else if (carData.direction === -1 && carData.mesh.position.x < -limit) {
                carData.mesh.position.x = limit;
            }
        });
    }

    // ==========================================
    // RENOVAÇÃO DO MAPA (Cenário Infinito)
    // ==========================================
    updateMap(playerZ) {
        // 1. Gerar novas faixas à frente do jogador (Renderiza 35 blocos à frente)
        const targetZ = Math.floor(playerZ) - 35; 
        
        while (this.furthestZ > targetZ) {
            this.furthestZ--; // Avança um bloco para a frente (valores negativos em Z)
            
            // Lógica aleatória para a nova faixa
            const type = Math.random() > 0.4 ? 'road' : 'grass';
            this.createLane(this.furthestZ, type, false);
        }

        // 2. Limpar faixas que ficaram para trás (Mantém apenas 10 blocos atrás)
        const cleanupZ = Math.floor(playerZ) + 30;

        // Fazemos o loop de trás para a frente quando apagamos itens de um array
        for (let i = this.lanes.length - 1; i >= 0; i--) {
            const lane = this.lanes[i];
            
            // Se a faixa estiver muito atrás do jogador
            if (lane.z > cleanupZ) {
                // A. Remover da cena gráfica do Three.js
                this.scene.remove(lane.group);

                // B. Remover árvores do sistema de colisões
                for (const obs of this.obstacles) {
                    if (obs.endsWith(`,${lane.z}`)) {
                        this.obstacles.delete(obs);
                    }
                }

                // C. Remover os carros desta faixa da lista de updates e colisões
                this.cars = this.cars.filter(car => car.laneZ !== lane.z);

                // D. Remover do array de faixas ativas
                this.lanes.splice(i, 1);
            }
        }
    }

    isObstacle(x, z) {
        return this.obstacles.has(`${x},${z}`); // Devolve true se houver árvore nesta coordenada
    }

    // ==========================================
    // REINICIAR O MAPA (Game Over)
    // ==========================================
    reset() {
        // 1. Apagar graficamente todas as faixas que existem
        this.lanes.forEach(lane => this.scene.remove(lane.group));
        
        // 2. Limpar os dados lógicos
        this.lanes = [];
        this.cars = [];
        this.obstacles.clear();
        
        // 3. Repor o contador de distância e gerar novamente
        this.furthestZ = -30;
        this.createInitialMap();
    }
}