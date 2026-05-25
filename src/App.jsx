import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import "./App.css";

useGLTF.preload("/models/penguin.glb");
useGLTF.preload("/models/seabed.glb");
useGLTF.preload("/models/fish.glb");
useGLTF.preload("/models/squid.glb");
useGLTF.preload("/models/plastic.glb");

const GAME_TIME = 60;
const START_ENERGY = 50;

function cloneModel(scene) {
  return SkeletonUtils.clone(scene);
}

function UnderwaterBubbles() {
  const pointsRef = useRef();

  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < 110; i++) {
      temp.push({
        x: (Math.random() - 0.5) * 9,
        y: Math.random() * 7 - 3,
        z: Math.random() * -10,
        speed: 0.25 + Math.random() * 0.55,
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

      if (array[i * 3 + 1] > 4) {
        array[i * 3 + 1] = -3;
        array[i * 3] = (Math.random() - 0.5) * 9;
        array[i * 3 + 2] = Math.random() * -10;
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
        size={0.055}
        transparent
        opacity={0.65}
        depthWrite={false}
      />
    </points>
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
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = true;

        if (child.material) {
          child.material.transparent = true;
          child.material.opacity = 0.75;
        }
      }
    });
  }, [actions, names, clonedScene]);

  return (
    <group ref={group}>
      <ambientLight intensity={1.2} color="#c7f1ff" />
      <directionalLight position={[2, 6, 4]} intensity={1.6} color="#e0f7ff" />
      <pointLight position={[0, 1.5, 2]} intensity={1.2} color="#38bdf8" />

      <primitive
        object={clonedScene}
        position={[0, -2.4, -5.2]}
        scale={[1.6, 1.6, 1.6]}
      />

      <mesh position={[0, 0, -7.5]}>
        <planeGeometry args={[18, 12]} />
        <meshBasicMaterial color="#075985" transparent opacity={0.3} />
      </mesh>

      <mesh position={[0, 3.7, -4]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[18, 18]} />
        <meshBasicMaterial
          color="#7dd3fc"
          transparent
          opacity={0.18}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[-2.5, 1.2, -4]} rotation={[0.4, 0, -0.35]}>
        <cylinderGeometry args={[0.12, 2.5, 8, 32]} />
        <meshBasicMaterial
          color="#e0f2fe"
          transparent
          opacity={0.08}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[2.5, 1.4, -5]} rotation={[0.5, 0, 0.35]}>
        <cylinderGeometry args={[0.12, 2.8, 8, 32]} />
        <meshBasicMaterial
          color="#e0f2fe"
          transparent
          opacity={0.07}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function PlayerPenguin({ tilt }) {
  const group = useRef();
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

    const targetX = THREE.MathUtils.clamp(tilt.x * 2.4, -2.3, 2.3);
    const targetY = THREE.MathUtils.clamp(-tilt.y * 1.5, -1.45, 1.35);

    group.current.position.x = THREE.MathUtils.lerp(
      group.current.position.x,
      targetX,
      delta * 5.5
    );

    group.current.position.y = THREE.MathUtils.lerp(
      group.current.position.y,
      targetY,
      delta * 5.5
    );

    group.current.position.z = 0;

    group.current.rotation.z = THREE.MathUtils.lerp(
      group.current.rotation.z,
      -targetX * 0.18,
      delta * 4
    );
  });

  return (
    <group ref={group} position={[0, 0, 0]}>
      <group rotation={[0, Math.PI / 2, 0]}>
        <primitive object={clonedScene} scale={0.22} />
      </group>
    </group>
  );
}

function AnimatedItemModel({ modelPath, scale }) {
  const { scene, animations } = useGLTF(modelPath);
  const clonedScene = useMemo(() => cloneModel(scene), [scene]);
  const mixer = useMemo(
    () => new THREE.AnimationMixer(clonedScene),
    [clonedScene]
  );

  useEffect(() => {
    if (animations?.length) {
      animations.forEach((clip) => {
        mixer.clipAction(clip).reset().play().setEffectiveTimeScale(1.25);
      });
    }

    return () => {
      mixer.stopAllAction();
    };
  }, [animations, mixer]);

  useFrame((_, delta) => {
    mixer.update(delta);
  });

  return <primitive object={clonedScene} scale={scale} />;
}

function StaticItemModel({ modelPath, scale }) {
  const { scene } = useGLTF(modelPath);
  const clonedScene = useMemo(() => cloneModel(scene), [scene]);
  const group = useRef();

  useFrame((_, delta) => {
    if (!group.current) return;
    group.current.rotation.x += delta * 0.8;
    group.current.rotation.y += delta * 0.6;
  });

  return (
    <group ref={group}>
      <primitive object={clonedScene} scale={scale} />
    </group>
  );
}

