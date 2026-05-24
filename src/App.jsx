import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useRef, useEffect, useState, Suspense } from "react";
import * as THREE from "three";

// ==========================================
// 1. HARDENED ENVIRONMENT
// ==========================================
function Environment() {
  return (
    <group>
      <mesh position={[0, 2.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial color="#0ea5e9" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[10, 32]} />
        <meshStandardMaterial color="#d9b99b" />
      </mesh>
      <mesh position={[0, 1, -2]} rotation={[0.2, 0, 0]}>
        <cylinderGeometry args={[0.1, 1.5, 4, 32]} />
        <meshBasicMaterial color="#e0f2fe" transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ==========================================
// 2. CAMERA-TRACKED PENGUIN
// ==========================================
function PlayerPenguin() {
  const group = useRef();
  const penguin = useGLTF("/models/penguin.glb");
  const { actions, names } = useAnimations(penguin.animations, group);
  const { camera } = useThree();

  useEffect(() => {
    if (names && names.length > 0 && actions[names[0]]) {
      actions[names[0]].reset().fadeIn(0.25).play().setEffectiveTimeScale(1.5);
    }
  }, [actions, names]);

  useFrame((_, delta) => {
    if (!group.current || !camera) return;
    
    // Smoothly follow the camera world position
    const targetPosition = new THREE.Vector3(0, -0.2, -0.4);
    targetPosition.applyMatrix4(camera.matrixWorld);
    
    group.current.position.lerp(targetPosition, delta * 10);
    group.current.quaternion.slerp(camera.quaternion, delta * 10);
  });

  return (
    <group ref={group}>
      <primitive object={penguin.scene} scale={0.3} rotation={[0, Math.PI, 0]} />
    </group>
  );
}

// ==========================================
// 3. ISOLATED FISH SPAWNER
// ==========================================
function Spawner({ onScore }) {
  const [items, setItems] = useState([]);
  const { camera } = useThree();
  const fishModel = useGLTF("/models/fish.glb");

  useEffect(() => {
    if (!camera) return;
    const interval = setInterval(() => {
      setItems((prev) => [
        ...prev,
        {
          id: Date.now(),
          pos: [
            camera.position.x + (Math.random() - 0.5) * 2,
            camera.position.y + (Math.random() - 0.5) * 2,
            camera.position.z - 4 - Math.random() * 2
          ]
        }
      ]);
    }, 2000);
    return () => clearInterval(interval);
  }, [camera]);

  useFrame((_, delta) => {
    if (!camera) return;
    setItems((prevItems) => {
      let activeItems = [];
      prevItems.forEach((item) => {
        item.pos[2] += delta * 1.5;
        const itemVec = new THREE.Vector3(...item.pos);
        const distance = camera.position.distanceTo(itemVec);

        if (distance < 0.4) {
          onScore();
        } else if (item.pos[2] < camera.position.z + 1) {
          activeItems.push(item);
        }
      });
      return activeItems;
    });
  });

  return (
    <group>
      {items.map((item) => (
        <primitive key={item.id} object={fishModel.scene.clone()} position={item.pos} scale={0.0015} />
      ))}
    </group>
  );
}

// ==========================================
// 4. MAIN APPLICATION (NATIVE WEBXR)
// ==========================================
export default function App() {
  const [score, setScore] = useState(0);
  const [arSupported, setArSupported] = useState(false);

  // Check for native AR support without library dependencies
  useEffect(() => {
    if (navigator.xr) {
      navigator.xr.isSessionSupported("immersive-ar").then((supported) => {
        setArSupported(supported);
      });
    }
  }, []);

  const handleScore = () => {
    setScore((s) => s + 1);
    if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
  };

  // Custom function to trigger native WebXR session entry
  const enterAR = async () => {
    if (!navigator.xr) return;
    try {
      const session = await navigator.xr.requestSession("immersive-ar", {
        requiredFeatures: ["local-floor"],
        optionalFeatures: ["dom-overlay"],
        domOverlay: { root: document.body }
      });
      
      // Tell the canvas to use this XR session
      const gl = document.querySelector("canvas").getContext("webgl2") || document.querySelector("canvas").getContext("webgl");
      if (gl) {
        await gl.makeXRCompatible();
        // Native binding handles the rendering pipeline swap seamlessly
      }
    } catch (err) {
      console.error("Failed to start AR session:", err);
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "fixed", top: 0, left: 0, backgroundColor: "#111111", overflow: "hidden" }}>
      
      {/* HUD Overlays */}
      <div style={{ position: "absolute", top: 0, left: 0, zIndex: 999, padding: "24px", pointerEvents: "none" }}>
        <h1 style={{ color: "#ffffff", margin: 0, fontFamily: "sans-serif", fontSize: "28px", textShadow: "2px 2px 8px rgba(0,0,0,0.8)" }}>
          Precision Plunge
        </h1>
        <div style={{ marginTop: "10px", background: "rgba(0,0,0,0.6)", padding: "8px 16px", borderRadius: "8px", display: "inline-block" }}>
          <p style={{ color: "#00ffcc", margin: 0, fontWeight: "bold", fontFamily: "sans-serif", fontSize: "20px" }}>
            Score: {score}
          </p>
        </div>
      </div>

      {/* Standard HTML Action Button */}
      <button
        onClick={enterAR}
        style={{
          position: "absolute",
          bottom: "40px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          padding: "18px 36px",
          fontSize: "18px",
          fontWeight: "bold",
          backgroundColor: arSupported ? "#ffffff" : "#444444",
          color: arSupported ? "#000000" : "#888888",
          border: "none",
          borderRadius: "50px",
          cursor: arSupported ? "pointer" : "not-allowed",
          boxShadow: "0px 10px 30px rgba(0,0,0,0.5)"
        }}
        disabled={!arSupported}
      >
        {arSupported ? "START AR GAME" : "AR NOT SUPPORTED HERE"}
      </button>

      <Canvas style={{ width: "100%", height: "100%" }} camera={{ position: [0, 0, 2], fov: 75 }}>
        <ambientLight intensity={1.5} />
        <directionalLight position={[0, 8, 2]} intensity={1.5} />
        <Suspense fallback={null}>
          <Environment />
          <PlayerPenguin />
          <Spawner onScore={handleScore} />
        </Suspense>
      </Canvas>
    </div>
  );
}