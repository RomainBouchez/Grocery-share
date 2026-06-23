"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF, Environment, ContactShadows } from "@react-three/drei";
import type { Group } from "three";

function CartModel() {
  const { scene } = useGLTF("/shopping_cart.glb");
  const ref = useRef<Group>(null);

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.4;
    }
  });

  return (
    <group ref={ref}>
      <primitive object={scene} scale={2.2} position={[0, -0.8, 0]} />
    </group>
  );
}

export function ShoppingCart3D() {
  return (
    <Canvas
      camera={{ position: [0, 1.5, 5], fov: 40 }}
      style={{ width: "100%", height: "100%" }}
      shadows
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1.4} castShadow />
      <directionalLight position={[-4, 3, -4]} intensity={0.4} color="#86efac" />
      <Suspense fallback={null}>
        <CartModel />
        <ContactShadows
          position={[0, -1.5, 0]}
          opacity={0.4}
          scale={6}
          blur={2}
          far={3}
        />
        <Environment preset="city" />
      </Suspense>
    </Canvas>
  );
}

useGLTF.preload("/shopping_cart.glb");