function GameItem({ item, playerPositionRef, onCollect, onMiss }) {
  const group = useRef();
  const collectedRef = useRef(false);

  useFrame((_, delta) => {
    if (!group.current || collectedRef.current) return;

    group.current.position.z += item.speed * delta;
    group.current.rotation.y += delta * item.spin;

    const playerPos = playerPositionRef.current;
    const itemPos = group.current.position;
    const distance = itemPos.distanceTo(playerPos);

    if (distance < item.hitRadius) {
      collectedRef.current = true;
      onCollect(item.id, item.type);
      return;
    }

    if (itemPos.z > 1.4) {
      collectedRef.current = true;
      onMiss(item.id);
    }
  });

  return (
    <group ref={group} position={item.position}>
      {item.type === "fish" && (
        <AnimatedItemModel modelPath="/models/fish.glb" scale={0.07} />
      )}

      {item.type === "squid" && (
        <AnimatedItemModel modelPath="/models/squid.glb" scale={0.13} />
      )}

      {item.type === "plastic" && (
        <StaticItemModel modelPath="/models/plastic.glb" scale={0.07} />
      )}
    </group>
  );
}

function SceneContent({
  gameState,
  tilt,
  items,
  onCollect,
  onMiss,
  playerPositionRef,
}) {
  useFrame(() => {
    const targetX = THREE.MathUtils.clamp(tilt.x * 2.4, -2.3, 2.3);
    const targetY = THREE.MathUtils.clamp(-tilt.y * 1.5, -1.45, 1.35);
    playerPositionRef.current.set(targetX, targetY, 0);
  });

  return (
    <>
      <color attach="background" args={["#062a4f"]} />
      <fog attach="fog" args={["#062a4f", 4, 13]} />

      <UnderwaterEnvironment />
      <UnderwaterBubbles />

      {gameState === "PLAYING" && (
        <>
          <PlayerPenguin tilt={tilt} />

          {items.map((item) => (
            <GameItem
              key={item.id}
              item={item}
              playerPositionRef={playerPositionRef}
              onCollect={onCollect}
              onMiss={onMiss}
            />
          ))}
        </>
      )}
    </>
  );
}

