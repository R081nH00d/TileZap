import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const tutSteps=[
  "1. Click the tile to move the block to tht tile.",
  "2. Merge the block with other blocks by placing it on the adjacent tiles",
  "3. After merging travel to goal tiles colored in pink",
  "4. Level completed advance to next level",
  "5. If got stuck click restart and continue again",
];

let currentLevel=0;
let currentStep=-1;
const tut_text=document.getElementById("tut-text");

setInterval(()=> {
  currentStep=(currentStep+1)%tutSteps.length;
  tut_text.textContent=tutSteps[currentStep];
}, 3000);

const scene = new THREE.Scene();
const canvas = document.getElementById("experience-canvas");
const sizes ={
  width: window.innerWidth,
  height: window.innerHeight,
};
const renderer = new THREE.WebGLRenderer({canvas:canvas, antialias:true});
const raycaster = new THREE.Raycaster();


let character ={
  group: new THREE.Group(),
  instance : null,
  block001: null,
  block002 : null,
  block003 :null,
  block004: null,
  block005: null,
  isMoving :false,
};


scene.add(character.group);
const pointer = new THREE.Vector2();
const intersectObjects=[];
const intersectObjectsNames=[];
const goalTiles=[
];
const platformTiles=[];

renderer.setSize( sizes.width, sizes.height );
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor('skyblue');
renderer.shadowMap.type=THREE.PCFShadowMap;
renderer.shadowMap.enabled=true;

//document.body.appendChild( renderer.domElement );

const camera = new THREE.PerspectiveCamera( 73, sizes.width / sizes.height, 0.1, 1000 );

camera.position.x =8.244763772420455;
camera.position.y =8.4372715754375;
camera.position.z =9.358217661513395;
const loader = new GLTFLoader();

