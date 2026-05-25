import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import "./App.css";

useGLTF.preload("/models/fish.glb");
useGLTF.preload("/models/seabed.glb");
useGLTF.preload("/models/penguin.glb");

const GAME_TIME = 60;
const START_ENERGY = 50;

function cloneModel(scene) {
  return SkeletonUtils.clone(scene);
}

function shuffleArray(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

function createBalancedItemType(itemBagRef) {
  if (!itemBagRef.current || itemBagRef.current.length === 0) {
    itemBagRef.current = shuffleArray([
      "fish",
      "fish",
      "fish",
      "fish",
      "squid",
      "squid",
      "krill",
      "krill",
      "plastic",
      "plastic",
    ]);
  }

  return itemBagRef.current.pop();
}

function createGameItem(camera, itemBagRef) {
  const type = createBalancedItemType(itemBagRef);

  const yaw = Math.random() * Math.PI * 2;
  const pitch = THREE.MathUtils.degToRad(THREE.MathUtils.randFloatSpread(45));

  const distance = 4.6 + Math.random() * 1.2;

  const direction = new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    -Math.cos(yaw) * Math.cos(pitch)
  ).normalize();

  const position = camera.position.clone().add(direction.multiplyScalar(distance));

  return {
    id: `${Date.now()}-${Math.random()}`,
    type,
    position: [position.x, position.y, position.z],
    speed: type === "plastic" ? 0.85 : 0.95,
    spin: 0.55 + Math.random() * 0.65,
    bobOffset: Math.random() * Math.PI * 2,
  };
}

function CameraRig({ viewRef }) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    camera.position.set(0, 0, 0);

    camera.rotation.y = THREE.MathUtils.lerp(
      camera.rotation.y,
      viewRef.current.yaw,
      delta * 5
    );

    camera.rotation.x = THREE.MathUtils.lerp(
      camera.rotation.x,
      viewRef.current.pitch,
      delta * 5
    );

    camera.rotation.z = 0;
  });

  return null;
}

function UnderwaterBubbles() {
  const pointsRef = useRef();

  const particles = useMemo(() => {
    const temp = [];

    for (let i = 0; i < 250; i++) {
      temp.push({
        x: (Math.random() - 0.5) * 16,
        y: Math.random() * 9 - 4.5,
        z: -Math.random() * 14 - 1,
        speed: 0.18 + Math.random() * 0.58,
      });
    }

    return temp;
  }, []);

  const positions = useMemo(() => {
    return new Float32Array(particles.flatMap((p) => [p.x, p.y, p.z]));
  }, [particles]);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;

    const array = pointsRef.current.geometry.attributes.position.array;

    for (let i = 0; i < particles.length; i++) {
      array[i * 3 + 1] += particles[i].speed * delta;

      if (array[i * 3 + 1] > 4.7) {
        array[i * 3 + 1] = -4.2;
        array[i * 3] = (Math.random() - 0.5) * 16;
        array[i * 3 + 2] = -Math.random() * 14 - 1;
      }
    }

    pointsRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.length}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>

      <pointsMaterial
        color="#ffffff"
        size={0.04}
        transparent
        opacity={0.68}
        depthWrite={false}
      />
    </points>
  );
}

