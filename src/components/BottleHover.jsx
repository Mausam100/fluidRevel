import React, { useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'

// Tuning: number of trail blobs kept in memory.
// Higher = smoother/longer trails, lower = snappier and cheaper.
const MAX_TRAIL = 12

const BottleShader = ({ normalImage, hoverImage }) => {
  const meshRef = useRef(null)
  const materialRef = useRef(null)
  const mouseRef = useRef({ x: 0.5, y: 0.5, prevX: 0.5, prevY: 0.5 })
  const velocityRef = useRef(0)
  const displacementRef = useRef(0)
  const trailRef = useRef([]) // {x,y,size,alpha}
  const { viewport } = useThree()
  const scaledRef = useRef({ w: viewport.width, h: viewport.height })

  const textures = useTexture({
    normalTex: normalImage,
    hoverTex: hoverImage
  })

  useEffect(() => {
    if (!materialRef.current) return
    
    // Ensure textures are set and properly loaded
    if (textures.normalTex && textures.hoverTex) {
      textures.normalTex.magFilter = THREE.LinearFilter
      textures.normalTex.minFilter = THREE.LinearMipmapLinearFilter
      textures.normalTex.colorSpace = THREE.SRGBColorSpace
      
      textures.hoverTex.magFilter = THREE.LinearFilter
      textures.hoverTex.minFilter = THREE.LinearMipmapLinearFilter
      textures.hoverTex.colorSpace = THREE.SRGBColorSpace
      
      materialRef.current.uniforms.uTexture1.value = textures.normalTex
      materialRef.current.uniforms.uTexture2.value = textures.hoverTex

      // Calculate aspect ratio from image (only once when textures load)
      if (textures.normalTex.source && textures.normalTex.source.data) {
        const img = textures.normalTex.source.data
        const imageAspect = img.width / img.height

        // Scale plane to fill viewport while maintaining aspect ratio
        let width = viewport.width
        let height = viewport.width / imageAspect

        // If height exceeds viewport, constrain by height
        if (height > viewport.height) {
          height = viewport.height
          width = viewport.height * imageAspect
        }

        scaledRef.current = { w: width, h: height }
        
        // Log dimensions for reference
        console.log('Window Size:', { viewportWidth: viewport.width, viewportHeight: viewport.height })
        console.log('Image Size:', { imageWidth: img.width, imageHeight: img.height })
        console.log('Plane Size:', { planeWidth: width, planeHeight: height })
      }
    }
  }, [textures.normalTex, textures.hoverTex, viewport.width, viewport.height])

  useFrame((state) => {
    if (!materialRef.current) return

    // Tuning: base animation rate. Increase for faster wobble, decrease for calmer.
    materialRef.current.uniforms.uTime.value += 0.016
    const targetDisplacement = displacementRef.current
    const current = materialRef.current.uniforms.uDisplacement.value
    // Tuning: responsiveness of reveal alpha (0.05-0.3 typical).
    // Higher factor snaps quicker; lower factor eases in/out more.
    materialRef.current.uniforms.uDisplacement.value += 
      (targetDisplacement - current) * 0.3

    // Decay trail over time and sync to uniforms
    const trail = trailRef.current
    for (let i = 0; i < trail.length; i++) {
      // Tuning: trail fade rate per frame (0.90-0.99 typical).
      // Lower value fades faster; higher value lingers longer.
      trail[i].alpha *= 0.98
    }
    // remove faint points
    // Tuning: minimum alpha threshold before removing oldest trail point.
    while (trail.length && trail[0].alpha < 0.08) trail.shift()

    const uTrail = materialRef.current.uniforms.uTrail.value
    const uTrailSize = materialRef.current.uniforms.uTrailSize.value
    const uTrailAlpha = materialRef.current.uniforms.uTrailAlpha.value
    for (let i = 0; i < MAX_TRAIL; i++) {
      const p = trail[i]
      if (p) {
        uTrail[i].set(p.x, p.y)
        uTrailSize[i] = p.size
        uTrailAlpha[i] = p.alpha
      } else {
        uTrail[i].set(-1, -1)
        uTrailSize[i] = 0
        uTrailAlpha[i] = 0
      }
    }
  })

  useEffect(() => {
    const onMouseMove = (event) => {
      // Normalize mouse position to 0-1 range
      const newX = event.clientX / window.innerWidth
      const newY = 1 - event.clientY / window.innerHeight

      // Calculate velocity magnitude
      const deltaX = newX - mouseRef.current.prevX
      const deltaY = newY - mouseRef.current.prevY
      velocityRef.current = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

      mouseRef.current.prevX = mouseRef.current.x
      mouseRef.current.prevY = mouseRef.current.y
      mouseRef.current.x = newX
      mouseRef.current.y = newY

      if (materialRef.current) {
        materialRef.current.uniforms.uVelocity.value = velocityRef.current
        // Keep displacement active while moving
        displacementRef.current = 1

        // Push to trail (latest at end)
        // Tuning: pointer sensitivity multiplier (increase to respond more to speed)
        const v = Math.min(1, velocityRef.current * 8)
        // Tuning: fluid blob size (base + range scaled by velocity)
        // Increase base (120) for larger constant reveal; increase range (220) for bigger speed-based expansion.
        const size = 35.0 + v * 20.0 // gaussian size factor
        trailRef.current.push({ x: newX, y: newY, size, alpha: 1 })
        if (trailRef.current.length > MAX_TRAIL) trailRef.current.shift()
      }
    }

    const onMouseLeave = () => {
      // Smooth fade out when leaving viewport
      displacementRef.current = 0
    }

    const onMouseEnter = () => {
      // Enable when entering viewport
      displacementRef.current = 1
    }

    window.addEventListener('pointermove', onMouseMove, { passive: true })
    window.addEventListener('mouseleave', onMouseLeave, { passive: true })
    window.addEventListener('mouseenter', onMouseEnter, { passive: true })

    return () => {
      window.removeEventListener('pointermove', onMouseMove)
      window.removeEventListener('mouseleave', onMouseLeave)
      window.removeEventListener('mouseenter', onMouseEnter)
    }
  }, [])

  // Fluid reveal shader using trail-driven gooey mask + flow noise
  const fragmentShader = `
    precision mediump float;
    const int MAX_TRAIL = 12;

    float rand(vec2 n) { return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 ip = floor(p);
      vec2 u = fract(p); u = u*u*(3.0 - 2.0*u);
      float res = mix(
        mix(rand(ip), rand(ip + vec2(1.0, 0.0)), u.x),
        mix(rand(ip + vec2(0.0, 1.0)), rand(ip + vec2(1.0, 1.0)), u.x),
        u.y);
      return res;
    }
    float fbm(vec2 p){
      float v = 0.0; float a = 0.5;
      for (int i=0;i<3;i++){ v += a * noise(p); p *= 2.0; a *= 0.5; }
      return v;
    }
    vec2 flow(vec2 p, float t){
      // Tuning: flow field frequency (1.0-3.0 typical) and time speed (t*0.1-0.5)
      float n1 = fbm(p*1.5 + vec2(0.0, t*0.2));
      float n2 = fbm(p*1.5 + vec2(5.2, t*0.2));
      return vec2(n1 - 0.5, n2 - 0.5);
    }

    uniform sampler2D uTexture1;
    uniform sampler2D uTexture2;
    uniform float uDisplacement;
    uniform float uTime;
    uniform float uVelocity;
    uniform vec2 uTrail[MAX_TRAIL];
    uniform float uTrailSize[MAX_TRAIL];
    uniform float uTrailAlpha[MAX_TRAIL];

    varying vec2 vUv;

    void main(){
      vec2 uv = vUv;

      // Gooey mask from recent pointer trail (compute first)
      float mask = 0.0;
      for (int i=0; i<MAX_TRAIL; i++){
        float s = uTrailSize[i]; // gaussian factor (Tuning: adjust from JS side)
        float a = uTrailAlpha[i];
        vec2 p = uTrail[i];
        vec2 d = uv - p;
        float r2 = dot(d,d);
        float influence = exp(-r2 * s) * a; // gaussian
        mask = max(mask, influence);
      }

      // Edge wobble adds fluid look
      // Tuning: wobble frequency (uv*2.0), time speed (uTime*0.2), amplitude (* 0.35)
      float edgeNoise = (fbm(uv*3.0 + vec2(uTime*0.5)) - 0.5) * 0.15;
      mask += edgeNoise;
      mask = clamp(mask, 0.0, 1.0);

      // Smooth thresholding
      // Tuning: reveal softness via thresholds (0.35 start, 0.65 end)
      float alpha = smoothstep(0.25, 0.65, mask) * uDisplacement;

      // Sample base always with original UVs (no distortion)
      vec4 baseTex = texture2D(uTexture1, uv);
      if (alpha < 0.001) { gl_FragColor = baseTex; return; }

      // Do not distort the reveal/background either — sample with original UVs
      vec4 revealTex = texture2D(uTexture2, uv);

      // Optional: to add more fluid motion, warp sampling UVs slightly:
      // vec2 f = flow(uv*1.2, uTime);
      // revealTex = texture2D(uTexture2, uv + f*0.02);

      gl_FragColor = mix(baseTex, revealTex, alpha);
    }
  `

  const vertexShader = `
    varying vec2 vUv;
    
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `

  return (
    // Use actual image dimensions for plane
    <mesh ref={meshRef}>
      <planeGeometry args={[scaledRef.current.w, scaledRef.current.h, 1, 1]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={{
          uTexture1: { value: textures.normalTex },
          uTexture2: { value: textures.hoverTex },
          uDisplacement: { value: 0.0 },
          uTime: { value: 0.0 },
          uVelocity: { value: 0.0 },
          // trail uniforms
          uTrail: { value: Array.from({ length: MAX_TRAIL }, () => new THREE.Vector2(-5, -5)) },
          uTrailSize: { value: Array.from({ length: MAX_TRAIL }, () => 0) },
          uTrailAlpha: { value: Array.from({ length: MAX_TRAIL }, () => 0) }
        }}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  )
}

const BottleHover = ({ normalImage, hoverImage }) => {
  return (
    <Canvas>
      <BottleShader  normalImage={normalImage} hoverImage={hoverImage} />
    </Canvas>
  )
}

export default BottleHover
