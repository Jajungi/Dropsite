import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, Path } from 'react-native-svg';
import { FRAGMENT_SHADER, VERTEX_SHADER } from './scenicShaderSource';

interface ScenicShaderBackgroundProps {
  opacity?: number;
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('Shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function ScenicShaderBackgroundWeb({ opacity }: { opacity: number }) {
  const containerRef = useRef<View>(null);
  const rafRef = useRef<number>(0);
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    const host = containerRef.current as unknown as HTMLElement | null;
    if (!host || Platform.OS !== 'web') return;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    host.appendChild(canvas);

    const gl = canvas.getContext('webgl', { alpha: true, antialias: false });
    if (!gl) {
      host.removeChild(canvas);
      return;
    }

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vs || !fs) {
      host.removeChild(canvas);
      return;
    }

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      host.removeChild(canvas);
      return;
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const aPosition = gl.getAttribLocation(program, 'a_position');
    const uResolution = gl.getUniformLocation(program, 'u_resolution');
    const uTime = gl.getUniformLocation(program, 'u_time');

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.floor(host.clientWidth * dpr);
      const h = Math.floor(host.clientHeight * dpr);
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const start = performance.now();
    const render = () => {
      const t = (performance.now() - start) / 1000;
      gl.useProgram(program);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.enableVertexAttribArray(aPosition);
      gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      rafRef.current = requestAnimationFrame(render);
    };
    rafRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      if (host.contains(canvas)) host.removeChild(canvas);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
    };
  }, [width, height]);

  return (
    <View
      ref={containerRef}
      style={[StyleSheet.absoluteFill, { opacity, pointerEvents: 'none' }]}
    />
  );
}

function ScenicSvgBackground({ opacity }: { opacity: number }) {
  return (
    <View style={[StyleSheet.absoluteFill, { opacity, pointerEvents: 'none' }]}>
      <Svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#8BB8E8" stopOpacity="1" />
            <Stop offset="0.55" stopColor="#D8EAF8" stopOpacity="1" />
            <Stop offset="1" stopColor="#F5E6D0" stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="water" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#B8E8DC" stopOpacity="0.6" />
            <Stop offset="1" stopColor="#7ECFC0" stopOpacity="0.8" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#sky)" />
        <Path
          d="M0,62 L12,58 L28,61 L45,54 L62,58 L80,50 L100,55 L100,100 L0,100 Z"
          fill="#6A8AA8"
          opacity={0.35}
        />
        <Path
          d="M0,70 L18,66 L35,69 L55,62 L75,66 L100,60 L100,100 L0,100 Z"
          fill="#4E6E8C"
          opacity={0.45}
        />
        <Path
          d="M0,78 L22,74 L48,77 L68,70 L88,74 L100,72 L100,100 L0,100 Z"
          fill="#3A5872"
          opacity={0.55}
        />
        <Rect x="0" y="78" width="100" height="22" fill="url(#water)" />
        {[0, 1, 2, 3, 4].map((i) => (
          <Path
            key={i}
            d={`M0,${82 + i * 2.5} Q25,${81 + i * 2.5} 50,${82.5 + i * 2.5} T100,${82 + i * 2.5}`}
            stroke="rgba(90,140,180,0.25)"
            strokeWidth={0.4}
            fill="none"
          />
        ))}
      </Svg>
    </View>
  );
}

export function ScenicShaderBackground({ opacity = 0.1 }: ScenicShaderBackgroundProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.base} />
      {Platform.OS === 'web' ? (
        <ScenicShaderBackgroundWeb opacity={opacity} />
      ) : (
        <ScenicSvgBackground opacity={opacity} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFill, pointerEvents: 'none' as const },
  base: { ...StyleSheet.absoluteFill, backgroundColor: '#FFFFFA' },
});
