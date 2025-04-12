
# 🚀 3D Automata Simulator

**An interactive 3D visualization tool for exploring formal language theory and automata.**  
Designed for students, educators, and theoretical computer science enthusiasts.

[🔗 **Live Demo**](https://github.com/user-attachments/assets/4be34ab7-c98d-405e-b513-4dad9c99c880)  
*(View the simulator in action)*

---

## 📌 What Is This?

**3D Automata Simulator** offers a hands-on, visual approach to learning the foundations of automata theory.  
It allows users to design, simulate, and analyze:

- Finite Automata (FA)
- Pushdown Automata (PDA)
- Turing Machines (TM)

in a fully interactive 3D environment powered by **Three.js**.

---

## 🎯 Key Features

### 🧠 Supported Automata Types
- ✅ **Finite Automata (FA)**
- ✅ **Pushdown Automata (PDA)**
- ✅ **Turing Machines (TM)**

### 🔍 Visual Experience
- Dynamic **3D state and transition rendering**
- **Animated tokens** for real-time input processing
- **Color-coded state indicators** (initial, final, current)
- Smooth camera **rotation, panning, and zooming**

### ⚙️ Simulation Mechanics
- **Step-by-step** or **automated** simulation modes
- **Acceptance/rejection** status visualization
- **Animation speed control**
- **Stack rendering** for PDA
- **Tape visualization** for TM

### 🧰 User Interaction
- Simple UI to **create and edit automata**
- **Example library** with classic problems
- Embedded **educational content** and walkthroughs

---

## 🧪 How to Use

### 🎮 Controls
- **Rotate camera**: Click & drag
- **Zoom**: Scroll
- **Pan**: Right-click drag
- **Run/Step**: Execute simulation

### 🛠 Building Automata

**For FA:**
- Add states → Mark initial/final → Define transitions (e.g., `a`)

**For PDA:**
- Transition format: `a,X→Y`  
  *(read `a`, pop `X`, push `Y`)*

**For TM:**
- Transition format: `a→b,R`  
  *(read `a`, write `b`, move right)*

### ▶️ Running Simulations
1. Select automaton type
2. Enter input (e.g., `aabba`)
3. Click **Run** or **Step**
4. Observe acceptance (✅ green) or rejection (❌ red)

---

## 📚 Example Automata Included

- DFA: Strings ending with `'a'`
- DFA: Even number of `'a'`s
- DFA: Strings beginning with `"ab"`
- PDA: Palindromes over `{a, b}`
- PDA: Language `aⁿbⁿ`
- TM: Binary number increment

---

## 🎓 Learning Resources

- Foundations of **automata theory**
- Comparison between **FA**, **PDA**, and **TM**
- Interactive **tutorials and exercises**
- Visual breakdown of computational flow

---

## 🛠 Tech Stack

| Component    | Technology         |
|--------------|--------------------|
| Frontend     | HTML5, CSS3, JavaScript |
| 3D Rendering | [Three.js](https://threejs.org) |
| Deployment   | 100% Client-side (No backend) |
| Design       | Responsive UI (Desktop & Mobile) |

---

## 🌐 Browser Support

Tested and verified on:

- ✅ Chrome *(recommended)*
- ✅ Firefox
- ✅ Safari
- ✅ Microsoft Edge

---

## 🧑‍💻 Run Locally

```bash
# Clone the repository
git clone https://github.com/username/3d-automata-simulator.git

# Navigate into the directory
cd 3d-automata-simulator

# Open directly in browser
open index.html

# OR launch a simple local server
python -m http.server
# Visit: http://localhost:8000
```

---

## 🤝 Contributing

We welcome contributions from the community!

1. **Fork** the project  
2. Create a new branch:  
   `git checkout -b feature/amazing-feature`  
3. Commit your changes:  
   `git commit -m "Add amazing feature"`  
4. Push to GitHub:  
   `git push origin feature/amazing-feature`  
5. Open a **Pull Request**

---

## 📜 License

This project is open-source and available under the **MIT License**.  
See the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Inspired by the need for accessible tools in theoretical computer science education  
- Huge thanks to all educators and contributors who simplify complexity for learners worldwide

---

**Crafted with ❤️ for curious minds and future computer scientists.**
