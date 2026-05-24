import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useRef, useEffect, useState, Suspense } from "react";
import * as THREE from "three";

// ==========================================
// 1. UNDERWATER DEEP SEA ENVIRONMENT
// ==========================================
function Environment() {
  return (
    <group>
      {/* Sandy Ocean Bed */}
      <mesh position={[0, -3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#d4b296" roughness={0.9} />
      </mesh>
      {/* Distant water volume lighting effect */}
      <mesh position={[0, 4, -5]} rotation={[0.2, 0, 0]}>
        <cylinderGeometry args={[0.5, 4, 10, 16]} />
        <meshBasicMaterial color="#3af2b2" transparent opacity={0.04} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

// ==========================================
// 2. SWIMMING PENGUIN MODEL (UPDATED)
// ==========================================
function PlayerPenguin() {
  const group = useRef();
  
  // Loading your new swimming model asset
  const penguin = useGLTF("/models/penguin1.glb"); 
  const { actions, names } = useAnimations(penguin.animations, group);
  const { camera } = useThree();

  useEffect(() => {
    // Activate the new swimming animation state loop smoothly
    if (names && names.length > 0 && actions[names[0]]) {
      actions[names[0]].reset().fadeIn(0.25).play().setEffectiveTimeScale(1.0);
    }
  }, [actions, names]);

  useFrame((_, delta) => {
    if (!group.current || !camera) return;
    
    // Position target: Floating naturally in 3D space directly in front of the camera viewpoint
    const targetPosition = new THREE.Vector3(0, -0.3, -0.7);
    targetPosition.applyMatrix4(camera.matrixWorld);

    // Smooth position interpolation (swimming glide feel)
    group.current.position.lerp(targetPosition, delta * 3.5);
    
    // Dynamic Rotation: Align smoothly with the camera's orientation matrix
    group.current.quaternion.slerp(camera.quaternion, delta * 4);
  });

  return (
    <group ref={group}>
      {/* Turned 180 deg if model faces backwards, adjust rotation vector array if needed */}
      <primitive object={penguin.scene} scale={0.25} rotation={[0, Math.PI, 0]} />
    </group>
  );
}

// ==========================================
// 3. FIXED PATH FISH SPAWNER
// ==========================================
function Spawner({ onScore }) {
  const [items, setItems] = useState([]);
  const { camera } = useThree();
  const fishModel = useGLTF("/models/fish.glb");

  useEffect(() => {
    if (!camera) return;
    const interval = setInterval(() => {
      // Establish target directional vectors to spawn items along the camera path projection
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const spawnDistance = 6 + Math.random() * 2;
      
      setItems((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          pos: [
            camera.position.x + forward.x * spawnDistance + (Math.random() - 0.5) * 2.5,
            camera.position.y + forward.y * spawnDistance + (Math.random() - 0.5) * 2.5,
            camera.position.z + forward.z * spawnDistance + (Math.random() - 0.5) * 2.5
          ],
          speed: 1.5 + Math.random() * 1.0
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
        const itemVec = new THREE.Vector3(...item.pos);
        const playerVec = new THREE.Vector3(camera.position.x, camera.position.y - 0.3, camera.position.z - 0.7);
        
        // Swim directly toward the current position matrix
        const trackDirection = new THREE.Vector3().subVectors(playerVec, itemVec).normalize();
        itemVec.addScaledVector(trackDirection, item.speed * delta);
        
        item.pos = [itemVec.x, itemVec.y, itemVec.z];
        
        const currentDistance = itemVec.distanceTo(playerVec);

        if (currentDistance < 0.5) {
          onScore(); // Successfully captured item
        } else if (currentDistance > 0.1) {
          activeItems.push(item);
        }
      });
      
      return activeItems;
    });
  });

  return (
    <group>
      {items.map((item) => (
        <primitive key={item.id} object={fishModel.scene.clone()} position={item.pos} scale={0.0018} />
      ))}
    </group>
  );
}

// ==========================================
// 4. ARCHITECTURE HUB CORE
// ==========================================
export default function App() {
  const [score, setScore] = useState(0);
  const [isInAR, setIsInAR] = useState(false);

  const handleScore = () => {
    setScore((s) => s + 1);
    if (typeof window !== "undefined" && window.navigator?.vibrate) {
      window.navigator.vibrate(60);
    }
  };

  const startARSession = async () => {
    if (!navigator.xr) {
      alert("WebXR AR infrastructure missing or device connection unsecure!");
      return;
    }
    try {
      const session = await navigator.xr.requestSession("immersive-ar", {
        requiredFeatures: ["local-floor"],
        optionalFeatures: ["dom-overlay"],
        domOverlay: { root: document.body }
      });
      
      setIsInAR(true);
      session.addEventListener("end", () => setIsInAR(false));

      const canvas = document.querySelector("canvas");
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      await gl.makeXRCompatible();
      
      gl.xr.setReferenceSpaceType("local-floor");
      await gl.xr.setSession(session);
    } catch (err) {
      console.error("Critical failure during WebXR initialization loop:", err);
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", position: "fixed", top: 0, left: 0, backgroundColor: "#060b14", overflow: "hidden" }}>
      
      {/* Minimal Score HUD Overlay */}
      <div style={{ position: "absolute", top: "24px", left: "24px", zIndex: 999, pointerEvents: "none" }}>
        <div style={{ background: "rgba(6, 11, 20, 0.8)", backdropFilter: "blur(6px)", padding: "12px 24px", borderRadius: "14px", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ color: "#3af2b2", margin: 0, fontWeight: "bold", fontFamily: "sans-serif", fontSize: "24px" }}>
            Score: {score}
          </p>
        </div>
      </div>

      {/* FIXED VIEWPORT ACTION CAPTURE BUTTON */}
      {!isInAR && (
        <button
          onClick={startARSession}
          style={{
            position: "absolute",
            bottom: "50px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 99999,
            padding: "20px 40px",
            fontSize: "18px",
            fontWeight: "bold",
            color: "#ffffff",
            background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
            border: "none",
            borderRadius: "16px",
            boxShadow: "0 12px 28px rgba(3, 105, 161, 0.4)",
            cursor: "pointer",
            width: "85%",
            maxWidth: "340px",
            textTransform: "uppercase",
            letterSpacing: "1px"
          }}
        >
          Start AR Game
        </button>
      )}

      <Canvas style={{ width: "100%", height: "100%" }} camera={{ position: [0, 0, 2], fov: 75 }}>
        <ambientLight intensity={1.3} />
        <directionalLight position={[2, 8, 4]} intensity={1.4} />
        <Suspense fallback={null}>
          <Environment />
          <PlayerPenguin />
          <Spawner onScore={handleScore} />
        </Suspense>
      </Canvas>
    </div>
  );
}