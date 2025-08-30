import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const tutSteps = [
  "1. Click the tile to move the block to that postion.",
  "2. Merge the block with others by placing it on adjacent tiles.",
  "3. After merging, navigate to the pink goal tiles.",
  "4. Complete the level to advance to the next one.",
  "5. If stuck, click restart to try again.",
];

let currentLevel = 0;
let currentStep = -1;
const tut_text = document.getElementById("tut-text");

setInterval(() => {
  currentStep = (currentStep + 1) % tutSteps.length;
  tut_text.textContent = tutSteps[currentStep];
}, 3000);

const scene = new THREE.Scene();
const canvas = document.getElementById("experience-canvas");
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};
const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
const raycaster = new THREE.Raycaster();


let character = {
  group: new THREE.Group(),
  instance: null,
  block001: null,
  block002: null,
  block003: null,
  block004: null,
  block005: null,
  block006: null,
  block007: null,
  isMoving: false,
};


scene.add(character.group);
const pointer = new THREE.Vector2();

const intersectObjects = [];
const intersectObjectsNames = [];
const goalTiles = [];
const platformTiles = [];
const wallTiles = [];
const moveHistory = [];

renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor('skyblue');
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.enabled = true;

//document.body.appendChild( renderer.domElement );

const camera = new THREE.PerspectiveCamera(73, sizes.width / sizes.height, 0.1, 1000);

camera.position.x = 8.244763772420455;
camera.position.y = 8.4372715754375;
camera.position.z = 9.358217661513395;
const loader = new GLTFLoader();

function loadModelTile(levelNumber) {

  loader.load(`./T_levels/Level${levelNumber}.glb`, function (gltf) {

    gltf.scene.traverse((child) => {
      /* if (intersectObjectsNames.includes(child.name)) {
         intersectObjects.push(child);
       }*/

      if (child.name.startsWith("platform") || child.name.startsWith("goal")) {

        child.material.transparent = true;
        child.material.opacity = 0;
        intersectObjects.push(child);
        platformTiles.push(child);
      }

      if (child.name.startsWith("wall")) {
        platformTiles.push(child);
        wallTiles.push(child);
      }

      if (child.name.startsWith("goal") && child.isMesh) {
        goalTiles.push(child);

        // Optional: Make goals green & emissive
        child.material = new THREE.MeshStandardMaterial({
          color: 0x7300e6,
          emissive: 0x7300e6,
          emissiveIntensity: 0.5
        });
      }

      if (child.name.startsWith("block")) {

        platformTiles.push(child)
      }

      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }

      if (child.name === "block") {
        character.instance = child;
        //character.group.add(child);
      }

      if (child.name === "block001") {
        character.block001 = child;
      }

      if (child.name === "block002") {
        character.block002 = child;
      }

      if (child.name === "block003") {
        character.block003 = child;
      }

      if (child.name === "block004") {
        character.block004 = child;
      }
      if (child.name === "block005") {
        character.block005 = child;
      }

      if (child.name === "block006") {
        character.block006 = child;
      }

      if (child.name === "block007") {
        character.block007 = child;
      }

      //console.log(child);

    });

    scene.add(gltf.scene);

    const blockWorldPos = new THREE.Vector3();
    character.instance.getWorldPosition(blockWorldPos);
    console.log(blockWorldPos);
    /*character.instance.parent.remove(character.instance);*/  // detach from GLTF tree
    character.group.position.copy(blockWorldPos);
    character.instance.position.set(0, 0, 0); // relative to group
    character.group.add(character.instance);

    animatePlatformEntrance(platformTiles);
    saveState();

  }, undefined, function (error) {

    console.error(error);

  });
}


const alight = new THREE.AmbientLight(0xffffff, 0.2); // soft white light
scene.add(alight);
const light = new THREE.DirectionalLight(0xFFFFFF, 1);
scene.add(light);
light.position.set(10, 20, 13);
const helper = new THREE.DirectionalLightHelper(light, 5);
scene.add(light);
//scene.add(helper);
const rimLight = new THREE.DirectionalLight(0xffffff, 0.2);
rimLight.position.set(-5, 10, -5);
scene.add(rimLight);

const controls = new OrbitControls(camera, canvas);
controls.update();

const pivotGroup = new THREE.Group();
scene.add(pivotGroup);



