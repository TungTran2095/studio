"use client";

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface ThreeDData {
  winRate: number;
  totalTrades: number;
  avgProfit: number;
  expectedReturn: number;
  successRate: number;
}

interface ThreeDChartProps {
  data: ThreeDData[];
}

export default function ThreeDChart({ data }: ThreeDChartProps) {
  console.log('ThreeDChart component rendered with data length:', data.length);
  
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  useEffect(() => {
    console.log('ThreeDChart useEffect triggered with data length:', data.length);
    if (!mountRef.current || data.length === 0) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    sceneRef.current = scene;

    // Camera setup with isometric-like perspective
    const camera = new THREE.PerspectiveCamera(
      45, 
      mountRef.current.clientWidth / mountRef.current.clientHeight, 
      0.1, 
      1000
    );
    camera.position.set(15, 15, 15);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Grid
    const gridHelper = new THREE.GridHelper(20, 20, 0xcccccc, 0xcccccc);
    scene.add(gridHelper);

    // Process data
    const winRates = [...new Set(data.map(d => d.winRate))].sort((a, b) => a - b);
    const tradeCounts = [...new Set(data.map(d => d.totalTrades))].sort((a, b) => a - b);
    const returns = data.map(d => d.expectedReturn);
    const minReturn = Math.min(...returns);
    const maxReturn = Math.max(...returns);

    // Color function
    const getColor = (value: number) => {
      const normalized = (value - minReturn) / (maxReturn - minReturn);
      if (normalized < 0.3) return new THREE.Color(0xef4444); // Red
      if (normalized < 0.6) return new THREE.Color(0xf59e0b); // Orange
      return new THREE.Color(0x22c55e); // Green
    };

    // Create bars
    data.forEach((item, index) => {
      const xIndex = winRates.indexOf(item.winRate);
      const yIndex = tradeCounts.indexOf(item.totalTrades);
      
      if (xIndex !== -1 && yIndex !== -1) {
        // Calculate position
        const x = (xIndex - winRates.length / 2) * 0.8;
        const z = (yIndex - tradeCounts.length / 2) * 0.8;
        
        // Calculate height
        const normalizedReturn = (item.expectedReturn - minReturn) / (maxReturn - minReturn);
        const height = Math.max(0.1, normalizedReturn * 5);
        const y = height / 2;

        // Create bar geometry
        const geometry = new THREE.BoxGeometry(0.6, height, 0.6);
        const material = new THREE.MeshLambertMaterial({ 
          color: getColor(item.expectedReturn),
          transparent: true,
          opacity: 0.8
        });
        
        const bar = new THREE.Mesh(geometry, material);
        bar.position.set(x, y, z);
        bar.castShadow = true;
        bar.receiveShadow = true;
        
        scene.add(bar);

        // Add value label for significant bars
        if (Math.abs(item.expectedReturn) > 10) {
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (context) {
            canvas.width = 128;
            canvas.height = 32;
            context.fillStyle = '#000000';
            context.font = 'bold 16px Arial';
            context.textAlign = 'center';
            context.fillText(`${item.expectedReturn.toFixed(1)}%`, 64, 20);
            
            const texture = new THREE.CanvasTexture(canvas);
            const labelMaterial = new THREE.SpriteMaterial({ map: texture });
            const label = new THREE.Sprite(labelMaterial);
            label.position.set(x, y + height/2 + 0.5, z);
            label.scale.set(2, 0.5, 1);
            scene.add(label);
          }
        }
      }
    });

    // Add axes with labels
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    // Add axis labels
    const createAxisLabel = (text: string, position: [number, number, number], color: string) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (context) {
        canvas.width = 256;
        canvas.height = 64;
        context.fillStyle = color;
        context.font = 'bold 24px Arial';
        context.textAlign = 'center';
        context.fillText(text, 128, 40);
        
        const texture = new THREE.CanvasTexture(canvas);
        const labelMaterial = new THREE.SpriteMaterial({ map: texture });
        const label = new THREE.Sprite(labelMaterial);
        label.position.set(...position);
        label.scale.set(4, 1, 1);
        scene.add(label);
      }
    };

    // Add axis labels
    createAxisLabel('Win Rate (%)', [0, 0, -8], '#ff0000');
    createAxisLabel('Number of Trades', [8, 0, 0], '#00ff00');
    createAxisLabel('Expected Return (%)', [0, 8, 0], '#0000ff');

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Rotate camera slowly for better 3D effect
      const time = Date.now() * 0.0001;
      camera.position.x = 15 * Math.cos(time);
      camera.position.z = 15 * Math.sin(time);
      camera.lookAt(0, 0, 0);
      
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return;
      
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [data]);

  return (
    <div className="w-full h-full">
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
} 