function WaterLightRays() {
  return (
    <group>
      <mesh position={[-2.7, 1.4, -4.2]} rotation={[0.45, 0, -0.34]}>
        <cylinderGeometry args={[0.08, 2.2, 8, 32]} />
        <meshBasicMaterial
          color="#e0f7ff"
          transparent
          opacity={0.06}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[2.4, 1.6, -4.8]} rotation={[0.52, 0, 0.35]}>
        <cylinderGeometry args={[0.08, 2.6, 8, 32]} />
        <meshBasicMaterial
          color="#e0f7ff"
          transparent
          opacity={0.055}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0.3, 2.1, -5.5]} rotation={[0.5, 0, 0.08]}>
        <cylinderGeometry args={[0.1, 3.1, 8, 32]} />
        <meshBasicMaterial
          color="#bae6fd"
          transparent
          opacity={0.045}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function UnderwaterEnvironment() {
  const group = useRef();
  const { scene, animations } = useGLTF("/models/seabed.glb");
  const clonedScene = useMemo(() => cloneModel(scene), [scene]);
  const { actions, names } = useAnimations(animations, group);

  useEffect(() => {
    if (names?.length) {
      names.forEach((name) => {
        if (actions[name]) {
          actions[name].reset().play();
        }
      });
    }

    clonedScene.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.transparent = true;
        child.material.opacity = 0.42;
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
  }, [actions, names, clonedScene]);

  return (
    <group ref={group}>
      <ambientLight intensity={1.55} color="#dff8ff" />
      <directionalLight position={[2, 6, 4]} intensity={1.45} color="#e0f7ff" />
      <pointLight position={[0, 1.5, -2]} intensity={1.5} color="#38bdf8" />

      <primitive
        object={clonedScene}
        position={[0, -2.65, -5.4]}
        scale={[1.22, 1.22, 1.22]}
      />

      <mesh position={[0, 0, -7.6]}>
        <planeGeometry args={[20, 13]} />
        <meshBasicMaterial color="#075985" transparent opacity={0.09} />
      </mesh>

      <mesh position={[0, 3.5, -4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[22, 22]} />
        <meshBasicMaterial
          color="#7dd3fc"
          transparent
          opacity={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>

      <WaterLightRays />
    </group>
  );
}

function PlayerPenguin() {
  const group = useRef();
  const { camera } = useThree();
  const { scene, animations } = useGLTF("/models/penguin.glb");
  const clonedScene = useMemo(() => cloneModel(scene), [scene]);
  const { actions, names } = useAnimations(animations, group);

  useEffect(() => {
    if (names?.length && actions[names[0]]) {
      actions[names[0]].reset().play();
    }
  }, [actions, names]);

  useFrame((_, delta) => {
    if (!group.current) return;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);

    const targetPosition = camera.position
      .clone()
      .add(forward.multiplyScalar(1.35))
      .add(new THREE.Vector3(0, -0.45, 0));

    group.current.position.lerp(targetPosition, delta * 8);
    group.current.lookAt(camera.position);
    group.current.rotateY(Math.PI);
  });

  return (
    <group ref={group}>
      <group rotation={[0, Math.PI / 2, 0]}>
        <primitive object={clonedScene} scale={0.08} />
      </group>
    </group>
  );
}

function FallbackFishShape() {
  return (
    <group renderOrder={30}>
      <mesh>
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshBasicMaterial color="#4ade80" depthTest={false} depthWrite={false} />
      </mesh>

      <mesh position={[-0.27, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.14, 0.26, 3]} />
        <meshBasicMaterial color="#22c55e" depthTest={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

function FishModel() {
  const { scene, animations } = useGLTF("/models/fish.glb");
  const clonedScene = useMemo(() => cloneModel(scene), [scene]);
  const mixer = useMemo(
    () => new THREE.AnimationMixer(clonedScene),
    [clonedScene]
  );

  const normalized = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clonedScene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();

    box.getSize(size);
    box.getCenter(center);

    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 0.42 / maxDim;

    return { center, scale };
  }, [clonedScene]);

  useEffect(() => {
    clonedScene.traverse((child) => {
      child.renderOrder = 30;

      if (child.isMesh && child.material) {
        child.material = child.material.clone();
        child.material.side = THREE.DoubleSide;
        child.material.depthTest = false;
        child.material.depthWrite = false;
        child.material.needsUpdate = true;
      }
    });

    if (animations?.length) {
      animations.forEach((clip) => {
        mixer.clipAction(clip).reset().play().setEffectiveTimeScale(1.25);
      });
    }

    return () => {
      mixer.stopAllAction();
    };
  }, [animations, mixer, clonedScene]);

  useFrame((_, delta) => {
    mixer.update(delta);
  });

  return (
    <group scale={normalized.scale}>
      <primitive
        object={clonedScene}
        position={[
          -normalized.center.x,
          -normalized.center.y,
          -normalized.center.z,
        ]}
      />
      <FallbackFishShape />
    </group>
  );
}

function SmallSquidModel() {
  const group = useRef();

  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.8;
  });

  return (
    <group ref={group} scale={0.5} renderOrder={30}>
      <mesh position={[0, 0.08, 0]}>
        <coneGeometry args={[0.18, 0.42, 24]} />
        <meshBasicMaterial
          color="#a78bfa"
          depthTest={false}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, -0.16, 0]}>
        <sphereGeometry args={[0.15, 20, 20]} />
        <meshBasicMaterial
          color="#8b5cf6"
          depthTest={false}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[-0.11, -0.34, 0]} rotation={[0, 0, 0.25]}>
        <capsuleGeometry args={[0.025, 0.22, 6, 12]} />
        <meshBasicMaterial color="#c4b5fd" depthTest={false} depthWrite={false} />
      </mesh>

      <mesh position={[0, -0.35, 0]}>
        <capsuleGeometry args={[0.025, 0.24, 6, 12]} />
        <meshBasicMaterial color="#c4b5fd" depthTest={false} depthWrite={false} />
      </mesh>

      <mesh position={[0.11, -0.34, 0]} rotation={[0, 0, -0.25]}>
        <capsuleGeometry args={[0.025, 0.22, 6, 12]} />
        <meshBasicMaterial color="#c4b5fd" depthTest={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

function SmallKrillModel() {
  const group = useRef();

  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.rotation.y += delta * 0.9;
  });

  return (
    <group ref={group} scale={0.45} renderOrder={30}>
      <mesh>
        <capsuleGeometry args={[0.11, 0.36, 8, 16]} />
        <meshBasicMaterial
          color="#c084fc"
          depthTest={false}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0.16, 0.04, 0]} rotation={[0, 0, -0.6]}>
        <coneGeometry args={[0.08, 0.18, 3]} />
        <meshBasicMaterial color="#e9d5ff" depthTest={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

function SmallPlasticModel() {
  const group = useRef();

  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.rotation.x += delta * 0.5;
    group.current.rotation.y += delta * 0.7;
  });

  return (
    <group ref={group} scale={0.5} renderOrder={30}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.42, 18]} />
        <meshBasicMaterial
          color="#fb7185"
          depthTest={false}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, 0.24, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.12, 18]} />
        <meshBasicMaterial color="#fecaca" depthTest={false} depthWrite={false} />
      </mesh>
    </group>
  );
}

