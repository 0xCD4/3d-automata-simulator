// Main application
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
    
    setupThreeJS() {
        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0f1028);
        
        // Create camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.z = 15;
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);
        
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        
        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 10, 10);
        this.scene.add(directionalLight);
        
        // Add point light for better effects
        const pointLight = new THREE.PointLight(0x4c6ef5, 0.8, 20);
        pointLight.position.set(0, 5, 0);
        this.scene.add(pointLight);
        
        // Add grid for reference
        const gridHelper = new THREE.GridHelper(20, 20, 0x4444aa, 0x222244);
        this.scene.add(gridHelper);
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        // Setup camera controls
        this.cameraRotation = { x: 0, y: 0 };
        this.cameraDistance = 15;
        
        // Basic mouse controls
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        
        this.renderer.domElement.addEventListener('mousedown', (e) => {
            this.isDragging = true;
        });
        
        this.renderer.domElement.addEventListener('mouseup', () => {
            this.isDragging = false;
        });
        
        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const deltaMove = {
                    x: e.clientX - this.previousMousePosition.x,
                    y: e.clientY - this.previousMousePosition.y
                };
                
                this.cameraRotation.x += deltaMove.y * 0.01;
                this.cameraRotation.y += deltaMove.x * 0.01;
                
                // Limit vertical rotation
                this.cameraRotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.cameraRotation.x));
                
                // Update camera position
                this.updateCameraPosition();
            }
            
            this.previousMousePosition = {
                x: e.clientX,
                y: e.clientY
            };
        });
        
        // Zoom with mouse wheel
        this.renderer.domElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.cameraDistance += e.deltaY * 0.01;
            this.cameraDistance = Math.max(5, Math.min(30, this.cameraDistance));
            this.updateCameraPosition();
        });
        
        // For animations
        this.clock = new THREE.Clock();
        this.dataPackets = [];
        this.activeAnimations = [];
    }
    
    updateCameraPosition() {
        const x = this.cameraDistance * Math.sin(this.cameraRotation.y) * Math.cos(this.cameraRotation.x);
        const y = this.cameraDistance * Math.sin(this.cameraRotation.x);
        const z = this.cameraDistance * Math.cos(this.cameraRotation.y) * Math.cos(this.cameraRotation.x);
        
        this.camera.position.set(x, y, z);
        this.camera.lookAt(0, 0, 0);
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
            
            // Show/hide PDA stack controls
            document.getElementById('pda-controls').style.display = 
                type === 'pda' ? 'block' : 'none';
            
            // Show/hide TM tape controls
            document.getElementById('tm-controls').style.display = 
                type === 'tm' ? 'block' : 'none';
            
            // Show/hide stack display during simulation
            document.getElementById('simulation-stack').style.display = 
                type === 'pda' ? 'block' : 'none';
            
            // Show/hide tape display during simulation
            document.getElementById('simulation-tape').style.display = 
                type === 'tm' ? 'block' : 'none';
        });
    }
    
    setupTutorial() {
        // Show tutorial button
        document.getElementById('show-tutorial').addEventListener('click', () => {
            const panel = document.getElementById('tutorial-panel');
            panel.style.display = panel.style.display === 'none' || panel.style.display === '' ? 'block' : 'none';
            
            // Reset to first step
            this.tutorialStep = 1;
            document.querySelectorAll('.tutorial-step').forEach((step, index) => {
                step.style.display = index === 0 ? 'block' : 'none';
            });
            
            // Reset button visibility
            document.querySelector('.prev-step').style.visibility = 'hidden';
            document.querySelector('.next-step').textContent = 'Next';
        });
        
        // Tutorial navigation
        this.tutorialStep = 1;
        const tutorialSteps = document.querySelectorAll('.tutorial-step').length;
        
        document.querySelector('.next-step').addEventListener('click', () => {
            if (this.tutorialStep < tutorialSteps) {
                document.getElementById(`step${this.tutorialStep}`).style.display = 'none';
                this.tutorialStep++;
                document.getElementById(`step${this.tutorialStep}`).style.display = 'block';
                
                // Show previous button after first step
                document.querySelector('.prev-step').style.visibility = 'visible';
                
                // Change next button text on last step
                if (this.tutorialStep === tutorialSteps) {
                    document.querySelector('.next-step').textContent = 'Close';
                }
            } else {
                // Close tutorial on last step
                document.getElementById('tutorial-panel').style.display = 'none';
            }
        });
        
        document.querySelector('.prev-step').addEventListener('click', () => {
            if (this.tutorialStep > 1) {
                document.getElementById(`step${this.tutorialStep}`).style.display = 'none';
                this.tutorialStep--;
                document.getElementById(`step${this.tutorialStep}`).style.display = 'block';
                
                // Hide previous button on first step
                if (this.tutorialStep === 1) {
                    document.querySelector('.prev-step').style.visibility = 'hidden';
                }
                
                // Reset next button text
                document.querySelector('.next-step').textContent = 'Next';
            }
        });
    }
    
    setupExamples() {
        document.getElementById('show-examples').addEventListener('click', () => {
            const panel = document.getElementById('examples-panel');
            panel.style.display = panel.style.display === 'none' || panel.style.display === '' ? 'block' : 'none';
            
            // Hide tutorial panel if open
            document.getElementById('tutorial-panel').style.display = 'none';
        });
        
        // Add event listeners to example automata
        document.querySelectorAll('.example-automaton').forEach(element => {
            element.addEventListener('click', () => {
                try {
                    const exampleType = element.getAttribute('data-example');
                    this.loadExampleAutomaton(exampleType);
                    
                    // Hide the example selector
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
                // DFA that accepts strings ending with 'a'
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
                // DFA that accepts strings with even number of 'a's
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
                // DFA that accepts strings starting with "ab"
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
                // PDA that accepts palindromes over {a,b}
                this.loadPushdownAutomaton(
                    [
                        { name: 'q0', initial: true, final: false },
                        { name: 'q1', initial: false, final: false },
                        { name: 'q2', initial: false, final: true }
                    ],
                    [
                        { from: 'q0', to: 'q0', input: 'a,ε→a' }, // Push 'a's onto stack
                        { from: 'q0', to: 'q0', input: 'b,ε→b' }, // Push 'b's onto stack
                        { from: 'q0', to: 'q1', input: 'ε,ε→ε' }, // Epsilon transition to middle
                        { from: 'q1', to: 'q1', input: 'a,a→ε' }, // Pop matching 'a's
                        { from: 'q1', to: 'q1', input: 'b,b→ε' }, // Pop matching 'b's
                        { from: 'q1', to: 'q2', input: 'ε,ε→ε' }  // Epsilon transition to accept
                    ],
                    'abba'
                );
                break;
            
            case 'anbn':
                // PDA that accepts a^n b^n for n ≥ 1
                this.loadPushdownAutomaton(
                    [
                        { name: 'q0', initial: true, final: false },
                        { name: 'q1', initial: false, final: false },
                        { name: 'q2', initial: false, final: true }
                    ],
                    [
                        { from: 'q0', to: 'q1', input: 'a,ε→X' }, // First 'a', push X
                        { from: 'q1', to: 'q1', input: 'a,ε→X' }, // Push X for each 'a'
                        { from: 'q1', to: 'q2', input: 'b,X→ε' }, // Start popping X for each 'b'
                        { from: 'q2', to: 'q2', input: 'b,X→ε' }  // Pop X for each 'b'
                    ],
                    'aaabbb'
                );
                break;
            
            case 'tm-binary-add':
                // TM that adds 1 to a binary number
                this.loadTuringMachine(
                    [
                        { name: 'q0', initial: true, final: false },
                        { name: 'q1', initial: false, final: false },
                        { name: 'q2', initial: false, final: true }
                    ],
                    [
                        { from: 'q0', to: 'q0', input: '1→1,R' }, // Skip over 1's
                        { from: 'q0', to: 'q0', input: '0→0,R' }, // Skip over 0's
                        { from: 'q0', to: 'q1', input: '_→_,L' }, // Reached end, go back
                        { from: 'q1', to: 'q1', input: '1→0,L' }, // Change 1 to 0, carry
                        { from: 'q1', to: 'q2', input: '0→1,R' }, // Change 0 to 1, done
                        { from: 'q1', to: 'q2', input: '_→1,R' }  // If at start, add a 1
                    ],
                    '1011'
                );
                break;
        }
    }
    
    loadFiniteAutomaton(states, transitions, inputString) {
        document.getElementById('automaton-type').value = 'fa';
        
        // Trigger the change event to update UI
        const event = new Event('change');
        document.getElementById('automaton-type').dispatchEvent(event);
        
        this.updateControlsWithAutomaton(states, transitions, inputString);
        this.createCustomAutomaton();
    }
    
    loadPushdownAutomaton(states, transitions, inputString) {
        document.getElementById('automaton-type').value = 'pda';
        
        // Trigger the change event to update UI
        const event = new Event('change');
        document.getElementById('automaton-type').dispatchEvent(event);
        
        this.updateControlsWithAutomaton(states, transitions, inputString);
        this.createCustomAutomaton();
    }
    
    loadTuringMachine(states, transitions, inputString) {
        document.getElementById('automaton-type').value = 'tm';
        
        // Trigger the change event to update UI
        const event = new Event('change');
        document.getElementById('automaton-type').dispatchEvent(event);
        
        this.updateControlsWithAutomaton(states, transitions, inputString);
        this.createCustomAutomaton();
    }
    
    updateControlsWithAutomaton(states, transitions, inputString) {
        // Clear existing states
        const statesContainer = document.getElementById('states-container');
        statesContainer.innerHTML = '';
        
        // Add states
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
            
            // Add event listener for the first add button
            if (index === 0) {
                stateDiv.querySelector('.add-state').addEventListener('click', () => {
                    this.addStateInput();
                });
            } else {
                // Add event listener to remove button
                stateDiv.querySelector('.remove-state').addEventListener('click', () => {
                    stateDiv.remove();
                    this.updateStateSelectors();
                });
            }
        });
        
        // Clear existing transitions
        const transitionsContainer = document.getElementById('transitions-container');
        transitionsContainer.innerHTML = '';
        
        // Add transitions
        transitions.forEach((transition, index) => {
            const transitionDiv = document.createElement('div');
            transitionDiv.className = 'transition';
            
            // Create from-state selector
            const fromStateSelect = document.createElement('select');
            fromStateSelect.className = 'from-state';
            
            // Create input symbol field
            const inputSymbol = document.createElement('input');
            inputSymbol.type = 'text';
            inputSymbol.className = 'input-symbol';
            inputSymbol.placeholder = 'Input';
            inputSymbol.value = transition.input;
            
            // Create to-state selector
            const toStateSelect = document.createElement('select');
            toStateSelect.className = 'to-state';
            
            // Create button (add for first, remove for others)
            const button = document.createElement('button');
            button.className = index === 0 ? 'add-transition' : 'remove-transition';
            button.textContent = index === 0 ? '+' : '-';
            
            // Append elements to transition div
            transitionDiv.appendChild(fromStateSelect);
            transitionDiv.appendChild(inputSymbol);
            transitionDiv.appendChild(toStateSelect);
            transitionDiv.appendChild(button);
            
            transitionsContainer.appendChild(transitionDiv);
            
            // Add event listener for buttons
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
        
        // Update state selectors in transitions
        this.updateStateSelectors();
        
        // Set transition from/to values
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
        
        // Set input string
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
        
        // Add event listener to remove button
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
        
        // Create from-state selector
        const fromStateSelect = document.createElement('select');
        fromStateSelect.className = 'from-state';
        
        // Create input symbol field
        const inputSymbol = document.createElement('input');
        inputSymbol.type = 'text';
        inputSymbol.className = 'input-symbol';
        inputSymbol.placeholder = 'Input';
        inputSymbol.value = 'a';
        
        // Create to-state selector
        const toStateSelect = document.createElement('select');
        toStateSelect.className = 'to-state';
        
        // Create remove button
        const removeButton = document.createElement('button');
        removeButton.className = 'remove-transition';
        removeButton.textContent = '-';
        
        // Append elements to transition div
        transitionDiv.appendChild(fromStateSelect);
        transitionDiv.appendChild(inputSymbol);
        transitionDiv.appendChild(toStateSelect);
        transitionDiv.appendChild(removeButton);
        
        transitionsContainer.appendChild(transitionDiv);
        
        // Add event listener to remove button
        removeButton.addEventListener('click', () => {
            transitionDiv.remove();
        });
        
        this.updateStateSelectors();
    }
    
    updateStateSelectors() {
        // Get all state names
        const stateInputs = document.querySelectorAll('.state input[type="text"]');
        const stateNames = Array.from(stateInputs).map(input => input.value);
        
        // Update all state selectors
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
            
            // Try to restore the previous value if it exists
            if (stateNames.includes(currentValue)) {
                selector.value = currentValue;
            }
        });
    }
    
    createDefaultAutomaton() {
        // Create a default DFA that accepts strings ending with 'a'
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
            // Clear all existing objects from the scene
            this.clearScene();
            
            // Add back lights and grid
            this.addSceneElements();
            
            // Get automaton type
            const automatonType = document.getElementById('automaton-type').value;
            
            // Get states
            const stateElements = document.querySelectorAll('.state');
            const states = Array.from(stateElements).map((element, index) => {
                const name = element.querySelector('input[type="text"]').value;
                const initial = element.querySelectorAll('input[type="checkbox"]')[0].checked;
                const final = element.querySelectorAll('input[type="checkbox"]')[1].checked;
                
                // Calculate position in 3D space (arrange in a circle)
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
            
            // Get transitions
            const transitionElements = document.querySelectorAll('.transition');
            const transitions = Array.from(transitionElements).map(element => {
                return {
                    from: element.querySelector('.from-state').value,
                    to: element.querySelector('.to-state').value,
                    input: element.querySelector('.input-symbol').value
                };
            });
            
            // Create automaton
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
        // Clear all objects from the scene
        while(this.scene.children.length > 0) { 
            this.scene.remove(this.scene.children[0]); 
        }
        
        // Clear data packets
        this.dataPackets = [];
        this.activeAnimations = [];
    }
    
    addSceneElements() {
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        
        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 10, 10);
        this.scene.add(directionalLight);
        
        // Add point light for better effects
        const pointLight = new THREE.PointLight(0x4c6ef5, 0.8, 20);
        pointLight.position.set(0, 5, 0);
        this.scene.add(pointLight);
        
        // Add grid for reference
        const gridHelper = new THREE.GridHelper(20, 20, 0x4444aa, 0x222244);
        this.scene.add(gridHelper);
    }
    
    createTextSprite(text, color) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 128;
        
        context.font = '40px Arial';
        context.fillStyle = color || '#ffffff';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(text, canvas.width / 2, canvas.height / 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true
        });
        
        return new THREE.Sprite(material);
    }
    
    visualizeAutomaton() {
        try {
            // Clear previous visualization
            this.stateObjects = {};
            this.transitionObjects = [];
            
            // Create state objects (spheres)
            this.automaton.states.forEach(state => {
                // Create sphere for state
                const geometry = new THREE.SphereGeometry(0.8, 32, 32);
                const material = new THREE.MeshPhongMaterial({
                    color: state.final ? 0x4CAF50 : (state.initial ? 0x2196F3 : 0xE0E0E0),
                    specular: 0x444444,
                    shininess: 30
                });
                const sphere = new THREE.Mesh(geometry, material);
                sphere.position.copy(state.position);
                sphere.castShadow = true;
                sphere.receiveShadow = true;
                this.scene.add(sphere);
                
                // Add glow effect for states
                const glowMaterial = new THREE.MeshBasicMaterial({
                    color: state.final ? 0x4CAF50 : (state.initial ? 0x2196F3 : 0xE0E0E0),
                    transparent: true,
                    opacity: 0.2
                });
                const glowSphere = new THREE.Mesh(
                    new THREE.SphereGeometry(1.0, 32, 32),
                    glowMaterial
                );
                glowSphere.position.copy(state.position);
                this.scene.add(glowSphere);
                
                // Add state name text as sprite
                const textSprite = this.createTextSprite(state.name);
                textSprite.position.set(state.position.x, state.position.y + 1.5, state.position.z);
                textSprite.scale.set(1.5, 0.75, 1);
                this.scene.add(textSprite);
                
                // If final state, add a ring around it
                if (state.final) {
                    const ringGeometry = new THREE.TorusGeometry(1.1, 0.08, 16, 32);
                    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0x4CAF50 });
                    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
                    ring.position.copy(state.position);
                    ring.rotation.x = Math.PI / 2;
                    this.scene.add(ring);
                }
                
                // Store reference to state object
                this.stateObjects[state.name] = {
                    sphere,
                    glowSphere,
                    textSprite,
                    position: state.position.clone()
                };
            });
            
            // Create transition objects (arrows)
            this.automaton.transitions.forEach(transition => {
                const fromState = this.automaton.states.find(s => s.name === transition.from);
                const toState = this.automaton.states.find(s => s.name === transition.to);
                
                if (!fromState || !toState) return;
                
                const fromPos = fromState.position;
                const toPos = toState.position;
                
                // Self-transition (loop)
                if (fromState.name === toState.name) {
                    const loopRadius = 1.2;
                    const loopSegments = 32;
                    const loopGeometry = new THREE.TorusGeometry(loopRadius, 0.1, 16, loopSegments, Math.PI * 1.5);
                    const loopMaterial = new THREE.MeshBasicMaterial({ color: 0xFFA726 });
                    const loop = new THREE.Mesh(loopGeometry, loopMaterial);
                    
                    // Position the loop above the state
                    loop.position.copy(fromPos);
                    loop.position.y += 1;
                    loop.rotation.x = Math.PI / 2;
                    
                    this.scene.add(loop);
                    
                    // Add input symbol text as sprite
                    const textSprite = this.createTextSprite(transition.input, '#FFA726');
                    textSprite.position.set(fromPos.x, fromPos.y + 2.5, fromPos.z);
                    textSprite.scale.set(1.5, 0.75, 1);
                    this.scene.add(textSprite);
                    
                    // Create points for self-loop animation
                    const loopPoints = [];
                    for (let i = 0; i <= 20; i++) {
                        const t = i / 20;
                        const angle = Math.PI + t * Math.PI;
                        const x = loopRadius * Math.cos(angle);
                        const y = 1 + 0.5 * Math.sin(angle * 2);
                        const z = loopRadius * Math.sin(angle);
                        loopPoints.push(new THREE.Vector3(x, y, z).add(fromPos));
                    }
                    
                    this.transitionObjects.push({
                        from: transition.from,
                        to: transition.to,
                        input: transition.input,
                        object: loop,
                        textSprite,
                        points: loopPoints,
                        selfTransition: true
                    });
                } else {
                    // Regular transition between different states
                    const direction = new THREE.Vector3().subVectors(toPos, fromPos);
                    const length = direction.length();
                    direction.normalize();
                    
                    // Create tube for the transition path
                    const points = [
                        fromPos.clone(),
                        toPos.clone().sub(direction.clone().multiplyScalar(0.8)) // Slightly before target
                    ];
                    
                    const curve = new THREE.LineCurve3(points[0], points[1]);
                    
                    const pathGeometry = new THREE.TubeGeometry(
                        curve, 20, 0.05, 8, false
                    );
                    const pathMaterial = new THREE.MeshBasicMaterial({ color: 0xFFA726, transparent: true, opacity: 0.7 });
                    const pathMesh = new THREE.Mesh(pathGeometry, pathMaterial);
                    this.scene.add(pathMesh);
                    
                    // Create arrow head
                    const headLength = 0.4;
                    const headWidth = 0.2;
                    const coneGeometry = new THREE.ConeGeometry(headWidth, headLength, 8);
                    const coneMaterial = new THREE.MeshBasicMaterial({ color: 0xFFA726 });
                    const cone = new THREE.Mesh(coneGeometry, coneMaterial);
                    
                    // Position and orient the arrow head
                    cone.position.copy(toPos.clone().sub(direction.clone().multiplyScalar(0.8))); // Slightly offset from target
                    cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
                    this.scene.add(cone);
                    
                    // Add input symbol text at the middle of the arrow
                    const midPoint = new THREE.Vector3().addVectors(
                        fromPos,
                        direction.clone().multiplyScalar(length / 2)
                    );
                    midPoint.y += 0.5; // Lift text slightly above the arrow
                    
                    const textSprite = this.createTextSprite(transition.input, '#FFA726');
                    textSprite.position.copy(midPoint);
                    textSprite.scale.set(1.5, 0.75, 1);
                    this.scene.add(textSprite);
                    
                    // Create points for animation
                    const transitionPoints = [];
                    for (let i = 0; i <= 20; i++) {
                        const t = i / 20;
                        transitionPoints.push(new THREE.Vector3().lerpVectors(fromPos, points[1], t));
                    }
                    
                    this.transitionObjects.push({
                        from: transition.from,
                        to: transition.to,
                        input: transition.input,
                        object: pathMesh,
                        cone: cone,
                        textSprite,
                        points: transitionPoints,
                        selfTransition: false
                    });
                }
            });
            
            // Update simulation info
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
        
        // Count states and transitions
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
                if (packet.object && packet.object.parent) {
                    packet.object.parent.remove(packet.object);
                }
            }
            this.dataPackets = [];
            this.activeAnimations = [];
            
            // Reset all states to their original colors
            Object.values(this.stateObjects).forEach(stateObj => {
                const state = this.automaton.states.find(s => s.name === Object.keys(this.stateObjects).find(key => this.stateObjects[key] === stateObj));
                if (state) {
                    stateObj.sphere.material.color.set(
                        state.final ? 0x4CAF50 : (state.initial ? 0x2196F3 : 0xE0E0E0)
                    );
                    stateObj.glowSphere.material.color.set(
                        state.final ? 0x4CAF50 : (state.initial ? 0x2196F3 : 0xE0E0E0)
                    );
                    stateObj.glowSphere.material.opacity = 0.2;
                }
            });
            
            // Reset all transitions to their original colors
            this.transitionObjects.forEach(transObj => {
                transObj.object.material.color.set(0xFFA726);
                if (transObj.cone) {
                    transObj.cone.material.color.set(0xFFA726);
                }
                transObj.object.material.opacity = 0.7;
            });
            
            // Reset simulation state
            this.simulationRunning = false;
            this.stepMode = false;
            this.simulationStep = 0;
            this.currentState = this.automaton.states.find(s => s.initial);
            this.inputString = document.getElementById('input-string').value;
            this.inputIndex = 0;
            
            // Re-enable run button
            document.getElementById('run-simulation').disabled = false;
            document.getElementById('step-simulation').disabled = false;
            
            // Reset stack for PDA
            this.stack = [];
            document.getElementById('simulation-stack').textContent = 'Stack: []';
            
            // Reset tape for TM
            this.tape = this.inputString.split('');
            this.headPosition = 0;
            document.getElementById('simulation-tape').textContent = 
                `Tape: [${this.tape.join(',')}], Head: ${this.headPosition}`;
            
            document.getElementById('simulation-status').textContent = 'Ready';
            
            // Hide debug panel
            document.getElementById('debug-panel').style.display = 'none';
        } catch (error) {
            console.error("Error resetting simulation:", error);
            alert(`Error resetting simulation: ${error.message}`);
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
            alert(`Error running simulation: ${error.message}`);
        }
    }
    
    stepSimulation() {
        try {
            if (!this.simulationRunning && !this.stepMode) {
                this.resetSimulation();
            }
            
            // Prevent multiple clicks during animation
            if (this.activeAnimations.length > 0) {
                return;
            }
            
            // Set step mode instead of simulation running
            this.stepMode = true;
            this.simulationRunning = false;
            
            // Update debug information before processing
            this.updateDebugInfo();
            
            // Disable both step and run buttons until animation completes
            document.getElementById('step-simulation').disabled = true;
            document.getElementById('run-simulation').disabled = true;
            
            // Update UI to show step mode
            document.getElementById('simulation-status').textContent = 
                `Step Mode - Processing step ${this.simulationStep + 1}`;
            
            this.processNextInput();
        } catch (error) {
            console.error("Error stepping simulation:", error);
            alert(`Error stepping simulation: ${error.message}`);
            // Re-enable buttons on error
            document.getElementById('step-simulation').disabled = false;
            document.getElementById('run-simulation').disabled = false;
        }
    }
    
    processNextInput() {
        try {
            if (this.stepMode) {
                this.simulationStep++;
            }
            
            // Clear any completed animations
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
            // Re-enable buttons on error
            document.getElementById('step-simulation').disabled = false;
            document.getElementById('run-simulation').disabled = false;
        }
    }
    
    createDataPacket(position, inputSymbol) {
        // Create a glowing sphere to represent the data packet
        const geometry = new THREE.SphereGeometry(0.3, 16, 16);
        const material = new THREE.MeshBasicMaterial({
            color: 0xF44336,
            transparent: true,
            opacity: 0.9
        });
        const packet = new THREE.Mesh(geometry, material);
        packet.position.copy(position);
        
        // Add a text label showing the input symbol
        const labelSprite = this.createTextSprite(inputSymbol, '#FFFFFF');
        labelSprite.scale.set(0.5, 0.25, 1);
        packet.add(labelSprite);
        labelSprite.position.y = 0.5;
        
        // Add glow effect
        const glowGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xF44336,
            transparent: true,
            opacity: 0.3
        });
        const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
        packet.add(glowSphere);
        
        this.scene.add(packet);
        
        return {
            object: packet,
            glow: glowSphere,
            label: labelSprite,
            progress: 0,
            inputSymbol: inputSymbol
        };
    }
    
    animateDataPacket(packet, points, duration, onComplete) {
        const self = this;
        
        const animation = {
            packet: packet,
            points: points,
            startTime: Date.now(),
            duration: duration,
            onComplete: () => {
                // Remove animation and update debug info
                const index = self.activeAnimations.indexOf(animation);
                if (index > -1) {
                    self.activeAnimations.splice(index, 1);
                }
                
                // Update debug information after state changes
                self.updateDebugInfo();
                
                // Re-enable step button after animation completes if we're not at the end
                if (self.inputIndex < self.inputString.length) {
                    document.getElementById('step-simulation').disabled = false;
                }
                
                // Call the original onComplete callback
                if (onComplete) onComplete();
            },
            update: function(time) {
                const elapsed = time - this.startTime;
                const progress = Math.min(elapsed / this.duration, 1);
                
                if (points && points.length > 1) {
                    const pointIndex = Math.floor(progress * (points.length - 1));
                    const fraction = progress * (points.length - 1) - pointIndex;
                    
                    // Interpolate between points
                    if (pointIndex < points.length - 1) {
                        const p1 = points[pointIndex];
                        const p2 = points[pointIndex + 1];
                        packet.object.position.lerpVectors(p1, p2, fraction);
                    }
                }
                
                // Pulsate the glow
                packet.glow.scale.set(
                    1 + 0.2 * Math.sin(progress * Math.PI * 4),
                    1 + 0.2 * Math.sin(progress * Math.PI * 4),
                    1 + 0.2 * Math.sin(progress * Math.PI * 4)
                );
                
                if (progress === 1) {
                    this.onComplete();
                }
                
                return progress < 1;
            }
        };
        
        this.dataPackets.push(packet);
        this.activeAnimations.push(animation);
        
        return animation;
    }
    
    processFiniteAutomaton() {
        if (this.inputIndex >= this.inputString.length) {
            // End of input reached
            const isFinalState = this.currentState.final;
            document.getElementById('simulation-status').textContent = 
                isFinalState ? 'Accepted ✓' : 'Rejected ✗';
            
            // Highlight final state
            const stateObj = this.stateObjects[this.currentState.name];
            stateObj.sphere.material.color.set(isFinalState ? 0x4CAF50 : 0xFF5252);
            stateObj.glowSphere.material.color.set(isFinalState ? 0x4CAF50 : 0xFF5252);
            stateObj.glowSphere.material.opacity = 0.4;
            
            this.simulationRunning = false;
            // Don't reset step mode here
            
            // Re-enable buttons at end of simulation
            document.getElementById('step-simulation').disabled = false;
            document.getElementById('run-simulation').disabled = false;
            return;
        }
        
        const currentInput = this.inputString[this.inputIndex];
        document.getElementById('simulation-status').textContent = 
            `Step Mode - Processing "${currentInput}" (${this.inputIndex + 1}/${this.inputString.length})`;
        
        // Find valid transition
        const transition = this.automaton.transitions.find(t => 
            t.from === this.currentState.name && t.input === currentInput
        );
        
        if (!transition) {
            // No valid transition found
            document.getElementById('simulation-status').textContent = 
                `Rejected: No transition for input "${currentInput}" from state ${this.currentState.name}`;
            
            // Highlight current state in red
            const stateObj = this.stateObjects[this.currentState.name];
            stateObj.sphere.material.color.set(0xFF5252);
            stateObj.glowSphere.material.color.set(0xFF5252);
            stateObj.glowSphere.material.opacity = 0.4;
            
            this.simulationRunning = false;
            // Don't reset step mode here
            
            // Re-enable buttons when rejected
            document.getElementById('step-simulation').disabled = false;
            document.getElementById('run-simulation').disabled = false;
            return;
        }
        
        // Highlight the transition
        const transObj = this.transitionObjects.find(t => 
            t.from === transition.from && t.to === transition.to && t.input === transition.input
        );
        
        if (transObj) {
            transObj.object.material.color.set(0xF44336);
            transObj.object.material.opacity = 1.0;
            if (transObj.cone) {
                transObj.cone.material.color.set(0xF44336);
            }
            
            // Create a data packet at the starting state
            const fromStateObj = this.stateObjects[transition.from];
            const packet = this.createDataPacket(fromStateObj.position.clone(), currentInput);
            
            // Animate the data packet along the transition
            this.animateDataPacket(
                packet, 
                transObj.points, 
                this.animationSpeed, 
                () => {
                    // When animation completes, update state
                    const nextState = this.automaton.states.find(s => s.name === transition.to);
                    
                    // Update current state
                    this.currentState = nextState;
                    
                    // Highlight new current state
                    const stateObj = this.stateObjects[nextState.name];
                    stateObj.sphere.material.color.set(0xFFC107);
                    stateObj.glowSphere.material.color.set(0xFFC107);
                    stateObj.glowSphere.material.opacity = 0.4;
                    
                    // Remove the packet
                    this.scene.remove(packet.object);
                    this.dataPackets = this.dataPackets.filter(p => p !== packet);
                    
                    // Move to next input
                    this.inputIndex++;
                    
                    // Continue simulation based on mode
                    if (this.simulationRunning && !this.stepMode) {
                        setTimeout(() => this.processNextInput(), 500);
                    }
                    // Don't reset step mode here
                }
            );
        }
    }
    
    processPushdownAutomaton() {
        if (this.inputIndex >= this.inputString.length) {
            // End of input reached - check if in a final state
            const isFinalState = this.currentState.final;
            document.getElementById('simulation-status').textContent = 
                isFinalState ? 'Accepted ✓' : 'Rejected ✗';
            
            // Highlight final state
            const stateObj = this.stateObjects[this.currentState.name];
            stateObj.sphere.material.color.set(isFinalState ? 0x4CAF50 : 0xFF5252);
            stateObj.glowSphere.material.color.set(isFinalState ? 0x4CAF50 : 0xFF5252);
            stateObj.glowSphere.material.opacity = 0.4;
            
            this.simulationRunning = false;
            // Don't reset step mode here
            
            // Re-enable buttons at end of simulation
            document.getElementById('step-simulation').disabled = false;
            document.getElementById('run-simulation').disabled = false;
            return;
        }
        
        const currentInput = this.inputString[this.inputIndex];
        document.getElementById('simulation-status').textContent = 
            `Processing: "${currentInput}" with stack top: ${this.stack.length > 0 ? this.stack[this.stack.length - 1] : 'ε'}`;
        
        // Parse transitions for PDA (input,pop→push)
        let validTransitions = [];
        let epsilonTransitions = [];
        
        this.automaton.transitions.forEach(transition => {
            if (transition.from !== this.currentState.name) return;
            
            const parts = transition.input.split(',');
            if (parts.length !== 2) return;
            
            const [inputSymbol, stackOp] = parts;
            const [popSymbol, pushSymbol] = stackOp.split('→');
            
            // Epsilon transition (no input consumed)
            if (inputSymbol === 'ε') {
                if (popSymbol === 'ε' || (this.stack.length > 0 && this.stack[this.stack.length - 1] === popSymbol)) {
                    epsilonTransitions.push({
                        transition,
                        popSymbol: popSymbol === 'ε' ? '' : popSymbol,
                        pushSymbol: pushSymbol === 'ε' ? '' : pushSymbol
                    });
                }
            }
            // Normal input transition
            else if (inputSymbol === currentInput) {
                if (popSymbol === 'ε' || (this.stack.length > 0 && this.stack[this.stack.length - 1] === popSymbol)) {
                    validTransitions.push({
                        transition,
                        popSymbol: popSymbol === 'ε' ? '' : popSymbol,
                        pushSymbol: pushSymbol === 'ε' ? '' : pushSymbol
                    });
                }
            }
        });
        
        // First try normal transitions, then epsilon transitions
        const chosenTransition = validTransitions.length > 0 ? validTransitions[0] : 
                                epsilonTransitions.length > 0 ? epsilonTransitions[0] : null;
        
        if (!chosenTransition) {
            document.getElementById('simulation-status').textContent = 
                `Rejected: No valid transition found`;
            
            // Highlight current state in red
            const stateObj = this.stateObjects[this.currentState.name];
            stateObj.sphere.material.color.set(0xFF5252);
            stateObj.glowSphere.material.color.set(0xFF5252);
            stateObj.glowSphere.material.opacity = 0.4;
            
            this.simulationRunning = false;
            // Don't reset step mode here
            
            // Re-enable buttons when rejected
            document.getElementById('step-simulation').disabled = false;
            document.getElementById('run-simulation').disabled = false;
            return;
        }
        
        // Highlight the transition
        const transObj = this.transitionObjects.find(t => 
            t.from === chosenTransition.transition.from && 
            t.to === chosenTransition.transition.to && 
            t.input === chosenTransition.transition.input
        );
        
        if (transObj) {
            transObj.object.material.color.set(0xF44336);
            transObj.object.material.opacity = 1.0;
            if (transObj.cone) {
                transObj.cone.material.color.set(0xF44336);
            }
            
            // Create a data packet at the starting state
            const fromStateObj = this.stateObjects[chosenTransition.transition.from];
            const displaySymbol = chosenTransition.transition.input.split(',')[0] === 'ε' ? 'ε' : currentInput;
            const packet = this.createDataPacket(fromStateObj.position.clone(), displaySymbol);
            
            // Animate the data packet along the transition
            this.animateDataPacket(
                packet, 
                transObj.points, 
                this.animationSpeed, 
                () => {
                    // Update stack
                    if (chosenTransition.popSymbol && this.stack.length > 0) {
                        this.stack.pop(); // Pop symbol
                    }
                    
                    if (chosenTransition.pushSymbol) {
                        this.stack.push(chosenTransition.pushSymbol); // Push symbol
                    }
                    
                    // Update stack display
                    document.getElementById('simulation-stack').textContent = `Stack: [${this.stack.join(',')}]`;
                    
                    // Check if input was consumed (non-epsilon input)
                    const inputConsumed = chosenTransition.transition.input.split(',')[0] !== 'ε';
                    
                    // Update state
                    const nextState = this.automaton.states.find(s => s.name === chosenTransition.transition.to);
                    this.currentState = nextState;
                    
                    // Highlight new current state
                    const stateObj = this.stateObjects[nextState.name];
                    stateObj.sphere.material.color.set(0xFFC107);
                    stateObj.glowSphere.material.color.set(0xFFC107);
                    stateObj.glowSphere.material.opacity = 0.4;
                    
                    // Remove the packet
                    this.scene.remove(packet.object);
                    this.dataPackets = this.dataPackets.filter(p => p !== packet);
                    
                    // Move to next input if consumed
                    if (inputConsumed) {
                        this.inputIndex++;
                    }
                    
                    // Continue simulation based on mode
                    if (this.simulationRunning && !this.stepMode) {
                        setTimeout(() => this.processNextInput(), 500);
                    }
                    // Don't reset step mode here
                }
            );
        }
    }
    
    processTuringMachine() {
        // Check if we're in a final state
        if (this.currentState.final) {
            document.getElementById('simulation-status').textContent = 'Accepted ✓';
            
            // Highlight final state
            const stateObj = this.stateObjects[this.currentState.name];
            stateObj.sphere.material.color.set(0x4CAF50);
            stateObj.glowSphere.material.color.set(0x4CAF50);
            stateObj.glowSphere.material.opacity = 0.4;
            
            this.simulationRunning = false;
            // Don't reset step mode here
            
            // Re-enable buttons at end of simulation
            document.getElementById('step-simulation').disabled = false;
            document.getElementById('run-simulation').disabled = false;
            return;
        }
        
        // Current tape symbol at head position
        const currentSymbol = this.headPosition < this.tape.length ? 
                            this.tape[this.headPosition] : '_';
        
        document.getElementById('simulation-status').textContent = 
            `Processing: Symbol "${currentSymbol}" at position ${this.headPosition}`;
        
        // Parse transitions for TM (read→write,direction)
        const transition = this.automaton.transitions.find(t => 
            t.from === this.currentState.name && 
            t.input.startsWith(`${currentSymbol}→`)
        );
        
        if (!transition) {
            document.getElementById('simulation-status').textContent = 
                `Halted: No transition for symbol "${currentSymbol}" from state ${this.currentState.name}`;
            
            // Highlight current state in red
            const stateObj = this.stateObjects[this.currentState.name];
            stateObj.sphere.material.color.set(0xFF5252);
            stateObj.glowSphere.material.color.set(0xFF5252);
            stateObj.glowSphere.material.opacity = 0.4;
            
            this.simulationRunning = false;
            // Don't reset step mode here
            
            // Re-enable buttons when halted
            document.getElementById('step-simulation').disabled = false;
            document.getElementById('run-simulation').disabled = false;
            return;
        }
        
        // Highlight the transition
        const transObj = this.transitionObjects.find(t => 
            t.from === transition.from && t.to === transition.to && t.input === transition.input
        );
        
        if (transObj) {
            transObj.object.material.color.set(0xF44336);
            transObj.object.material.opacity = 1.0;
            if (transObj.cone) {
                transObj.cone.material.color.set(0xF44336);
            }
            
            // Create a data packet at the starting state
            const fromStateObj = this.stateObjects[transition.from];
            const packet = this.createDataPacket(fromStateObj.position.clone(), currentSymbol);
            
            // Parse the transition
            const [readWrite, direction] = transition.input.split(',');
            const [, writeSymbol] = readWrite.split('→');
            
            // Animate the data packet along the transition
            this.animateDataPacket(
                packet, 
                transObj.points, 
                this.animationSpeed, 
                () => {
                    // Update tape (write symbol)
                    if (this.headPosition >= this.tape.length) {
                        // Extend tape if needed
                        this.tape.push(writeSymbol);
                    } else {
                        this.tape[this.headPosition] = writeSymbol;
                    }
                    
                    // Update head position
                    if (direction === 'R') {
                        this.headPosition++;
                    } else if (direction === 'L') {
                        this.headPosition = Math.max(0, this.headPosition - 1);
                    }
                    // 'S' means stay, so no change to head position
                    
                    // Update tape display
                    document.getElementById('simulation-tape').textContent = 
                        `Tape: [${this.tape.join(',')}], Head: ${this.headPosition}`;
                    
                    // Update state
                    const nextState = this.automaton.states.find(s => s.name === transition.to);
                    this.currentState = nextState;
                    
                    // Highlight new current state
                    const stateObj = this.stateObjects[nextState.name];
                    stateObj.sphere.material.color.set(0xFFC107);
                    stateObj.glowSphere.material.color.set(0xFFC107);
                    stateObj.glowSphere.material.opacity = 0.4;
                    
                    // Remove the packet
                    this.scene.remove(packet.object);
                    this.dataPackets = this.dataPackets.filter(p => p !== packet);
                    
                    // Continue simulation based on mode
                    if (this.simulationRunning && !this.stepMode) {
                        setTimeout(() => this.processNextInput(), 500);
                    }
                    // Don't reset step mode here
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
        
        // Animate glowing effects
        const elapsedTime = this.clock.getElapsedTime();
        
        // Animate state glows
        if (this.stateObjects) {
            Object.values(this.stateObjects).forEach(stateObj => {
                if (stateObj.glowSphere) {
                    const scale = 1.0 + 0.1 * Math.sin(elapsedTime * 2);
                    stateObj.glowSphere.scale.set(scale, scale, scale);
                }
            });
        }
        
        this.renderer.render(this.scene, this.camera);
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
            background: rgba(0, 0, 0, 0.8);
            color: #fff;
            padding: 15px;
            border-radius: 8px;
            font-family: monospace;
            display: none;
        `;
        
        debugPanel.innerHTML = `
            <h3>Debug Information</h3>
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

        // Update current state info
        document.getElementById('debug-current-state').textContent = 
            `Current State: ${this.currentState ? this.currentState.name : '-'} ` +
            `(Initial: ${this.currentState?.initial ? 'Yes' : 'No'}, ` +
            `Final: ${this.currentState?.final ? 'Yes' : 'No'})`;

        // Update input info
        document.getElementById('debug-input').textContent = 
            `Input: "${this.inputString}" (Length: ${this.inputString.length})`;
        
        // Update position info
        document.getElementById('debug-position').textContent = 
            `Position: ${this.inputIndex + 1}/${this.inputString.length} ` +
            `(Current symbol: "${this.inputIndex < this.inputString.length ? this.inputString[this.inputIndex] : '-'}")`;

        // Update available transitions
        const availableTransitions = this.automaton.transitions
            .filter(t => t.from === this.currentState?.name)
            .map(t => `${t.from} --${t.input}--> ${t.to}`)
            .join('\n');
        document.getElementById('debug-transitions').innerHTML = 
            `Available Transitions:<br><pre>${availableTransitions || 'None'}</pre>`;

        // Update stack/tape based on automaton type
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