function resetLevel() {
  // 1. Remove all objects from scene that are part of the level
  const toRemove = [];
  scene.traverse((child) => {
    if (child.name.startsWith("platform") || child.name.startsWith("block") || child.name.startsWith("goal") || child.name.startsWith("wall")) {
      toRemove.push(child);
    }
  });
  toRemove.forEach(obj => obj.parent?.remove(obj));

  // 2. Clear arrays and reset character group
  intersectObjects.length = 0;
  platformTiles.length = 0;
  goalTiles.length = 0;
  character.group.clear();
  character.group.rotation.set(0, 0, 0);
  character.group.position.set(0, 0, 0);
  character.instance = null;
  character.block001 = null;
  character.block002 = null;
  character.block003 = null;
  character.block004 = null;
  character.block005 = null;
  character.block006 = null;
  character.block007 = null;
  character.isMoving = false;

  // 3. Load again

  const el = document.getElementById('levelComplete');
  el.classList.remove('show');
  const e = document.getElementById('border');
  e.classList.remove('show');
  const nextBtn = document.getElementById("next");
  nextBtn.classList.remove("active");
  nextBtn.removeEventListener("click", handleNextClick);

  loadModelTile(currentLevel);
}


document.getElementById("restart").addEventListener("click", () => {
  console.log("Restarting level...");
  resetLevel();
});


function animatePlatformEntrance(tiles) {

  tiles.sort((a, b) => {
    const numA = parseInt(a.name.replace("platform", ""));
    const numB = parseInt(b.name.replace("platform", ""));
    return numA - numB;
  });

  tiles.forEach((tile, i) => {
    const delay = i * 0.03;
    const originalY = tile.position.y;

    tile.position.y = 25;
    tile.visible = true;

    gsap.to(tile.material, {
      opacity: 1,
      delay: delay + 0.1,
      duration: 0.4,
      ease: "power1.out"
    });

    gsap.to(tile.position, {
      y: originalY,
      delay,
      duration: 0.6,
      ease: "bounce.out"
    });
  });
}

function handleResize() {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  camera.aspect = sizes.width / sizes.height;

  camera.updateProjectionMatrix()
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

}

function isAdjacent(tile) {
  const tileBox = new THREE.Box3().setFromObject(tile);
  const tileCenter = new THREE.Vector3();
  // console.log(tileBox);
  console.log(tileCenter);
  tileBox.getCenter(tileCenter);
  console.log(tileCenter);

  const threshold = 0.3;
  const expectedStep = 2.48;

  // Check adjacency to ANY block in the character group
  for (const child of character.group.children) {
    if (!child.isMesh) continue;

    const blockPos = new THREE.Vector3();
    child.getWorldPosition(blockPos);

    const dx = tileCenter.x - blockPos.x;
    const dz = tileCenter.z - blockPos.z;
    const dy = Math.abs(tileCenter.y - blockPos.y);

    const isXStep = Math.abs(Math.abs(dx) - expectedStep) < threshold && Math.abs(dz) < threshold;
    const isZStep = Math.abs(Math.abs(dz) - expectedStep) < threshold && Math.abs(dx) < threshold;

    if ((isXStep || isZStep) && dy < 0.6) {
      return true;
    }
  }

  return false;
}

function roundToGrid(value, step = 0.5) {
  return Math.round(value / step) * step;
}

