import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

class AudioVisualizer {
  constructor() {
    // DOM elements
    this.canvas2d = document.getElementById('canvas2d');
    this.canvas3d = document.getElementById('canvas3d');
    this.startBtn = document.getElementById('startBtn');
    this.visualizerSelect = document.getElementById('visualizerSelect');
    this.status = document.getElementById('status');
    this.fullscreenBtn = document.getElementById('fullscreenBtn');
    this.controls = document.querySelector('.controls');

    // Audio context setup
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
    this.source = null;
    this.currentStream = null;

    // Canvas 2D setup
    this.ctx = this.canvas2d.getContext('2d');
    this.particles = [];

    // Three.js setup
    this.initThreeJS();
    this.handleResize(); // Call resize immediately after init

    // Event listeners
    this.setupEventListeners();
    this.setupControlsVisibility();

    // Start render loop
    this.render();
  }

  initThreeJS() {
    // Scene
    this.scene = new THREE.Scene();
    
    // Camera
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.z = 15;
    this.camera.position.y = 5;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ 
      canvas: this.canvas3d.querySelector('canvas'),
      antialias: true,
      alpha: true 
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);

    // Controls
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.05;
    this.orbitControls.enableZoom = true;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(directionalLight);

    // Initialize 3D objects
    this.initializeCubes();
    this.initializeSphere();
    this.initializeTerrain();
  }

  initializeCubes() {
    this.cubes = [];
    const geometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const material = new THREE.MeshPhongMaterial({
      color: 0x00ff00,
      specular: 0x666666,
      emissive: 0x00ff00,
      shininess: 10,
      transparent: true,
      opacity: 0.8
    });

    for (let i = 0; i < 64; i++) {
      const cube = new THREE.Mesh(geometry, material.clone());
      cube.position.x = (i - 32) * 0.4;
      cube.position.y = 0;
      this.cubes.push(cube);
    }
  }

  initializeSphere() {
    const geometry = new THREE.SphereGeometry(2, 64, 64);
    const material = new THREE.MeshPhongMaterial({
      color: 0x0088ff,
      wireframe: true,
      transparent: true,
      opacity: 0.8
    });
    this.sphere = new THREE.Mesh(geometry, material);
  }

  initializeTerrain() {
    const geometry = new THREE.PlaneGeometry(20, 20, 128, 128);
    const material = new THREE.MeshPhongMaterial({
      color: 0x00ff88,
      wireframe: true,
      side: THREE.DoubleSide
    });
    this.terrain = new THREE.Mesh(geometry, material);
    this.terrain.rotation.x = -Math.PI / 2;
  }

  async startAudioCapture() {
    try {
      if (this.currentStream) {
        this.currentStream.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
      this.currentStream = stream;

      if (!this.audioContext) {
        this.audioContext = new AudioContext();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 2048;
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      }

      this.source = this.audioContext.createMediaStreamSource(stream);
      this.source.connect(this.analyser);
      
      this.status.textContent = 'Visualizing audio...';
      this.startBtn.textContent = 'Change Source';

      stream.getAudioTracks()[0].onended = () => {
        this.status.textContent = 'Audio capture ended. Select a new source.';
        this.startBtn.textContent = 'Select Audio Source';
        this.currentStream = null;
      };
    } catch (err) {
      console.error('Error capturing audio:', err);
      this.status.textContent = 'Error capturing audio. Please try again.';
    }
  }

  render() {
    requestAnimationFrame(this.render.bind(this));
    
    if (!this.analyser) return;
    
    this.analyser.getByteFrequencyData(this.dataArray);
    const visualizerType = this.visualizerSelect.value;

    // Clear previous frame
    if (visualizerType === 'cubes' || visualizerType === 'sphere' || visualizerType === 'terrain') {
      this.canvas2d.style.display = 'none';
      this.canvas3d.style.display = 'block';
      this.scene.clear();
      this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(5, 5, 5);
      this.scene.add(directionalLight);
      this.orbitControls.update();
    } else {
      this.canvas2d.style.display = 'block';
      this.canvas3d.style.display = 'none';
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      this.ctx.fillRect(0, 0, this.canvas2d.width, this.canvas2d.height);
    }

    // Update orbit controls if using 3D visualization
    if (visualizerType === 'cubes' || visualizerType === 'sphere' || visualizerType === 'terrain') {
      this.orbitControls.update();
    }

    // Render selected visualizer
    switch (visualizerType) {
      case 'bars': this.renderBars(); break;
      case 'circular': this.renderCircular(); break;
      case 'wave': this.renderWave(); break;
      case 'particles': this.renderParticles(); break;
      case 'cubes': this.renderCubes(); break;
      case 'sphere': this.renderSphere(); break;
      case 'terrain': this.renderTerrain(); break;
    }

    // Make sure to render the 3D scene if needed
    if (visualizerType === 'cubes' || visualizerType === 'sphere' || visualizerType === 'terrain') {
      this.renderer.render(this.scene, this.camera);
    }
  }

  renderBars() {
    const barWidth = this.canvas2d.width / this.analyser.frequencyBinCount * 2.5;
    const barSpacing = 1;

    for (let i = 0; i < this.analyser.frequencyBinCount; i++) {
      const barHeight = this.dataArray[i] * 2;
      const x = i * (barWidth + barSpacing);
      const y = this.canvas2d.height - barHeight;

      const gradient = this.ctx.createLinearGradient(x, y, x, this.canvas2d.height);
      gradient.addColorStop(0, `hsl(${i / this.analyser.frequencyBinCount * 360}, 100%, 50%)`);
      gradient.addColorStop(1, `hsl(${i / this.analyser.frequencyBinCount * 360}, 100%, 20%)`);

      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(x, y, barWidth, barHeight);
    }
  }

  renderCircular() {
    const centerX = this.canvas2d.width / 2;
    const centerY = this.canvas2d.height / 2;
    const radius = Math.min(centerX, centerY) - 50;

    for (let i = 0; i < this.analyser.frequencyBinCount; i++) {
      const angle = (i * 2 * Math.PI) / this.analyser.frequencyBinCount;
      const value = this.dataArray[i];
      const length = value * 1.5;

      const x1 = centerX + Math.cos(angle) * radius;
      const y1 = centerY + Math.sin(angle) * radius;
      const x2 = centerX + Math.cos(angle) * (radius + length);
      const y2 = centerY + Math.sin(angle) * (radius + length);

      this.ctx.strokeStyle = `hsl(${(i / this.analyser.frequencyBinCount) * 360}, 100%, 50%)`;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.lineTo(x2, y2);
      this.ctx.stroke();
    }
  }

  renderWave() {
    this.ctx.beginPath();
    this.ctx.strokeStyle = `hsl(${Date.now() / 50 % 360}, 100%, 50%)`;
    this.ctx.lineWidth = 2;

    for (let i = 0; i < this.analyser.frequencyBinCount; i++) {
      const x = (i / this.analyser.frequencyBinCount) * this.canvas2d.width;
      const y = (this.dataArray[i] / 128.0) * (this.canvas2d.height / 2);
      
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }

    this.ctx.stroke();
  }

  renderParticles() {
    if (!this.particles.length) {
      for (let i = 0; i < 100; i++) {
        this.particles.push({
          x: Math.random() * this.canvas2d.width,
          y: Math.random() * this.canvas2d.height,
          size: Math.random() * 5 + 2,
          speedX: Math.random() * 2 - 1,
          speedY: Math.random() * 2 - 1
        });
      }
    }

    const avgFrequency = Array.from(this.dataArray).reduce((a, b) => a + b) / this.dataArray.length;

    this.particles.forEach(particle => {
      particle.x += particle.speedX * (avgFrequency / 128);
      particle.y += particle.speedY * (avgFrequency / 128);

      if (particle.x < 0) particle.x = this.canvas2d.width;
      if (particle.x > this.canvas2d.width) particle.x = 0;
      if (particle.y < 0) particle.y = this.canvas2d.height;
      if (particle.y > this.canvas2d.height) particle.y = 0;

      this.ctx.beginPath();
      this.ctx.fillStyle = `hsla(${avgFrequency}, 100%, 50%, 0.8)`;
      this.ctx.arc(particle.x, particle.y, particle.size * (avgFrequency / 128), 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  renderCubes() {
    // Remove any existing meshes
    this.scene.clear();
    
    // Add lights back
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(ambientLight);
    this.scene.add(directionalLight);

    // Add and update cubes
    this.cubes.forEach((cube, i) => {
      const value = this.dataArray[i] / 128.0;
      cube.scale.y = value * 3 + 0.1;
      cube.position.y = (value * 3) / 2;
      cube.material.color.setHSL(i / this.cubes.length, 0.8, 0.5);
      cube.material.emissive.setHSL(i / this.cubes.length, 1, 0.2 * value);
      this.scene.add(cube);
    });

    this.renderer.render(this.scene, this.camera);
  }

  renderSphere() {
    this.scene.clear();
    
    // Add lights back
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(ambientLight);
    this.scene.add(directionalLight);

    this.scene.add(this.sphere);
    
    const vertices = this.sphere.geometry.attributes.position;
    const avgFrequency = Array.from(this.dataArray).reduce((a, b) => a + b) / this.dataArray.length;
    
    for (let i = 0; i < vertices.count; i++) {
      const offset = (this.dataArray[i % this.dataArray.length] / 255) * 0.5;
      const originalVert = this.sphere.geometry.attributes.position.array;
      vertices.array[i * 3] = originalVert[i * 3] * (1 + offset);
      vertices.array[i * 3 + 1] = originalVert[i * 3 + 1] * (1 + offset);
      vertices.array[i * 3 + 2] = originalVert[i * 3 + 2] * (1 + offset);
    }
    
    vertices.needsUpdate = true;
    this.sphere.rotation.x += 0.01;
    this.sphere.rotation.y += 0.01;
    
    this.renderer.render(this.scene, this.camera);
  }

  renderTerrain() {
    this.scene.clear();
    
    // Add lights back
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    this.scene.add(ambientLight);
    this.scene.add(directionalLight);

    this.scene.add(this.terrain);
    
    const vertices = this.terrain.geometry.attributes.position;
    
    for (let i = 0; i < vertices.count; i++) {
      const value = this.dataArray[i % this.dataArray.length] / 128.0;
      vertices.array[i * 3 + 2] = Math.sin(i) * value;
    }
    
    vertices.needsUpdate = true;
    this.terrain.rotation.z += 0.005;
    
    this.renderer.render(this.scene, this.camera);
  }

  setupEventListeners() {
    window.addEventListener('resize', this.handleResize.bind(this));
    this.startBtn.addEventListener('click', () => this.startAudioCapture());
    this.fullscreenBtn.addEventListener('click', this.toggleFullscreen.bind(this));
    this.visualizerSelect.addEventListener('change', () => {
      if (this.visualizerSelect.value === 'particles') {
        this.particles = [];
      }
    });
  }

  setupControlsVisibility() {
    let timeout;
    document.addEventListener('mousemove', () => {
      this.controls.classList.remove('hidden');
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        this.controls.classList.add('hidden');
      }, 3000);
    });
  }

  handleResize() {
    // Update 2D canvas
    this.canvas2d.width = window.innerWidth;
    this.canvas2d.height = window.innerHeight;

    // Update 3D renderer
    if (this.renderer) {
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }
  }

  async toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
    }
  }
}

// Initialize the visualizer
document.addEventListener('DOMContentLoaded', () => {
  new AudioVisualizer();
});