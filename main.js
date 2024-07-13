import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { GammaCorrectionShader } from "three/examples/jsm/shaders/GammaCorrectionShader.js";
import { gsap } from "gsap";
import { closeView } from "./closeView.js";
import { middleView } from "./middleView.js";
import { distantView } from "./distantView.js";
import { setActiveView } from "./state.js";

let scene, camera, renderer, composer, model, controls, raycaster, mouse;
const objects = [];
let lastCameraPosition = new THREE.Vector3();
let activeView = null;
const loadingDiv = document.getElementById("loading");
init();
animate();

function init() {
  const container = document.createElement("div");
  container.className = "three-container";
  document.body.appendChild(container);

  // Scene
  scene = new THREE.Scene();

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true; // 启用阴影
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 使用柔和阴影
  renderer.toneMapping = THREE.ReinhardToneMapping; // 设置色调映射
  renderer.toneMappingExposure = 10; // 增加曝光
  renderer.outputEncoding = THREE.sRGBEncoding;
  container.appendChild(renderer.domElement);

  // Camera
  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    2000
  );

  camera.position.set(0, 10, 65);
  const targetLookAt2 = new THREE.Vector3(0, 15, -30);
  // camera.rotation.set(0, 12.54, 0);
  camera.lookAt(targetLookAt2);
  lastCameraPosition.copy(camera.position);

  // Raycaster
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(
    "https://www.gstatic.com/draco/versioned/decoders/1.4.1/"
  ); // 设置 Draco 解码器路径

  // Load GLB model
  const loader = new GLTFLoader();
  loader.setDRACOLoader(dracoLoader);
  loader.load(
    "scene.glb",
    function (gltf) {
      model = gltf.scene;
      model.traverse((child) => {
        if (child.isMesh) {
          console.log(child); // 输出模型名称到控制台
          child.castShadow = true;
          child.receiveShadow = true;
          objects.push(child); // Add mesh to objects array
          if (child.name === "xs") {
            const video = document.createElement('video');
            video.src = 'output6.webm';
            video.loop = true;
            video.muted = true;
            video.play();

            const videoTexture = new THREE.VideoTexture(video);
            videoTexture.needsUpdate = true;

            // Ensure the material is compatible with video textures
            child.material = new THREE.MeshBasicMaterial({ map: videoTexture });
            child.material.needsUpdate = true;
          }

          if (child.name === "dhl") {
            const textureLoader = new THREE.TextureLoader();
            const texture = textureLoader.load('map.png', () => {
              texture.needsUpdate = true;
              child.material = new THREE.MeshBasicMaterial({ map: texture });
              child.material.needsUpdate = true;
            });
          }

        }
      });
      scene.add(model);
      loadingDiv.style.display = "none";
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    undefined,
    function (error) {
      console.error(error);
    }
  );

  // Postprocessing
  composer = new EffectComposer(renderer);

  // Render pass
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // Unreal Bloom pass
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.2,
    0.4,
    0.85
  );
  bloomPass.threshold = 0;
  bloomPass.strength = 0.2;
  bloomPass.radius = 0;
  composer.addPass(bloomPass);

  // Gamma correction pass
  const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);
  composer.addPass(gammaCorrectionPass);

  // FXAA pass
  const fxaaPass = new ShaderPass(FXAAShader);
  const pixelRatio = renderer.getPixelRatio();
  fxaaPass.material.uniforms["resolution"].value.x =
    1 / (window.innerWidth * pixelRatio);
  fxaaPass.material.uniforms["resolution"].value.y =
    1 / (window.innerHeight * pixelRatio);
  composer.addPass(fxaaPass);

  // Handle window resize
  window.addEventListener("resize", onWindowResize, false);

  // Mouse click event listener
  window.addEventListener("click", onMouseClick, false);

  // Move camera on button click

  document
    .getElementById("camera1-button")
    .addEventListener("click", () => {
      setActiveView('distant'); // 设置当前激活的视图为 distant
      distantView(camera);
    });

  document
    .getElementById("camera2-button")
    .addEventListener("click", () => {
      setActiveView('middle'); // 设置当前激活的视图为 middle
      middleView(camera);
    });

  document
    .getElementById("camera3-button")
    .addEventListener("click", () => {
      setActiveView('close'); // 设置当前激活的视图为 close
      closeView(camera, objects);
    });

}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseClick(event) {
  // Normalize mouse coordinates to [-1, 1]
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Update the picking ray with the camera and mouse position
  raycaster.setFromCamera(mouse, camera);

  // Calculate objects intersecting the picking ray
  const intersects = raycaster.intersectObjects(objects);

  if (intersects.length > 0) {
    const intersectedObject = intersects[0].object;
    console.log(intersectedObject.name); // 输出被点击对象的名称
    // Check if the clicked object is the specific model
    if (intersectedObject.name === "SM_Statue_RaijinAmo_Baked") {
      // alert("clicked");
      // closeView(camera);
    }
    if (intersectedObject.name === "SM_Statue_FujinAmo_Baked") {
      // alert("clicked");
      // middleView(camera);
    }
    if (intersectedObject.name === "立方体002_Baked") {
      // alert("clicked");
      //  distantView(camera);
    }
  }
}

function onMoveButtonClick() {
  gsap.to(camera.position, {
    duration: 2,
    x: 0.04, // 设置新的x位置
    y: 9.03, // 设置新的y位置
    z: 30, // 设置新的z位置
    onUpdate: function () {
      // camera.lookAt(scene.position);
    },
    onComplete: function () {
      lastCameraPosition.copy(camera.position);
    },
  });
}

function animate() {
  requestAnimationFrame(animate);
  if (!camera.position.equals(lastCameraPosition)) {
    updateMaterials();
    lastCameraPosition.copy(camera.position);
  }

  // Render scene with composer
  composer.render();
}

function updateMaterials() {
  objects.forEach((child) => {
    if (child.material) {
      child.material.needsUpdate = true;
    }
  });
}