function checkIfOnGoalTile() {
  const allBlocks = [
    character.instance, character.block001, character.block002, character.block003,
    character.block004, character.block005, character.block006, character.block007
  ].filter(Boolean);

  const notGrouped = allBlocks.filter(b => b && b.parent !== character.group);
  if (notGrouped.length > 0) {
    console.log("Not all blocks are merged");
    return;
  }

  const placedBlocks = allBlocks.filter(b => b && b.parent === character.group);
  console.log("Checking", placedBlocks.length, "placed blocks...");

  let matchedGoals = 0;
  const matchedPairs = [];
  const unmatchedBlocks = [];
  const matchedGoalIndexes = new Set();

  placedBlocks.forEach((block, blockIndex) => {
    const blockPos = new THREE.Vector3();
    block.getWorldPosition(blockPos);

    const blockRounded = {
      x: roundToGrid(blockPos.x, 0.5),
      z: roundToGrid(blockPos.z, 0.5)
    };

    let matched = false;

    for (let i = 0; i < goalTiles.length; i++) {
      const goal = goalTiles[i];
      const goalBox = new THREE.Box3().setFromObject(goal);
      const goalCenter = new THREE.Vector3();
      goalBox.getCenter(goalCenter);

      const goalRounded = {
        x: roundToGrid(goalCenter.x, 0.5),
        z: roundToGrid(goalCenter.z, 0.5)
      };


      const isClose = (
        Math.abs(blockRounded.x - goalRounded.x) < 0.1 &&
        Math.abs(blockRounded.z - goalRounded.z) < 0.1
      );

      if (isClose && !matchedGoalIndexes.has(i)) {
        matched = true;
        matchedGoals++;
        matchedGoalIndexes.add(i);
        matchedPairs.push({
          blockName: block.name,
          goalName: goal.name,
          blockPos: blockRounded,
          goalPos: goalRounded
        });
        break;
      }
    }

    if (!matched) {
      unmatchedBlocks.push({ name: block.name, position: blockRounded });
    }
  });

  const unmatchedGoals = goalTiles
    .map((goal, i) => {
      if (matchedGoalIndexes.has(i)) return null;

      const goalBox = new THREE.Box3().setFromObject(goal);
      const goalCenter = new THREE.Vector3();
      goalBox.getCenter(goalCenter);

      return {
        name: goal.name,
        position: {
          x: Math.round(goalCenter.x * 10) / 10,
          z: Math.round(goalCenter.z * 10) / 10
        }
      };
    })
    .filter(Boolean);

  console.log("Matched Goals:", matchedGoals, "/", placedBlocks.length);

  if (matchedPairs.length > 0) {
    console.log("Matched Block-Goal Pairs:");
    matchedPairs.forEach(pair => {
      console.log(`  ${pair.blockName} matched ${pair.goalName} → blockPos(x=${pair.blockPos.x}, z=${pair.blockPos.z})`);
    });
  }

  if (unmatchedBlocks.length > 0) {
    console.warn("Unmatched Blocks:");
    unmatchedBlocks.forEach(b =>
      console.warn(`  ${b.name} not on goal → pos: x=${b.position.x}, z=${b.position.z}`)
    );
  }

  if (unmatchedGoals.length > 0) {
    console.warn("Unused Goal Tiles:");
    unmatchedGoals.forEach(g =>
      console.warn(`  ${g.name} not matched → pos: x=${g.position.x}, z=${g.position.z}`)
    );
  }

  if (matchedGoals === placedBlocks.length) {
    console.log("Level completed!");
    showLevelComplete();
    triggerLevelComplete();
  } else {
    console.log("Not all blocks are on goals");
  }
}



function triggerLevelComplete() {
  // Disable interaction
  character.isMoving = true;

  confetti({
    angle: 90,
    spread: 280,
    startVelocity: 45,
    particleCount: 350,
    origin: { x: 0.5, y: 0.5 },
    colors: ['#bb0000', '#ffffff']
  });
}

function showLevelComplete() {
  const el = document.getElementById('levelComplete');
  el.classList.add('show');
  const e = document.getElementById("border");
  e.classList.add("show");

  const nextBtn = document.getElementById("next");
  nextBtn.classList.add("active");
  setTimeout(() => el.classList.remove('show'), 100000);
  setTimeout(() => e.classList.remove('show'), 100000);

  document.getElementById("next").addEventListener("click", handleNextClick);
}

const handleNextClick = () => {
  currentLevel++;
  resetLevel();
  showLevel(currentLevel);
  showLevelnext(currentLevel);
  showLevelprev(currentLevel);
}

function barrier(pivotPos, dx, dz) {
  const allBlocks = [
    character.instance, character.block001, character.block002, character.block003,
    character.block004, character.block005, character.block006, character.block007
  ].filter(Boolean);

  const notGrouped = allBlocks.filter(b => b && b.parent !== character.group);
  /*if (notGrouped.length > 0) {
    console.log("Not all blocks are merged");
    return;
  }*/

  const placedBlocks = allBlocks.filter(b => b && b.parent === character.group);
  console.log("Checking", placedBlocks.length, "placed blocks...");

  const matchedBlocks = [];

  placedBlocks.forEach((block) => {
    const blockPos = new THREE.Vector3();
    block.getWorldPosition(blockPos);

    const blockRounded = {
      x: Math.round((blockPos.x) * 10) / 10,
      z: Math.round((blockPos.z) * 10) / 10
    };

    for (const wall of wallTiles) {
      const goalBox = new THREE.Box3().setFromObject(wall);
      const goalCenter = new THREE.Vector3();
      goalBox.getCenter(goalCenter);

      const goalRounded = {
        x: Math.round(goalCenter.x * 10) / 10,
        z: Math.round(goalCenter.z * 10) / 10
      };

      const match =
        Math.abs(blockRounded.x - goalRounded.x) < 0.1 &&
        Math.abs(blockRounded.z - goalRounded.z) < 0.1;

      if (match) {
        matchedBlocks.push({ name: block.name, position: blockRounded });
        break;
      }
    }
  });

  if (matchedBlocks.length > 0) {
    //console.log("Level completed! At least one block is on a goal.");
    matchedBlocks.forEach(b =>
      console.log(`✔ ${b.name} matched → pos: x=${b.position.x}, z=${b.position.z}`)
    );
    // showLevelComplete();
    // triggerLevelComplete();
    console.log("Finally wowwo");
    return true;
  } else {
    console.warn("No collison");
  }
}

