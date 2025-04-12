# 3D Automata Simulator

An interactive 3D visualization tool for formal language theory and automata. Built for students, educators, and enthusiasts of theoretical computer science.

[🔗 **Live Demo**](#) *(Insert actual link here)*

---

## 🎯 Overview

**3D Automata Simulator** provides an intuitive, visual platform to explore and understand core concepts in automata theory. By simulating Finite Automata (FA), Pushdown Automata (PDA), and Turing Machines (TM) in a 3D interactive environment, the tool bridges the gap between abstract formalism and visual intuition.

---

## 🚀 Features

### 🔄 Automata Types Supported
- **Finite Automata (FA)**
- **Pushdown Automata (PDA)**
- **Turing Machines (TM)**

### 🧠 Visual Components
- Real-time **3D representation** of states and transitions
- **Animated input processing** with data packet visualization
- **Color-coded states**: Initial, Final, and Current
- **Interactive camera controls**: rotate, pan, zoom

### 🕹️ Simulation Options
- **Step-by-step** or **automatic** simulation
- Instant **acceptance/rejection feedback**
- **Speed adjustment** for animations
- **Stack visualization** for PDAs
- **Tape visualization** for Turing Machines

### 🧩 User Interface
- Intuitive tools to **create states and transitions**
- Built-in **example library** of common automata
- Integrated **tutorials and explanations**

---

## 🧪 How to Use

### 📷 Basic Controls
- **Rotate camera**: Click and drag
- **Zoom**: Use scroll wheel
- **Create Automaton**: Add states/transitions and click "Create Automaton"
- **Simulate Input**: Enter string and click "Run" or "Step"

### 🛠️ Creating Automata

#### Finite Automata (FA)
- Add states, mark initial/final states
- Define transitions using input symbols

#### Pushdown Automata (PDA)
- Use transition format: `a,X→Y`  
  *(read 'a', pop 'X', push 'Y')*

#### Turing Machine (TM)
- Use transition format: `a→b,R`  
  *(read 'a', write 'b', move right)*

### ▶️ Running Simulations
- Enter an input string (e.g., `aabba`)
- Choose **Run** for full simulation or **Step** to advance symbol-by-symbol
- Visual outcome: **Green** for accepted, **Red** for rejected

---

## 📚 Example Automata Library

Includes several ready-to-run automata:
- **DFA**: Strings ending with `'a'`
- **DFA**: Even number of `'a'`s
- **DFA**: Strings starting with `"ab"`
- **PDA**: Palindromes over `{a, b}`
- **PDA**: Language `aⁿbⁿ`
- **TM**: Binary increment operation

---

## 🎓 Educational Resources

- Core concepts in **automata theory**
- Differences between **FA**, **PDA**, and **TM**
- Guided walkthroughs for **building and testing automata**
- Visual explanations of **computational logic**

---

## ⚙️ Technical Stack

- **Frontend**: HTML5, CSS3, JavaScript
- **3D Engine**: [Three.js](https://threejs.org)
- **Architecture**: Entirely client-side, no backend dependencies
- **Responsive Design**: Optimized for desktop and mobile

---

## 🌐 Browser Compatibility

Fully tested on:
- ✅ Chrome *(Recommended)*
- ✅ Firefox
- ✅ Edge
- ✅ Safari

---

## 🛠️ Local Development

```bash
# Clone the repository
git clone https://github.com/username/3d-automata-simulator.git

# Navigate to the project folder
cd 3d-automata-simulator

# Open the project in your browser (option 1)
open index.html

# OR run a local server (option 2)
python -m http.server
# Then visit: http://localhost:8000
```

---

## 🤝 Contributing

All contributions are welcome!  
To contribute:

1. Fork the repo  
2. Create your feature branch:  
   `git checkout -b feature/amazing-feature`
3. Commit your changes:  
   `git commit -m "Add amazing feature"`
4. Push to your branch:  
   `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License**.  
See the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Inspired by the need for engaging visual aids in computer science education
- Special thanks to educators and students pushing the boundaries of learning

---

**Created with ❤️ for the next generation of computer scientists**

---

Let me know if you'd like a version in Turkish or want this as a `README.md` file directly.
