# 3D Automata Simulator User Guide

## Introduction

The 3D Automata Simulator is an interactive tool for visualizing and simulating various types of automata:

- Finite Automata (FA)
- Pushdown Automata (PDA)
- Turing Machines (TM)

This guide will help you understand how to use the simulator, create your own automata, and run simulations.

## Getting Started

### Interface Overview

- **Main Canvas**: 3D visualization of the automaton
- **Control Panel**: Left side - create and modify automata
- **Input Panel**: Bottom - run simulations with input strings
- **Examples Panel**: Access pre-built automata examples
- **Tutorial Panel**: Learn about automata concepts

### Basic Controls

- **Camera Navigation**: 
  - Drag with mouse to rotate the view
  - Scroll to zoom in and out
- **States and Transitions**: 
  - Blue spheres are initial states
  - Green spheres are final/accepting states
  - White spheres are regular states
  - Orange arrows are transitions between states

## Creating an Automaton

1. Select the automaton type (FA, PDA, TM) from the dropdown
2. Add states:
   - Click the "+" button to add new states
   - Set state name
   - Check "Initial" for the starting state
   - Check "Final" for accepting states
3. Add transitions:
   - Select "from" and "to" states
   - Enter the input symbol or transition rule
   - Click "+" to add more transitions
4. Click "Create Automaton" to visualize your automaton

### Transition Notation

- **For Finite Automata**:
  - Simply enter the input symbol (e.g., "a", "b", "0", "1")

- **For Pushdown Automata**:
  - Use the format: `input,pop→push`
  - Examples:
    - `a,ε→X`: Read 'a', push 'X' (no pop)
    - `b,X→ε`: Read 'b', pop 'X' (no push)
    - `ε,ε→ε`: Epsilon transition (no input, no stack op)

- **For Turing Machines**:
  - Use the format: `read→write,direction`
  - Examples:
    - `a→b,R`: Read 'a', write 'b', move right
    - `1→0,L`: Read '1', write '0', move left
    - `_→X,S`: Read blank, write 'X', stay in place

## Running Simulations

1. Enter an input string in the input field
2. Click "Run" for automatic simulation or "Step" for step-by-step execution
3. Watch as the input symbols travel through the automaton as glowing packets
4. The simulation ends with either:
   - Green state (acceptance)
   - Red state (rejection)

### Controls During Simulation

- **Run**: Automatically process the entire input
- **Step**: Process one input symbol at a time
- **Reset**: Clear current simulation and start over
- **Speed**: Adjust animation speed with the slider

## Example Automata

Click "Example Automata" to access pre-built examples:

- **Finite Automata**:
  - Strings ending with 'a'
  - Even number of 'a's
  - Strings starting with "ab"

- **Pushdown Automata**:
  - Palindromes
  - a^n b^n language

- **Turing Machines**:
  - Binary increment
  
## Learning Resources

Click "How It Works" to access the tutorial:

- Basic concepts of automata theory
- Step-by-step explanations of simulation process
- Tips for designing different types of automata

## Troubleshooting

If you encounter issues:

- Check the console for error messages (F12 in most browsers)
- Make sure all states have appropriate transitions
- For PDAs, ensure stack operations are correctly formatted
- For TMs, verify tape operations and direction indicators