const undoStack = [];

function saveState() {
  const state = {
    groupPos: character.group.position.clone(),
    groupQuat: character.group.quaternion.clone(),
    groupScale: character.group.scale.clone(),
    blockStates: character.group.children.map(child => ({
      uuid: child.uuid,
      pos: child.getWorldPosition(new THREE.Vector3()),
      quat: child.getWorldQuaternion(new THREE.Quaternion()),
      scale: child.getWorldScale(new THREE.Vector3()),
    }))
  };
  undoStack.push(state);
}


function undo() {
  if (undoStack.length === 0) return;
  const lastState = undoStack.pop();

  const allBlocks = [
    character.instance,
    character.block001,
    character.block002,
    character.block003,
    character.block004,
    character.block005,
    character.block006,
    character.block007
  ].filter(Boolean);

  // Detach all blocks from group (to preserve world positions)
  for (const block of allBlocks) {
    if (block.parent === character.group) {
      character.group.remove(block);
    }
    scene.attach(block);
  }

  // Restore each block's world transform
  for (const saved of lastState.blockStates) {
    const block = allBlocks.find(b => b.uuid === saved.uuid);
    if (!block) continue;

    block.position.copy(saved.pos);
    block.quaternion.copy(saved.quat);
    block.scale.copy(saved.scale);
  }

  // Restore group transform
  character.group.position.copy(lastState.groupPos);
  character.group.quaternion.copy(lastState.groupQuat);
  character.group.scale.copy(lastState.groupScale);

  // Reattach blocks to group (preserve world positions)
  for (const saved of lastState.blockStates) {
    const block = allBlocks.find(b => b.uuid === saved.uuid);
    if (block) {
      character.group.attach(block);  // This keeps world transform
    }
  }

  character.isMoving = false;
}