function GameItem({ item, onCollect, onMiss }) {
  const group = useRef();
  const glowRef = useRef();
  const ringRef = useRef();
  const collectedRef = useRef(false);
  const visibleTimeRef = useRef(0);
  const { camera } = useThree();

  useFrame((state, delta) => {
    if (!group.current || collectedRef.current) return;

    const itemPosition = group.current.position;
    const cameraPosition = camera.position.clone();

    const directionToCamera = cameraPosition.clone().sub(itemPosition).normalize();
    itemPosition.addScaledVector(directionToCamera, item.speed * delta);

    group.current.position.y +=
      Math.sin(state.clock.elapsedTime * 2.2 + item.bobOffset) * 0.0025;

    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);

    const directionToItem = itemPosition.clone().sub(cameraPosition).normalize();
    const centerDot = forward.dot(directionToItem);
    const distance = itemPosition.distanceTo(cameraPosition);

    group.current.lookAt(camera.position);

    const scaleByDistance = THREE.MathUtils.clamp(distance / 4.3, 0.58, 1.0);
    group.current.scale.setScalar(scaleByDistance);

    const focusAmount = THREE.MathUtils.clamp((centerDot - 0.82) / 0.16, 0, 1);

    if (glowRef.current) {
      const glowScale = 0.72 + focusAmount * 0.22;
      glowRef.current.scale.set(glowScale, glowScale, glowScale);
      glowRef.current.material.opacity = 0.08 + focusAmount * 0.1;
    }

    if (ringRef.current) {
      const ringScale = 0.75 + focusAmount * 0.18;
      ringRef.current.scale.set(ringScale, ringScale, ringScale);
      ringRef.current.material.opacity = 0.24 + focusAmount * 0.12;
    }

    if (centerDot > 0.925 && distance < 2.55) {
      visibleTimeRef.current += delta;
    } else {
      visibleTimeRef.current = 0;
    }

    if (centerDot > 0.94 && distance < 2.15 && visibleTimeRef.current > 0.28) {
      collectedRef.current = true;
      onCollect(item.id, item.type);
      return;
    }

    if (distance < 1.05) {
      collectedRef.current = true;
      onMiss(item.id);
    }
  });

  const glowColor =
    item.type === "plastic"
      ? "#fb7185"
      : item.type === "squid"
      ? "#a78bfa"
      : item.type === "krill"
      ? "#c084fc"
      : "#4ade80";

  return (
    <group ref={group} position={item.position}>
      <mesh ref={glowRef} position={[0, 0, 0.14]} renderOrder={1}>
        <sphereGeometry args={[0.42, 24, 24]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={0.12}
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={ringRef} position={[0, 0, 0.16]} renderOrder={2}>
        <ringGeometry args={[0.28, 0.32, 40]} />
        <meshBasicMaterial
          color={glowColor}
          transparent
          opacity={0.28}
          depthWrite={false}
          depthTest={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <group position={[0, 0, -0.18]} renderOrder={30}>
        {item.type === "fish" && <FishModel />}

        {item.type === "squid" && <SmallSquidModel />}

        {item.type === "krill" && <SmallKrillModel />}

        {item.type === "plastic" && <SmallPlasticModel />}
      </group>
    </group>
  );
}

function SceneContent({
  gameState,
  activeItem,
  onCollect,
  onMiss,
  viewRef,
  setActiveItem,
  itemBagRef,
}) {
  const { camera } = useThree();

  useEffect(() => {
    if (gameState !== "PLAYING") return;

    const spawnTimer = setInterval(() => {
      setActiveItem((currentItem) => {
        if (currentItem) return currentItem;
        return createGameItem(camera, itemBagRef);
      });
    }, 350);

    return () => clearInterval(spawnTimer);
  }, [camera, gameState, setActiveItem, itemBagRef]);

  return (
    <>
      <CameraRig viewRef={viewRef} />

      <fog attach="fog" args={["#0f6f9e", 2.8, 11]} />

      <UnderwaterEnvironment />
      <UnderwaterBubbles />

      {gameState === "PLAYING" && (
        <>
          <PlayerPenguin />

          {activeItem && (
            <GameItem
              key={activeItem.id}
              item={activeItem}
              onCollect={onCollect}
              onMiss={onMiss}
            />
          )}
        </>
      )}
    </>
  );
}

export default function App() {
  const [gameState, setGameState] = useState("MENU");
  const [activeItem, setActiveItem] = useState(null);

  const [energy, setEnergy] = useState(START_ENERGY);
  const [fishCount, setFishCount] = useState(0);
  const [squidCount, setSquidCount] = useState(0);
  const [krillCount, setKrillCount] = useState(0);
  const [plasticCount, setPlasticCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);

  const [permissionMessage, setPermissionMessage] = useState("");
  const [cameraReady, setCameraReady] = useState(false);

  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const itemBagRef = useRef([]);

  const viewRef = useRef({
    yaw: 0,
    pitch: 0,
  });

  const orientationBaseRef = useRef(null);
  const lastTouchRef = useRef(null);

  const ambienceAudio = useRef(null);
  const collectAudio = useRef(null);
  const incorrectAudio = useRef(null);
  const babyPenguinAudio = useRef(null);

  useEffect(() => {
    ambienceAudio.current = new Audio("/audios/antarctic_ambience.mp3");
    ambienceAudio.current.loop = true;
    ambienceAudio.current.volume = 0.3;

    collectAudio.current = new Audio("/audios/fish_collect.mp3");
    collectAudio.current.volume = 0.8;

    incorrectAudio.current = new Audio("/audios/incorrect.mp3");
    incorrectAudio.current.volume = 0.95;

    babyPenguinAudio.current = new Audio("/audios/baby_penguin.mp3");
    babyPenguinAudio.current.volume = 0.95;

    return () => {
      ambienceAudio.current?.pause();
      collectAudio.current?.pause();
      incorrectAudio.current?.pause();
      babyPenguinAudio.current?.pause();

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setPermissionMessage(
          "Camera is not available on this browser. The game will still run with an ocean background."
        );
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        videoRef.current.setAttribute("webkit-playsinline", "true");
        await videoRef.current.play();
      }

      setCameraReady(true);
      return true;
    } catch (error) {
      console.error("Camera error:", error);
      setCameraReady(false);
      setPermissionMessage(
        "Camera permission was blocked. The game will still work with an ocean background."
      );
      return false;
    }
  };

  const handleOrientation = useCallback((event) => {
    const alpha = event.alpha ?? 0;
    const beta = event.beta ?? 60;

    if (orientationBaseRef.current === null) {
      orientationBaseRef.current = alpha;
    }

    let yawDeg = alpha - orientationBaseRef.current;

    if (yawDeg > 180) yawDeg -= 360;
    if (yawDeg < -180) yawDeg += 360;

    const pitchDeg = THREE.MathUtils.clamp(beta - 60, -45, 45);

    viewRef.current.yaw = THREE.MathUtils.degToRad(yawDeg);
    viewRef.current.pitch = THREE.MathUtils.degToRad(pitchDeg * 0.75);
  }, []);

  const requestMotionPermission = async () => {
    try {
      const DeviceOrientation =
        typeof window !== "undefined"
          ? window.DeviceOrientationEvent
          : undefined;

      if (
        DeviceOrientation &&
        typeof DeviceOrientation.requestPermission === "function"
      ) {
        const permission = await DeviceOrientation.requestPermission();

        if (permission === "granted") {
          window.addEventListener("deviceorientation", handleOrientation, true);
          return true;
        }

        setPermissionMessage(
          "Motion permission was blocked. You can still play by dragging on the screen."
        );
        return false;
      }

      window.addEventListener("deviceorientation", handleOrientation, true);
      return true;
    } catch (error) {
      console.error("Motion permission error:", error);
      setPermissionMessage(
        "Motion permission failed. You can still play by dragging on the screen."
      );
      return false;
    }
  };

  useEffect(() => {
    const handleTouchStart = (event) => {
      if (event.touches.length === 0) return;

      lastTouchRef.current = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      };
    };

    const handleTouchMove = (event) => {
      if (gameState !== "PLAYING") return;
      if (!event.touches || event.touches.length === 0) return;
      if (!lastTouchRef.current) return;

      const touch = event.touches[0];

      const deltaX = touch.clientX - lastTouchRef.current.x;
      const deltaY = touch.clientY - lastTouchRef.current.y;

      viewRef.current.yaw += deltaX * 0.006;
      viewRef.current.pitch += deltaY * 0.006;

      viewRef.current.pitch = THREE.MathUtils.clamp(
        viewRef.current.pitch,
        -0.75,
        0.75
      );

      lastTouchRef.current = {
        x: touch.clientX,
        y: touch.clientY,
      };
    };

    const handleMouseMove = (event) => {
      if (gameState !== "PLAYING") return;
      if (event.buttons !== 1) return;

      viewRef.current.yaw += event.movementX * 0.005;
      viewRef.current.pitch += event.movementY * 0.005;

      viewRef.current.pitch = THREE.MathUtils.clamp(
        viewRef.current.pitch,
        -0.75,
        0.75
      );
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState !== "PLAYING") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  useEffect(() => {
    if (gameState !== "PLAYING") return;

    if (timeLeft <= 0 || energy <= 0) {
      setGameState("GAMEOVER");
      setActiveItem(null);
      ambienceAudio.current?.pause();

      if (babyPenguinAudio.current) {
        babyPenguinAudio.current.currentTime = 0;
        babyPenguinAudio.current.play().catch(() => {});
      }
    }
  }, [gameState, timeLeft, energy]);

  const resetGame = () => {
    setActiveItem(null);
    setEnergy(START_ENERGY);
    setFishCount(0);
    setSquidCount(0);
    setKrillCount(0);
    setPlasticCount(0);
    setTimeLeft(GAME_TIME);
    setPermissionMessage("");
    viewRef.current = { yaw: 0, pitch: 0 };
    orientationBaseRef.current = null;
    itemBagRef.current = [];
  };

  const warmUpAudio = async () => {
    const audios = [
      ambienceAudio.current,
      collectAudio.current,
      incorrectAudio.current,
      babyPenguinAudio.current,
    ];

    for (const audio of audios) {
      if (!audio) continue;

      try {
        audio.muted = true;
        await audio.play();
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
      } catch {
        audio.muted = false;
      }
    }
  };

  const startGame = async () => {
    resetGame();

    await requestMotionPermission();
    await startCamera();

    setGameState("PLAYING");

    setTimeout(() => {
      warmUpAudio();

      if (ambienceAudio.current) {
        ambienceAudio.current.currentTime = 0;
        ambienceAudio.current.play().catch(() => {});
      }
    }, 100);
  };

  const handleCollect = useCallback((id, type) => {
    setActiveItem((currentItem) => {
      if (!currentItem || currentItem.id !== id) return currentItem;
      return null;
    });

    if (window.navigator?.vibrate) {
      window.navigator.vibrate(35);
    }

    if (type === "fish") {
      setFishCount((prev) => prev + 1);
      setEnergy((prev) => Math.min(100, prev + 10));

      if (collectAudio.current) {
        collectAudio.current.currentTime = 0;
        collectAudio.current.play().catch(() => {});
      }
    }

    if (type === "squid") {
      setSquidCount((prev) => prev + 1);
      setEnergy((prev) => Math.min(100, prev + 15));

      if (collectAudio.current) {
        collectAudio.current.currentTime = 0;
        collectAudio.current.play().catch(() => {});
      }
    }

    if (type === "krill") {
      setKrillCount((prev) => prev + 1);
      setEnergy((prev) => Math.min(100, prev + 12));

      if (collectAudio.current) {
        collectAudio.current.currentTime = 0;
        collectAudio.current.play().catch(() => {});
      }
    }

    if (type === "plastic") {
      setPlasticCount((prev) => prev + 1);
      setEnergy((prev) => Math.max(0, prev - 20));

      if (incorrectAudio.current) {
        incorrectAudio.current.currentTime = 0;
        incorrectAudio.current.play().catch(() => {});
      }
    }
  }, []);

  const handleMiss = useCallback((id) => {
    setActiveItem((currentItem) => {
      if (!currentItem || currentItem.id !== id) return currentItem;
      return null;
    });
  }, []);

  const getResultTitle = () => {
    if (energy <= 0) return "OUT OF ENERGY!";
    return "TIME'S UP!";
  };

  const getResultMessage = () => {
    if (energy >= 80) return "Incredible! ICY is full of energy.";
    if (energy >= 45) return "Good job! ICY safely collected enough food.";
    if (energy > 0) return "That was close! ICY needs more food next time.";
    return "Oh no! Too much plastic drained ICY's energy.";
  };

  return (
    <div className="app-shell">
      <video ref={videoRef} className="camera-feed" muted playsInline />

      <div className={`camera-fallback ${cameraReady ? "hidden" : ""}`} />

      <div className="water-tint" />
      <div className="caustic-layer" />
      <div className="depth-vignette" />

      <Canvas
        className="game-canvas"
        camera={{ position: [0, 0, 0], fov: 68 }}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
        }}
      >
        <SceneContent
          gameState={gameState}
          activeItem={activeItem}
          onCollect={handleCollect}
          onMiss={handleMiss}
          viewRef={viewRef}
          setActiveItem={setActiveItem}
          itemBagRef={itemBagRef}
        />
      </Canvas>

      <div className="center-reticle">
        <div className="reticle-dot" />
      </div>

      {gameState === "PLAYING" && (
        <div className="game-hud">
          <div className="hud-card tracker-card">
            <div className="hud-label">TARGET TRACKER</div>
            <div className="hud-row fish">Fish: {fishCount}</div>
            <div className="hud-row squid">Squid: {squidCount}</div>
            <div className="hud-row krill">Krill: {krillCount}</div>
            <div className="hud-row plastic">Plastic: {plasticCount}</div>
          </div>

          <div className="hud-card timer-card">
            <div className={`timer ${timeLeft <= 10 ? "danger" : ""}`}>
              0:{String(timeLeft).padStart(2, "0")}
            </div>

            <div className="hud-label right">ENERGY</div>

            <div className="energy-bar">
              <div
                className={`energy-fill ${energy <= 30 ? "low" : ""}`}
                style={{ width: `${energy}%` }}
              />
            </div>
          </div>

          <div className="move-helper">
            Keep the target on the visible food to collect energy. Avoid plastic.
          </div>
        </div>
      )}

      {gameState === "MENU" && (
        <div className="screen-overlay">
          <div className="menu-card">
            <div className="small-pill">Safari AR Experience</div>

            <h1>ICY PLUNGE</h1>

            <p className="subtitle">
              Explore the ocean around you and help ICY collect food.
            </p>

            <div className="instruction-box">
              <strong>How to play</strong>
              <br />
              Allow camera and motion access. Slowly move your phone to scan
              the ocean. Keep fish, squid, or krill inside the target circle to
              collect energy. Avoid plastic because it drains ICY’s energy.
            </div>

            <div className="probability-box">
              Fish 40% · Squid 20% · Krill 20% · Plastic 20%
            </div>

            {permissionMessage && (
              <div className="permission-message">{permissionMessage}</div>
            )}

            <button className="primary-button" onClick={startGame}>
              START AR EXPERIENCE
            </button>

            <p className="support-note">
              Tip: Follow the visible target. If motion is blocked, drag on the
              screen to look around.
            </p>
          </div>
        </div>
      )}

      {gameState === "GAMEOVER" && (
        <div className="screen-overlay">
          <div className="result-card">
            <h1 className={energy <= 0 ? "danger-text" : ""}>
              {getResultTitle()}
            </h1>

            <div className="final-box">
              <div className="final-label">FINAL ENERGY LEVEL</div>

              <div className={energy > 30 ? "final-score" : "final-score low"}>
                {energy}%
              </div>

              <p className="result-message">“{getResultMessage()}”</p>

              <div className="final-stats">
                <span className="fish">Fish: {fishCount}</span>
                <span className="squid">Squid: {squidCount}</span>
                <span className="krill">Krill: {krillCount}</span>
                <span className="plastic">Plastic: {plasticCount}</span>
              </div>
            </div>

            <div className="button-row">
              <button className="primary-button" onClick={startGame}>
                PLAY AGAIN
              </button>

              <button
                className="secondary-button"
                onClick={() => setGameState("THANKYOU")}
              >
                EXIT GAME
              </button>
            </div>
          </div>
        </div>
      )}

      {gameState === "THANKYOU" && (
        <div className="screen-overlay solid">
          <div className="thank-card">
            <h1>Thank You!</h1>

            <p>
              Thank you for playing ICY Plunge. Plastic pollution is dangerous
              for marine life. By helping ICY avoid plastic, you helped keep the
              virtual ocean safe.
            </p>

            <button
              className="primary-button"
              onClick={() => setGameState("MENU")}
            >
              BACK TO MENU
            </button>
          </div>
        </div>
      )}
    </div>
  );
}