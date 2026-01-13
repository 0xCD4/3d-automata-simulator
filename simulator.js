// Realistic 3D Automata Simulator with Advanced Graphics
class AutomataSimulator {
    constructor() {
        // Set up error handling
        window.onerror = (message, source, lineno, colno, error) => {
            console.error("Error occurred:", message, "at", source, "line", lineno);
            this.hideLoadingOverlay();
            alert(`An error occurred: ${message}. See console for details.`);
            return true;
        };

        // Initialize step mode flag
        this.stepMode = false;

        // Create debug panel
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
            alert(`Initialization error: ${error.message}. See console for details.`);
        }

        // Set animation speed from slider
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

    // Easing functions for smooth animations
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    easeOutElastic(t) {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }

    easeOutBack(t) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    }

    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }

    setupThreeJS() {
        // Create scene with fog for depth
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x050510);
        this.scene.fog = new THREE.FogExp2(0x050510, 0.02);

        // Create camera
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 8, 18);
        this.camera.lookAt(0, 0, 0);

        // Create renderer with advanced settings
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;

        // Enable shadows
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        document.getElementById('canvas-container').appendChild(this.renderer.domElement);

        // Create environment map for reflections
        this.createEnvironmentMap();

        // Add lighting
        this.setupLighting();

        // Add starfield background
        this.createStarfield();

        // Add ground plane with reflections
        this.createGroundPlane();

        // Add animated grid
        this.createAnimatedGrid();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());

        // Setup camera controls with damping
        this.setupCameraControls();

        // For animations
        this.clock = new THREE.Clock();
        this.dataPackets = [];
        this.activeAnimations = [];
        this.particleSystems = [];

        // Target camera values for smooth interpolation
        this.targetCameraRotation = { x: 0.3, y: 0 };
        this.currentCameraRotation = { x: 0.3, y: 0 };
        this.targetCameraDistance = 18;
        this.currentCameraDistance = 18;
    }

    createEnvironmentMap() {
        // Create a simple procedural environment map for reflections
        const size = 128;
        const data = new Uint8Array(size * size * 4 * 6);

        // Fill with gradient colors for each face
        const colors = [
            [0.1, 0.1, 0.3], // +x
            [0.1, 0.1, 0.3], // -x
            [0.2, 0.2, 0.4], // +y (top - brighter)
            [0.05, 0.05, 0.1], // -y (bottom - darker)
            [0.1, 0.1, 0.3], // +z
            [0.1, 0.1, 0.3]  // -z
        ];

        for (let face = 0; face < 6; face++) {
            const offset = face * size * size * 4;
            for (let i = 0; i < size * size; i++) {
                const idx = offset + i * 4;
                data[idx] = Math.floor(colors[face][0] * 255);
                data[idx + 1] = Math.floor(colors[face][1] * 255);
                data[idx + 2] = Math.floor(colors[face][2] * 255);
                data[idx + 3] = 255;
            }
        }

        const texture = new THREE.DataTexture(data, size, size);
        texture.needsUpdate = true;

        // Store for use with materials
        this.envMapIntensity = 0.5;
    }

    setupLighting() {
        // Ambient light - subtle fill
        const ambientLight = new THREE.AmbientLight(0x1a1a2e, 0.4);
        this.scene.add(ambientLight);

        // Main directional light with shadows
        this.mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
        this.mainLight.position.set(10, 20, 10);
        this.mainLight.castShadow = true;
        this.mainLight.shadow.mapSize.width = 2048;
        this.mainLight.shadow.mapSize.height = 2048;
        this.mainLight.shadow.camera.near = 0.5;
        this.mainLight.shadow.camera.far = 50;
        this.mainLight.shadow.camera.left = -20;
        this.mainLight.shadow.camera.right = 20;
        this.mainLight.shadow.camera.top = 20;
        this.mainLight.shadow.camera.bottom = -20;
        this.mainLight.shadow.bias = -0.0001;
        this.mainLight.shadow.radius = 4;
        this.scene.add(this.mainLight);

        // Secondary directional light (fill)
        const fillLight = new THREE.DirectionalLight(0x4466aa, 0.3);
        fillLight.position.set(-10, 5, -10);
        this.scene.add(fillLight);

        // Rim light for dramatic effect
        const rimLight = new THREE.DirectionalLight(0x6644ff, 0.4);
        rimLight.position.set(0, -5, -15);
        this.scene.add(rimLight);

        // Central point light (animated)
        this.centralLight = new THREE.PointLight(0x4c6ef5, 1.5, 25);
        this.centralLight.position.set(0, 3, 0);
        this.centralLight.castShadow = true;
        this.centralLight.shadow.mapSize.width = 512;
        this.centralLight.shadow.mapSize.height = 512;
        this.scene.add(this.centralLight);

        // Accent point lights
        const accentLight1 = new THREE.PointLight(0xff6b6b, 0.8, 15);
        accentLight1.position.set(-8, 2, 0);
        this.scene.add(accentLight1);

        const accentLight2 = new THREE.PointLight(0x4ecdc4, 0.8, 15);
        accentLight2.position.set(8, 2, 0);
        this.scene.add(accentLight2);

        // Store for animation
        this.accentLights = [accentLight1, accentLight2];
    }

    createStarfield() {
        const starCount = 2000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);

        for (let i = 0; i < starCount; i++) {
            // Distribute stars in a sphere
            const radius = 100 + Math.random() * 200;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);

            // Random star colors (white to blue-ish)
            const colorVal = 0.7 + Math.random() * 0.3;
            colors[i * 3] = colorVal;
            colors[i * 3 + 1] = colorVal;
            colors[i * 3 + 2] = colorVal + Math.random() * 0.2;

            sizes[i] = 0.5 + Math.random() * 1.5;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            size: 1,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true
        });

        this.starfield = new THREE.Points(geometry, material);
        this.scene.add(this.starfield);
    }

    createGroundPlane() {
        // Create reflective ground plane
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x0a0a15,
            metalness: 0.9,
            roughness: 0.3,
            transparent: true,
            opacity: 0.8
        });

        this.groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
        this.groundPlane.rotation.x = -Math.PI / 2;
        this.groundPlane.position.y = -0.5;
        this.groundPlane.receiveShadow = true;
        this.scene.add(this.groundPlane);
    }

    createAnimatedGrid() {
        // Create custom animated grid with glowing lines
        const gridSize = 30;
        const divisions = 30;
        const gridGeometry = new THREE.BufferGeometry();
        const gridPositions = [];

        const step = gridSize / divisions;
        const halfSize = gridSize / 2;

        // Create grid lines
        for (let i = 0; i <= divisions; i++) {
            const pos = -halfSize + i * step;
            // X-axis lines
            gridPositions.push(-halfSize, 0, pos, halfSize, 0, pos);
            // Z-axis lines
            gridPositions.push(pos, 0, -halfSize, pos, 0, halfSize);
        }

        gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridPositions, 3));

        const gridMaterial = new THREE.LineBasicMaterial({
            color: 0x2233aa,
            transparent: true,
            opacity: 0.3
        });

        this.grid = new THREE.LineSegments(gridGeometry, gridMaterial);
        this.grid.position.y = -0.49;
        this.scene.add(this.grid);

        // Add glowing center cross
        const crossGeometry = new THREE.BufferGeometry();
        crossGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
            -halfSize, 0, 0, halfSize, 0, 0,
            0, 0, -halfSize, 0, 0, halfSize
        ], 3));

        const crossMaterial = new THREE.LineBasicMaterial({
            color: 0x4466ff,
            transparent: true,
            opacity: 0.6
        });

        this.gridCross = new THREE.LineSegments(crossGeometry, crossMaterial);
        this.gridCross.position.y = -0.48;
        this.scene.add(this.gridCross);
    }

    setupPostProcessing() {
        // Create effect composer
        this.composer = new THREE.EffectComposer(this.renderer);

        // Render pass
        const renderPass = new THREE.RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        // Bloom pass for glow effects
        const bloomPass = new THREE.UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.8,  // strength
            0.4,  // radius
            0.85  // threshold
        );
        this.composer.addPass(bloomPass);
        this.bloomPass = bloomPass;

        // FXAA anti-aliasing
        const fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
        fxaaPass.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
        this.composer.addPass(fxaaPass);
        this.fxaaPass = fxaaPass;
    }

    setupCameraControls() {
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.cameraDamping = 0.08;

        this.renderer.domElement.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        this.renderer.domElement.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        this.renderer.domElement.addEventListener('mouseleave', () => {
            this.isDragging = false;
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const deltaMove = {
                    x: e.clientX - this.previousMousePosition.x,
                    y: e.clientY - this.previousMousePosition.y
                };

                this.targetCameraRotation.x += deltaMove.y * 0.005;
                this.targetCameraRotation.y += deltaMove.x * 0.005;

                // Limit vertical rotation
                this.targetCameraRotation.x = Math.max(-0.5, Math.min(Math.PI / 2.5, this.targetCameraRotation.x));
            }

            this.previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        // Zoom with mouse wheel
        this.renderer.domElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.targetCameraDistance += e.deltaY * 0.02;
            this.targetCameraDistance = Math.max(8, Math.min(40, this.targetCameraDistance));
        });
    }

    updateCameraPosition() {
        // Smooth interpolation for camera movement
        this.currentCameraRotation.x += (this.targetCameraRotation.x - this.currentCameraRotation.x) * this.cameraDamping;
        this.currentCameraRotation.y += (this.targetCameraRotation.y - this.currentCameraRotation.y) * this.cameraDamping;
        this.currentCameraDistance += (this.targetCameraDistance - this.currentCameraDistance) * this.cameraDamping;

        const x = this.currentCameraDistance * Math.sin(this.currentCameraRotation.y) * Math.cos(this.currentCameraRotation.x);
        const y = this.currentCameraDistance * Math.sin(this.currentCameraRotation.x);
        const z = this.currentCameraDistance * Math.cos(this.currentCameraRotation.y) * Math.cos(this.currentCameraRotation.x);

        this.camera.position.set(x, Math.max(y, 2), z);
        this.camera.lookAt(0, 0, 0);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);

        // Update FXAA resolution
        if (this.fxaaPass) {
            this.fxaaPass.uniforms['resolution'].value.set(1 / window.innerWidth, 1 / window.innerHeight);
        }
    }

    setupControls() {
        // Toggle controls visibility
        document.getElementById('toggle-controls').addEventListener('click', () => {
            const controlsPanel = document.getElementById('controls');
            const toggleButton = document.getElementById('controls-toggle');

            controlsPanel.classList.toggle('hidden');

            if (controlsPanel.classList.contains('hidden')) {
                toggleButton.style.display = 'block';
            } else {
                toggleButton.style.display = 'none';
            }
        });

        // Show controls button
        document.getElementById('controls-toggle').addEventListener('click', () => {
            const controlsPanel = document.getElementById('controls');
            const toggleButton = document.getElementById('controls-toggle');

            controlsPanel.classList.remove('hidden');
            toggleButton.style.display = 'none';
        });

        // Create automaton button
        document.getElementById('create-automaton').addEventListener('click', () => {
            this.createCustomAutomaton();
        });

        // Add state button
        document.querySelector('.add-state').addEventListener('click', () => {
            this.addStateInput();
        });

        // Add transition button
        document.querySelector('.add-transition').addEventListener('click', () => {
            this.addTransitionInput();
        });

        // Simulation controls
        document.getElementById('run-simulation').addEventListener('click', () => {
            this.runSimulation();
        });

        document.getElementById('step-simulation').addEventListener('click', () => {
            this.stepSimulation();
        });

        document.getElementById('reset-simulation').addEventListener('click', () => {
            this.resetSimulation();
        });

        // Automaton type change
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

                if (this.tutorialStep === 1) {
                    document.querySelector('.prev-step').style.visibility = 'hidden';
                }

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
                try {
                    const exampleType = element.getAttribute('data-example');
                    this.loadExampleAutomaton(exampleType);
                    document.getElementById('examples-panel').style.display = 'none';
                } catch (error) {
                    console.error("Error loading example:", error);
                    alert(`Error loading example: ${error.message}`);
                }
            });
        });
    }

    loadExampleAutomaton(exampleType) {
        switch(exampleType) {
            case 'ends-with-a':
                this.loadFiniteAutomaton(
                    [
                        { name: 'q0', initial: true, final: false },
                        { name: 'q1', initial: false, final: true }
                    ],
                    [
                        { from: 'q0', to: 'q0', input: 'b' },
                        { from: 'q0', to: 'q1', input: 'a' },
                        { from: 'q1', to: 'q0', input: 'b' },
                        { from: 'q1', to: 'q1', input: 'a' }
                    ],
                    'aabba'
                );
                break;

            case 'even-a':
                this.loadFiniteAutomaton(
                    [
                        { name: 'even', initial: true, final: true },
                        { name: 'odd', initial: false, final: false }
                    ],
                    [
                        { from: 'even', to: 'odd', input: 'a' },
                        { from: 'even', to: 'even', input: 'b' },
                        { from: 'odd', to: 'even', input: 'a' },
                        { from: 'odd', to: 'odd', input: 'b' }
                    ],
                    'aabab'
                );
                break;

            case 'starts-with-ab':
                this.loadFiniteAutomaton(
                    [
                        { name: 'q0', initial: true, final: false },
                        { name: 'q1', initial: false, final: false },
                        { name: 'q2', initial: false, final: true },
                        { name: 'q3', initial: false, final: false }
                    ],
                    [
                        { from: 'q0', to: 'q1', input: 'a' },
                        { from: 'q0', to: 'q3', input: 'b' },
                        { from: 'q1', to: 'q2', input: 'b' },
                        { from: 'q1', to: 'q3', input: 'a' },
                        { from: 'q2', to: 'q2', input: 'a' },
                        { from: 'q2', to: 'q2', input: 'b' },
                        { from: 'q3', to: 'q3', input: 'a' },
                        { from: 'q3', to: 'q3', input: 'b' }
                    ],
                    'abaa'
                );
                break;

            case 'palindrome':
                this.loadPushdownAutomaton(
                    [
                        { name: 'q0', initial: true, final: false },
                        { name: 'q1', initial: false, final: false },
                        { name: 'q2', initial: false, final: true }
                    ],
                    [
                        { from: 'q0', to: 'q0', input: 'a,ε→a' },
                        { from: 'q0', to: 'q0', input: 'b,ε→b' },
                        { from: 'q0', to: 'q1', input: 'ε,ε→ε' },
                        { from: 'q1', to: 'q1', input: 'a,a→ε' },
                        { from: 'q1', to: 'q1', input: 'b,b→ε' },
                        { from: 'q1', to: 'q2', input: 'ε,ε→ε' }
                    ],
                    'abba'
                );
                break;

            case 'anbn':
                this.loadPushdownAutomaton(
                    [
                        { name: 'q0', initial: true, final: false },
                        { name: 'q1', initial: false, final: false },
                        { name: 'q2', initial: false, final: true }
                    ],
                    [
                        { from: 'q0', to: 'q1', input: 'a,ε→X' },
                        { from: 'q1', to: 'q1', input: 'a,ε→X' },
                        { from: 'q1', to: 'q2', input: 'b,X→ε' },
                        { from: 'q2', to: 'q2', input: 'b,X→ε' }
                    ],
                    'aaabbb'
                );
                break;

            case 'tm-binary-add':
                this.loadTuringMachine(
                    [
                        { name: 'q0', initial: true, final: false },
                        { name: 'q1', initial: false, final: false },
                        { name: 'q2', initial: false, final: true }
                    ],
                    [
                        { from: 'q0', to: 'q0', input: '1→1,R' },
                        { from: 'q0', to: 'q0', input: '0→0,R' },
                        { from: 'q0', to: 'q1', input: '_→_,L' },
                        { from: 'q1', to: 'q1', input: '1→0,L' },
                        { from: 'q1', to: 'q2', input: '0→1,R' },
                        { from: 'q1', to: 'q2', input: '_→1,R' }
                    ],
                    '1011'
                );
                break;
        }
    }

    loadFiniteAutomaton(states, transitions, inputString) {
        document.getElementById('automaton-type').value = 'fa';
        const event = new Event('change');
        document.getElementById('automaton-type').dispatchEvent(event);
        this.updateControlsWithAutomaton(states, transitions, inputString);
        this.createCustomAutomaton();
    }

    loadPushdownAutomaton(states, transitions, inputString) {
        document.getElementById('automaton-type').value = 'pda';
        const event = new Event('change');
        document.getElementById('automaton-type').dispatchEvent(event);
        this.updateControlsWithAutomaton(states, transitions, inputString);
        this.createCustomAutomaton();
    }

    loadTuringMachine(states, transitions, inputString) {
        document.getElementById('automaton-type').value = 'tm';
        const event = new Event('change');
        document.getElementById('automaton-type').dispatchEvent(event);
        this.updateControlsWithAutomaton(states, transitions, inputString);
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
                stateDiv.querySelector('.add-state').addEventListener('click', () => {
                    this.addStateInput();
                });
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
            inputSymbol.placeholder = 'Input';
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
                button.addEventListener('click', () => {
                    this.addTransitionInput();
                });
            } else {
                button.addEventListener('click', () => {
                    transitionDiv.remove();
                });
            }
        });

        this.updateStateSelectors();

        const fromSelectors = document.querySelectorAll('.from-state');
        const toSelectors = document.querySelectorAll('.to-state');

        transitions.forEach((transition, index) => {
            if (index < fromSelectors.length) {
                fromSelectors[index].value = transition.from;
            }
            if (index < toSelectors.length) {
                toSelectors[index].value = transition.to;
            }
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
        inputSymbol.placeholder = 'Input';
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

        removeButton.addEventListener('click', () => {
            transitionDiv.remove();
        });

        this.updateStateSelectors();
    }

    updateStateSelectors() {
        const stateInputs = document.querySelectorAll('.state input[type="text"]');
        const stateNames = Array.from(stateInputs).map(input => input.value);

        const fromStateSelectors = document.querySelectorAll('.from-state');
        const toStateSelectors = document.querySelectorAll('.to-state');

        [...fromStateSelectors, ...toStateSelectors].forEach(selector => {
            const currentValue = selector.value;
            selector.innerHTML = '';

            stateNames.forEach(stateName => {
                const option = document.createElement('option');
                option.value = stateName;
                option.textContent = stateName;
                selector.appendChild(option);
            });

            if (stateNames.includes(currentValue)) {
                selector.value = currentValue;
            }
        });
    }

    createDefaultAutomaton() {
        this.automaton = {
            type: 'fa',
            states: [
                { name: 'q0', initial: true, final: false, position: new THREE.Vector3(-5, 0, 0) },
                { name: 'q1', initial: false, final: true, position: new THREE.Vector3(5, 0, 0) }
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
        try {
            this.clearScene();
            this.addSceneElements();

            const automatonType = document.getElementById('automaton-type').value;

            const stateElements = document.querySelectorAll('.state');
            const states = Array.from(stateElements).map((element, index) => {
                const name = element.querySelector('input[type="text"]').value;
                const initial = element.querySelectorAll('input[type="checkbox"]')[0].checked;
                const final = element.querySelectorAll('input[type="checkbox"]')[1].checked;

                const angle = (index / stateElements.length) * Math.PI * 2;
                const radius = 5;
                const x = radius * Math.cos(angle);
                const z = radius * Math.sin(angle);

                return {
                    name,
                    initial,
                    final,
                    position: new THREE.Vector3(x, 0, z)
                };
            });

            const transitionElements = document.querySelectorAll('.transition');
            const transitions = Array.from(transitionElements).map(element => {
                return {
                    from: element.querySelector('.from-state').value,
                    to: element.querySelector('.to-state').value,
                    input: element.querySelector('.input-symbol').value
                };
            });

            this.automaton = {
                type: automatonType,
                states,
                transitions
            };

            this.visualizeAutomaton();
            this.resetSimulation();
        } catch (error) {
            console.error("Error creating automaton:", error);
            alert(`Error creating automaton: ${error.message}`);
        }
    }

    clearScene() {
        // Remove only automaton objects, keep environment
        const objectsToRemove = [];
        this.scene.traverse((child) => {
            if (child.userData.isAutomatonObject) {
                objectsToRemove.push(child);
            }
        });

        objectsToRemove.forEach(obj => {
            this.scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });

        // Clear particle systems
        this.particleSystems.forEach(ps => {
            this.scene.remove(ps);
            if (ps.geometry) ps.geometry.dispose();
            if (ps.material) ps.material.dispose();
        });
        this.particleSystems = [];

        this.dataPackets = [];
        this.activeAnimations = [];
    }

    addSceneElements() {
        // Scene elements are preserved, no need to re-add
    }

    createTextSprite(text, color) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 128;

        // Add subtle glow effect
        context.shadowColor = color || '#ffffff';
        context.shadowBlur = 10;

        context.font = 'bold 48px Arial';
        context.fillStyle = color || '#ffffff';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });

        const sprite = new THREE.Sprite(material);
        sprite.userData.isAutomatonObject = true;
        return sprite;
    }

    // Create realistic PBR state sphere
    createStateSphere(state) {
        const group = new THREE.Group();
        group.userData.isAutomatonObject = true;

        // Determine colors based on state type
        let baseColor, emissiveColor, emissiveIntensity;
        if (state.final) {
            baseColor = 0x00ff88;
            emissiveColor = 0x00ff88;
            emissiveIntensity = 0.3;
        } else if (state.initial) {
            baseColor = 0x4488ff;
            emissiveColor = 0x4488ff;
            emissiveIntensity = 0.3;
        } else {
            baseColor = 0xccccdd;
            emissiveColor = 0x666688;
            emissiveIntensity = 0.1;
        }

        // Main sphere with PBR material
        const geometry = new THREE.SphereGeometry(0.8, 64, 64);
        const material = new THREE.MeshStandardMaterial({
            color: baseColor,
            metalness: 0.7,
            roughness: 0.2,
            emissive: emissiveColor,
            emissiveIntensity: emissiveIntensity
        });

        const sphere = new THREE.Mesh(geometry, material);
        sphere.castShadow = true;
        sphere.receiveShadow = true;
        group.add(sphere);

        // Inner glow sphere
        const glowGeometry = new THREE.SphereGeometry(0.85, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: baseColor,
            transparent: true,
            opacity: 0.15,
            side: THREE.BackSide
        });
        const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
        group.add(glowSphere);

        // Outer glow for bloom effect
        const outerGlowGeometry = new THREE.SphereGeometry(1.1, 32, 32);
        const outerGlowMaterial = new THREE.MeshBasicMaterial({
            color: baseColor,
            transparent: true,
            opacity: 0.08,
            side: THREE.BackSide
        });
        const outerGlowSphere = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
        group.add(outerGlowSphere);

        // Add ring for final states
        if (state.final) {
            const ringGeometry = new THREE.TorusGeometry(1.15, 0.06, 16, 64);
            const ringMaterial = new THREE.MeshStandardMaterial({
                color: 0x00ff88,
                metalness: 0.9,
                roughness: 0.1,
                emissive: 0x00ff88,
                emissiveIntensity: 0.5
            });
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.rotation.x = Math.PI / 2;
            ring.castShadow = true;
            group.add(ring);
        }

        // Add arrow indicator for initial state
        if (state.initial) {
            const arrowGroup = new THREE.Group();

            // Arrow shaft
            const shaftGeometry = new THREE.CylinderGeometry(0.08, 0.08, 1.5, 16);
            const shaftMaterial = new THREE.MeshStandardMaterial({
                color: 0x4488ff,
                metalness: 0.8,
                roughness: 0.2,
                emissive: 0x4488ff,
                emissiveIntensity: 0.3
            });
            const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
            shaft.rotation.z = Math.PI / 2;
            shaft.position.x = -2;
            arrowGroup.add(shaft);

            // Arrow head
            const headGeometry = new THREE.ConeGeometry(0.2, 0.4, 16);
            const headMaterial = new THREE.MeshStandardMaterial({
                color: 0x4488ff,
                metalness: 0.8,
                roughness: 0.2,
                emissive: 0x4488ff,
                emissiveIntensity: 0.3
            });
            const head = new THREE.Mesh(headGeometry, headMaterial);
            head.rotation.z = -Math.PI / 2;
            head.position.x = -1.1;
            arrowGroup.add(head);

            group.add(arrowGroup);
        }

        group.position.copy(state.position);

        return {
            group,
            sphere,
            glowSphere,
            outerGlowSphere,
            baseColor,
            emissiveColor
        };
    }

    // Create curved transition with Bezier curves
    createTransitionCurve(fromPos, toPos, isSelfLoop = false) {
        if (isSelfLoop) {
            // Create a nice loop above the state
            const loopRadius = 1.0;
            const loopHeight = 1.5;
            const points = [];

            for (let i = 0; i <= 40; i++) {
                const t = i / 40;
                const angle = Math.PI + t * Math.PI * 1.5;
                const x = fromPos.x + loopRadius * Math.cos(angle);
                const y = fromPos.y + loopHeight + 0.5 * Math.sin(t * Math.PI);
                const z = fromPos.z + loopRadius * Math.sin(angle);
                points.push(new THREE.Vector3(x, y, z));
            }

            return points;
        }

        // Create curved path between states
        const midPoint = new THREE.Vector3().addVectors(fromPos, toPos).multiplyScalar(0.5);
        const direction = new THREE.Vector3().subVectors(toPos, fromPos);
        const distance = direction.length();

        // Calculate perpendicular offset for curve
        const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
        const curveHeight = distance * 0.15;

        // Control point for quadratic bezier
        const controlPoint = midPoint.clone();
        controlPoint.y += curveHeight;
        controlPoint.add(perpendicular.multiplyScalar(curveHeight * 0.3));

        // Generate curve points
        const curve = new THREE.QuadraticBezierCurve3(fromPos, controlPoint, toPos);
        const points = curve.getPoints(40);

        // Trim end to not overlap with target state
        const trimmedPoints = [];
        for (let i = 0; i < points.length; i++) {
            const distToEnd = points[i].distanceTo(toPos);
            if (distToEnd > 0.9) {
                trimmedPoints.push(points[i]);
            }
        }

        return trimmedPoints;
    }

    visualizeAutomaton() {
        try {
            this.stateObjects = {};
            this.transitionObjects = [];

            // Create states
            this.automaton.states.forEach(state => {
                const stateVisual = this.createStateSphere(state);
                this.scene.add(stateVisual.group);

                // Add state name label
                const textSprite = this.createTextSprite(state.name, '#ffffff');
                textSprite.position.set(state.position.x, state.position.y + 1.8, state.position.z);
                textSprite.scale.set(1.5, 0.75, 1);
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

                // Create tube geometry for transition
                const curve = new THREE.CatmullRomCurve3(points);
                const tubeGeometry = new THREE.TubeGeometry(curve, 64, 0.04, 8, false);
                const tubeMaterial = new THREE.MeshStandardMaterial({
                    color: 0xff8844,
                    metalness: 0.6,
                    roughness: 0.3,
                    emissive: 0xff6622,
                    emissiveIntensity: 0.2,
                    transparent: true,
                    opacity: 0.9
                });

                const tubeMesh = new THREE.Mesh(tubeGeometry, tubeMaterial);
                tubeMesh.userData.isAutomatonObject = true;
                tubeMesh.castShadow = true;
                this.scene.add(tubeMesh);

                // Add arrow head
                let arrowHead = null;
                if (points.length >= 2) {
                    const lastPoint = points[points.length - 1];
                    const secondLastPoint = points[points.length - 2];
                    const direction = new THREE.Vector3().subVectors(lastPoint, secondLastPoint).normalize();

                    const coneGeometry = new THREE.ConeGeometry(0.15, 0.35, 16);
                    const coneMaterial = new THREE.MeshStandardMaterial({
                        color: 0xff8844,
                        metalness: 0.6,
                        roughness: 0.3,
                        emissive: 0xff6622,
                        emissiveIntensity: 0.3
                    });

                    arrowHead = new THREE.Mesh(coneGeometry, coneMaterial);
                    arrowHead.userData.isAutomatonObject = true;
                    arrowHead.position.copy(lastPoint);
                    arrowHead.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
                    arrowHead.castShadow = true;
                    this.scene.add(arrowHead);
                }

                // Add transition label
                const labelPos = points[Math.floor(points.length / 2)].clone();
                labelPos.y += 0.5;

                const textSprite = this.createTextSprite(transition.input, '#ffaa66');
                textSprite.position.copy(labelPos);
                textSprite.scale.set(1.2, 0.6, 1);
                this.scene.add(textSprite);

                this.transitionObjects.push({
                    from: transition.from,
                    to: transition.to,
                    input: transition.input,
                    tube: tubeMesh,
                    arrow: arrowHead,
                    textSprite,
                    points,
                    selfTransition: isSelfLoop,
                    originalColor: 0xff8844,
                    originalEmissive: 0xff6622
                });
            });

            this.updateInfoDisplay();
        } catch (error) {
            console.error("Error visualizing automaton:", error);
            alert(`Error visualizing automaton: ${error.message}`);
        }
    }

    updateInfoDisplay() {
        const type = this.automaton.type;
        const infoElement = document.getElementById('simulation-info');

        let typeName = 'Finite Automaton';
        if (type === 'pda') typeName = 'Pushdown Automaton';
        if (type === 'tm') typeName = 'Turing Machine';

        const stateCount = this.automaton.states.length;
        const acceptingCount = this.automaton.states.filter(s => s.final).length;
        const transitionCount = this.automaton.transitions.length;

        infoElement.innerHTML = `${typeName} with ${stateCount} states (${acceptingCount} accepting) and ${transitionCount} transitions`;
    }

    resetSimulation() {
        try {
            // Remove all data packets
            for (let i = this.dataPackets.length - 1; i >= 0; i--) {
                const packet = this.dataPackets[i];
                if (packet.group && packet.group.parent) {
                    packet.group.parent.remove(packet.group);
                }
            }
            this.dataPackets = [];
            this.activeAnimations = [];

            // Clear particle systems
            this.particleSystems.forEach(ps => {
                this.scene.remove(ps);
            });
            this.particleSystems = [];

            // Reset all states to their original colors
            Object.values(this.stateObjects).forEach(stateObj => {
                const state = stateObj.state;
                let baseColor;
                if (state.final) {
                    baseColor = 0x00ff88;
                } else if (state.initial) {
                    baseColor = 0x4488ff;
                } else {
                    baseColor = 0xccccdd;
                }

                stateObj.sphere.material.color.setHex(baseColor);
                stateObj.sphere.material.emissive.setHex(baseColor);
                stateObj.sphere.material.emissiveIntensity = state.final ? 0.3 : (state.initial ? 0.3 : 0.1);
                stateObj.glowSphere.material.color.setHex(baseColor);
                stateObj.glowSphere.material.opacity = 0.15;
                stateObj.outerGlowSphere.material.color.setHex(baseColor);
                stateObj.outerGlowSphere.material.opacity = 0.08;
            });

            // Reset all transitions
            this.transitionObjects.forEach(transObj => {
                transObj.tube.material.color.setHex(transObj.originalColor);
                transObj.tube.material.emissive.setHex(transObj.originalEmissive);
                transObj.tube.material.emissiveIntensity = 0.2;
                transObj.tube.material.opacity = 0.9;
                if (transObj.arrow) {
                    transObj.arrow.material.color.setHex(transObj.originalColor);
                    transObj.arrow.material.emissive.setHex(transObj.originalEmissive);
                }
            });

            this.simulationRunning = false;
            this.stepMode = false;
            this.simulationStep = 0;
            this.currentState = this.automaton.states.find(s => s.initial);
            this.inputString = document.getElementById('input-string').value;
            this.inputIndex = 0;

            document.getElementById('run-simulation').disabled = false;
            document.getElementById('step-simulation').disabled = false;

            this.stack = [];
            document.getElementById('simulation-stack').textContent = 'Stack: []';

            this.tape = this.inputString.split('');
            this.headPosition = 0;
            document.getElementById('simulation-tape').textContent =
                `Tape: [${this.tape.join(',')}], Head: ${this.headPosition}`;

            document.getElementById('simulation-status').textContent = 'Ready';
            document.getElementById('debug-panel').style.display = 'none';
        } catch (error) {
            console.error("Error resetting simulation:", error);
        }
    }

    runSimulation() {
        try {
            this.resetSimulation();
            this.stepMode = false;
            this.simulationRunning = true;
            this.animateSimulation();
        } catch (error) {
            console.error("Error running simulation:", error);
        }
    }

    stepSimulation() {
        try {
            if (!this.simulationRunning && !this.stepMode) {
                this.resetSimulation();
            }

            if (this.activeAnimations.length > 0) {
                return;
            }

            this.stepMode = true;
            this.simulationRunning = false;

            this.updateDebugInfo();

            document.getElementById('step-simulation').disabled = true;
            document.getElementById('run-simulation').disabled = true;

            document.getElementById('simulation-status').textContent =
                `Step Mode - Processing step ${this.simulationStep + 1}`;

            this.processNextInput();
        } catch (error) {
            console.error("Error stepping simulation:", error);
            document.getElementById('step-simulation').disabled = false;
            document.getElementById('run-simulation').disabled = false;
        }
    }

    processNextInput() {
        try {
            if (this.stepMode) {
                this.simulationStep++;
            }

            this.activeAnimations = this.activeAnimations.filter(anim => {
                const time = Date.now();
                return anim.update(time);
            });

            if (this.automaton.type === 'fa') {
                this.processFiniteAutomaton();
            } else if (this.automaton.type === 'pda') {
                this.processPushdownAutomaton();
            } else if (this.automaton.type === 'tm') {
                this.processTuringMachine();
            }
        } catch (error) {
            console.error("Error processing input:", error);
            document.getElementById('simulation-status').textContent = `Error: ${error.message}`;
            this.simulationRunning = false;
            this.stepMode = false;
            document.getElementById('step-simulation').disabled = false;
            document.getElementById('run-simulation').disabled = false;
        }
    }

    // Create realistic data packet with particle trail
    createDataPacket(position, inputSymbol) {
        const group = new THREE.Group();
        group.userData.isAutomatonObject = true;

        // Core sphere
        const coreGeometry = new THREE.SphereGeometry(0.25, 32, 32);
        const coreMaterial = new THREE.MeshStandardMaterial({
            color: 0xff4444,
            metalness: 0.8,
            roughness: 0.1,
            emissive: 0xff2222,
            emissiveIntensity: 0.8
        });
        const core = new THREE.Mesh(coreGeometry, coreMaterial);
        group.add(core);

        // Inner glow
        const innerGlowGeometry = new THREE.SphereGeometry(0.35, 16, 16);
        const innerGlowMaterial = new THREE.MeshBasicMaterial({
            color: 0xff6666,
            transparent: true,
            opacity: 0.4,
            side: THREE.BackSide
        });
        const innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
        group.add(innerGlow);

        // Outer glow for bloom
        const outerGlowGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const outerGlowMaterial = new THREE.MeshBasicMaterial({
            color: 0xff4444,
            transparent: true,
            opacity: 0.2,
            side: THREE.BackSide
        });
        const outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
        group.add(outerGlow);

        // Label
        const labelSprite = this.createTextSprite(inputSymbol, '#ffffff');
        labelSprite.scale.set(0.6, 0.3, 1);
        labelSprite.position.y = 0.6;
        group.add(labelSprite);

        group.position.copy(position);
        this.scene.add(group);

        // Create particle trail system
        const trailParticles = this.createParticleTrail();
        this.scene.add(trailParticles);
        this.particleSystems.push(trailParticles);

        return {
            group,
            core,
            innerGlow,
            outerGlow,
            label: labelSprite,
            trail: trailParticles,
            trailPositions: [],
            inputSymbol
        };
    }

    createParticleTrail() {
        const particleCount = 50;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        const alphas = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = -1000; // Hidden initially
            positions[i * 3 + 2] = 0;

            colors[i * 3] = 1.0;
            colors[i * 3 + 1] = 0.3;
            colors[i * 3 + 2] = 0.2;

            sizes[i] = 0.1 * (1 - i / particleCount);
            alphas[i] = 1 - i / particleCount;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            size: 0.15,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending
        });

        return new THREE.Points(geometry, material);
    }

    updateParticleTrail(packet, currentPosition) {
        if (!packet.trail) return;

        // Add current position to trail
        packet.trailPositions.unshift(currentPosition.clone());

        // Limit trail length
        if (packet.trailPositions.length > 50) {
            packet.trailPositions.pop();
        }

        // Update particle positions
        const positions = packet.trail.geometry.attributes.position.array;

        for (let i = 0; i < packet.trailPositions.length && i < 50; i++) {
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
            packet: packet,
            points: points,
            startTime: Date.now(),
            duration: duration,
            onComplete: () => {
                const index = self.activeAnimations.indexOf(animation);
                if (index > -1) {
                    self.activeAnimations.splice(index, 1);
                }

                self.updateDebugInfo();

                if (self.inputIndex < self.inputString.length) {
                    document.getElementById('step-simulation').disabled = false;
                }

                if (onComplete) onComplete();
            },
            update: function(time) {
                const elapsed = time - this.startTime;
                const rawProgress = Math.min(elapsed / this.duration, 1);

                // Apply easing
                const progress = self.easeInOutCubic(rawProgress);

                if (points && points.length > 1) {
                    const pointIndex = Math.floor(progress * (points.length - 1));
                    const fraction = progress * (points.length - 1) - pointIndex;

                    if (pointIndex < points.length - 1) {
                        const p1 = points[pointIndex];
                        const p2 = points[pointIndex + 1];
                        packet.group.position.lerpVectors(p1, p2, fraction);

                        // Update particle trail
                        self.updateParticleTrail(packet, packet.group.position);
                    }
                }

                // Pulsate effects
                const pulseScale = 1 + 0.15 * Math.sin(rawProgress * Math.PI * 8);
                packet.innerGlow.scale.setScalar(pulseScale);
                packet.outerGlow.scale.setScalar(pulseScale * 1.2);

                // Rotate core slightly
                packet.core.rotation.y += 0.05;
                packet.core.rotation.x += 0.02;

                if (rawProgress === 1) {
                    this.onComplete();
                }

                return rawProgress < 1;
            }
        };

        this.dataPackets.push(packet);
        this.activeAnimations.push(animation);

        return animation;
    }

    highlightState(stateName, color, intensity = 0.5) {
        const stateObj = this.stateObjects[stateName];
        if (!stateObj) return;

        stateObj.sphere.material.color.setHex(color);
        stateObj.sphere.material.emissive.setHex(color);
        stateObj.sphere.material.emissiveIntensity = intensity;
        stateObj.glowSphere.material.color.setHex(color);
        stateObj.glowSphere.material.opacity = 0.3;
        stateObj.outerGlowSphere.material.color.setHex(color);
        stateObj.outerGlowSphere.material.opacity = 0.15;
    }

    highlightTransition(transObj, color) {
        transObj.tube.material.color.setHex(color);
        transObj.tube.material.emissive.setHex(color);
        transObj.tube.material.emissiveIntensity = 0.5;
        transObj.tube.material.opacity = 1.0;
        if (transObj.arrow) {
            transObj.arrow.material.color.setHex(color);
            transObj.arrow.material.emissive.setHex(color);
            transObj.arrow.material.emissiveIntensity = 0.5;
        }
    }

    processFiniteAutomaton() {
        if (this.inputIndex >= this.inputString.length) {
            const isFinalState = this.currentState.final;
            document.getElementById('simulation-status').textContent =
                isFinalState ? 'Accepted ✓' : 'Rejected ✗';

            this.highlightState(this.currentState.name, isFinalState ? 0x00ff88 : 0xff4444, 0.6);

            this.simulationRunning = false;
            document.getElementById('step-simulation').disabled = false;
            document.getElementById('run-simulation').disabled = false;
            return;
        }

        const currentInput = this.inputString[this.inputIndex];
        document.getElementById('simulation-status').textContent =
            `Processing "${currentInput}" (${this.inputIndex + 1}/${this.inputString.length})`;

        const transition = this.automaton.transitions.find(t =>
            t.from === this.currentState.name && t.input === currentInput
        );

        if (!transition) {
            document.getElementById('simulation-status').textContent =
                `Rejected: No transition for "${currentInput}" from ${this.currentState.name}`;

            this.highlightState(this.currentState.name, 0xff4444, 0.6);

            this.simulationRunning = false;
            document.getElementById('step-simulation').disabled = false;
            document.getElementById('run-simulation').disabled = false;
            return;
        }

        const transObj = this.transitionObjects.find(t =>
            t.from === transition.from && t.to === transition.to && t.input === transition.input
        );

        if (transObj) {
            this.highlightTransition(transObj, 0xff6666);

            const fromStateObj = this.stateObjects[transition.from];
            const packet = this.createDataPacket(fromStateObj.position.clone(), currentInput);

            this.animateDataPacket(
                packet,
                transObj.points,
                this.animationSpeed,
                () => {
                    const nextState = this.automaton.states.find(s => s.name === transition.to);
                    this.currentState = nextState;

                    this.highlightState(nextState.name, 0xffcc00, 0.5);

                    // Clean up packet
                    this.scene.remove(packet.group);
                    if (packet.trail) {
                        this.scene.remove(packet.trail);
                        const idx = this.particleSystems.indexOf(packet.trail);
                        if (idx > -1) this.particleSystems.splice(idx, 1);
                    }
                    this.dataPackets = this.dataPackets.filter(p => p !== packet);

                    this.inputIndex++;

                    if (this.simulationRunning && !this.stepMode) {
                        setTimeout(() => this.processNextInput(), 300);
                    }
                }
            );
        }
    }

    processPushdownAutomaton() {
        if (this.inputIndex >= this.inputString.length) {
            const isFinalState = this.currentState.final;
            document.getElementById('simulation-status').textContent =
                isFinalState ? 'Accepted ✓' : 'Rejected ✗';

            this.highlightState(this.currentState.name, isFinalState ? 0x00ff88 : 0xff4444, 0.6);

            this.simulationRunning = false;
            document.getElementById('step-simulation').disabled = false;
            document.getElementById('run-simulation').disabled = false;
            return;
        }

        const currentInput = this.inputString[this.inputIndex];
        document.getElementById('simulation-status').textContent =
            `Processing: "${currentInput}" with stack top: ${this.stack.length > 0 ? this.stack[this.stack.length - 1] : 'ε'}`;

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
                    epsilonTransitions.push({
                        transition,
                        popSymbol: popSymbol === 'ε' ? '' : popSymbol,
                        pushSymbol: pushSymbol === 'ε' ? '' : pushSymbol
                    });
                }
            } else if (inputSymbol === currentInput) {
                if (popSymbol === 'ε' || (this.stack.length > 0 && this.stack[this.stack.length - 1] === popSymbol)) {
                    validTransitions.push({
                        transition,
                        popSymbol: popSymbol === 'ε' ? '' : popSymbol,
                        pushSymbol: pushSymbol === 'ε' ? '' : pushSymbol
                    });
                }
            }
        });

        const chosenTransition = validTransitions.length > 0 ? validTransitions[0] :
                                epsilonTransitions.length > 0 ? epsilonTransitions[0] : null;

        if (!chosenTransition) {
            document.getElementById('simulation-status').textContent = 'Rejected: No valid transition found';

            this.highlightState(this.currentState.name, 0xff4444, 0.6);

            this.simulationRunning = false;
            document.getElementById('step-simulation').disabled = false;
            document.getElementById('run-simulation').disabled = false;
            return;
        }

        const transObj = this.transitionObjects.find(t =>
            t.from === chosenTransition.transition.from &&
            t.to === chosenTransition.transition.to &&
            t.input === chosenTransition.transition.input
        );

        if (transObj) {
            this.highlightTransition(transObj, 0xff6666);

            const fromStateObj = this.stateObjects[chosenTransition.transition.from];
            const displaySymbol = chosenTransition.transition.input.split(',')[0] === 'ε' ? 'ε' : currentInput;
            const packet = this.createDataPacket(fromStateObj.position.clone(), displaySymbol);

            this.animateDataPacket(
                packet,
                transObj.points,
                this.animationSpeed,
                () => {
                    if (chosenTransition.popSymbol && this.stack.length > 0) {
                        this.stack.pop();
                    }

                    if (chosenTransition.pushSymbol) {
                        this.stack.push(chosenTransition.pushSymbol);
                    }

                    document.getElementById('simulation-stack').textContent = `Stack: [${this.stack.join(',')}]`;

                    const inputConsumed = chosenTransition.transition.input.split(',')[0] !== 'ε';

                    const nextState = this.automaton.states.find(s => s.name === chosenTransition.transition.to);
                    this.currentState = nextState;

                    this.highlightState(nextState.name, 0xffcc00, 0.5);

                    // Clean up packet
                    this.scene.remove(packet.group);
                    if (packet.trail) {
                        this.scene.remove(packet.trail);
                        const idx = this.particleSystems.indexOf(packet.trail);
                        if (idx > -1) this.particleSystems.splice(idx, 1);
                    }
                    this.dataPackets = this.dataPackets.filter(p => p !== packet);

                    if (inputConsumed) {
                        this.inputIndex++;
                    }

                    if (this.simulationRunning && !this.stepMode) {
                        setTimeout(() => this.processNextInput(), 300);
                    }
                }
            );
        }
    }

    processTuringMachine() {
        if (this.currentState.final) {
            document.getElementById('simulation-status').textContent = 'Accepted ✓';

            this.highlightState(this.currentState.name, 0x00ff88, 0.6);

            this.simulationRunning = false;
            document.getElementById('step-simulation').disabled = false;
            document.getElementById('run-simulation').disabled = false;
            return;
        }

        const currentSymbol = this.headPosition < this.tape.length ?
                            this.tape[this.headPosition] : '_';

        document.getElementById('simulation-status').textContent =
            `Processing: Symbol "${currentSymbol}" at position ${this.headPosition}`;

        const transition = this.automaton.transitions.find(t =>
            t.from === this.currentState.name &&
            t.input.startsWith(`${currentSymbol}→`)
        );

        if (!transition) {
            document.getElementById('simulation-status').textContent =
                `Halted: No transition for "${currentSymbol}" from ${this.currentState.name}`;

            this.highlightState(this.currentState.name, 0xff4444, 0.6);

            this.simulationRunning = false;
            document.getElementById('step-simulation').disabled = false;
            document.getElementById('run-simulation').disabled = false;
            return;
        }

        const transObj = this.transitionObjects.find(t =>
            t.from === transition.from && t.to === transition.to && t.input === transition.input
        );

        if (transObj) {
            this.highlightTransition(transObj, 0xff6666);

            const fromStateObj = this.stateObjects[transition.from];
            const packet = this.createDataPacket(fromStateObj.position.clone(), currentSymbol);

            const [readWrite, direction] = transition.input.split(',');
            const [, writeSymbol] = readWrite.split('→');

            this.animateDataPacket(
                packet,
                transObj.points,
                this.animationSpeed,
                () => {
                    if (this.headPosition >= this.tape.length) {
                        this.tape.push(writeSymbol);
                    } else {
                        this.tape[this.headPosition] = writeSymbol;
                    }

                    if (direction === 'R') {
                        this.headPosition++;
                    } else if (direction === 'L') {
                        this.headPosition = Math.max(0, this.headPosition - 1);
                    }

                    document.getElementById('simulation-tape').textContent =
                        `Tape: [${this.tape.join(',')}], Head: ${this.headPosition}`;

                    const nextState = this.automaton.states.find(s => s.name === transition.to);
                    this.currentState = nextState;

                    this.highlightState(nextState.name, 0xffcc00, 0.5);

                    // Clean up packet
                    this.scene.remove(packet.group);
                    if (packet.trail) {
                        this.scene.remove(packet.trail);
                        const idx = this.particleSystems.indexOf(packet.trail);
                        if (idx > -1) this.particleSystems.splice(idx, 1);
                    }
                    this.dataPackets = this.dataPackets.filter(p => p !== packet);

                    if (this.simulationRunning && !this.stepMode) {
                        setTimeout(() => this.processNextInput(), 300);
                    }
                }
            );
        }
    }

    animateSimulation() {
        if (this.simulationRunning) {
            this.processNextInput();
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const elapsedTime = this.clock.getElapsedTime();
        const deltaTime = this.clock.getDelta();

        // Update camera with smooth damping
        this.updateCameraPosition();

        // Update animations
        const time = Date.now();
        if (this.activeAnimations && this.activeAnimations.length > 0) {
            for (let i = this.activeAnimations.length - 1; i >= 0; i--) {
                const animation = this.activeAnimations[i];
                const isActive = animation.update(time);

                if (!isActive) {
                    this.activeAnimations.splice(i, 1);
                }
            }
        }

        // Animate state glows
        if (this.stateObjects) {
            Object.values(this.stateObjects).forEach(stateObj => {
                if (stateObj.glowSphere) {
                    const scale = 1.0 + 0.08 * Math.sin(elapsedTime * 2);
                    stateObj.glowSphere.scale.setScalar(scale);
                }
                if (stateObj.outerGlowSphere) {
                    const scale = 1.0 + 0.05 * Math.sin(elapsedTime * 1.5 + 0.5);
                    stateObj.outerGlowSphere.scale.setScalar(scale);
                }
            });
        }

        // Animate central light
        if (this.centralLight) {
            this.centralLight.intensity = 1.5 + 0.3 * Math.sin(elapsedTime * 1.5);
        }

        // Animate accent lights
        if (this.accentLights) {
            this.accentLights.forEach((light, i) => {
                light.intensity = 0.8 + 0.2 * Math.sin(elapsedTime * 2 + i * Math.PI);
            });
        }

        // Slowly rotate starfield
        if (this.starfield) {
            this.starfield.rotation.y += 0.0001;
        }

        // Animate grid opacity
        if (this.grid) {
            this.grid.material.opacity = 0.2 + 0.1 * Math.sin(elapsedTime * 0.5);
        }
        if (this.gridCross) {
            this.gridCross.material.opacity = 0.4 + 0.2 * Math.sin(elapsedTime * 0.7);
        }

        // Render with post-processing
        this.composer.render();
    }

    createDebugPanel() {
        const debugPanel = document.createElement('div');
        debugPanel.id = 'debug-panel';
        debugPanel.className = 'panel';
        debugPanel.style.cssText = `
            position: fixed;
            right: 20px;
            top: 20px;
            width: 300px;
            background: rgba(10, 10, 30, 0.9);
            color: #fff;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            display: none;
            border: 1px solid rgba(100, 100, 255, 0.3);
            backdrop-filter: blur(10px);
        `;

        debugPanel.innerHTML = `
            <h3 style="color: #88aaff; margin-top: 0;">Debug Information</h3>
            <div id="debug-current-state">Current State: -</div>
            <div id="debug-input">Input: -</div>
            <div id="debug-position">Position: -</div>
            <div id="debug-transitions">Available Transitions: -</div>
            <div id="debug-stack">Stack: -</div>
            <div id="debug-tape">Tape: -</div>
        `;

        document.body.appendChild(debugPanel);
    }

    updateDebugInfo() {
        const debugPanel = document.getElementById('debug-panel');
        debugPanel.style.display = this.stepMode ? 'block' : 'none';

        if (!this.stepMode) return;

        document.getElementById('debug-current-state').textContent =
            `Current State: ${this.currentState ? this.currentState.name : '-'} ` +
            `(Initial: ${this.currentState?.initial ? 'Yes' : 'No'}, ` +
            `Final: ${this.currentState?.final ? 'Yes' : 'No'})`;

        document.getElementById('debug-input').textContent =
            `Input: "${this.inputString}" (Length: ${this.inputString.length})`;

        document.getElementById('debug-position').textContent =
            `Position: ${this.inputIndex + 1}/${this.inputString.length} ` +
            `(Current symbol: "${this.inputIndex < this.inputString.length ? this.inputString[this.inputIndex] : '-'}")`;

        const availableTransitions = this.automaton.transitions
            .filter(t => t.from === this.currentState?.name)
            .map(t => `${t.from} --${t.input}--> ${t.to}`)
            .join('\n');
        document.getElementById('debug-transitions').innerHTML =
            `Available Transitions:<br><pre style="color: #aaccff;">${availableTransitions || 'None'}</pre>`;

        if (this.automaton.type === 'pda') {
            document.getElementById('debug-stack').textContent =
                `Stack: [${this.stack.join(',')}]`;
            document.getElementById('debug-stack').style.display = 'block';
            document.getElementById('debug-tape').style.display = 'none';
        } else if (this.automaton.type === 'tm') {
            document.getElementById('debug-tape').textContent =
                `Tape: [${this.tape.join(',')}], Head: ${this.headPosition}`;
            document.getElementById('debug-tape').style.display = 'block';
            document.getElementById('debug-stack').style.display = 'none';
        } else {
            document.getElementById('debug-stack').style.display = 'none';
            document.getElementById('debug-tape').style.display = 'none';
        }
    }
}

// Initialize the simulator when page is fully loaded
window.addEventListener('load', () => {
    try {
        new AutomataSimulator();
    } catch (error) {
        console.error("Failed to initialize simulator:", error);
        document.getElementById('loading-overlay').style.display = 'none';
        alert(`Failed to initialize simulator: ${error.message}`);
    }
});
