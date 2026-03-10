# Interactive Telecommunications & Signal Processing Simulator

## Overview
This project is a comprehensive, interactive educational platform designed to visualize and teach core concepts in telecommunications, wireless communications, and signal processing. Through a series of dynamic, step-by-step simulations, users can explore complex mathematical and physical phenomena—from basic signal modulation to advanced 4G/5G channel estimation techniques.

## Simulation Modules
The application features a suite of specialized simulators located in `src/components/simulations`, each focusing on a distinct area of telecommunications:

- **Signal Recovery & Channel Estimation (`SignalRecoverySimulator`)**: Demonstrates how modern User Equipment (UE) uses known Pilot Signals to map a city's multipath impulse response and mathematically untangle the received signal using Zero-Forcing Equalization in the frequency domain.
- **Cellular Network Simulator (`CellularSimulator`)**: Visualizes cellular topologies, frequency reuse, and handoff mechanisms as users move between cell towers.
- **Doppler Effect Simulator (`DopplerSimulator`)**: Illustrates how relative motion between a transmitter and receiver shifts the frequency of the signal, impacting high-speed communications.
- **Modulation Simulator (`ModulationSimulator`)**: An interactive playground for exploring different digital and analog modulation schemes, showing how data is mapped onto carrier waves.
- **Multipath Fading Simulator (`MultipathSimulator`)**: Focuses on the physical environment, showing how constructive and destructive interference from multiple signal paths causes fading and signal degradation.
- **Propagation Simulator (`PropagationSimulator`)**: Models how electromagnetic waves travel through space, demonstrating path loss, attenuation, and the inverse-square law.
- **Trunking & Traffic Simulator (`TrunkingSimulator`)**: Explores Erlang capacity, blocking probabilities, and how limited channel resources are shared among a large pool of users in a network.

## Design & Assets
The application is built with a modern, technical dashboard aesthetic to make complex mathematical concepts accessible, engaging, and highly visual.

- **Styling**: **Tailwind CSS** is used for a clean, responsive, and professional interface with a consistent "Technical/Cyber" color palette (slate, indigo, emerald, amber).
- **Visualizations**: 
  - **Chart.js (`react-chartjs-2`) & Recharts**: Used extensively for rendering discrete time-domain signals (using stepped lines and bar charts), continuous frequency spectrums, and real-time data plots.
  - **KaTeX (`react-katex`)**: Renders complex mathematical formulas (like Convolution, Fourier Transforms, and Shannon Capacity) cleanly and natively in the browser.
- **Animations**: **Framer Motion (`motion/react`)** powers dynamic SVG waves, moving vehicles, propagating signals, and smooth UI transitions across all simulators.
- **Icons**: **Lucide React** provides crisp, consistent iconography throughout the application.

## Future Haptics Integration
The design and interactive assets across the entire codebase have been specifically structured with future **haptic feedback** integration in mind. The following interactions are prime candidates for haptic enhancements to deepen the educational experience:
- **Sliders & Toggles**: Adjusting channel taps, noise variance, carrier frequencies, or vehicle speeds will feature subtle, granular haptic clicks (e.g., a "ratchet" feel as values increase/decrease).
- **Action Buttons**: Transmitting signals, performing FFTs, switching modulation schemes, or initiating network handoffs will trigger distinct, satisfying haptic confirmations.
- **Success/Error States**: Successfully recovering a signal, dropping a call in the Trunking simulator, or encountering bit-mismatch errors due to noise will be accompanied by unique haptic patterns to reinforce the learning outcome physically.
- **Animated Waves & Physics**: The continuous flow of SVG signal paths, Doppler frequency shifts, and constructive/destructive interference peaks could be paired with ambient, rhythmic haptic pulses on supported devices, allowing users to literally "feel" the physics of the waves.

## Tech Stack
- **Frontend Framework**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4
- **Math & Logic**: Math.js
- **Charting**: Chart.js, Recharts
- **Animation**: Framer Motion
- **Math Rendering**: KaTeX