function loadModel(levelNumber){
  
  loader.load( `./levels/Level${levelNumber}.glb`, function ( gltf ) {
    
    gltf.scene.traverse((child)=>{
      if(intersectObjectsNames.includes(child.name)){
        intersectObjects.push(child);
      }
      
      if (child.name.startsWith("platform") || child.name.startsWith("goal")) {
  
        child.material.transparent=true;
        child.material.opacity=0;
        intersectObjects.push(child);
        platformTiles.push(child);
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
  
      if(child.name.startsWith("block")){
      
        platformTiles.push(child)
      }
      
      if (child.isMesh){
        child.castShadow=true;
        child.receiveShadow=true;
      }
        
      if(child.name === "block"){
        character.instance=child;
          //character.group.add(child);
        }
        
      if(child.name === "block001"){
        character.block001=child;
      }
        
      if(child.name === "block002"){
        character.block002=child;
      }

      if(child.name === "block003"){
        character.block003=child;
      }
      
      if(child.name === "block004"){
        character.block004=child;
      }
      if(child.name === "block005"){
        character.block005=child;
      }
        
      //console.log(child);
        
    });
  
    scene.add( gltf.scene );
      
    const blockWorldPos = new THREE.Vector3();
    character.instance.getWorldPosition(blockWorldPos);
    /*character.instance.parent.remove(character.instance);*/  // detach from GLTF tree
    character.group.position.copy(blockWorldPos);
    character.instance.position.set(0, 0, 0); // relative to group
    character.group.add(character.instance);
  
    animatePlatformEntrance(platformTiles);
  
  }, undefined, function ( error ) {
    
    console.error( error );
    
  });
}


const alight = new THREE.AmbientLight( 0xffffff,0.2 ); // soft white light
scene.add( alight );
const light = new THREE.DirectionalLight( 0xFFFFFF,1 );
scene.add( light );
light.position.set(10,20,13);
//const helper = new THREE.DirectionalLightHelper( light, 5 );
scene.add( light );
const rimLight = new THREE.DirectionalLight(0xffffff, 0.2);
rimLight.position.set(-5, 10, -5);
scene.add(rimLight);

const controls = new OrbitControls( camera, canvas );
controls.update();

const pivotGroup = new THREE.Group();
scene.add(pivotGroup);



function resetLevel() {
  // 1. Remove all objects from scene that are part of the level
  const toRemove = [];
  scene.traverse((child) => {
    if (child.name.startsWith("platform") || child.name.startsWith("block") || child.name.startsWith("goal")) {
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
  character.isMoving = false;

  // 3. Load the model again

  const el = document.getElementById('levelComplete');
  el.classList.remove('show');
  const e=document.getElementById('border');
  e.classList.remove('show');
  const nextBtn=document.getElementById("next");
  nextBtn.classList.remove("active");
  nextBtn.removeEventListener("click", handleNextClick);

  loadModel(currentLevel);
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

    tile.position.y = 15;
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

function handleResize(){
  sizes.width=window.innerWidth;
  sizes.height=window.innerHeight;
  
  camera.aspect=sizes.width/sizes.height;
  
  camera.updateProjectionMatrix() 
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

}

function isAdjacent(tile) {
  const tileBox = new THREE.Box3().setFromObject(tile);
  const tileCenter = new THREE.Vector3();
  tileBox.getCenter(tileCenter);

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

function checkIfOnGoalTile() {
  const allBlocks = [character.instance, character.block001, character.block002, character.block003, character.block004, character.block005].filter(Boolean);

  const notGrouped = allBlocks.filter(b => b && b.parent !== character.group);
  if (notGrouped.length > 0) {
    console.log(" Not all blocks are merged");
    return;
  }

  const placedBlocks = allBlocks.filter(b => b && b.parent === character.group);
  console.log(" Checking", placedBlocks.length, "placed blocks...");

  let matchedGoals = 0;

  for (const block of placedBlocks) {
    const blockPos = new THREE.Vector3();
    block.getWorldPosition(blockPos);

    const blockRounded = {
      x: Math.round(blockPos.x * 10) / 10,
      z: Math.round(blockPos.z * 10) / 10
    };

    console.log("Block Rounded Pos:", blockRounded);

    let matched = false;

    for (const goal of goalTiles) {
      const goalBox = new THREE.Box3().setFromObject(goal);
      const goalCenter = new THREE.Vector3();
      goalBox.getCenter(goalCenter);

      const goalRounded = {
        x: Math.round(goalCenter.x * 10) / 10,
        z: Math.round(goalCenter.z * 10) / 10
      };

      if (
        Math.abs(blockRounded.x - goalRounded.x) < 0.1 &&
        Math.abs(blockRounded.z - goalRounded.z) < 0.1
      ) {
        matched = true;
        break;
      }
    }

    if (matched) matchedGoals++;
  }

  console.log("Matched Goals:", matchedGoals, "/", placedBlocks.length);

  if (matchedGoals === placedBlocks.length) {
    console.log("Level completed!");
    showLevelComplete(); // your UI logic
    triggerLevelComplete();
  } else {
    console.log("⚠ Not all blocks are on goals");
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
  const e=document.getElementById("border");
  e.classList.add("show");

  const nextBtn=document.getElementById("next");
  nextBtn.classList.add("active");
  setTimeout(() => el.classList.remove('show'), 100000);
  setTimeout(() => e.classList.remove('show'), 100000);

  document.getElementById("next").addEventListener("click", handleNextClick);
}

const handleNextClick =()=>{
  currentLevel++;
  resetLevel();
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
    const allBlocks = [character.instance, character.block001, character.block002,character.block003,character.block004, character.block005].filter(Boolean);
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
    checkIfOnGoalTile();
  }, "+=0");
}


function onPointerMove( event ) {

	// calculate pointer position in normalized device coordinates
	// (-1 to +1) for both components

	pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

}

loadModel(currentLevel);
window.addEventListener("click", onClick);
window.addEventListener("resize", handleResize);
window.addEventListener( "pointermove", onPointerMove );

function animate()
{
  raycaster.setFromCamera( pointer, camera );
  
  const intersects = raycaster.intersectObjects( intersectObjects );
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
    for (const block of [character.instance, character.block001, character.block002,character.block003, character.block004, character.block005].filter(Boolean)) {
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


	for ( let i = 0; i < intersects.length; i ++ ) {

    //console.log(intersects[0].object.name);
    //console.log("Hit:", intersects[0].object.name, "| Parent:", intersects[0].object.parent?.name);

	}

  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate); 