function onClick(event) {
  if (character.isMoving) return;
  character.isMoving = true;

  raycaster.setFromCamera(pointer, camera);

  const validTiles = intersectObjects.filter(tile => {
    const tileBox = new THREE.Box3().setFromObject(tile);
    const tileCenter = new THREE.Vector3();
    tileBox.getCenter(tileCenter);

    const threshold = 0.3;
    const heightThreshold = 1.5;

    for (const block of character.group.children) {
      if (!block.isMesh) continue;

      const blockPos = new THREE.Vector3();
      block.getWorldPosition(blockPos);

      const dx = Math.abs(tileCenter.x - blockPos.x);
      const dz = Math.abs(tileCenter.z - blockPos.z);
      const dy = Math.abs(tileCenter.y - blockPos.y);

      if (dx < threshold && dz < threshold && dy < heightThreshold) {
        return false; // A block is on this tile, exclude it
      }
    }

    return true; // No block above, allow clicking
  });

  const intersects = raycaster.intersectObjects(validTiles, true);

  if (intersects.length === 0) {
    character.isMoving = false;
    return;
  }

  const tile = intersects[0].object;

  if (!isAdjacent(tile)) {
    console.log("Not adjacent to any block");
    character.isMoving = false;
    return;
  }

  const tileBox = new THREE.Box3().setFromObject(tile);
  const tileCenter = new THREE.Vector3();
  tileBox.getCenter(tileCenter);

  const threshold = 0.3;
  const expectedStep = 2.48;

  let pivotBlock = null;
  let minDistance = Infinity;

  for (const child of character.group.children) {
    if (!child.isMesh) continue;

    const blockPos = new THREE.Vector3();
    child.getWorldPosition(blockPos);

    const dx = tileCenter.x - blockPos.x;
    const dz = tileCenter.z - blockPos.z;
    const dy = Math.abs(tileCenter.y - blockPos.y);

    const isXStep = Math.abs(Math.abs(dx) - expectedStep) < threshold && Math.abs(dz) < threshold;
    const isZStep = Math.abs(Math.abs(dz) - expectedStep) < threshold && Math.abs(dx) < threshold;

    if ((isXStep || isZStep) && dy < 0.6) {
      const distance = blockPos.distanceTo(tileCenter);
      if (distance < minDistance) {
        minDistance = distance;
        pivotBlock = child;
      }
    }
  }

  if (!pivotBlock) {
    console.log("No valid pivot block found");
    character.isMoving = false;
    return;
  }

  const pivotPos = new THREE.Vector3();
  pivotBlock.getWorldPosition(pivotPos);

  const dx = tileCenter.x - pivotPos.x;
  const dz = tileCenter.z - pivotPos.z;
  const flipAxis = Math.abs(dx) > Math.abs(dz) ? 'z' : 'x';

  // Reset local transform and reparent to pivotGroup
  scene.attach(character.group);

  pivotGroup.position.copy(pivotPos);
  pivotGroup.rotation.set(0, 0, 0);

  const charWorld = new THREE.Vector3();
  character.group.getWorldPosition(charWorld);
  const relOffset = new THREE.Vector3().subVectors(charWorld, pivotPos);

  character.group.position.copy(relOffset);
  pivotGroup.add(character.group);

  const timeline = gsap.timeline();
  const rotationTween = {};
  rotationTween[flipAxis] = "-=" + Math.PI;

  timeline.to(pivotGroup.rotation, {
    ...rotationTween,
    duration: 0.65,
    ease: "power1.inOut"
  });

  timeline.to(pivotGroup.position, {
    x: pivotGroup.position.x + dx,
    z: pivotGroup.position.z + dz,
    duration: 0.65,
    ease: "power1.inOut"
  }, "<");

  // Final step: cleanup and restore world transform
  timeline.add(() => {
    character.group.updateMatrixWorld(true);
    const savedMatrix = character.group.matrixWorld.clone();

    pivotGroup.remove(character.group);
    scene.add(character.group);

    character.group.matrix.copy(savedMatrix);
    character.group.matrix.decompose(
      character.group.position,
      character.group.quaternion,
      character.group.scale
    );

    pivotGroup.position.set(0, 0, 0);
    pivotGroup.rotation.set(0, 0, 0);

    character.isMoving = false;

    // Block merging logic
    const allBlocks = [character.instance, character.block001, character.block002, character.block003,
    character.block004, character.block005, character.block006, character.block007].filter(Boolean);

    const ungrouped = allBlocks.filter(block => block && block.parent !== character.group);
    const grouped = character.group.children.filter(obj => obj.isMesh);

    for (const unBlock of ungrouped) {
      const unWorld = new THREE.Vector3();
      unBlock.getWorldPosition(unWorld);

      for (const groupBlock of grouped) {
        const groupWorld = new THREE.Vector3();
        groupBlock.getWorldPosition(groupWorld);

        const dx = unWorld.x - groupWorld.x;
        const dz = unWorld.z - groupWorld.z;
        const dy = Math.abs(unWorld.y - groupWorld.y);

        const isAdj = (
          (Math.abs(Math.round(dx / expectedStep)) === 1 && Math.round(dz / expectedStep) === 0) ||
          (Math.abs(Math.round(dz / expectedStep)) === 1 && Math.round(dx / expectedStep) === 0)
        ) && dy < 0.6;

        if (isAdj) {
          unBlock.material.color.copy(groupBlock.material.color);

          const worldPos = new THREE.Vector3();
          unBlock.getWorldPosition(worldPos);
          character.group.worldToLocal(worldPos);
          unBlock.position.copy(worldPos);

          if (unBlock.parent !== character.group) {
            unBlock.parent.remove(unBlock);
            character.group.add(unBlock);
          }

          break;
        }
      }
    }

    if (barrier(pivotPos, dx, dz) && currentLevel != 10) {

      console.log("yes on wall");
      undo();
      //character.isMoving=false;
      //return;

    } else {

      saveState();
    }
    checkIfOnGoalTile();
  }, "+=0");
}