export default function App() {
  const [gameState, setGameState] = useState("MENU");
  const [items, setItems] = useState([]);
  const [energy, setEnergy] = useState(START_ENERGY);
  const [fishCount, setFishCount] = useState(0);
  const [squidCount, setSquidCount] = useState(0);
  const [plasticCount, setPlasticCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_TIME);
  const [permissionMessage, setPermissionMessage] = useState("");

  const tiltRef = useRef({ x: 0, y: 0 });
  const [tiltState, setTiltState] = useState({ x: 0, y: 0 });

  const playerPositionRef = useRef(new THREE.Vector3(0, 0, 0));

  const ambienceAudio = useRef(null);
  const collectAudio = useRef(null);
  const incorrectAudio = useRef(null);
  const babyPenguinAudio = useRef(null);

  useEffect(() => {
    ambienceAudio.current = new Audio("/audios/antarctic_ambience.mp3");
    ambienceAudio.current.loop = true;
    ambienceAudio.current.volume = 0.35;

    collectAudio.current = new Audio("/audios/fish_collect.mp3");
    collectAudio.current.volume = 0.8;

    incorrectAudio.current = new Audio("/audios/incorrect.mp3");
    incorrectAudio.current.volume = 0.8;

    babyPenguinAudio.current = new Audio("/audios/baby_penguin.mp3");
    babyPenguinAudio.current.volume = 0.95;

    return () => {
      ambienceAudio.current?.pause();
      collectAudio.current?.pause();
      incorrectAudio.current?.pause();
      babyPenguinAudio.current?.pause();
    };
  }, []);

  useEffect(() => {
    const syncTilt = setInterval(() => {
      setTiltState({ ...tiltRef.current });
    }, 33);

    return () => clearInterval(syncTilt);
  }, []);

  const handleOrientation = useCallback((event) => {
    const gamma = event.gamma || 0;
    const beta = event.beta || 0;

    const x = THREE.MathUtils.clamp(gamma / 35, -1, 1);
    const y = THREE.MathUtils.clamp((beta - 45) / 35, -1, 1);

    tiltRef.current = { x, y };
  }, []);

  const requestMotionPermission = async () => {
    setPermissionMessage("");

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
          "Motion permission was not allowed. You can still play by dragging on the screen."
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
    const handleMouseMove = (event) => {
      if (gameState !== "PLAYING") return;

      const x = (event.clientX / window.innerWidth - 0.5) * 2;
      const y = (event.clientY / window.innerHeight - 0.5) * 2;

      tiltRef.current = {
        x: THREE.MathUtils.clamp(x, -1, 1),
        y: THREE.MathUtils.clamp(y, -1, 1),
      };
    };

    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [gameState]);

  useEffect(() => {
    const handleTouchMove = (event) => {
      if (gameState !== "PLAYING") return;
      if (!event.touches || event.touches.length === 0) return;

      const touch = event.touches[0];

      const x = (touch.clientX / window.innerWidth - 0.5) * 2;
      const y = (touch.clientY / window.innerHeight - 0.5) * 2;

      tiltRef.current = {
        x: THREE.MathUtils.clamp(x, -1, 1),
        y: THREE.MathUtils.clamp(y, -1, 1),
      };
    };

    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    return () => {
      window.removeEventListener("touchmove", handleTouchMove);
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
      ambienceAudio.current?.pause();

      if (babyPenguinAudio.current) {
        babyPenguinAudio.current.currentTime = 0;
        babyPenguinAudio.current.play().catch(() => {});
      }
    }
  }, [gameState, timeLeft, energy]);

  useEffect(() => {
    if (gameState !== "PLAYING") return;

    const spawnInterval = setInterval(() => {
      const rand = Math.random();

      let type = "fish";

      if (rand < 0.55) {
        type = "fish";
      } else if (rand < 0.85) {
        type = "squid";
      } else {
        type = "plastic";
      }

      const x = (Math.random() - 0.5) * 4.6;
      const y = (Math.random() - 0.5) * 2.7;
      const z = -8.5 - Math.random() * 2.5;

      const speed =
        type === "plastic"
          ? 1.55 + Math.random() * 0.5
          : 1.35 + Math.random() * 0.5;

      const newItem = {
        id: `${Date.now()}-${Math.random()}`,
        type,
        position: [x, y, z],
        speed,
        spin: 0.6 + Math.random() * 0.8,
        hitRadius: type === "squid" ? 0.58 : 0.5,
      };

      setItems((prev) => [...prev, newItem]);
    }, 1200);

    return () => clearInterval(spawnInterval);
  }, [gameState]);

  const resetGame = () => {
    setItems([]);
    setEnergy(START_ENERGY);
    setFishCount(0);
    setSquidCount(0);
    setPlasticCount(0);
    setTimeLeft(GAME_TIME);
    tiltRef.current = { x: 0, y: 0 };
    setTiltState({ x: 0, y: 0 });
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

    // This must happen directly from the button click for iPhone Safari.
    await requestMotionPermission();

    // Start game even if motion permission fails.
    // User can still play by dragging on the screen.
    setGameState("PLAYING");

    // Audio starts after permission request.
    setTimeout(() => {
      warmUpAudio();

      if (ambienceAudio.current) {
        ambienceAudio.current.currentTime = 0;
        ambienceAudio.current.play().catch(() => {});
      }
    }, 100);
  };

  const handleCollect = useCallback((id, type) => {
    setItems((prev) => prev.filter((item) => item.id !== id));

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
      setEnergy((prev) => Math.min(100, prev + 20));

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
    setItems((prev) => prev.filter((item) => item.id !== id));
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
      <Canvas
        camera={{ position: [0, 0, 4.2], fov: 62 }}
        gl={{
          alpha: false,
          antialias: true,
          powerPreference: "high-performance",
        }}
      >
        <SceneContent
          gameState={gameState}
          tilt={tiltState}
          items={items}
          onCollect={handleCollect}
          onMiss={handleMiss}
          playerPositionRef={playerPositionRef}
        />
      </Canvas>

      {gameState === "PLAYING" && (
        <div className="game-hud">
          <div className="hud-card tracker-card">
            <div className="hud-label">TARGET TRACKER</div>
            <div className="hud-row fish">Fish: {fishCount}</div>
            <div className="hud-row squid">Squid: {squidCount}</div>
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
            Move your phone or drag your finger to guide ICY.
          </div>
        </div>
      )}

      {gameState === "MENU" && (
        <div className="screen-overlay">
          <div className="menu-card">
            <div className="small-pill">iOS / Safari PWA version</div>

            <h1>ICY PLUNGE</h1>

            <p className="subtitle">
              Help the baby penguin swim underwater and collect food.
            </p>

            <div className="instruction-box">
              <strong>How to play</strong>
              <br />
              Move your phone left, right, up, and down. If motion is blocked,
              drag on the screen to guide ICY. Catch fish and squid to gain
              energy. Avoid plastic.
            </div>

            {permissionMessage && (
              <div className="permission-message">{permissionMessage}</div>
            )}

            <button className="primary-button" onClick={startGame}>
              START GAME
            </button>

            <p className="support-note">
              On iPhone, press Allow for motion permission. If it is blocked,
              drag on the screen to play.
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