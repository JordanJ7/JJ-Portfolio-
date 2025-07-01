import * as THREE from 'three';

// Function to generate a dynamic texture using Canvas
export function generateDynamicTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // used Draw generative art on the canvas
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = 'white';
    for (let i = 0; i < 100; i++) {
        ctx.beginPath();
        ctx.arc(
            Math.random() * 512,
            Math.random() * 512,
            Math.random() * 50,
            0,
            Math.PI * 2
        );
        ctx.fill();
    }

    // Create and return the THREE.js CanvasTexture
    return new THREE.CanvasTexture(canvas);
}