function onPointerMove(event) {

  // calculate pointer position in normalized device coordinates
  // (-1 to +1) for both components

  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;

}
// call this when level completes
function showLevel(newLevel) {
  const levelText = document.getElementById('level-text');

  // Remove class to restart animation
  levelText.classList.remove('animate-level');

  // Force reflow to reset animation state
  void levelText.offsetWidth;

  // Update text
  levelText.textContent = `Level ${newLevel}`;

  // Trigger animation
  levelText.classList.add('animate-level');
}

function showLevelnext(newLevel) {
  const levelText = document.getElementById('level-text-next');

  // Remove class to restart animation
  levelText.classList.remove('animate-level');

  // Force reflow to reset animation state
  void levelText.offsetWidth;

  // Update text
  levelText.textContent = `Level ${++newLevel}`;

  // Trigger animation
  levelText.classList.add('animate-level');
}

function showLevelprev(newLevel) {
  const levelText = document.getElementById('level-text-prev');

  // Remove class to restart animation
  levelText.classList.remove('animate-level');

  // Force reflow to reset animation state
  void levelText.offsetWidth;

  // Update text
  levelText.textContent = `Level ${--newLevel}`;

  // Trigger animation
  levelText.classList.add('animate-level');
}

loadModelTile(currentLevel);
window.addEventListener("click", onClick);
window.addEventListener("resize", handleResize);
window.addEventListener("pointermove", onPointerMove);

function start(){
  const menu=document.getElementById("experience");
  menu.style.filter="blur(0px)";
  document.getElementById("strt_menu").remove();
}

document.getElementById("play").addEventListener("click", start);

const sphereGeometry = new THREE.SphereGeometry(0.1, 32, 32); // radius 0.2, smoothness
const sphereMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // red color
const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);

// Set position (example: x=1, y=2, z=3)
sphere.position.set(0.0000171661376953125, 2.5388419511675835, -1.2124543190002441);

console.log("Sphere", sphere.position);


// Optional: enable shadows if needed
sphere.castShadow = true;
sphere.receiveShadow = true;

//scene.add(sphere);


function animate() {
  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(intersectObjects);
  // calculate objects intersecting the picking ray

  let isHoveringValidTile = false;

  if (intersects.length > 0 && character.group) {
    const hoveredTile = intersects[0].object;

    // Check if the hovered tile is beneath any block
    let isBlocked = false;
    const tileBox = new THREE.Box3().setFromObject(hoveredTile);
    const tileCenter = new THREE.Vector3();
    tileBox.getCenter(tileCenter);

    const threshold = 0.3;
    const heightThreshold = 1.5;

    for (const block of character.group.children) {
      if (!block.isMesh) continue;

      const blockPos = new THREE.Vector3();
      block.getWorldPosition(blockPos);

      const dx = Math.abs(tileCenter.x - blockPos.x);
      const dz = Math.abs(tileCenter.z - blockPos.z);
      const dy = Math.abs(tileCenter.y - blockPos.y);

      if (dx < threshold && dz < threshold && dy < heightThreshold) {
        isBlocked = true;
        break;
      }
    }

    if (!isBlocked) {
      // Now check adjacency like before
      for (const block of [character.instance, character.block001, character.block002, character.block003,
      character.block004, character.block005, character.block006, character.block007].filter(Boolean)) {
        if (!block || block.parent != character.group) continue;

        const blockPos = new THREE.Vector3();
        block.getWorldPosition(blockPos);

        const dx = tileCenter.x - blockPos.x;
        const dz = tileCenter.z - blockPos.z;
        const dy = Math.abs(tileCenter.y - blockPos.y);

        const isX = Math.abs(Math.abs(dx) - 2.48) < 0.3 && Math.abs(dz) < 0.3;
        const isZ = Math.abs(Math.abs(dz) - 2.48) < 0.3 && Math.abs(dx) < 0.3;

        if ((isX || isZ) && dy < 0.6) {
          isHoveringValidTile = true;
          break;
        }
      }
    }
  }

  document.body.style.cursor = isHoveringValidTile ? "pointer" : "default";


  for (let i = 0; i < intersects.length; i++) {

    //console.log(intersects[0].object.name);
    //console.log("Hit:", intersects[0].object.name, "| Parent:", intersects[0].object.parent?.name);

  }

  renderer.render(scene, camera);
}

const axesHelper = new THREE.AxesHelper(20);
//scene.add(axesHelper);
renderer.setAnimationLoop(animate);

