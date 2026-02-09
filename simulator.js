// Clean & Modern 3D Automata Simulator
class AutomataSimulator {
    constructor() {
        window.onerror = (message, source, lineno, colno, error) => {
            console.error("Error occurred:", message, "at", source, "line", lineno);
            this.hideLoadingOverlay();
            return true;
        };

        this.stepMode = false;
        this.metrics = { steps: 0, consumed: 0 };
        this.createDebugPanel();

        try {
            this.setupThreeJS();
            this.setupPostProcessing();
            this.setupControls();
            this.setupExamples();
            this.setupTutorial();
            this.createDefaultAutomaton();
            this.animate();
            this.hideLoadingOverlay();
        } catch (error) {
            console.error("Initialization error:", error);
            this.hideLoadingOverlay();
        }

        this.animationSpeed = 1000 / parseInt(document.getElementById('speed-slider').value);
        document.getElementById('speed-slider').addEventListener('input', (e) => {
            this.animationSpeed = 1000 / parseInt(e.target.value);
        });
    }

    hideLoadingOverlay() {
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            setTimeout(() => {
                if (loadingOverlay.parentNode) {
                    loadingOverlay.style.display = 'none';
                }
            }, 500);
        }
    }

    // Smooth easing
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    easeOutQuart(t) {
        return 1 - Math.pow(1 - t, 4);
    }

    setupThreeJS() {
        // Clean dark scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0a12);

        // Camera
        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 12, 20);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        document.getElementById('canvas-container').appendChild(this.renderer.domElement);

        this.setupLighting();
        this.createCleanGrid();

        window.addEventListener('resize', () => this.onWindowResize());
        this.setupCameraControls();

        this.clock = new THREE.Clock();
        this.dataPackets = [];
        this.activeAnimations = [];
        this.particleSystems = [];

        this.targetCameraRotation = { x: 0.4, y: 0 };
        this.currentCameraRotation = { x: 0.4, y: 0 };
        this.targetCameraDistance = 20;
        this.currentCameraDistance = 20;
    }

    setupLighting() {
        // Soft ambient
        const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
        this.scene.add(ambientLight);

        // Main light - soft white
        this.mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
        this.mainLight.position.set(5, 15, 10);
        this.mainLight.castShadow = true;
        this.mainLight.shadow.mapSize.width = 2048;
        this.mainLight.shadow.mapSize.height = 2048;
        this.mainLight.shadow.camera.near = 0.5;
        this.mainLight.shadow.camera.far = 50;
        this.mainLight.shadow.camera.left = -15;
        this.mainLight.shadow.camera.right = 15;
        this.mainLight.shadow.camera.top = 15;
        this.mainLight.shadow.camera.bottom = -15;
        this.mainLight.shadow.bias = -0.0001;
        this.mainLight.shadow.radius = 3;
        this.scene.add(this.mainLight);

        // Subtle fill light
        const fillLight = new THREE.DirectionalLight(0x6080ff, 0.3);
        fillLight.position.set(-10, 5, -5);
        this.scene.add(fillLight);

        // Subtle rim light
        const rimLight = new THREE.DirectionalLight(0xff8060, 0.2);
        rimLight.position.set(0, -3, -10);
        this.scene.add(rimLight);
    }

    createCleanGrid() {
        // Minimal circular grid
        const gridGroup = new THREE.Group();

        // Concentric circles
        const circleCount = 4;
        for (let i = 1; i <= circleCount; i++) {
            const radius = i * 3;
            const segments = 64;
            const circleGeometry = new THREE.BufferGeometry();
            const positions = [];

            for (let j = 0; j <= segments; j++) {
                const angle = (j / segments) * Math.PI * 2;
                positions.push(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
            }

            circleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
            const circleMaterial = new THREE.LineBasicMaterial({
                color: 0x2a2a40,
                transparent: true,
                opacity: 0.4 - (i * 0.08)
            });
            const circle = new THREE.Line(circleGeometry, circleMaterial);
            gridGroup.add(circle);
        }

        // Cross lines
        const crossGeometry = new THREE.BufferGeometry();
        const crossPositions = [
            -12, 0, 0, 12, 0, 0,
            0, 0, -12, 0, 0, 12
        ];
        crossGeometry.setAttribute('position', new THREE.Float32BufferAttribute(crossPositions, 3));
        const crossMaterial = new THREE.LineBasicMaterial({
            color: 0x3a3a55,
            transparent: true,
            opacity: 0.3
        });
        const cross = new THREE.LineSegments(crossGeometry, crossMaterial);
        gridGroup.add(cross);

        gridGroup.position.y = -0.5;
        this.scene.add(gridGroup);
        this.grid = gridGroup;

        // Ground plane - subtle
        const groundGeometry = new THREE.CircleGeometry(15, 64);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x12121a,
            metalness: 0.1,
            roughness: 0.9,
            transparent: true,
            opacity: 0.8
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.51;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }

    setupPostProcessing() {
        this.composer = new THREE.EffectComposer(this.renderer);

        const renderPass = new THREE.RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // Subtle bloom
        const bloomPass = new THREE.UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.4,   // strength - reduced
            0.5,   // radius
            0.9    // threshold - higher = less bloom
        );
        this.composer.addPass(bloomPass);
        this.bloomPass = bloomPass;

        // FXAA
        const fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
        fxaaPass.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
        this.composer.addPass(fxaaPass);
        this.fxaaPass = fxaaPass;
    }

    setupCameraControls() {
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.cameraDamping = 0.06;

        this.renderer.domElement.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        this.renderer.domElement.addEventListener('mouseup', () => this.isDragging = false);
        this.renderer.domElement.addEventListener('mouseleave', () => this.isDragging = false);

        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const deltaMove = {
                    x: e.clientX - this.previousMousePosition.x,
                    y: e.clientY - this.previousMousePosition.y
                };

                this.targetCameraRotation.x += deltaMove.y * 0.004;
                this.targetCameraRotation.y += deltaMove.x * 0.004;
                this.targetCameraRotation.x = Math.max(0.1, Math.min(Math.PI / 2.2, this.targetCameraRotation.x));
            }
            this.previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        this.renderer.domElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.targetCameraDistance += e.deltaY * 0.015;
            this.targetCameraDistance = Math.max(10, Math.min(35, this.targetCameraDistance));
        });
    }

    updateCameraPosition() {
        this.currentCameraRotation.x += (this.targetCameraRotation.x - this.currentCameraRotation.x) * this.cameraDamping;
        this.currentCameraRotation.y += (this.targetCameraRotation.y - this.currentCameraRotation.y) * this.cameraDamping;
        this.currentCameraDistance += (this.targetCameraDistance - this.currentCameraDistance) * this.cameraDamping;

        const x = this.currentCameraDistance * Math.sin(this.currentCameraRotation.y) * Math.cos(this.currentCameraRotation.x);
        const y = this.currentCameraDistance * Math.sin(this.currentCameraRotation.x);
        const z = this.currentCameraDistance * Math.cos(this.currentCameraRotation.y) * Math.cos(this.currentCameraRotation.x);

        this.camera.position.set(x, Math.max(y, 3), z);
        this.camera.lookAt(0, 0, 0);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
        if (this.fxaaPass) {
            this.fxaaPass.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
        }
    }

    // Color palette - clean and modern
    colors = {
        initial: { base: 0x4a9eff, emissive: 0x2060cc, glow: 0x4a9eff },
        final: { base: 0x50e890, emissive: 0x20a050, glow: 0x50e890 },
        regular: { base: 0x8888aa, emissive: 0x404060, glow: 0x6666aa },
        current: { base: 0xffcc40, emissive: 0xcc9020, glow: 0xffcc40 },
        error: { base: 0xff5555, emissive: 0xaa2020, glow: 0xff5555 },
        transition: { base: 0x6a7aff, emissive: 0x3040aa, glow: 0x6a7aff },
        packet: { base: 0xff6b6b, emissive: 0xcc3030, glow: 0xff6b6b }
    };

    createStateSphere(state) {
        const group = new THREE.Group();
        group.userData.isAutomatonObject = true;

        let colorSet;
        if (state.final && state.initial) {
            colorSet = this.colors.final;
        } else if (state.final) {
            colorSet = this.colors.final;
        } else if (state.initial) {
            colorSet = this.colors.initial;
        } else {
            colorSet = this.colors.regular;
        }

        // Main sphere - clean glass-like material
        const geometry = new THREE.SphereGeometry(0.7, 48, 48);
        const material = new THREE.MeshStandardMaterial({
            color: colorSet.base,
            metalness: 0.3,
            roughness: 0.15,
            emissive: colorSet.emissive,
            emissiveIntensity: 0.15
        });

        const sphere = new THREE.Mesh(geometry, material);
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        group.add(sphere);

        // Subtle inner glow
        const glowGeometry = new THREE.SphereGeometry(0.75, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: colorSet.glow,
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide
        });
        const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
        group.add(glowSphere);

        // Final state ring - thin and elegant
        if (state.final) {
            const ringGeometry = new THREE.TorusGeometry(0.95, 0.03, 16, 64);
            const ringMaterial = new THREE.MeshStandardMaterial({
                color: 0x50e890,
                metalness: 0.5,
                roughness: 0.2,
                emissive: 0x30a060,
                emissiveIntensity: 0.3
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.rotation.x = Math.PI / 2;
            ring.castShadow = true;
            group.add(ring);
        }

        // Initial state indicator - small elegant arrow
        if (state.initial) {
            const arrowGroup = new THREE.Group();

            const shaftGeometry = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 12);
            const shaftMaterial = new THREE.MeshStandardMaterial({
                color: 0x4a9eff,
                metalness: 0.4,
                roughness: 0.3,
                emissive: 0x2060cc,
                emissiveIntensity: 0.2
            });
            const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
            shaft.rotation.z = Math.PI / 2;
            shaft.position.x = -1.5;
            arrowGroup.add(shaft);

            const headGeometry = new THREE.ConeGeometry(0.12, 0.25, 12);
            const head = new THREE.Mesh(headGeometry, shaftMaterial);
            head.rotation.z = -Math.PI / 2;
            head.position.x = -0.85;
            arrowGroup.add(head);

            group.add(arrowGroup);
        }

        group.position.copy(state.position);

        return {
            group,
            sphere,
            glowSphere,
            colorSet
        };
    }

    createTransitionCurve(fromPos, toPos, isSelfLoop = false) {
        if (isSelfLoop) {
            const points = [];
            const loopRadius = 0.8;
            const loopHeight = 1.2;

            for (let i = 0; i <= 32; i++) {
                const t = i / 32;
                const angle = Math.PI * 0.8 + t * Math.PI * 1.4;
                const x = fromPos.x + loopRadius * Math.cos(angle);
                const y = fromPos.y + loopHeight + 0.4 * Math.sin(t * Math.PI);
                const z = fromPos.z + loopRadius * Math.sin(angle);
                points.push(new THREE.Vector3(x, y, z));
            }
            return points;
        }

        const midPoint = new THREE.Vector3().addVectors(fromPos, toPos).multiplyScalar(0.5);
        const direction = new THREE.Vector3().subVectors(toPos, fromPos);
        const distance = direction.length();
        const curveHeight = Math.min(distance * 0.12, 1.0);

        const controlPoint = midPoint.clone();
        controlPoint.y += curveHeight;

        const curve = new THREE.QuadraticBezierCurve3(fromPos, controlPoint, toPos);
        const points = curve.getPoints(32);

        // Trim to not overlap with target
        return points.filter(p => p.distanceTo(toPos) > 0.8);
    }

    createTextSprite(text, color, scale = 1) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 128;

        context.font = 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        context.fillStyle = color || '#ffffff';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });

        const sprite = new THREE.Sprite(material);
        sprite.scale.set(1.2 * scale, 0.6 * scale, 1);
        sprite.userData.isAutomatonObject = true;
        return sprite;
    }

    visualizeAutomaton() {
        try {
            this.stateObjects = {};
            this.transitionObjects = [];

            // Create states
            this.automaton.states.forEach(state => {
                const stateVisual = this.createStateSphere(state);
                this.scene.add(stateVisual.group);

                // Label
                const textSprite = this.createTextSprite(state.name, '#ffffff');
                textSprite.position.set(state.position.x, state.position.y + 1.4, state.position.z);
                this.scene.add(textSprite);

                this.stateObjects[state.name] = {
                    ...stateVisual,
                    textSprite,
                    position: state.position.clone(),
                    state: state
                };
            });

            // Create transitions
            this.automaton.transitions.forEach(transition => {
                const fromState = this.automaton.states.find(s => s.name === transition.from);
                const toState = this.automaton.states.find(s => s.name === transition.to);
                if (!fromState || !toState) return;

                const isSelfLoop = fromState.name === toState.name;
                const points = this.createTransitionCurve(fromState.position, toState.position, isSelfLoop);

                // Tube - thin and clean
                const curve = new THREE.CatmullRomCurve3(points);
                const tubeGeometry = new THREE.TubeGeometry(curve, 48, 0.025, 8, false);
                const tubeMaterial = new THREE.MeshStandardMaterial({
                    color: this.colors.transition.base,
                    metalness: 0.4,
                    roughness: 0.3,
                    emissive: this.colors.transition.emissive,
                    emissiveIntensity: 0.15,
                    transparent: true,
                    opacity: 0.85
                });

                const tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
                tubeMesh.userData.isAutomatonObject = true;
                tubeMesh.castShadow = true;
                this.scene.add(tubeMesh);

                // Arrow head - small
                let arrowHead = null;
                if (points.length >= 2) {
                    const lastPoint = points[points.length - 1];
                    const secondLastPoint = points[points.length - 2];
                    const direction = new THREE.Vector3().subVectors(lastPoint, secondLastPoint).normalize();

                    const coneGeometry = new THREE.ConeGeometry(0.1, 0.22, 12);
                    const coneMaterial = new THREE.MeshStandardMaterial({
                        color: this.colors.transition.base,
                        metalness: 0.4,
                        roughness: 0.3,
                        emissive: this.colors.transition.emissive,
                        emissiveIntensity: 0.2
                    });

                    arrowHead = new THREE.Mesh(coneGeometry, coneMaterial);
                    arrowHead.userData.isAutomatonObject = true;
                    arrowHead.position.copy(lastPoint);
                    arrowHead.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
                    arrowHead.castShadow = true;
                    this.scene.add(arrowHead);
                }

                // Label - positioned nicely
                const labelPos = points[Math.floor(points.length / 2)].clone();
                labelPos.y += 0.35;

                const textSprite = this.createTextSprite(transition.input, '#8899ff', 0.8);
                textSprite.position.copy(labelPos);
                this.scene.add(textSprite);

                this.transitionObjects.push({
                    from: transition.from,
                    to: transition.to,
                    input: transition.input,
                    tube: tubeMesh,
                    arrow: arrowHead,
                    textSprite,
                    points,
                    selfTransition: isSelfLoop
                });
            });

            this.updateInfoDisplay();
        } catch (error) {
            console.error("Error visualizing automaton:", error);
        }
    }

    createDataPacket(position, inputSymbol) {
        const group = new THREE.Group();
        group.userData.isAutomatonObject = true;

        // Core - small and clean
        const coreGeometry = new THREE.SphereGeometry(0.18, 24, 24);
        const coreMaterial = new THREE.MeshStandardMaterial({
            color: this.colors.packet.base,
            metalness: 0.5,
            roughness: 0.2,
            emissive: this.colors.packet.emissive,
            emissiveIntensity: 0.4
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        group.add(core);

        // Subtle glow
        const glowGeometry = new THREE.SphereGeometry(0.28, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: this.colors.packet.glow,
            transparent: true,
            opacity: 0.25,
            side: THREE.BackSide
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        group.add(glow);

        // Label
        const labelSprite = this.createTextSprite(inputSymbol, '#ffffff', 0.5);
        labelSprite.position.y = 0.45;
        group.add(labelSprite);

        group.position.copy(position);
        this.scene.add(group);

        // Simple trail
        const trail = this.createSimpleTrail();
        this.scene.add(trail);
        this.particleSystems.push(trail);

        return {
            group,
            core,
            glow,
            label: labelSprite,
            trail,
            trailPositions: [],
            inputSymbol
        };
    }

    createSimpleTrail() {
        const particleCount = 30;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = -1000;
            positions[i * 3 + 2] = 0;

            const fade = 1 - (i / particleCount);
            colors[i * 3] = 1.0;
            colors[i * 3 + 1] = 0.4 * fade;
            colors[i * 3 + 2] = 0.4 * fade;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.08,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending
        });

        return new THREE.Points(geometry, material);
    }

    updateTrail(packet, currentPosition) {
        if (!packet.trail) return;

        packet.trailPositions.unshift(currentPosition.clone());
        if (packet.trailPositions.length > 30) packet.trailPositions.pop();

        const positions = packet.trail.geometry.attributes.position.array;
        for (let i = 0; i < packet.trailPositions.length && i < 30; i++) {
            const pos = packet.trailPositions[i];
            positions[i * 3] = pos.x;
            positions[i * 3 + 1] = pos.y;
            positions[i * 3 + 2] = pos.z;
        }
        packet.trail.geometry.attributes.position.needsUpdate = true;
    }

    animateDataPacket(packet, points, duration, onComplete) {
        const self = this;

        const animation = {
            packet,
            points,
            startTime: Date.now(),
            duration,
            onComplete: () => {
                const index = self.activeAnimations.indexOf(animation);
                if (index > -1) self.activeAnimations.splice(index, 1);
                self.updateDebugInfo();
                if (self.inputIndex < self.inputString.length) {
                    document.getElementById('step-simulation').disabled = false;
                }
                if (onComplete) onComplete();
            },
            update: function(time) {
                const elapsed = time - this.startTime;
                const rawProgress = Math.min(elapsed / this.duration, 1);
                const progress = self.easeOutQuart(rawProgress);

                if (points && points.length > 1) {
                    const pointIndex = Math.floor(progress * (points.length - 1));
                    const fraction = progress * (points.length - 1) - pointIndex;

                    if (pointIndex < points.length - 1) {
                        const p1 = points[pointIndex];
                        const p2 = points[pointIndex + 1];
                        packet.group.position.lerpVectors(p1, p2, fraction);
                        self.updateTrail(packet, packet.group.position);
                    }
                }

                // Subtle pulse
                const pulse = 1 + 0.1 * Math.sin(rawProgress * Math.PI * 6);
                packet.glow.scale.setScalar(pulse);

                if (rawProgress === 1) this.onComplete();
                return rawProgress < 1;
            }
        };

        this.dataPackets.push(packet);
        this.activeAnimations.push(animation);
        return animation;
    }

    highlightState(stateName, colorSet, intensity = 0.3) {
        const stateObj = this.stateObjects[stateName];
        if (!stateObj) return;

        stateObj.sphere.material.color.setHex(colorSet.base);
        stateObj.sphere.material.emissive.setHex(colorSet.emissive);
        stateObj.sphere.material.emissiveIntensity = intensity;
        stateObj.glowSphere.material.color.setHex(colorSet.glow);
        stateObj.glowSphere.material.opacity = 0.2;
    }

    highlightTransition(transObj) {
        transObj.tube.material.emissiveIntensity = 0.4;
        transObj.tube.material.opacity = 1.0;
        if (transObj.arrow) {
            transObj.arrow.material.emissiveIntensity = 0.4;
        }
    }

    // ==================== CONTROL SETUP ====================
    setupControls() {
        document.getElementById('toggle-controls').addEventListener('click', () => {
            const controlsPanel = document.getElementById('controls');
            const toggleButton = document.getElementById('controls-toggle');
            controlsPanel.classList.toggle('hidden');
            toggleButton.style.display = controlsPanel.classList.contains('hidden') ? 'block' : 'none';
        });

        document.getElementById('controls-toggle').addEventListener('click', () => {
            document.getElementById('controls').classList.remove('hidden');
            document.getElementById('controls-toggle').style.display = 'none';
        });

        document.getElementById('create-automaton').addEventListener('click', () => this.createCustomAutomaton());
        document.querySelector('.add-state').addEventListener('click', () => this.addStateInput());
        document.querySelector('.add-transition').addEventListener('click', () => this.addTransitionInput());
        document.getElementById('run-simulation').addEventListener('click', () => this.runSimulation());
        document.getElementById('step-simulation').addEventListener('click', () => this.stepSimulation());
        document.getElementById('reset-simulation').addEventListener('click', () => this.resetSimulation());

        document.getElementById('automaton-type').addEventListener('change', (e) => {
            const type = e.target.value;
            document.getElementById('pda-controls').style.display = type === 'pda' ? 'block' : 'none';
            document.getElementById('tm-controls').style.display = type === 'tm' ? 'block' : 'none';
            document.getElementById('simulation-stack').style.display = type === 'pda' ? 'block' : 'none';
            document.getElementById('simulation-tape').style.display = type === 'tm' ? 'block' : 'none';
        });
    }

    setupTutorial() {
        document.getElementById('show-tutorial').addEventListener('click', () => {
            const panel = document.getElementById('tutorial-panel');
            panel.style.display = panel.style.display === 'none' || panel.style.display === '' ? 'block' : 'none';
            this.tutorialStep = 1;
            document.querySelectorAll('.tutorial-step').forEach((step, index) => {
                step.style.display = index === 0 ? 'block' : 'none';
            });
            document.querySelector('.prev-step').style.visibility = 'hidden';
            document.querySelector('.next-step').textContent = 'Next';
        });

        this.tutorialStep = 1;
        const tutorialSteps = document.querySelectorAll('.tutorial-step').length;

        document.querySelector('.next-step').addEventListener('click', () => {
            if (this.tutorialStep < tutorialSteps) {
                document.getElementById(`step${this.tutorialStep}`).style.display = 'none';
                this.tutorialStep++;
                document.getElementById(`step${this.tutorialStep}`).style.display = 'block';
                document.querySelector('.prev-step').style.visibility = 'visible';
                if (this.tutorialStep === tutorialSteps) {
                    document.querySelector('.next-step').textContent = 'Close';
                }
            } else {
                document.getElementById('tutorial-panel').style.display = 'none';
            }
        });

        document.querySelector('.prev-step').addEventListener('click', () => {
            if (this.tutorialStep > 1) {
                document.getElementById(`step${this.tutorialStep}`).style.display = 'none';
                this.tutorialStep--;
                document.getElementById(`step${this.tutorialStep}`).style.display = 'block';
                if (this.tutorialStep === 1) document.querySelector('.prev-step').style.visibility = 'hidden';
                document.querySelector('.next-step').textContent = 'Next';
            }
        });
    }

    setupExamples() {
        document.getElementById('show-examples').addEventListener('click', () => {
            const panel = document.getElementById('examples-panel');
            panel.style.display = panel.style.display === 'none' || panel.style.display === '' ? 'block' : 'none';
            document.getElementById('tutorial-panel').style.display = 'none';
        });

        document.querySelectorAll('.example-automaton').forEach(element => {
            element.addEventListener('click', () => {
                const exampleType = element.getAttribute('data-example');
                this.loadExampleAutomaton(exampleType);
                document.getElementById('examples-panel').style.display = 'none';
            });
        });
    }

    loadExampleAutomaton(exampleType) {
        const examples = {
            'ends-with-a': {
                type: 'fa',
                states: [{ name: 'q0', initial: true, final: false }, { name: 'q1', initial: false, final: true }],
                transitions: [
                    { from: 'q0', to: 'q0', input: 'b' }, { from: 'q0', to: 'q1', input: 'a' },
                    { from: 'q1', to: 'q0', input: 'b' }, { from: 'q1', to: 'q1', input: 'a' }
                ],
                input: 'aabba'
            },
            'even-a': {
                type: 'fa',
                states: [{ name: 'even', initial: true, final: true }, { name: 'odd', initial: false, final: false }],
                transitions: [
                    { from: 'even', to: 'odd', input: 'a' }, { from: 'even', to: 'even', input: 'b' },
                    { from: 'odd', to: 'even', input: 'a' }, { from: 'odd', to: 'odd', input: 'b' }
                ],
                input: 'aabab'
            },
            'starts-with-ab': {
                type: 'fa',
                states: [
                    { name: 'q0', initial: true, final: false }, { name: 'q1', initial: false, final: false },
                    { name: 'q2', initial: false, final: true }, { name: 'q3', initial: false, final: false }
                ],
                transitions: [
                    { from: 'q0', to: 'q1', input: 'a' }, { from: 'q0', to: 'q3', input: 'b' },
                    { from: 'q1', to: 'q2', input: 'b' }, { from: 'q1', to: 'q3', input: 'a' },
                    { from: 'q2', to: 'q2', input: 'a' }, { from: 'q2', to: 'q2', input: 'b' },
                    { from: 'q3', to: 'q3', input: 'a' }, { from: 'q3', to: 'q3', input: 'b' }
                ],
                input: 'abaa'
            },
            'palindrome': {
                type: 'pda',
                states: [
                    { name: 'q0', initial: true, final: false }, { name: 'q1', initial: false, final: false },
                    { name: 'q2', initial: false, final: true }
                ],
                transitions: [
                    { from: 'q0', to: 'q0', input: 'a,ε→a' }, { from: 'q0', to: 'q0', input: 'b,ε→b' },
                    { from: 'q0', to: 'q1', input: 'ε,ε→ε' }, { from: 'q1', to: 'q1', input: 'a,a→ε' },
                    { from: 'q1', to: 'q1', input: 'b,b→ε' }, { from: 'q1', to: 'q2', input: 'ε,ε→ε' }
                ],
                input: 'abba'
            },
            'anbn': {
                type: 'pda',
                states: [
                    { name: 'q0', initial: true, final: false }, { name: 'q1', initial: false, final: false },
                    { name: 'q2', initial: false, final: true }
                ],
                transitions: [
                    { from: 'q0', to: 'q1', input: 'a,ε→X' }, { from: 'q1', to: 'q1', input: 'a,ε→X' },
                    { from: 'q1', to: 'q2', input: 'b,X→ε' }, { from: 'q2', to: 'q2', input: 'b,X→ε' }
                ],
                input: 'aaabbb'
            },
            'tm-binary-add': {
                type: 'tm',
                states: [
                    { name: 'q0', initial: true, final: false }, { name: 'q1', initial: false, final: false },
                    { name: 'q2', initial: false, final: true }
                ],
                transitions: [
                    { from: 'q0', to: 'q0', input: '1→1,R' }, { from: 'q0', to: 'q0', input: '0→0,R' },
                    { from: 'q0', to: 'q1', input: '_→_,L' }, { from: 'q1', to: 'q1', input: '1→0,L' },
                    { from: 'q1', to: 'q2', input: '0→1,R' }, { from: 'q1', to: 'q2', input: '_→1,R' }
                ],
                input: '1011'
            }
        };

        const example = examples[exampleType];
        if (!example) return;

        document.getElementById('automaton-type').value = example.type;
        document.getElementById('automaton-type').dispatchEvent(new Event('change'));
        this.updateControlsWithAutomaton(example.states, example.transitions, example.input);
        this.createCustomAutomaton();
    }

    updateControlsWithAutomaton(states, transitions, inputString) {
        const statesContainer = document.getElementById('states-container');
        statesContainer.innerHTML = '';

        states.forEach((state, index) => {
            const stateDiv = document.createElement('div');
            stateDiv.className = 'state';
            stateDiv.innerHTML = `
                <input type="text" placeholder="State name" value="${state.name}">
                <label><input type="checkbox" ${state.initial ? 'checked' : ''}> Initial</label>
                <label><input type="checkbox" ${state.final ? 'checked' : ''}> Final</label>
                ${index === 0 ? '<button class="add-state">+</button>' : '<button class="remove-state">-</button>'}
            `;
            statesContainer.appendChild(stateDiv);

            if (index === 0) {
                stateDiv.querySelector('.add-state').addEventListener('click', () => this.addStateInput());
            } else {
                stateDiv.querySelector('.remove-state').addEventListener('click', () => {
                    stateDiv.remove();
                    this.updateStateSelectors();
                });
            }
        });

        const transitionsContainer = document.getElementById('transitions-container');
        transitionsContainer.innerHTML = '';

        transitions.forEach((transition, index) => {
            const transitionDiv = document.createElement('div');
            transitionDiv.className = 'transition';

            const fromStateSelect = document.createElement('select');
            fromStateSelect.className = 'from-state';

            const inputSymbol = document.createElement('input');
            inputSymbol.type = 'text';
            inputSymbol.className = 'input-symbol';
            inputSymbol.value = transition.input;

            const toStateSelect = document.createElement('select');
            toStateSelect.className = 'to-state';

            const button = document.createElement('button');
            button.className = index === 0 ? 'add-transition' : 'remove-transition';
            button.textContent = index === 0 ? '+' : '-';

            transitionDiv.appendChild(fromStateSelect);
            transitionDiv.appendChild(inputSymbol);
            transitionDiv.appendChild(toStateSelect);
            transitionDiv.appendChild(button);
            transitionsContainer.appendChild(transitionDiv);

            if (index === 0) {
                button.addEventListener('click', () => this.addTransitionInput());
            } else {
                button.addEventListener('click', () => transitionDiv.remove());
            }
        });

        this.updateStateSelectors();

        const fromSelectors = document.querySelectorAll('.from-state');
        const toSelectors = document.querySelectorAll('.to-state');

        transitions.forEach((transition, index) => {
            if (index < fromSelectors.length) fromSelectors[index].value = transition.from;
            if (index < toSelectors.length) toSelectors[index].value = transition.to;
        });

        document.getElementById('input-string').value = inputString;
    }

    addStateInput() {
        const statesContainer = document.getElementById('states-container');
        const stateCount = statesContainer.children.length;

        const stateDiv = document.createElement('div');
        stateDiv.className = 'state';
        stateDiv.innerHTML = `
            <input type="text" placeholder="State name" value="q${stateCount}">
            <label><input type="checkbox"> Initial</label>
            <label><input type="checkbox"> Final</label>
            <button class="remove-state">-</button>
        `;
        statesContainer.appendChild(stateDiv);

        stateDiv.querySelector('.remove-state').addEventListener('click', () => {
            stateDiv.remove();
            this.updateStateSelectors();
        });

        this.updateStateSelectors();
    }

    addTransitionInput() {
        const transitionsContainer = document.getElementById('transitions-container');
        const transitionDiv = document.createElement('div');
        transitionDiv.className = 'transition';

        const fromStateSelect = document.createElement('select');
        fromStateSelect.className = 'from-state';

        const inputSymbol = document.createElement('input');
        inputSymbol.type = 'text';
        inputSymbol.className = 'input-symbol';
        inputSymbol.value = 'a';

        const toStateSelect = document.createElement('select');
        toStateSelect.className = 'to-state';

        const removeButton = document.createElement('button');
        removeButton.className = 'remove-transition';
        removeButton.textContent = '-';

        transitionDiv.appendChild(fromStateSelect);
        transitionDiv.appendChild(inputSymbol);
        transitionDiv.appendChild(toStateSelect);
        transitionDiv.appendChild(removeButton);
        transitionsContainer.appendChild(transitionDiv);

        removeButton.addEventListener('click', () => transitionDiv.remove());
        this.updateStateSelectors();
    }

    updateStateSelectors() {
        const stateInputs = document.querySelectorAll('.state input[type="text"]');
        const stateNames = Array.from(stateInputs).map(input => input.value);
        const allSelectors = [...document.querySelectorAll('.from-state'), ...document.querySelectorAll('.to-state')];

        allSelectors.forEach(selector => {
            const currentValue = selector.value;
            selector.innerHTML = '';
            stateNames.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                selector.appendChild(option);
            });
            if (stateNames.includes(currentValue)) selector.value = currentValue;
        });
    }

    createDefaultAutomaton() {
        this.automaton = {
            type: 'fa',
            states: [
                { name: 'q0', initial: true, final: false, position: new THREE.Vector3(-4, 0, 0) },
                { name: 'q1', initial: false, final: true, position: new THREE.Vector3(4, 0, 0) }
            ],
            transitions: [
                { from: 'q0', to: 'q0', input: 'b' },
                { from: 'q0', to: 'q1', input: 'a' },
                { from: 'q1', to: 'q0', input: 'b' },
                { from: 'q1', to: 'q1', input: 'a' }
            ]
        };
        this.visualizeAutomaton();
    }

    createCustomAutomaton() {
        this.clearScene();

        const automatonType = document.getElementById('automaton-type').value;
        const stateElements = document.querySelectorAll('.state');
        const states = Array.from(stateElements).map((element, index) => {
            const name = element.querySelector('input[type="text"]').value;
            const initial = element.querySelectorAll('input[type="checkbox"]')[0].checked;
            const final = element.querySelectorAll('input[type="checkbox"]')[1].checked;
            const angle = (index / stateElements.length) * Math.PI * 2;
            const radius = 4;
            return {
                name, initial, final,
                position: new THREE.Vector3(radius * Math.cos(angle), 0, radius * Math.sin(angle))
            };
        });

        const transitionElements = document.querySelectorAll('.transition');
        const transitions = Array.from(transitionElements).map(element => ({
            from: element.querySelector('.from-state').value,
            to: element.querySelector('.to-state').value,
            input: element.querySelector('.input-symbol').value
        }));

        this.automaton = { type: automatonType, states, transitions };
        this.visualizeAutomaton();
        this.resetSimulation();
    }

    clearScene() {
        const objectsToRemove = [];
        this.scene.traverse(child => {
            if (child.userData.isAutomatonObject) objectsToRemove.push(child);
        });

        objectsToRemove.forEach(obj => {
            this.scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                else obj.material.dispose();
            }
        });

        this.particleSystems.forEach(ps => {
            this.scene.remove(ps);
            if (ps.geometry) ps.geometry.dispose();
            if (ps.material) ps.material.dispose();
        });
        this.particleSystems = [];
        this.dataPackets = [];
        this.activeAnimations = [];
    }

    updateInfoDisplay() {
        const type = this.automaton.type;
        const infoElement = document.getElementById('simulation-info');
        let typeName = type === 'pda' ? 'Pushdown Automaton' : type === 'tm' ? 'Turing Machine' : 'Finite Automaton';
        const stateCount = this.automaton.states.length;
        const acceptingCount = this.automaton.states.filter(s => s.final).length;
        const transitionCount = this.automaton.transitions.length;
        infoElement.innerHTML = `${typeName} with ${stateCount} states (${acceptingCount} accepting) and ${transitionCount} transitions`;
    }

    logSimulationEvent(message, type = 'info') {
        const log = document.getElementById('simulation-log');
        if (!log) return;

        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.textContent = message;
        log.prepend(entry);

        while (log.children.length > 8) {
            log.removeChild(log.lastChild);
        }
    }

    updateAnalytics(mode = 'Idle') {
        const total = Math.max(this.inputString?.length || 0, 0);
        const consumed = Math.min(this.inputIndex || 0, total);
        const progress = total > 0 ? (consumed / total) * 100 : 0;

        const stepsEl = document.getElementById('metric-steps');
        const consumedEl = document.getElementById('metric-consumed');
        const stateEl = document.getElementById('metric-state');
        const modeEl = document.getElementById('metric-mode');
        const progressEl = document.getElementById('progress-bar');

        if (stepsEl) stepsEl.textContent = `${this.metrics.steps}`;
        if (consumedEl) consumedEl.textContent = `${consumed}/${total}`;
        if (stateEl) stateEl.textContent = this.currentState?.name || '-';
        if (modeEl) modeEl.textContent = mode;
        if (progressEl) progressEl.style.width = `${progress}%`;
    }

    resetSimulation() {
        this.dataPackets.forEach(packet => {
            if (packet.group && packet.group.parent) packet.group.parent.remove(packet.group);
        });
        this.dataPackets = [];
        this.activeAnimations = [];

        this.particleSystems.forEach(ps => this.scene.remove(ps));
        this.particleSystems = [];

        Object.values(this.stateObjects).forEach(stateObj => {
            const state = stateObj.state;
            let colorSet;
            if (state.final) colorSet = this.colors.final;
            else if (state.initial) colorSet = this.colors.initial;
            else colorSet = this.colors.regular;

            stateObj.sphere.material.color.setHex(colorSet.base);
            stateObj.sphere.material.emissive.setHex(colorSet.emissive);
            stateObj.sphere.material.emissiveIntensity = 0.15;
            stateObj.glowSphere.material.color.setHex(colorSet.glow);
            stateObj.glowSphere.material.opacity = 0.1;
        });

        this.transitionObjects.forEach(transObj => {
            transObj.tube.material.color.setHex(this.colors.transition.base);
            transObj.tube.material.emissive.setHex(this.colors.transition.emissive);
            transObj.tube.material.emissiveIntensity = 0.15;
            transObj.tube.material.opacity = 0.85;
            if (transObj.arrow) {
                transObj.arrow.material.color.setHex(this.colors.transition.base);
                transObj.arrow.material.emissive.setHex(this.colors.transition.emissive);
                transObj.arrow.material.emissiveIntensity = 0.2;
            }
        });

        this.simulationRunning = false;
        this.stepMode = false;
        this.simulationStep = 0;
        this.metrics.steps = 0;
        this.currentState = this.automaton.states.find(s => s.initial);
        this.inputString = document.getElementById('input-string').value;
        this.inputIndex = 0;

        document.getElementById('run-simulation').disabled = false;
        document.getElementById('step-simulation').disabled = false;

        this.stack = [];
        document.getElementById('simulation-stack').textContent = 'Stack: []';

        this.tape = this.inputString.split('');
        this.headPosition = 0;
        document.getElementById('simulation-tape').textContent = `Tape: [${this.tape.join(',')}], Head: ${this.headPosition}`;

        document.getElementById('simulation-status').textContent = 'Ready';
        document.getElementById('debug-panel').style.display = 'none';

        const log = document.getElementById('simulation-log');
        if (log) log.innerHTML = '';
        this.logSimulationEvent(`Ready in ${this.automaton.type.toUpperCase()} mode from ${this.currentState?.name || '-'}.`);
        this.updateAnalytics('Idle');
    }

    runSimulation() {
        this.resetSimulation();
        this.stepMode = false;
        this.simulationRunning = true;
        this.logSimulationEvent(`Started run with input "${this.inputString}".`);
        this.updateAnalytics('Auto');
        this.animateSimulation();
    }

    stepSimulation() {
        if (!this.simulationRunning && !this.stepMode) this.resetSimulation();
        if (this.activeAnimations.length > 0) return;

        this.stepMode = true;
        this.simulationRunning = false;
        this.metrics.steps++;
        this.updateDebugInfo();

        document.getElementById('step-simulation').disabled = true;
        document.getElementById('run-simulation').disabled = true;
        document.getElementById('simulation-status').textContent = `Step ${this.simulationStep + 1}`;
        this.logSimulationEvent(`Manual step ${this.simulationStep + 1}.`);
        this.updateAnalytics('Step');

        this.processNextInput();
    }

    processNextInput() {
        if (this.stepMode) this.simulationStep++;
        if (this.simulationRunning && !this.stepMode) this.metrics.steps++;

        this.activeAnimations = this.activeAnimations.filter(anim => anim.update(Date.now()));

        if (this.automaton.type === 'fa') this.processFiniteAutomaton();
        else if (this.automaton.type === 'pda') this.processPushdownAutomaton();
        else if (this.automaton.type === 'tm') this.processTuringMachine();
    }

    processFiniteAutomaton() {
        if (this.inputIndex >= this.inputString.length) {
            const isFinalState = this.currentState.final;
            document.getElementById('simulation-status').textContent = isFinalState ? 'Accepted ✓' : 'Rejected ✗';
            this.highlightState(this.currentState.name, isFinalState ? this.colors.final : this.colors.error, 0.4);
            this.simulationRunning = false;
            this.logSimulationEvent(isFinalState ? 'Input accepted.' : 'Input rejected at final check.', isFinalState ? 'accept' : 'reject');
            this.updateAnalytics(isFinalState ? 'Accepted' : 'Rejected');
            document.getElementById('step-simulation').disabled = false;
            document.getElementById('run-simulation').disabled = false;
            return;
        }

        const currentInput = this.inputString[this.inputIndex];
        document.getElementById('simulation-status').textContent = `Processing "${currentInput}" (${this.inputIndex + 1}/${this.inputString.length})`;

        const transition = this.automaton.transitions.find(t => t.from === this.currentState.name && t.input === currentInput);

        if (!transition) {
            document.getElementById('simulation-status').textContent = `Rejected: No transition for "${currentInput}"`;
            this.highlightState(this.currentState.name, this.colors.error, 0.4);
            this.simulationRunning = false;
            this.logSimulationEvent(`No transition for ${currentInput} from ${this.currentState.name}.`, 'reject');
            this.updateAnalytics('Rejected');
            document.getElementById('step-simulation').disabled = false;
            document.getElementById('run-simulation').disabled = false;
            return;
        }

        const transObj = this.transitionObjects.find(t => t.from === transition.from && t.to === transition.to && t.input === transition.input);

        if (transObj) {
            this.highlightTransition(transObj);
            const fromStateObj = this.stateObjects[transition.from];
            const packet = this.createDataPacket(fromStateObj.position.clone(), currentInput);

            this.animateDataPacket(packet, transObj.points, this.animationSpeed, () => {
                const nextState = this.automaton.states.find(s => s.name === transition.to);
                this.currentState = nextState;
                this.highlightState(nextState.name, this.colors.current, 0.35);

                this.scene.remove(packet.group);
                if (packet.trail) {
                    this.scene.remove(packet.trail);
                    const idx = this.particleSystems.indexOf(packet.trail);
                    if (idx > -1) this.particleSystems.splice(idx, 1);
                }
                this.dataPackets = this.dataPackets.filter(p => p !== packet);

                this.inputIndex++;
                this.metrics.consumed = this.inputIndex;
                this.logSimulationEvent(`Read ${currentInput}: ${transition.from} → ${transition.to}.`);
                this.updateAnalytics(this.stepMode ? 'Step' : 'Auto');

                if (this.simulationRunning && !this.stepMode) {
                    setTimeout(() => this.processNextInput(), 200);
                }
            });
        }
    }

    processPushdownAutomaton() {
        if (this.inputIndex >= this.inputString.length) {
            const isFinalState = this.currentState.final;
            document.getElementById('simulation-status').textContent = isFinalState ? 'Accepted ✓' : 'Rejected ✗';
            this.highlightState(this.currentState.name, isFinalState ? this.colors.final : this.colors.error, 0.4);
            this.simulationRunning = false;
            this.logSimulationEvent(isFinalState ? 'PDA accepted input.' : 'PDA rejected input.', isFinalState ? 'accept' : 'reject');
            this.updateAnalytics(isFinalState ? 'Accepted' : 'Rejected');
            document.getElementById('step-simulation').disabled = false;
            document.getElementById('run-simulation').disabled = false;
            return;
        }

        const currentInput = this.inputString[this.inputIndex];
        document.getElementById('simulation-status').textContent = `Processing "${currentInput}"`;

        let validTransitions = [];
        let epsilonTransitions = [];

        this.automaton.transitions.forEach(transition => {
            if (transition.from !== this.currentState.name) return;
            const parts = transition.input.split(',');
            if (parts.length !== 2) return;
            const [inputSymbol, stackOp] = parts;
            const [popSymbol, pushSymbol] = stackOp.split('→');

            if (inputSymbol === 'ε') {
                if (popSymbol === 'ε' || (this.stack.length > 0 && this.stack[this.stack.length - 1] === popSymbol)) {
                    epsilonTransitions.push({ transition, popSymbol: popSymbol === 'ε' ? '' : popSymbol, pushSymbol: pushSymbol === 'ε' ? '' : pushSymbol });
                }
            } else if (inputSymbol === currentInput) {
                if (popSymbol === 'ε' || (this.stack.length > 0 && this.stack[this.stack.length - 1] === popSymbol)) {
                    validTransitions.push({ transition, popSymbol: popSymbol === 'ε' ? '' : popSymbol, pushSymbol: pushSymbol === 'ε' ? '' : pushSymbol });
                }
            }
        });

        const chosenTransition = validTransitions.length > 0 ? validTransitions[0] : epsilonTransitions.length > 0 ? epsilonTransitions[0] : null;

        if (!chosenTransition) {
            document.getElementById('simulation-status').textContent = 'Rejected: No valid transition';
            this.highlightState(this.currentState.name, this.colors.error, 0.4);
            this.simulationRunning = false;
            this.logSimulationEvent('No valid PDA transition.', 'reject');
            this.updateAnalytics('Rejected');
            document.getElementById('step-simulation').disabled = false;
            document.getElementById('run-simulation').disabled = false;
            return;
        }

        const transObj = this.transitionObjects.find(t => t.from === chosenTransition.transition.from && t.to === chosenTransition.transition.to && t.input === chosenTransition.transition.input);

        if (transObj) {
            this.highlightTransition(transObj);
            const fromStateObj = this.stateObjects[chosenTransition.transition.from];
            const displaySymbol = chosenTransition.transition.input.split(',')[0] === 'ε' ? 'ε' : currentInput;
            const packet = this.createDataPacket(fromStateObj.position.clone(), displaySymbol);

            this.animateDataPacket(packet, transObj.points, this.animationSpeed, () => {
                if (chosenTransition.popSymbol && this.stack.length > 0) this.stack.pop();
                if (chosenTransition.pushSymbol) this.stack.push(chosenTransition.pushSymbol);
                document.getElementById('simulation-stack').textContent = `Stack: [${this.stack.join(',')}]`;

                const inputConsumed = chosenTransition.transition.input.split(',')[0] !== 'ε';
                const nextState = this.automaton.states.find(s => s.name === chosenTransition.transition.to);
                this.currentState = nextState;
                this.highlightState(nextState.name, this.colors.current, 0.35);

                this.scene.remove(packet.group);
                if (packet.trail) {
                    this.scene.remove(packet.trail);
                    const idx = this.particleSystems.indexOf(packet.trail);
                    if (idx > -1) this.particleSystems.splice(idx, 1);
                }
                this.dataPackets = this.dataPackets.filter(p => p !== packet);

                if (inputConsumed) this.inputIndex++;
                this.metrics.consumed = this.inputIndex;
                this.logSimulationEvent(`PDA ${chosenTransition.transition.from} → ${chosenTransition.transition.to} using ${chosenTransition.transition.input}.`);
                this.updateAnalytics(this.stepMode ? 'Step' : 'Auto');

                if (this.simulationRunning && !this.stepMode) {
                    setTimeout(() => this.processNextInput(), 200);
                }
            });
        }
    }

    processTuringMachine() {
        if (this.currentState.final) {
            document.getElementById('simulation-status').textContent = 'Accepted ✓';
            this.highlightState(this.currentState.name, this.colors.final, 0.4);
            this.simulationRunning = false;
            this.logSimulationEvent('TM accepted and halted.', 'accept');
            this.updateAnalytics('Accepted');
            document.getElementById('step-simulation').disabled = false;
            document.getElementById('run-simulation').disabled = false;
            return;
        }

        const currentSymbol = this.headPosition < this.tape.length ? this.tape[this.headPosition] : '_';
        document.getElementById('simulation-status').textContent = `Processing "${currentSymbol}" at position ${this.headPosition}`;

        const transition = this.automaton.transitions.find(t => t.from === this.currentState.name && t.input.startsWith(`${currentSymbol}→`));

        if (!transition) {
            document.getElementById('simulation-status').textContent = `Halted: No transition for "${currentSymbol}"`;
            this.highlightState(this.currentState.name, this.colors.error, 0.4);
            this.simulationRunning = false;
            this.logSimulationEvent(`TM halted: no transition for ${currentSymbol}.`, 'reject');
            this.updateAnalytics('Halted');
            document.getElementById('step-simulation').disabled = false;
            document.getElementById('run-simulation').disabled = false;
            return;
        }

        const transObj = this.transitionObjects.find(t => t.from === transition.from && t.to === transition.to && t.input === transition.input);

        if (transObj) {
            this.highlightTransition(transObj);
            const fromStateObj = this.stateObjects[transition.from];
            const packet = this.createDataPacket(fromStateObj.position.clone(), currentSymbol);
            const [readWrite, direction] = transition.input.split(',');
            const [, writeSymbol] = readWrite.split('→');

            this.animateDataPacket(packet, transObj.points, this.animationSpeed, () => {
                if (this.headPosition >= this.tape.length) this.tape.push(writeSymbol);
                else this.tape[this.headPosition] = writeSymbol;

                if (direction === 'R') this.headPosition++;
                else if (direction === 'L') this.headPosition = Math.max(0, this.headPosition - 1);

                document.getElementById('simulation-tape').textContent = `Tape: [${this.tape.join(',')}], Head: ${this.headPosition}`;
                this.metrics.consumed = Math.max(this.metrics.consumed, this.headPosition);
                this.logSimulationEvent(`TM ${transition.from} → ${transition.to} wrote ${writeSymbol}, moved ${direction}.`);
                this.updateAnalytics(this.stepMode ? 'Step' : 'Auto');

                const nextState = this.automaton.states.find(s => s.name === transition.to);
                this.currentState = nextState;
                this.highlightState(nextState.name, this.colors.current, 0.35);

                this.scene.remove(packet.group);
                if (packet.trail) {
                    this.scene.remove(packet.trail);
                    const idx = this.particleSystems.indexOf(packet.trail);
                    if (idx > -1) this.particleSystems.splice(idx, 1);
                }
                this.dataPackets = this.dataPackets.filter(p => p !== packet);

                if (this.simulationRunning && !this.stepMode) {
                    setTimeout(() => this.processNextInput(), 200);
                }
            });
        }
    }

    animateSimulation() {
        if (this.simulationRunning) this.processNextInput();
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const elapsedTime = this.clock.getElapsedTime();

        this.updateCameraPosition();

        const time = Date.now();
        for (let i = this.activeAnimations.length - 1; i >= 0; i--) {
            if (!this.activeAnimations[i].update(time)) {
                this.activeAnimations.splice(i, 1);
            }
        }

        // Subtle glow animation
        if (this.stateObjects) {
            Object.values(this.stateObjects).forEach(stateObj => {
                if (stateObj.glowSphere) {
                    const scale = 1.0 + 0.03 * Math.sin(elapsedTime * 1.5);
                    stateObj.glowSphere.scale.setScalar(scale);
                }
            });
        }

        this.composer.render();
    }

    createDebugPanel() {
        const debugPanel = document.createElement('div');
        debugPanel.id = 'debug-panel';
        debugPanel.style.cssText = `
            position: fixed; right: 20px; top: 20px; width: 280px;
            background: rgba(15, 15, 25, 0.95); color: #ccc;
            padding: 16px; border-radius: 10px; font-family: monospace;
            font-size: 12px; display: none; border: 1px solid rgba(100, 120, 180, 0.2);
            backdrop-filter: blur(10px);
        `;
        debugPanel.innerHTML = `
            <div style="color: #7a9fff; font-weight: bold; margin-bottom: 10px;">Debug Info</div>
            <div id="debug-current-state">State: -</div>
            <div id="debug-input">Input: -</div>
            <div id="debug-position">Position: -</div>
            <div id="debug-transitions" style="margin-top: 8px;">Transitions: -</div>
            <div id="debug-stack">Stack: -</div>
            <div id="debug-tape">Tape: -</div>
        `;
        document.body.appendChild(debugPanel);
    }

    updateDebugInfo() {
        const debugPanel = document.getElementById('debug-panel');
        debugPanel.style.display = this.stepMode ? 'block' : 'none';
        if (!this.stepMode) return;

        document.getElementById('debug-current-state').textContent = `State: ${this.currentState?.name || '-'}`;
        document.getElementById('debug-input').textContent = `Input: "${this.inputString}"`;
        document.getElementById('debug-position').textContent = `Position: ${this.inputIndex + 1}/${this.inputString.length}`;

        const transitions = this.automaton.transitions
            .filter(t => t.from === this.currentState?.name)
            .map(t => `${t.input} → ${t.to}`)
            .join(', ');
        document.getElementById('debug-transitions').innerHTML = `Transitions: <span style="color: #8899ff;">${transitions || 'None'}</span>`;

        if (this.automaton.type === 'pda') {
            document.getElementById('debug-stack').textContent = `Stack: [${this.stack.join(',')}]`;
            document.getElementById('debug-stack').style.display = 'block';
            document.getElementById('debug-tape').style.display = 'none';
        } else if (this.automaton.type === 'tm') {
            document.getElementById('debug-tape').textContent = `Tape: [${this.tape.join(',')}] @${this.headPosition}`;
            document.getElementById('debug-tape').style.display = 'block';
            document.getElementById('debug-stack').style.display = 'none';
        } else {
            document.getElementById('debug-stack').style.display = 'none';
            document.getElementById('debug-tape').style.display = 'none';
        }
    }
}

window.addEventListener('load', () => {
    try {
        new AutomataSimulator();
    } catch (error) {
        console.error("Failed to initialize:", error);
        document.getElementById('loading-overlay').style.display = 'none';
    }
});
