import "./App.css";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { XR, ARButton } from "@react-three/xr";
import { useGLTF, useAnimations, Html } from "@react-three/drei";
import { useRef, useEffect, useState, Suspense } from "react";
import * as THREE from "three";

// ==========================================
// 1. ENVIRONMENT: WATER ROOF & SAND FLOOR
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
// 2. PLAYER: CAMERA-TRACKED PENGUIN
// ==========================================
function PlayerPenguin() {
  const group = useRef();
  const penguin = useGLTF("/models/penguin.glb");
  const { actions, names } = useAnimations(penguin.animations, group);
  const { camera } = useThree();

  useEffect(() => {
    // Safety check in case animations are missing from the model
    if (names && names.length > 0 && actions[names[0]]) {
      const activeAction = actions[names[0]];
      activeAction.reset().fadeIn(0.25).play();
      activeAction.setEffectiveTimeScale(1.5); 
    }
  }, [actions, names]);

  useFrame((state, delta) => {
    if (!group.current) return;
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
// 3. SPAWNER: INCOMING FISH
// ==========================================
function Spawner({ onScore }) {
  const [items, setItems] = useState([]);
  const { camera } = useThree();
  const fishModel = useGLTF("/models/fish.glb");

  useEffect(() => {
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

  useFrame((state, delta) => {
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
// 4. MAIN GAME CONTROLLER
// ==========================================
export default function App() {
  const [isARActive, setIsARActive] = useState(false);
  const [score, setScore] = useState(0);

  const handleScore = () => {
    setScore((s) => s + 1);
    if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(50);
    }
  };

  return (
    <div style={{ width: "100vw", height: "100dvh", position: "relative", backgroundColor: "#111" }}>
      
      {/* ALWAYS VISIBLE DIAGNOSTIC UI */}
      <div style={{ position: "absolute", zIndex: 9999, width: "100%", padding: "20px", pointerEvents: "none" }}>
        <h2 style={{ color: "white", margin: 0, textShadow: "2px 2px 4px black" }}>Score: {score}</h2>
        <p style={{ color: isARActive ? "#4ade80" : "#f87171", fontWeight: "bold", textShadow: "1px 1px 2px black" }}>
          {isARActive ? "AR Session Active" : "Waiting for AR / PC Mode"}
        </p>
      </div>

      <ARButton
        sessionInit={{ 
          requiredFeatures: ["local-floor"],
          optionalFeatures: ["hit-test", "dom-overlay"],
          domOverlay: { root: document.body }
        }}
        style={{ 
          position: 'absolute', 
          bottom: '40px', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          zIndex: 10000, 
          display: 'block',
          padding: '16px 32px',
          backgroundColor: 'white',
          color: 'black',
          fontWeight: 'bold',
          borderRadius: '30px',
          border: 'none',
          boxShadow: '0px 4px 10px rgba(0,0,0,0.5)'
        }}
      />

      <Canvas style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}>
        <XR onSessionStart={() => setIsARActive(true)} onSessionEnd={() => setIsARActive(false)}>
          
          {/* THE 404 CATCHER: If models fail to load, this prevents the black screen */}
          <Suspense fallback={
            <Html center>
              <div style={{ background: "rgba(255,0,0,0.9)", color: "white", padding: "20px", borderRadius: "10px", width: "300px", textAlign: "center" }}>
                <h3 style={{ margin: "0 0 10px 0" }}>⚠️ Loading Stuck</h3>
                <p style={{ margin: 0 }}>If this stays on your screen, your <b>penguin.glb</b> or <b>fish.glb</b> files are missing from the <b>public/models</b> folder!</p>
              </div>
            </Html>
          }>
            <ambientLight intensity={2.0} />
            <directionalLight position={[0, 5, 0]} intensity={1.5} color="#e0f2fe" />
            
            {/* Render unconditionally so you can see them before AR starts */}
            <Environment />
            <PlayerPenguin />
            <Spawner onScore={handleScore} />
          </Suspense>

        </XR>
      </Canvas>
    </div>
  );
}