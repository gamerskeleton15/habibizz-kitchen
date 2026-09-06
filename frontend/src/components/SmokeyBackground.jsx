// SmokeyBackground - a self-contained WebGL1 animated smoke background.
// Renders a full-bleed canvas of slow, curling smoke behind its children
// (the card or content sits on top). Ported from the shadcn login-form
// demo component and adapted for this project (React + Vite + Tailwind +
// plain JavaScript - no TypeScript).
//
// The smoke is tinted by the `color` prop (defaults to brand yellow) and
// `intensity` controls how much shows. Falls back to a static CSS gradient
// if WebGL is unavailable, and renders a single static frame for users who
// prefer reduced motion.

import { useRef, useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'

export default function SmokeyBackground({
  color = '#FFD400',
  intensity = 0.35,
  className,
  style,
  children,
  ...rest
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const frameIdRef = useRef(undefined)
  const startTimeRef = useRef(0)

  const shouldReduceMotion = useReducedMotion()
  const [isMounted, setIsMounted] = useState(false)
  const [webglFailed, setWebglFailed] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    return () => setIsMounted(false)
  }, [])

  // Set up WebGL1, compile the smoke shader, and run the animation loop.
  // Fully torn down on unmount (frame loop, ResizeObserver, GPU objects).
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container || !isMounted) return

    // WebGL1 is plenty - this is a single fullscreen pass. If the context
    // is unavailable we switch to the static CSS gradient fallback below.
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) {
      setWebglFailed(true)
      return
    }

    const vertexShaderSource = `
    attribute vec2 a_position;
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
    }`

    const vertexShader = gl.createShader(gl.VERTEX_SHADER)
    gl.shaderSource(vertexShader, vertexShaderSource)
    gl.compileShader(vertexShader)

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)
    gl.shaderSource(fragmentShader, FRAGMENT_SHADER)
    gl.compileShader(fragmentShader)

    const program = gl.createProgram()
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    gl.useProgram(program)

    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    )

    const positionLocation = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

    const uniforms = {
      u_time: gl.getUniformLocation(program, 'u_time'),
      u_resolution: gl.getUniformLocation(program, 'u_resolution'),
      u_color: gl.getUniformLocation(program, 'u_color'),
      u_intensity: gl.getUniformLocation(program, 'u_intensity'),
    }

    const resize = () => {
      const width = container.clientWidth
      const height = container.clientHeight
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = width * pixelRatio
      canvas.height = height * pixelRatio
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      gl.viewport(0, 0, canvas.width, canvas.height)
    }

    resize()
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)

    startTimeRef.current = performance.now()

    // Draw one frame with the current props.
    const render = (now) => {
      const elapsed = (now - startTimeRef.current) / 1000
      gl.uniform1f(uniforms.u_time, elapsed)
      gl.uniform2f(uniforms.u_resolution, canvas.width, canvas.height)
      gl.uniform3f(uniforms.u_color, ...hexToRgb(color))
      gl.uniform1f(uniforms.u_intensity, intensity)
      gl.drawArrays(gl.TRIANGLES, 0, 6)
    }

    if (shouldReduceMotion) {
      // Respect the user's motion preference: a single static frame only.
      render(performance.now())
    } else {
      const animate = (now) => {
        render(now)
        frameIdRef.current = requestAnimationFrame(animate)
      }
      frameIdRef.current = requestAnimationFrame(animate)
    }

    return () => {
      if (frameIdRef.current !== undefined) {
        cancelAnimationFrame(frameIdRef.current)
      }
      resizeObserver.disconnect()
      gl.deleteProgram(program)
      gl.deleteShader(vertexShader)
      gl.deleteShader(fragmentShader)
      gl.deleteBuffer(positionBuffer)
    }
  }, [isMounted, shouldReduceMotion, color, intensity])

  return (
    <div
      ref={containerRef}
      className={className}
      {...rest}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: -1,
        overflow: 'hidden',
        // Static fallback if WebGL is unavailable - a soft yellow glow
        // instead of live smoke.
        background: webglFailed
          ? 'radial-gradient(ellipse 80% 60% at 50% 20%, rgba(255, 212, 0, 0.14) 0%, rgba(0, 0, 0, 0) 70%)'
          : undefined,
        ...style,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
      {children}
    </div>
  )
}

// ---- Helpers / shader ----

function hexToRgb(hex) {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  const num = parseInt(h, 16)
  return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255]
}

// GLSL ES 1.00 fragment shader (WebGL1): domain-warped fBm simplex noise
// rolled through time so the plumes bend and drift like real smoke.
const FRAGMENT_SHADER = `
precision highp float;

uniform float u_time;
uniform vec2 u_resolution;
uniform vec3 u_color;
uniform float u_intensity;

// Simplex noise 2D (Ashima / Stefan Gustavson, MIT)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 10.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

// Fractal Brownian motion: a few octaves of simplex noise, each scaled
// down, so we get big rolling shapes plus fine detail - the basis of smoke.
float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.55;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += amp * snoise(p);
    p = rot * p * 2.02 + vec2(0.7);
    amp *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;

  // Center and scale so the smoke fills the screen at any size.
  vec2 p = (uv - 0.5) * vec2(aspect, 1.0) * 2.2;

  float t = u_time * 0.04;

  // Domain warp: the noise coordinates are themselves warped by noise, so
  // the plumes curl and bend like drifting smoke instead of staying put.
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t * 0.6));
  vec2 r = vec2(
    fbm(p + 4.0 * q + vec2(1.7, 9.2) + t * 0.9),
    fbm(p + 4.0 * q + vec2(8.3, 2.8) - t * 0.9)
  );

  float f = fbm(p + 4.0 * r);
  f = f * 0.5 + 0.5;

  // Soft threshold - only the brighter bands of noise read as smoke.
  float alpha = smoothstep(0.35, 0.9, f) * u_intensity;

  vec3 col = mix(vec3(0.01, 0.01, 0.01), u_color, alpha);
  gl_FragColor = vec4(col, 1.0);
}
`
