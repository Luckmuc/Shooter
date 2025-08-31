import { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Ray } from "@babylonjs/core/Culling/ray";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import "@babylonjs/loaders";

const canvas = document.getElementById('renderCanvas');
const engine = new Engine(canvas, true);
const scene = new Scene(engine);

const camera = new FreeCamera('playerCam', new Vector3(50, 3, 50), scene);
camera.checkCollisions = false;
camera.applyGravity = false;
camera.speed = 1.2;
camera.inertia = 0;

function ensureSafePlayerSpawn(){
    const testPos = camera.position.clone();
    for(const mesh of scene.meshes){
        if(mesh.metadata && mesh.metadata.solid){
            if(pointNearMesh(mesh, testPos, PLAYER_RADIUS)){
                console.log('Player spawn inside solid mesh, relocating...');
                const safePositions = [
                    new Vector3(30, 3, 30),
                    new Vector3(-30, 3, 30), 
                    new Vector3(30, 3, -30),
                    new Vector3(-30, 3, -30),
                    new Vector3(0, 3, 0)
                ];
                for(const pos of safePositions){
                    let isSafe = true;
                    for(const m of scene.meshes){
                        if(m.metadata && m.metadata.solid && pointNearMesh(m, pos, PLAYER_RADIUS)){
                            isSafe = false;
                            break;
                        }
                    }
                    if(isSafe){
                        camera.position = pos.clone();
                        console.log('Moved player to safe position:', pos);
                        return;
                    }
                }
                camera.position = new Vector3(0, 25, 0);
                console.log('Emergency spawn: moved player to elevated position');
                return;
            }
        }
    }
}

const light = new HemisphericLight('h1', new Vector3(0,1,0), scene);
scene.clearColor = new Color4(0.53,0.81,0.92,1);

const sun = new DirectionalLight('sun', new Vector3(-0.5,-1,0.2), scene);
sun.intensity = 1.2;
sun.position = new Vector3(60,80,-60);
const sunMat = new StandardMaterial('sunMat', scene);
sunMat.emissiveColor = new Color3(1.0, 0.95, 0.6);
const sunMesh = MeshBuilder.CreateSphere('sunMesh',{diameter:8}, scene);
sunMesh.position = new Vector3(60,80,-60);
sunMesh.material = sunMat;
sunMesh.isPickable = false;

scene.fogMode = 2;
scene.fogDensity = 0.0015;
scene.fogColor = new Color3(0.85,0.89,0.95);
light.intensity = 0.9;

function createSnow(){
    const ps = new ParticleSystem('snow', 2000, scene);
    const partDT = new DynamicTexture('partDT',{width:64,height:64}, scene, true);
    const pctx = partDT.getContext();
    pctx.clearRect(0,0,64,64);
    pctx.fillStyle = 'white';
    pctx.beginPath();
    pctx.arc(32,32,12,0,Math.PI*2);
    pctx.fill();
    partDT.update();
    ps.particleTexture = partDT;
    ps.emitter = new Vector3(0,50,0);
    ps.minEmitBox = new Vector3(-MAP_HALF,0,-MAP_HALF);
    ps.maxEmitBox = new Vector3(MAP_HALF,0,MAP_HALF);
    ps.minSize = 0.12;
    ps.maxSize = 0.4;
    ps.minLifeTime = 6;
    ps.maxLifeTime = 12;
    ps.emitRate = 180;
    ps.direction1 = new Vector3(-0.5,-1,-0.5);
    ps.direction2 = new Vector3(0.5,-1,0.5);
    ps.gravity = new Vector3(0,-1,0);
    ps.start();
}

const MAP_SIZE = 1200;
const MAP_HALF = MAP_SIZE / 2;
const ground = MeshBuilder.CreateGround('ground', {width:MAP_SIZE, height:MAP_SIZE}, scene);
ground.position.y = 0;
const gmat = new StandardMaterial('gmat', scene);
gmat.diffuseColor = new Color3(0.12, 0.35, 0.08);
ground.material = gmat;
markSolid(ground);

const dt = new DynamicTexture('groundDT', {width:1024, height:1024}, scene, false);
const ctx = dt.getContext();
ctx.fillStyle = 'rgba(30,120,40,0.95)';
ctx.fillRect(0,0,1024,1024);
for(let i=0;i<200;i++){
    const x = Math.floor(Math.random()*1024);
    const y = Math.floor(Math.random()*1024);
    const w = 4 + Math.floor(Math.random()*12);
    ctx.fillStyle = `rgba(${10+Math.floor(Math.random()*30)}, ${10+Math.floor(Math.random()*30)}, ${15+Math.floor(Math.random()*35)}, ${0.3})`;
    ctx.fillRect(x,y,w,2);
}
dt.update();
gmat.diffuseTexture = dt;

function markSolid(mesh){
    if(!mesh) return;
    mesh.metadata = mesh.metadata || {};
    mesh.metadata.solid = true;
}

const PLAYER_RADIUS = 1.25;
const BOT_RADIUS = 1.1;

const streetMat = new StandardMaterial('streetMat', scene);
streetMat.diffuseColor = new Color3(0.12,0.12,0.12);
streetMat.specularColor = new Color3(0.02,0.02,0.02);
function makeStreet(x,z,w,h){
    const s = MeshBuilder.CreateGround('street_'+x+'_'+z,{width:w, height:h}, scene);
    s.position = new Vector3(x,0.02,z);
    s.material = streetMat;
}
makeStreet(0,0,MAP_SIZE,20);
makeStreet(0,0,20,MAP_SIZE);

const roads = [];
const spawnPoints = [];
const trafficLights = [];

function createCityRoadSystem(){
    const roadWidth = 8;
    const arterialWidth = 18;
    const blockSize = 96;
    const blocksPerSide = 10;
    const usableSpan = blockSize * blocksPerSide;
    const halfSpan = usableSpan / 2;

    createRoad(0, 0, MAP_SIZE, arterialWidth, 0);
    createRoad(0, 0, arterialWidth, MAP_SIZE, Math.PI/2);
    const minorOffset = Math.floor(blockSize * 2.5);
    createRoad(0, minorOffset, MAP_SIZE * 0.95, arterialWidth, 0);
    createRoad(0, -minorOffset, MAP_SIZE * 0.95, arterialWidth, 0);
    createRoad(minorOffset, 0, arterialWidth, MAP_SIZE * 0.95, Math.PI/2);
    createRoad(-minorOffset, 0, arterialWidth, MAP_SIZE * 0.95, Math.PI/2);

    for(let bx = 0; bx < blocksPerSide; bx++){
        for(let bz = 0; bz < blocksPerSide; bz++){
            const cx = Math.round((bx - blocksPerSide/2 + 0.5) * blockSize);
            const cz = Math.round((bz - blocksPerSide/2 + 0.5) * blockSize);

            const localCount = 1 + Math.floor(Math.random() * 3);
            for(let l = 0; l < localCount; l++){
                const len = Math.round(blockSize * (0.35 + Math.random() * 0.5));
                if(Math.random() < 0.55){
                    const xoff = Math.round((Math.random() - 0.5) * (blockSize * 0.5));
                    createRoad(cx + xoff, cz, roadWidth, len, Math.PI/2);
        } else {
          const zoff = Math.round((Math.random() - 0.5) * (blockSize * 0.5));
          createRoad(cx, cz + zoff, len, roadWidth, 0);
        }
      }

      if(Math.random() < 0.06){
        const ang = Math.random() * Math.PI * 2;
        const clen = 20 + Math.random() * 36;
        createRoad(cx + Math.cos(ang) * (blockSize*0.28), cz + Math.sin(ang) * (blockSize*0.28), roadWidth, clen, ang);
      }
    }
  }

  const avenueCount = 6;
  for(let a=0;a<avenueCount;a++){
    const alongX = Math.random() < 0.5;
    const startBlock = Math.floor(Math.random() * blocksPerSide);
    const spanBlocks = 2 + Math.floor(Math.random() * 4);
    const start = -Math.floor(blocksPerSide/2) * blockSize + startBlock * blockSize + Math.floor(Math.random()*blockSize*0.3);
    if(alongX){
      const z = Math.round((Math.random() - 0.5) * usableSpan);
      createRoad( start + (spanBlocks*blockSize)/2, z, spanBlocks * blockSize, arterialWidth, 0 );
    } else {
      const x = Math.round((Math.random() - 0.5) * usableSpan);
      createRoad( x, start + (spanBlocks*blockSize)/2, arterialWidth, spanBlocks * blockSize, Math.PI/2 );
    }
  }
}

function createOfficeBuilding(x, z, w, d, floors) {
  const h = floors * 3.5;
  createBuilding(x, z, w, d, h);
  
  for(let f = 1; f < floors; f++) {
    const windowBand = MeshBuilder.CreateBox(uniqueName('windows'), {width: w * 0.9, height: 0.1, depth: d * 0.9}, scene);
    windowBand.position = new Vector3(x, f * 3.5, z);
    const wMat = new StandardMaterial(uniqueName('windowMat'), scene);
    wMat.diffuseColor = new Color3(0.3, 0.4, 0.6);
    wMat.emissiveColor = new Color3(0.1, 0.15, 0.2);
    windowBand.material = wMat;
  }
}

function createShoppingMall(x, z) {
  const mall = MeshBuilder.CreateBox(uniqueName('mall'), {width: 120, height: 8, depth: 80}, scene);
  mall.position = new Vector3(x, 4, z);
  const mallMat = new StandardMaterial(uniqueName('mallMat'), scene);
  mallMat.diffuseColor = new Color3(0.8, 0.7, 0.6);
  mall.material = mallMat;
  markSolid(mall);
  
  for(let i = -1; i <= 1; i++) {
    const canopy = MeshBuilder.CreateBox(uniqueName('canopy'), {width: 15, height: 0.5, depth: 8}, scene);
    canopy.position = new Vector3(x + i * 40, 2.5, z + 44);
    const cMat = new StandardMaterial(uniqueName('canopyMat'), scene);
    cMat.diffuseColor = new Color3(0.9, 0.2, 0.2);
    canopy.material = cMat;
    markSolid(canopy);
  }
}

function createGasStationComplex(x, z) {
  const station = MeshBuilder.CreateBox(uniqueName('gasMain'), {width: 20, height: 4, depth: 15}, scene);
  station.position = new Vector3(x, 2, z);
  const stMat = new StandardMaterial(uniqueName('gasMat'), scene);
  stMat.diffuseColor = new Color3(0.9, 0.9, 0.1);
  station.material = stMat;
  markSolid(station);
  
  const canopy = MeshBuilder.CreateBox(uniqueName('gasCanopy'), {width: 40, height: 1, depth: 25}, scene);
  canopy.position = new Vector3(x, 5, z + 20);
  const canMat = new StandardMaterial(uniqueName('gasCanopyMat'), scene);
  canMat.diffuseColor = new Color3(0.95, 0.95, 0.95);
  canopy.material = canMat;
  markSolid(canopy);
  
  for(let i = -1; i <= 1; i += 2) {
    for(let j = -1; j <= 1; j += 2) {
      const pillar = MeshBuilder.CreateCylinder(uniqueName('gasPillar'), {diameter: 1, height: 5}, scene);
      pillar.position = new Vector3(x + i * 15, 2.5, z + 20 + j * 10);
      const pMat = new StandardMaterial(uniqueName('pillarMat'), scene);
      pMat.diffuseColor = new Color3(0.8, 0.8, 0.8);
      pillar.material = pMat;
      markSolid(pillar);
    }
  }
  
  for(let i = -2; i <= 2; i++) {
    for(let j = -1; j <= 1; j += 2) {
      const pump = MeshBuilder.CreateBox(uniqueName('pump'), {width: 1.5, height: 1.8, depth: 0.8}, scene);
      pump.position = new Vector3(x + i * 6, 0.9, z + 20 + j * 8);
      const pumpMat = new StandardMaterial(uniqueName('pumpMat'), scene);
      pumpMat.diffuseColor = new Color3(0.9, 0.1, 0.1);
      pump.material = pumpMat;
      markSolid(pump);
    }
  }
}

function generateModernCity() {
  buildingsList.length = 0;
  
  createCityRoadSystem();

  for(let i = 0; i < 8; i++) {
    const x = -300 + Math.random() * 200;
    const z = -300 + Math.random() * 200;
    const floors = 15 + Math.floor(Math.random() * 25);
    createOfficeBuilding(x, z, 25 + Math.random() * 15, 25 + Math.random() * 15, floors);
  }
  
  for(let i = 0; i < 20; i++) {
    const x = 100 + Math.random() * 400;
    const z = -200 + Math.random() * 400;
    const floors = 5 + Math.floor(Math.random() * 8);
    createBuilding(x, z, 15 + Math.random() * 10, 15 + Math.random() * 10, floors * 3.2);
  }
  
  createShoppingMall(-450, 200);
  createShoppingMall(350, 300);
  createShoppingMall(100, -400);
  
  for(let i = 0; i < 12; i++) {
    const x = -500 + Math.random() * 200;
    const z = 200 + Math.random() * 300;
    createContainer(x, z, 20 + Math.random() * 15, 8 + Math.random() * 4);
  }
  
  createGasStationComplex(200, 150);
  createGasStationComplex(-250, -150);
  createGasStationComplex(400, -200);
  createGasStationComplex(-180, 320);
  
  for(let i = 0; i < 30; i++) {
    const x = (Math.random() - 0.5) * (MAP_SIZE * 0.8);
    const z = (Math.random() - 0.5) * (MAP_SIZE * 0.8);
    
    if(Math.abs(x) < 20 || Math.abs(z) < 20) continue;
    if(Math.abs(x % (MAP_SIZE / 6)) < 20) continue;
    if(Math.abs(z % (MAP_SIZE / 6)) < 20) continue;
    
    const buildingType = Math.random();
    if(buildingType < 0.4) {
      const floors = 8 + Math.floor(Math.random() * 12);
      createOfficeBuilding(x, z, 20 + Math.random() * 10, 20 + Math.random() * 10, floors);
    } else if(buildingType < 0.7) {
      const floors = 3 + Math.floor(Math.random() * 6);
      createBuilding(x, z, 12 + Math.random() * 8, 12 + Math.random() * 8, floors * 3.5);
    } else {
      createBuilding(x, z, 25 + Math.random() * 15, 15 + Math.random() * 10, 4 + Math.random() * 2);
    }
  }
}

function spawnCityBots(count = 15) {
  for(let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * (MAP_SIZE * 0.9);
    const z = (Math.random() - 0.5) * (MAP_SIZE * 0.9);
    const y = 2;
    
    const bot = MeshBuilder.CreateBox(uniqueName('bot'), {width: 1.2, height: 2.0, depth: 0.8}, scene);
    bot.position = new Vector3(x, y, z);
    
    const botMat = new StandardMaterial(uniqueName('botMat'), scene);
    botMat.diffuseColor = pickRandom(botPalette);
    bot.material = botMat;
    markSolid(bot);
    
    bots.push({
      mesh: bot,
      parts: [bot],
      hp: 100,
      speed: 2 + Math.random() * 3,
      direction: Math.random() * Math.PI * 2,
      changeTime: 0
    });
  }
}

const wallMat = new StandardMaterial('wallMat', scene);
wallMat.diffuseColor = new Color3(0.85, 0.87, 0.9);
wallMat.specularColor = new Color3(0.2, 0.2, 0.2);

const buildingPalette = [
  new Color3(0.84,0.86,0.9),
  new Color3(0.75,0.68,0.6),
  new Color3(0.82,0.76,0.72), 
  new Color3(0.65,0.72,0.78)
];
const containerPalette = [
  new Color3(0.15,0.22,0.4),
  new Color3(0.25,0.07,0.07),
  new Color3(0.12,0.12,0.12),
  new Color3(0.08,0.25,0.12)
];
const rampPalette = [
  new Color3(0.65,0.65,0.66),
  new Color3(0.56,0.52,0.5),
  new Color3(0.45,0.48,0.5)
];
const coverPalette = [
  new Color3(0.45,0.45,0.48),
  new Color3(0.5,0.42,0.4),
  new Color3(0.38,0.45,0.38)
];
const botPalette = [
  new Color3(0.7,0.2,0.2),
  new Color3(0.2,0.6,0.2),
  new Color3(0.2,0.3,0.7),
  new Color3(0.6,0.5,0.2)
];

function pickRandom(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function uniqueName(prefix){ return prefix + '_' + Math.floor(Math.random()*1000000); }

const themes = [
  { name: 'Winter-muted', buildings: buildingPalette, containers: containerPalette, ramps: rampPalette, covers: coverPalette, bots: botPalette, teleBases: [new Color3(0.6,0.8,1.0), new Color3(0.6,0.9,0.6)] },
  { name: 'Warm-town', buildings: [new Color3(0.9,0.78,0.66), new Color3(0.82,0.7,0.6), new Color3(0.74,0.6,0.5)], containers: [new Color3(0.45,0.15,0.12), new Color3(0.3,0.2,0.1)], ramps: rampPalette, covers: coverPalette, bots: [new Color3(0.7,0.1,0.1), new Color3(0.5,0.4,0.15)], teleBases: [new Color3(0.9,0.6,0.6), new Color3(0.9,0.7,0.4)] },
  { name: 'High-contrast', buildings: [new Color3(0.95,0.95,0.95), new Color3(0.72,0.72,0.82)], containers: [new Color3(0.08,0.08,0.15), new Color3(0.2,0.08,0.08)], ramps: [new Color3(0.4,0.4,0.45)], covers: [new Color3(0.55,0.55,0.58)], bots: [new Color3(1,0.2,0.2), new Color3(0.2,0.8,1)], teleBases: [new Color3(0.6,1,0.6), new Color3(1,0.6,1)] }
];
let currentTheme = 0;

function applyTheme(index){
  currentTheme = index % themes.length;
  const t = themes[currentTheme];
  scene.meshes.forEach(m => {
    if(!m.material) return;
    const n = m.name || '';
    try{
      if(n.startsWith('b_') || n.startsWith('b_floor') || n.startsWith('b_left') || n.startsWith('b_right') || n.startsWith('b_back') || n.startsWith('b_front')){
        m.material.diffuseColor = pickRandom(t.buildings);
      }
      if(n.startsWith('container') || n.startsWith('c_cap')){
        m.material.diffuseColor = pickRandom(t.containers);
      }
      if(n.startsWith('ramp') || n.startsWith('rampSmall')){
        m.material.diffuseColor = pickRandom(t.ramps);
      }
      if(n.startsWith('cover') || n.startsWith('plat')){
        m.material.diffuseColor = pickRandom(t.covers);
      }
      if(n.startsWith('bot')){
        m.material.diffuseColor = pickRandom(t.bots);
      }
      if(n.startsWith('tp')){
        m.material.emissiveColor = pickRandom(t.teleBases);
      }
    }catch(e){}
  });
  const tb = document.getElementById('themeBtn');
  if(tb) tb.innerText = `Theme: ${t.name}`;
}

function cycleTheme(){ applyTheme((currentTheme+1) % themes.length); }

if(typeof document !== 'undefined'){
  window.addEventListener('load', ()=>{
    const btn = document.getElementById('themeBtn');
    if(btn) btn.addEventListener('click', ()=> cycleTheme());
    applyTheme(0);
  });
}

const teleporters = [];
let lastTeleportTime = 0;

function createFir(x,z,height=8){
  const trunkHeight = Math.max(1.2, height * 0.12);
  const trunk = MeshBuilder.CreateCylinder('trunk',{diameter:0.45, height:trunkHeight}, scene);
  trunk.position = new Vector3(x,trunkHeight/2,z);
  const matT = new StandardMaterial('trunkMat', scene);
  matT.diffuseColor = new Color3(0.10,0.06,0.03);
  trunk.material = matT;
  markSolid(trunk);

  const coneCount = 4;
  let base = trunkHeight + 0.5;
  for(let i=0;i<coneCount;i++){
    const frac = 1 - (i/ (coneCount));
    const coneDiameter = Math.max(1.6, height * (0.9 * frac));
    const coneHeight = Math.max(1.6, height * 0.25);
    const cone = MeshBuilder.CreateCylinder('firCone',{diameterTop:0, diameterBottom:coneDiameter, height:coneHeight, tessellation:24}, scene);
    cone.position = new Vector3(x, base + coneHeight/2, z);
    const mat = new StandardMaterial('coneMat', scene);
    const green = 0.15 + (i * 0.03);
    mat.diffuseColor = new Color3(0.02, Math.max(0.12, green), 0.02);
    mat.specularColor = new Color3(0.02,0.02,0.02);
    cone.material = mat;
    markSolid(cone);
    base += coneHeight - 0.35;
  }
}

function pointNearMesh(mesh, point, radius=0){
  if(!mesh || !mesh.getBoundingInfo) return false;
  try{
    const bb = mesh.getBoundingInfo().boundingBox;
    if(!bb) return false;
    const min = bb.minimumWorld;
    const max = bb.maximumWorld;
    if(!min || !max) return false;
    const cx = Math.max(min.x, Math.min(max.x, point.x));
    const cy = Math.max(min.y, Math.min(max.y, point.y));
    const cz = Math.max(min.z, Math.min(max.z, point.z));
    const dx = point.x - cx;
    const dy = point.y - cy;
    const dz = point.z - cz;
    const dist2 = dx*dx + dy*dy + dz*dz;
    return dist2 <= (radius * radius);
  }catch(e){ return false; }
}

function moveMeshWithCollision(mesh, targetPos, radius=1.0){
  if(!mesh) return false;
  const dir = targetPos.subtract(mesh.position);
  const dist = dir.length();
  if(dist < 0.0001) return true;
  dir.normalize();
  const steps = Math.max(2, Math.ceil(dist / 0.1));
  for(let s=1;s<=steps;s++){
    const t = s/steps;
    const sample = mesh.position.add(dir.scale(dist * t));
    let blocked = false;
    for(const m of scene.meshes){
      if(m === mesh) continue;
      if(m.metadata && m.metadata.solid){
        if(pointNearMesh(m, sample, radius)) { blocked = true; break; }
      }
    }
    if(blocked) return false;
  }
  mesh.position = targetPos.clone();
  return true;
}

function createBuilding(cx,cz,w,d,h){
  const floor = MeshBuilder.CreateBox('b_floor',{width:w, depth:d, height:0.2}, scene);
  floor.position = new Vector3(cx,0.1,cz);
  floor.material = wallMat;
  markSolid(floor);
  const wallThickness = 0.6;
  const halfW = w/2;
  const halfD = d/2;
  const left = MeshBuilder.CreateBox('b_left',{width:wallThickness, height:h, depth:d}, scene);
  left.position = new Vector3(cx - halfW + wallThickness/2, h/2, cz);
  left.material = wallMat; markSolid(left);
  const right = MeshBuilder.CreateBox('b_right',{width:wallThickness, height:h, depth:d}, scene);
  right.position = new Vector3(cx + halfW - wallThickness/2, h/2, cz);
  right.material = wallMat; markSolid(right);
  const back = MeshBuilder.CreateBox('b_back',{width:w - 1.0, height:h, depth:wallThickness}, scene);
  back.position = new Vector3(cx, h/2, cz - halfD + wallThickness/2);
  back.material = wallMat; markSolid(back);
  const doorW = 3.0;
  const frontL = MeshBuilder.CreateBox('b_frontL',{width:(w-doorW)/2, height:h, depth:wallThickness}, scene);
  frontL.position = new Vector3(cx - (doorW+w)/4, h/2, cz + halfD - wallThickness/2);
  frontL.material = wallMat; markSolid(frontL);
  const frontR = MeshBuilder.CreateBox('b_frontR',{width:(w-doorW)/2, height:h, depth:wallThickness}, scene);
  frontR.position = new Vector3(cx + (doorW+w)/4, h/2, cz + halfD - wallThickness/2);
  frontR.material = wallMat; markSolid(frontR);
  const roof = MeshBuilder.CreateBox('b_roof',{width:w+0.4, height:0.2, depth:d+0.4}, scene);
  roof.position = new Vector3(cx, h + 0.15, cz);
  const useWall = pickRandom(buildingPalette);
  const bMat = new StandardMaterial(uniqueName('bWall'), scene);
  bMat.diffuseColor = useWall;
  bMat.specularColor = new Color3(0.12,0.12,0.12);
  floor.material = bMat;
  left.material = bMat;
  right.material = bMat;
  back.material = bMat;
  frontL.material = bMat;
  frontR.material = bMat;
  const roofMat = new StandardMaterial(uniqueName('roofMat'), scene);
  roofMat.diffuseColor = useWall.add(new Color3(0.12,0.12,0.15)).scale(1.0);
  roof.material = roofMat;
  markSolid(roof);
  roof.metadata.climbable = true;
  buildingsList.push({cx:cx, cz:cz, w:w, d:d, top: roof.position.y});
}

const buildingsList = [];

function createSkyscraper(cx, cz, w, d, floors, floorHeight=3.2){
  const totalH = floors * floorHeight;
  for(let i=0;i<floors;i++){
    const y = (i * floorHeight) + (floorHeight/2);
    const bf = MeshBuilder.CreateBox(uniqueName('sk_floor'),{width:w, height:floorHeight-0.2, depth:d}, scene);
    bf.position = new Vector3(cx, y, cz);
    const fm = new StandardMaterial(uniqueName('skmat'), scene);
    fm.diffuseColor = pickRandom(buildingPalette);
    bf.material = fm;
    markSolid(bf);
    if(i < floors-1) bf.metadata.climbable = false;
  }
  const roof = MeshBuilder.CreateBox(uniqueName('sk_roof'),{width:w+0.4, height:0.3, depth:d+0.4}, scene);
  roof.position = new Vector3(cx, totalH + 0.15, cz);
  const roofMat = new StandardMaterial(uniqueName('sk_roof_mat'), scene);
  roofMat.diffuseColor = pickRandom(buildingPalette);
  roof.material = roofMat; markSolid(roof); roof.metadata.climbable = true;
  buildingsList.push({cx:cx, cz:cz, w:w, d:d, top: roof.position.y});
  return roof;
}

function createRoofStairs(buildingInfo){
  const {cx, cz, w, d, top} = buildingInfo;
  const side = Math.floor(Math.random()*4);
  const angle = (side === 0) ? 0 : (side === 1) ? Math.PI/2 : (side === 2) ? Math.PI : -Math.PI/2;
  const outDist = Math.max(w, d) / 2 + 2.0;
  const start = new Vector3(cx + Math.cos(angle) * outDist, 0.25, cz + Math.sin(angle) * outDist);
  const inset = 0.6;
  const roofEdge = new Vector3(cx - Math.cos(angle) * (Math.abs(Math.cos(angle)) * (w/2 - inset) + Math.abs(Math.sin(angle)) * (d/2 - inset)), top - 0.05, cz - Math.sin(angle) * (Math.abs(Math.cos(angle)) * (w/2 - inset) + Math.abs(Math.sin(angle)) * (d/2 - inset)));
  const horiz = new Vector3(roofEdge.x - start.x, 0, roofEdge.z - start.z);
  const horizDist = Math.max(0.1, Math.sqrt(horiz.x*horiz.x + horiz.z*horiz.z));
  const stepD = 0.9;
  const steps = Math.max(3, Math.ceil(horizDist / stepD));
  const stepH = Math.max(0.25, (top - 0.5) / steps);
  for(let i=0;i<steps;i++){
    const t = (i + 0.5) / steps;
    const px = start.x + horiz.x * t;
    const pz = start.z + horiz.z * t;
    const py = (stepH * (i + 0.5));
    const width = Math.min(4, w * 0.6);
    const depth = (horizDist / steps) * 1.05;
    const step = MeshBuilder.CreateBox(uniqueName('roofStep'), {width: width, height: stepH, depth: depth}, scene);
    step.position = new Vector3(px, py, pz);
    step.rotation.y = Math.atan2(horiz.x, horiz.z);
    const sm = new StandardMaterial(uniqueName('stepMat'), scene); sm.diffuseColor = new Color3(0.48,0.48,0.5); step.material = sm;
    markSolid(step);
    step.metadata.climbable = true;
  }
}

function createLadderForTallest(){
  if(buildingsList.length === 0) return;
  let tallest = buildingsList[0];
  for(const b of buildingsList) if(b.top > tallest.top) tallest = b;
  const ladderX = tallest.cx + tallest.w/2 + 0.5;
  const ladderZ = tallest.cz;
  const ladderBottomY = 0.5;
  const ladderTopY = tallest.top - 0.1;
  const totalH = ladderTopY - ladderBottomY;
  const rungCount = Math.max(6, Math.floor(totalH / 0.28));
  const rungSpacing = totalH / rungCount;
  for(let i=0;i<=rungCount;i++){
    const y = ladderBottomY + i * rungSpacing;
    const rung = MeshBuilder.CreateBox(uniqueName('ladderRung'),{width:0.02, height:0.02, depth:0.6}, scene);
    rung.position = new Vector3(ladderX, y, ladderZ);
    const rm = new StandardMaterial(uniqueName('ladMat'), scene); rm.diffuseColor = new Color3(0.18,0.12,0.08);
    rung.material = rm; markSolid(rung);
    rung.metadata.climbable = true;
  }
  try{
    const markerTop = ladderTopY - 0.1;
    registerLadder(ladderX, ladderZ, ladderBottomY, markerTop);
  }catch(e){ }
}

let ladderState = { activeLadder: null, near: false, climbing: false, climbStartY:0, climbTopY:0 };
function ensureLadderPrompt(){
  let el = document.getElementById('ladderPrompt');
  if(!el){ el = document.createElement('div'); el.id = 'ladderPrompt'; el.style.position='absolute'; el.style.left='50%'; el.style.bottom='12%'; el.style.transform='translateX(-50%)'; el.style.padding='6px 10px'; el.style.background='rgba(0,0,0,0.6)'; el.style.color='white'; el.style.borderRadius='6px'; el.style.display='none'; document.body.appendChild(el); }
  return el;
}

let fDown = false;
window.addEventListener('keydown', (e)=>{ if(e.key.toLowerCase() === 'f') fDown = true; });
window.addEventListener('keyup', (e)=>{ if(e.key.toLowerCase() === 'f') fDown = false; });

function registerLadder(x,z,bottomY,topY){
  const marker = MeshBuilder.CreateBox(uniqueName('ladderMarker'), {width:1.0, height:(topY-bottomY), depth:1.0}, scene);
  marker.position = new Vector3(x, (bottomY+topY)/2, z);
  marker.isVisible = false; marker.metadata = marker.metadata || {}; marker.metadata.isLadder = true; marker.metadata.bottomY = bottomY; marker.metadata.topY = topY;
  return marker;
}

function connectRoofsWithPlanks(){
  if(buildingsList.length < 2) return;
  const created = new Set();
  const maxDist = 220;
  const maxHeightDiff = 3.0;
  const inset = 0.6;
  for(let i=0;i<buildingsList.length;i++){
    const a = buildingsList[i];
    const others = [];
    for(let j=0;j<buildingsList.length;j++){ if(i===j) continue; const b = buildingsList[j]; const dist = Math.hypot(a.cx-b.cx, a.cz-b.cz); others.push({j,dist}); }
    others.sort((x,y)=>x.dist-y.dist);
    for(let k=0;k<Math.min(2, others.length); k++){
      const j = others[k].j; const b = buildingsList[j]; const key = `${Math.min(i,j)}_${Math.max(i,j)}`;
      if(created.has(key)) continue;
      const dist = others[k].dist;
      if(dist > maxDist) continue;
      if(Math.abs(a.top - b.top) > maxHeightDiff) continue;
      const angle = Math.atan2(b.cz - a.cz, b.cx - a.cx);
      const radiusA = Math.sqrt((a.w/2)*(a.w/2) + (a.d/2)*(a.d/2)) - inset;
      const radiusB = Math.sqrt((b.w/2)*(b.w/2) + (b.d/2)*(b.d/2)) - inset;
      const pointA = new Vector3(a.cx + Math.cos(angle)*radiusA, a.top + 0.06, a.cz + Math.sin(angle)*radiusA);
      const pointB = new Vector3(b.cx - Math.cos(angle)*radiusB, b.top + 0.06, b.cz - Math.sin(angle)*radiusB);
      const dx = pointB.x - pointA.x; const dz = pointB.z - pointA.z; const dy = pointB.y - pointA.y;
      const horiz = Math.sqrt(dx*dx + dz*dz);
      if(horiz < 1.0) continue;
      const length = Math.sqrt(dx*dx + dz*dz + dy*dy);
      const yaw = Math.atan2(dx, dz);
      const pitch = Math.atan2(dy, horiz);
      const width = Math.min(2.0, Math.max(0.6, horiz * 0.08));
      const plank = MeshBuilder.CreateBox(uniqueName('plankBridge'), {width: width, height: 0.12, depth: length}, scene);
      plank.position = new Vector3((pointA.x + pointB.x)/2, (pointA.y + pointB.y)/2, (pointA.z + pointB.z)/2);
      plank.rotation = new Vector3(-pitch, yaw, 0);
      const pm = new StandardMaterial(uniqueName('plankMat'), scene); pm.diffuseColor = new Color3(0.38,0.24,0.12);
      plank.material = pm;
      markSolid(plank); plank.metadata.climbable = true;
      created.add(key);
    }
  }
}

function createContainer(x,z,w=4,h=3.0){
  const c = MeshBuilder.CreateBox(uniqueName('container'),{width:w, height:h, depth:3.0}, scene);
  c.position = new Vector3(x,h/2,z);
  const cm = new StandardMaterial(uniqueName('cm'), scene);
  cm.diffuseColor = pickRandom(containerPalette);
  cm.specularColor = new Color3(0.05,0.05,0.05);
  c.material = cm;
  markSolid(c);
  c.metadata.climbable = true;
  const cap = MeshBuilder.CreateBox(uniqueName('c_cap'),{width:w+0.2, height:0.12, depth:3.2}, scene);
  cap.position = new Vector3(x, h + 0.06, z);
  const capMat = new StandardMaterial(uniqueName('capMat'), scene);
  capMat.diffuseColor = new Color3(0.98,0.98,1.0);
  cap.material = capMat;
  markSolid(cap);
  cap.metadata.climbable = true;
}

function createRamp(x,z,rot=0){
  const ramp = MeshBuilder.CreateBox(uniqueName('ramp'),{width:10, height:0.8, depth:12}, scene);
  ramp.position = new Vector3(x,0.4,z);
  ramp.rotation.x = -0.45;
  const rm = new StandardMaterial(uniqueName('rm'), scene);
  rm.diffuseColor = pickRandom(rampPalette);
  rm.specularColor = new Color3(0.06,0.06,0.06);
  ramp.material = rm;
  markSolid(ramp);
  ramp.metadata.climbable = true;
}

function createTeleporter(x,z,tx,tz){
  const pad = MeshBuilder.CreateDisc(uniqueName('tp'),{radius:1.2, tessellation:32}, scene);
  pad.position = new Vector3(x,0.05,z);
  const pm = new StandardMaterial(uniqueName('pm'), scene);
  const base = pickRandom([new Color3(0.6,0.8,1.0), new Color3(0.9,0.6,0.9), new Color3(0.6,0.9,0.6)]);
  pm.emissiveColor = base;
  pm.alpha = 0.6;
  pad.material = pm;
  teleporters.push({mesh:pad, to:new Vector3(tx,2,tz)});
}

function generateWinterMap(){
  function createWorldBorder(){
    const thickness = 1;
    const height = 10;
  const wallMat = new StandardMaterial('worldBorderMat', scene); wallMat.diffuseColor = new Color3(0.12,0.12,0.14); wallMat.alpha = 0.95;
  const n = MeshBuilder.CreateBox('wb_n',{width:MAP_SIZE, height:height, depth:thickness}, scene);
  n.position = new Vector3(0, height/2, -MAP_HALF - thickness/2);
  n.material = wallMat; markSolid(n);
  const s = MeshBuilder.CreateBox('wb_s',{width:MAP_SIZE, height:height, depth:thickness}, scene);
  s.position = new Vector3(0, height/2, MAP_HALF + thickness/2);
  s.material = wallMat; markSolid(s);
  const w = MeshBuilder.CreateBox('wb_w',{width:thickness, height:height, depth:MAP_SIZE}, scene);
  w.position = new Vector3(-MAP_HALF - thickness/2, height/2, 0);
  w.material = wallMat; markSolid(w);
  const e = MeshBuilder.CreateBox('wb_e',{width:thickness, height:height, depth:MAP_SIZE}, scene);
  e.position = new Vector3(MAP_HALF + thickness/2, height/2, 0);
  e.material = wallMat; markSolid(e);
  }
  createWorldBorder();

  generateModernCity();
  
  try{ createSpawnPointsFromRoads(); createTrafficLights(); }catch(e){}
  try{ createTrafficSigns(); }catch(e){}
  
  try{ spawnCars(100); }catch(e){}
  try{ spawnCityBots(25); }catch(e){}
  
  createTeleporter(-400, 400, 400, -400);
  createTeleporter(400, -400, -400, 400);
  createTeleporter(0, 500, 0, -500);
  
  setTimeout(() => {
    try { ensureSafePlayerSpawn(); } catch(e) { console.log('Safe spawn check failed:', e); }
  }, 100);
}

function createTrafficSigns(){
  const signMat = new StandardMaterial('signMat', scene);
  signMat.diffuseColor = new Color3(0.9,0.12,0.12);
  const postMat = new StandardMaterial('postMat', scene); postMat.diffuseColor = new Color3(0.12,0.12,0.12);
  for(const tl of trafficLights){
    try{
      const px = tl.pos.x + 3; const pz = tl.pos.z + 3;
      const post = MeshBuilder.CreateCylinder(uniqueName('signPost'), {diameter:0.12, height:2.0, tessellation:8}, scene);
      post.position = new Vector3(px, 1.0, pz);
      post.material = postMat; markSolid(post);
      const sign = MeshBuilder.CreateDisc(uniqueName('stopSign'), {radius:0.45, tessellation:6}, scene);
      sign.position = new Vector3(px, 1.6, pz);
      sign.rotation.x = Math.PI/2;
      const sm = new StandardMaterial(uniqueName('stopMat'), scene); sm.emissiveColor = new Color3(0.9,0.12,0.12); sm.diffuseColor = new Color3(0.9,0.12,0.12);
      sign.material = sm; sign.metadata = sign.metadata || {}; sign.metadata.isSign = true;
    }catch(e){}
  }
  for(const road of roads){
    try{
      const bb = road.getBoundingInfo().boundingBox; const min = bb.minimumWorld; const max = bb.maximumWorld;
      if((max.x - min.x) > (max.z - min.z)){
        for(let x = Math.floor(min.x+20); x < Math.floor(max.x-20); x += 180){
          const px = x; const pz = road.position.z + 4;
          const post = MeshBuilder.CreateCylinder(uniqueName('signPost'), {diameter:0.12, height:1.6, tessellation:8}, scene);
          post.position = new Vector3(px, 0.9, pz); post.material = postMat; markSolid(post);
          const sign = MeshBuilder.CreateDisc(uniqueName('speedSign'), {radius:0.36, tessellation:32}, scene);
          sign.position = new Vector3(px, 1.35, pz); sign.rotation.x = Math.PI/2;
          const sm = new StandardMaterial(uniqueName('speedMat'), scene); sm.diffuseColor = new Color3(1,1,1); sm.emissiveColor = new Color3(1,1,1);
          sign.material = sm; sign.metadata = sign.metadata || {}; sign.metadata.isSign = true;
        }
      } else {
        for(let z = Math.floor(min.z+20); z < Math.floor(max.z-20); z += 180){
          const px = road.position.x + 4; const pz = z;
          const post = MeshBuilder.CreateCylinder(uniqueName('signPost'), {diameter:0.12, height:1.6, tessellation:8}, scene);
          post.position = new Vector3(px, 0.9, pz); post.material = postMat; markSolid(post);
          const sign = MeshBuilder.CreateDisc(uniqueName('speedSign'), {radius:0.36, tessellation:32}, scene);
          sign.position = new Vector3(px, 1.35, pz); sign.rotation.x = Math.PI/2;
          const sm = new StandardMaterial(uniqueName('speedMat'), scene); sm.diffuseColor = new Color3(1,1,1); sm.emissiveColor = new Color3(1,1,1);
          sign.material = sm; sign.metadata = sign.metadata || {}; sign.metadata.isSign = true;
        }
      }
    }catch(e){}
  }
}


let player = {
  hp: 100,
  readyAmmo: 15,
  spareAmmo: 90,
  kills: 0
};

let dead = false;
let isSprinting = false;
let isOnGround = true;
let velY = 0;
const gravity = -30;
const jumpStrength = 10;

let sprintHintEl = null;
const DEFAULT_FOV = 0.9;
const SPRINT_FOV = 1.05;
const SCOPE_FOV = 0.28;
const FOV_LERP_SPEED = 6.0;

let isRunning = false;
let isSliding = false;
let slideRemaining = 0;
const SLIDE_DISTANCE = 6.0;
const SLIDE_SPEED_MULT = 1.5;
let slideDir = new Vector3(0,0,1);

const lastKeyTime = { w:0, e:0 };
const DOUBLE_TAP_MS = 300;

const weapons = [
  { id: 'pistol', name:'Pistol', magSize: 15, totalAmmo: 90, damage:34, range:200, rate: 120 },
  { id: 'sniper', name:'Sniper', magSize: 5, totalAmmo: 25, damage:150, range:1200, rate: 600 },
  { id: 'pump', name:'Pump', magSize: 8, totalAmmo: 32, damage:22, range:120, pellets:8, spread:0.12, rate: 450 },
  { id: 'minigun', name:'Minigun', magSize: 100, totalAmmo: 400, damage:8, range:300, rate: 40 }
];
let currentWeapon = 0;
let lastShotTime = 0;

const input = { forward:false, back:false, left:false, right:false };
let yaw = 0;
let pitch = 0;
const mouseSensitivity = 0.0025;

const weaponRoot = new MeshBuilder.CreateBox('weaponRoot',{size:0.1}, scene);
weaponRoot.parent = camera;
weaponRoot.position = new Vector3(0.45, -0.28, 0.6);
weaponRoot.scaling = new Vector3(0.82,0.82,0.82);

let isScoped = false;

const baseWeaponPos = weaponRoot.position.clone();
const baseWeaponRot = weaponRoot.rotation.clone();
let recoilOffset = new Vector3(0,0,0);
let recoilVel = new Vector3(0,0,0);
let recoilRot = new Vector3(0,0,0);
let recoilRotVel = new Vector3(0,0,0);
const RECOIL_DAMP = 8.0;
const RECOIL_RETURN = 6.0;
function applyRecoil(magnitude){ recoilVel.addInPlace(new Vector3(0,0,-magnitude)); recoilRotVel.addInPlace(new Vector3(-magnitude*5.5,0,0)); }

const metalMat = new PBRMaterial('metalMat', scene); metalMat.albedoColor = new Color3(0.08,0.08,0.1); metalMat.metallic = 1.0; metalMat.roughness = 0.35;
const darkMetalMat = new PBRMaterial('darkMetal', scene); darkMetalMat.albedoColor = new Color3(0.02,0.02,0.03); darkMetalMat.metallic = 1.0; darkMetalMat.roughness = 0.28;
const woodMat = new PBRMaterial('woodMat', scene); woodMat.albedoColor = new Color3(0.38,0.25,0.12); woodMat.metallic = 0.0; woodMat.roughness=0.6;
const plasticMat = new PBRMaterial('plasticMat', scene); plasticMat.albedoColor = new Color3(0.06,0.06,0.07); plasticMat.metallic = 0.0; plasticMat.roughness=0.45;

const weaponModels = { pistol:null, sniper:null, pump:null };

const weaponOffsets = {
  pistol: new Vector3(0.42, -0.32, 0.55),
  sniper: new Vector3(0.66, -0.18, 1.05),
  pump:   new Vector3(0.50, -0.34, 0.62)
};

function createWeaponModels(){
  const pRoot = new TransformNode('pistolRoot', scene);
  pRoot.parent = weaponRoot;
  const frame = MeshBuilder.CreateBox('pistol_frame',{width:0.24, height:0.08, depth:0.36}, scene);
  frame.parent = pRoot; frame.position = new Vector3(0.02, 0.0, 0.18); frame.material = plasticMat;
  const slide = MeshBuilder.CreateBox('pistol_slide',{width:0.22, height:0.06, depth:0.28}, scene);
  slide.parent = pRoot; slide.position = new Vector3(0.16,0.04,0.18); slide.material = darkMetalMat;
  const barrel = MeshBuilder.CreateCylinder('pistol_barrel',{diameter:0.04, height:0.42, tessellation:12}, scene);
  barrel.parent = pRoot; barrel.rotation.x = Math.PI/2; barrel.position = new Vector3(0.36,0.02,0.46); barrel.material = darkMetalMat;
  const grip = MeshBuilder.CreateBox('pistol_grip',{width:0.10, height:0.28, depth:0.20}, scene);
  grip.parent = pRoot; grip.position = new Vector3(-0.12,-0.16,0.02); grip.rotation.x = 0.16; grip.material = plasticMat;
  const mag = MeshBuilder.CreateBox('pistol_mag',{width:0.07, height:0.20, depth:0.05}, scene);
  mag.parent = pRoot; mag.position = new Vector3(-0.12,-0.30,-0.03); mag.material = metalMat;
  const sightR = MeshBuilder.CreateBox('pistol_sightR',{width:0.02, height:0.03, depth:0.02}, scene);
  sightR.parent = pRoot; sightR.position = new Vector3(0.06,0.075,0.02); sightR.material = darkMetalMat;
  const sightF = MeshBuilder.CreateBox('pistol_sightF',{width:0.02, height:0.02, depth:0.02}, scene);
  sightF.parent = pRoot; sightF.position = new Vector3(0.38,0.06,0.44); sightF.material = darkMetalMat;
  weaponModels.pistol = pRoot;

  const sRoot = new TransformNode('sniperRoot', scene);
  sRoot.parent = weaponRoot;
  const recv = MeshBuilder.CreateBox('sniper_recv',{width:0.20, height:0.08, depth:0.40}, scene);
  recv.parent = sRoot; recv.position = new Vector3(0.12,0.01,0.32); recv.material = darkMetalMat;
  const sBarrel = MeshBuilder.CreateCylinder('sniper_barrel',{diameter:0.03, height:1.6, tessellation:18}, scene);
  sBarrel.parent = sRoot; sBarrel.rotation.x = Math.PI/2; sBarrel.position = new Vector3(0.86,0.03,1.02); sBarrel.material = darkMetalMat;
  const muzzle = MeshBuilder.CreateCylinder('sniper_muz',{diameter:0.06, height:0.06, tessellation:12}, scene);
  muzzle.parent = sRoot; muzzle.rotation.x = Math.PI/2; muzzle.position = new Vector3(1.60,0.03,1.86); muzzle.material = metalMat;
  const sStock = MeshBuilder.CreateBox('sniper_stock',{width:0.36, height:0.10, depth:0.16}, scene);
  sStock.parent = sRoot; sStock.position = new Vector3(-0.28,-0.04,0.08); sStock.material = woodMat;
  const cheek = MeshBuilder.CreateBox('sniper_cheek',{width:0.12, height:0.06, depth:0.10}, scene);
  cheek.parent = sRoot; cheek.position = new Vector3(-0.18,0.02,0.12); cheek.material = woodMat;
  const scopeMain = MeshBuilder.CreateCylinder('scope_main',{diameter:0.08, height:0.7, tessellation:18}, scene);
  scopeMain.parent = sRoot; scopeMain.rotation.x = Math.PI/2; scopeMain.position = new Vector3(0.42,0.12,0.62); const scopeMat = new PBRMaterial('scopeMat', scene); scopeMat.albedoColor = new Color3(0.02,0.02,0.02); scopeMat.metallic=0.95; scopeMat.roughness=0.12; scopeMain.material = scopeMat;
  const scopeEye = MeshBuilder.CreateCylinder('scope_eye',{diameter:0.05, height:0.18, tessellation:12}, scene);
  scopeEye.parent = sRoot; scopeEye.rotation.x = Math.PI/2; scopeEye.position = new Vector3(0.72,0.11,0.87); scopeEye.material = scopeMat;
  const bipA = MeshBuilder.CreateCylinder('bipA',{diameter:0.015, height:0.3, tessellation:8}, scene); bipA.parent = sRoot; bipA.rotation.z = 0.5; bipA.position = new Vector3(0.44,-0.08,0.92); bipA.material = metalMat;
  const bipB = MeshBuilder.CreateCylinder('bipB',{diameter:0.015, height:0.3, tessellation:8}, scene); bipB.parent = sRoot; bipB.rotation.z = -0.5; bipB.position = new Vector3(0.44,-0.08,0.72); bipB.material = metalMat;
  weaponModels.sniper = sRoot;

  const puRoot = new TransformNode('pumpRoot', scene);
  puRoot.parent = weaponRoot;
  const pBarrel = MeshBuilder.CreateCylinder('pump_barrel',{diameter:0.10, height:0.78, tessellation:18}, scene);
  pBarrel.parent = puRoot; pBarrel.rotation.x = Math.PI/2; pBarrel.position = new Vector3(0.44,0.02,0.74); pBarrel.material = darkMetalMat;
  const forend = MeshBuilder.CreateBox('pump_forend',{width:0.18, height:0.07, depth:0.26}, scene);
  forend.parent = puRoot; forend.position = new Vector3(0.16, -0.02, 0.5); forend.material = metalMat;
  for(let i=0;i<4;i++){
    const groove = MeshBuilder.CreateBox(`groove_${i}`,{width:0.16, height:0.01, depth:0.02}, scene);
    groove.parent = forend; groove.position = new Vector3(0, -0.02, -0.09 + i*0.06); groove.material = darkMetalMat;
  }
  const pStock = MeshBuilder.CreateBox('pump_stock',{width:0.34, height:0.12, depth:0.14}, scene);
  pStock.parent = puRoot; pStock.position = new Vector3(-0.18,-0.04,0.12); pStock.material = woodMat;
  weaponModels.pump = puRoot;

  for(const k of Object.keys(weaponModels)) if(weaponModels[k]) weaponModels[k].setEnabled(false);
}

createWeaponModels();

function showWeapon(index){
  if(index >= 0 && index < weapons.length) {
    currentWeapon = index;
    const w = weapons[currentWeapon];
    player.readyAmmo = w.magSize;
    player.spareAmmo = w.totalAmmo;
  }
  const id = weapons[index] ? weapons[index].id : null;
  for(const k of Object.keys(weaponModels)) if(weaponModels[k]) weaponModels[k].setEnabled(k === id);
  if(id && weaponOffsets[id]){
    weaponRoot.position = weaponOffsets[id].clone();
  } else {
    weaponRoot.position = new Vector3(0.45, -0.28, 0.6);
  }
  updateHUD();
}

showWeapon(currentWeapon);

const projectiles = [];

const bots = [];
const cars = [];
const DEBUG_SHOW_CARS = false;

function createRoad(x,z,width,length,rotation=0){
  const r = MeshBuilder.CreateGround(uniqueName('road'), {width: width, height: length}, scene);
  r.position = new Vector3(x, 0.03, z);
  r.rotation = new Vector3(0, rotation, 0);
  const rm = new StandardMaterial(uniqueName('roadMat'), scene);
  rm.diffuseColor = new Color3(0.08,0.08,0.09);
  r.material = rm; r.metadata = r.metadata || {}; r.metadata.isRoad = true; markSolid(r);
  const dt = new DynamicTexture(uniqueName('laneDT'), {width:512, height:512}, scene, false);
  const ctx = dt.getContext(); ctx.clearRect(0,0,512,512);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for(let i=20;i<492;i+=48){ ctx.fillRect(250-4, i, 8, 24); }
  dt.update();
  const laneMat = new StandardMaterial(uniqueName('laneMat'), scene); laneMat.diffuseTexture = dt; laneMat.diffuseTexture.uScale = width/8; laneMat.diffuseTexture.vScale = length/8; r.material = laneMat;
  roads.push(r);
  return r;
}

function createRoadGrid(centerX=0, centerZ=0, blockSize=36, cols=6, rows=6){
  const roadWidth = 8;
  for(let r=0;r<=rows; r++){
    const z = centerZ - (rows*blockSize)/2 + r*blockSize;
    createRoad(centerX, z, cols*blockSize + roadWidth, roadWidth, 0);
  }
  for(let c=0;c<=cols; c++){
    const x = centerX - (cols*blockSize)/2 + c*blockSize;
    createRoad(x, centerZ, roadWidth, rows*blockSize + roadWidth, Math.PI/2);
  }
}

function createSpawnPointsFromRoads(){
  spawnPoints.length = 0;
  for(const road of roads){
    const bb = road.getBoundingInfo().boundingBox; const min = bb.minimumWorld; const max = bb.maximumWorld;
    if((max.x - min.x) > (max.z - min.z)){
      const step = 12;
      for(let x = Math.floor(min.x+4); x <= Math.floor(max.x-4); x += step){ spawnPoints.push(new Vector3(x, 0.5, road.position.z)); }
    } else {
      const step = 12;
      for(let z = Math.floor(min.z+4); z <= Math.floor(max.z-4); z += step){ spawnPoints.push(new Vector3(road.position.x, 0.5, z)); }
    }
  }
}

function debugShowSpawnPoints(){
  if(!DEBUG_SHOW_CARS) return;
  for(const sp of spawnPoints){
    const s = MeshBuilder.CreateSphere(uniqueName('spMarker'), {diameter:0.36, segments:6}, scene);
    s.position = sp.clone().add(new Vector3(0,0.4,0));
    const m = new StandardMaterial(uniqueName('spMat'), scene); m.emissiveColor = new Color3(0.95,0.9,0.0); s.material = m; s.isPickable = false;
  }
}
function createTrafficLights(){
  trafficLights.length = 0;
  const used = new Set();
  for(const a of roads){
    for(const b of roads){ if(a === b) continue; 
      const aBB = a.getBoundingInfo().boundingBox; const bBB = b.getBoundingInfo().boundingBox;
      const ix = a.position.x; const iz = b.position.z;
      const key = `${Math.round(ix)}_${Math.round(iz)}`;
      if(used.has(key)) continue;
      if(ix >= Math.min(aBB.minimumWorld.x, aBB.maximumWorld.x) - 1 && ix <= Math.max(aBB.minimumWorld.x, aBB.maximumWorld.x) + 1 && iz >= Math.min(bBB.minimumWorld.z, bBB.maximumWorld.z) - 1 && iz <= Math.max(bBB.minimumWorld.z, bBB.maximumWorld.z) + 1){
        const pole = MeshBuilder.CreateCylinder(uniqueName('tl_pole'), {diameter:0.18, height:2.2, tessellation:8}, scene);
        pole.position = new Vector3(ix + 2, 1.1, iz + 2);
        const pm = new StandardMaterial(uniqueName('tl_pole_m'), scene); pm.diffuseColor = new Color3(0.1,0.1,0.12); pole.material = pm; markSolid(pole);
        const lightSphere = MeshBuilder.CreateSphere(uniqueName('tl_light'), {diameter:0.5, segments:6}, scene);
        lightSphere.position = new Vector3(ix + 2, 2.4, iz + 2);
        const lm = new StandardMaterial(uniqueName('tl_mat'), scene); lm.emissiveColor = new Color3(0.1,0.1,0.1); lightSphere.material = lm;
        const state = (Math.random() < 0.5) ? 'NS' : 'EW';
        trafficLights.push({ pos: new Vector3(ix,0,iz), pole, lightSphere, state, timer:0, cycle:5, lm });
        used.add(key);
      }
    }}
}

function createCityBlocks(centerX=0, centerZ=0, blockSize=36, cols=6, rows=6){
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const bx = centerX - (cols*blockSize)/2 + c*blockSize + (Math.random()*8 - 4);
      const bz = centerZ - (rows*blockSize)/2 + r*blockSize + (Math.random()*8 - 4);
      const w = 14 + Math.floor(Math.random()*18);
      const d = 10 + Math.floor(Math.random()*18);
      const h = 5 + Math.floor(Math.random()*6);
      createBuilding(bx, bz, w, d, h);
      if(Math.random() < 0.08) createSkyscraper(bx + Math.random()*6 - 3, bz + Math.random()*6 - 3, 16, 16, 6 + Math.floor(Math.random()*6));
    }
  }
}

function aabbOverlap2D(bbA, bbB){
  try{
    const aMin = bbA.minimumWorld; const aMax = bbA.maximumWorld;
    const bMin = bbB.minimumWorld; const bMax = bbB.maximumWorld;
    const overlapX = Math.min(aMax.x, bMax.x) - Math.max(aMin.x, bMin.x);
    const overlapZ = Math.min(aMax.z, bMax.z) - Math.max(aMin.z, bMin.z);
    return { overlapX, overlapZ, overlap: (overlapX > 0 && overlapZ > 0) };
  }catch(e){ return {overlapX:0, overlapZ:0, overlap:false}; }
}

function relocateBuildingGroup(mesh, delta){
  if(!mesh) return;
  const moved = new Set();
  const moveOne = (m)=>{ if(!m || moved.has(m)) return; m.position = m.position.add(delta); moved.add(m); };
  moveOne(mesh);
  for(const m of scene.meshes){ if(m === mesh) continue; if(m.position && m.position.subtract(mesh.position).length() < 6){ moveOne(m); } }
}

function pushBuildingsOffRoads(){
  for(const road of roads){
    const rbb = road.getBoundingInfo().boundingBox;
    for(const m of scene.meshes){
      if(!m.metadata || !m.metadata.solid) continue;
      if(m.metadata.isRoad || m.metadata.isLadder) continue;
      const name = m.name || '';
      if(!(name.startsWith('b_') || name.startsWith('sk_') || name.startsWith('plat') || name.startsWith('container') || name.startsWith('gas_') || name.startsWith('gas_pad') || name.startsWith('gas_shop') || name.startsWith('gas_canopy'))) continue;
      try{
        const mbb = m.getBoundingInfo().boundingBox;
        const ov = aabbOverlap2D(mbb, rbb);
        if(ov.overlap){
          let dx = 0, dz = 0;
          if(ov.overlapX < ov.overlapZ){
            dx = (ov.overlapX + 2) * (m.position.x >= road.position.x ? 1 : -1);
          } else {
            dz = (ov.overlapZ + 2) * (m.position.z >= road.position.z ? 1 : -1);
          }
          relocateBuildingGroup(m, new Vector3(dx, 0, dz));
        }
      }catch(e){}
    }
  }
}

function updateHUD(){
  const hpFill = document.getElementById('hpFill');
  if(hpFill) hpFill.style.width = Math.max(0, Math.min(100, player.hp)) + '%';
  const hpText = document.getElementById('hpText');
  if(hpText) hpText.innerText = `HP: ${Math.max(0, Math.min(100, Math.floor(player.hp)))}`;
  const ammoEl = document.getElementById('ammo');
  if(ammoEl){
    const w = weapons[currentWeapon];
    ammoEl.innerText = `${w.name} • ${player.readyAmmo}/${player.spareAmmo}`;
  }
  const killsEl = document.getElementById('kills');
  if(killsEl) killsEl.innerText = `Kills: ${player.kills}`;
}

updateHUD();

function createImpact(point, color=new Color3(1,0.6,0.2)){
  const s = MeshBuilder.CreateSphere(uniqueName('imp'), {diameter:0.18, segments:6}, scene);
  s.position = point.clone();
  const m = new StandardMaterial(uniqueName('impMat'), scene);
  m.emissiveColor = color;
  s.material = m;
  s.metadata = s.metadata || {};
  s.metadata.solid = false;
  setTimeout(()=>{ try{ s.dispose(); }catch(e){} }, 1200);
}

function findBotByMesh(mesh){
  for(const b of bots){ if(b.mesh === mesh || (b.parts && b.parts.includes(mesh))) return b; }
  return null;
}

window.addEventListener('pointerdown', (e)=>{
  if(e.button === 0){
    shoot();
  }
});

canvas.addEventListener('click', ()=>{ try{ canvas.requestPointerLock(); }catch(e){} });
document.addEventListener('mousemove', (ev)=>{
  if(document.pointerLockElement === canvas){
  yaw += ev.movementX * mouseSensitivity;
  pitch += ev.movementY * mouseSensitivity;
    const limit = Math.PI/2 - 0.1;
    pitch = Math.max(-limit, Math.min(limit, pitch));
    camera.rotation.x = pitch;
    camera.rotation.y = yaw;
  }
});

window.addEventListener('keydown', (e)=>{
  const k = e.key.toLowerCase();
  const now = performance.now();
  if(k === 'w'){
    if(now - lastKeyTime.w < DOUBLE_TAP_MS){ isRunning = !isRunning; }
    lastKeyTime.w = now;
  }
  if(k === 'e'){
    if(now - lastKeyTime.e < DOUBLE_TAP_MS){ isRunning = !isRunning; }
    lastKeyTime.e = now;
  }
  if(k === 'w') input.forward = true;
  if(k === 's') input.back = true;
  if(k === 'a') input.left = true;
  if(k === 'd') input.right = true;
  if(k === 'shift') { setSprinting(true); }
  if(k === 'r') { 
    const w = weapons[currentWeapon];
    const neededAmmo = w.magSize - player.readyAmmo;
    const ammoToReload = Math.min(neededAmmo, player.spareAmmo);
    player.readyAmmo += ammoToReload;
    player.spareAmmo -= ammoToReload;
    updateHUD(); 
  }
  if(k === ' ') { if(isOnGround && !dead){ velY = jumpStrength; isOnGround = false; } }
  if(k === '1') { showWeapon(0); }
  if(k === '2') { showWeapon(1); }
  if(k === '3') { showWeapon(2); }
  if(k === '4') { showWeapon(3); }
});
window.addEventListener('keyup', (e)=>{
  const k = e.key.toLowerCase();
  if(k === 'w') input.forward = false;
  if(k === 's') input.back = false;
  if(k === 'a') input.left = false;
  if(k === 'd') input.right = false;
  if(k === 'shift') { setSprinting(false); }
});

window.addEventListener('contextmenu', (e)=>{ e.preventDefault(); });
window.addEventListener('mousedown', (e)=>{
  if(e.button === 2 && !dead){
    const w = weapons[currentWeapon];
    if(w && w.id === 'sniper' && !isSprinting && !isSliding){
      isScoped = !isScoped;
      const so = document.getElementById('scopeOverlay');
      if(so) so.style.display = isScoped ? 'block' : 'none';
  if(isScoped) showWeapon(-1); else showWeapon(currentWeapon);
      return;
    }
    if(e.button === 2 && isRunning && !isSliding && !dead){
      isSliding = true;
      slideRemaining = SLIDE_DISTANCE;
      slideDir = camera.getDirection(new Vector3(0,0,1)); slideDir.y = 0; slideDir.normalize();
  showWeapon(-1);
    }
  }
});

function setSprinting(v){
  isSprinting = !!v;
  camera.speed = isSprinting ? 1.8 : 1.2;
  if(!sprintHintEl) sprintHintEl = document.getElementById('sprintHint');
  if(sprintHintEl){
    if(isSprinting){ sprintHintEl.style.display = 'block'; sprintHintEl.style.opacity = '1'; }
    else { sprintHintEl.style.opacity = '0'; setTimeout(()=>{ if(sprintHintEl) sprintHintEl.style.display = 'none'; }, 300); }
  }
}

function shoot(){
  if(player.readyAmmo <= 0) return;
  if(dead) return;
  if(isSliding) return;
  const now = performance.now();
  const w = weapons[currentWeapon];
  if(now - lastShotTime < w.rate) return; 
  lastShotTime = now;
  player.readyAmmo--;
  updateHUD();
  const origin = camera.position.clone();
  const dir = camera.getDirection(Vector3.Forward()).normalize();
  if(w.id === 'sniper'){
    const ray = new Ray(origin, dir, w.range);
    const pick = scene.pickWithRay(ray, (mesh)=>{ return mesh.metadata && mesh.metadata.solid; });
    const dist = (pick && pick.hit) ? pick.distance : w.range;
    const tracer = MeshBuilder.CreateBox(uniqueName('tracer'), {width:0.06, height:0.06, depth: dist}, scene);
    tracer.position = origin.add(dir.scale(dist/2)); tracer.lookAt(origin.add(dir));
    const tmat = new StandardMaterial(uniqueName('tmatS'), scene); tmat.emissiveColor = new Color3(0.3,1,0.2); tracer.material = tmat;
    setTimeout(()=>{ try{ tracer.dispose(); }catch(e){} }, 140);
  if(pick && pick.hit && pick.pickedMesh){ const hitMesh = pick.pickedMesh; const b = findBotByMesh(hitMesh); if(b){ b.hp -= w.damage; if(b.hp <= 0){ b.parts.forEach(p=>{ try{ p.dispose(); }catch(e){} }); bots.splice(bots.indexOf(b),1); player.kills++; updateHUD(); showKillMsg('Bot eliminated'); } } else { createImpact(pick.pickedPoint, new Color3(0.8,0.9,1)); } }
  applyRecoil(0.03);
  } else if(w.id === 'minigun'){
    const ray = new Ray(origin, dir, w.range);
    const pick = scene.pickWithRay(ray, (mesh)=>{ return mesh.metadata && mesh.metadata.solid; });
    const dist = (pick && pick.hit) ? pick.distance : w.range;
    const tracer = MeshBuilder.CreateBox(uniqueName('tracer'), {width:0.06, height:0.06, depth: dist}, scene);
    tracer.position = origin.add(dir.scale(dist/2)); tracer.lookAt(origin.add(dir));
    const tmat = new StandardMaterial(uniqueName('tmatM'), scene); tmat.emissiveColor = new Color3(1,0.6,0.2); tracer.material = tmat;
    setTimeout(()=>{ try{ tracer.dispose(); }catch(e){} }, 60);
  if(pick && pick.hit && pick.pickedMesh){ const hitMesh = pick.pickedMesh; const b = findBotByMesh(hitMesh); if(b){ b.hp -= w.damage; if(b.hp <= 0){ b.parts.forEach(p=>{ try{ p.dispose(); }catch(e){} }); bots.splice(bots.indexOf(b),1); player.kills++; updateHUD(); showKillMsg('Bot eliminated'); } } else { createImpact(pick.pickedPoint, new Color3(1,0.6,0.2)); } }
  applyRecoil(0.01);
  } else if(w.id === 'pump'){
    for(let p=0;p<w.pellets;p++){
      const spread = (Math.random()-0.5) * w.spread;
      const spreadY = (Math.random()-0.5) * w.spread;
      const dirp = dir.add(new Vector3(spread, spreadY, 0)).normalize();
      const ray = new Ray(origin, dirp, w.range);
      const pick = scene.pickWithRay(ray, (mesh)=>{ return mesh.metadata && mesh.metadata.solid; });
      const dist = (pick && pick.hit) ? pick.distance : w.range;
      const tracer = MeshBuilder.CreateBox(uniqueName('tracer'), {width:0.04, height:0.04, depth: dist}, scene);
      tracer.position = origin.add(dirp.scale(dist/2)); tracer.lookAt(origin.add(dirp));
      const tmat = new StandardMaterial(uniqueName('tmatP'), scene); tmat.emissiveColor = new Color3(1,0.9,0.6); tracer.material = tmat;
      setTimeout(()=>{ try{ tracer.dispose(); }catch(e){} }, 90);
  if(pick && pick.hit && pick.pickedMesh){ const hitMesh = pick.pickedMesh; const b = findBotByMesh(hitMesh); if(b){ b.hp -= w.damage; if(b.hp <= 0){ b.parts.forEach(p=>{ try{ p.dispose(); }catch(e){} }); bots.splice(bots.indexOf(b),1); player.kills++; updateHUD(); showKillMsg('Bot eliminated'); } } else { createImpact(pick.pickedPoint, new Color3(1,0.9,0.6)); } }
  applyRecoil(0.015);
    }
  } else {
    const ray = new Ray(origin, dir, w.range);
    const pick = scene.pickWithRay(ray, (mesh)=>{ return mesh.metadata && mesh.metadata.solid; });
    const dist = (pick && pick.hit) ? pick.distance : w.range;
    const tracer = MeshBuilder.CreateBox(uniqueName('tracer'), {width:0.05, height:0.05, depth: dist}, scene);
    tracer.position = origin.add(dir.scale(dist/2)); tracer.lookAt(origin.add(dir));
    const tmat = new StandardMaterial(uniqueName('tmatD'), scene); tmat.emissiveColor = new Color3(0.6,1,0.6); tracer.material = tmat;
    setTimeout(()=>{ try{ tracer.dispose(); }catch(e){} }, 80);
  if(pick && pick.hit && pick.pickedMesh){ const hitMesh = pick.pickedMesh; const b = findBotByMesh(hitMesh); if(b){ b.hp -= w.damage; if(b.hp <= 0){ b.parts.forEach(p=>{ try{ p.dispose(); }catch(e){} }); bots.splice(bots.indexOf(b),1); player.kills++; updateHUD(); showKillMsg('Bot eliminated'); } } else { createImpact(pick.pickedPoint, new Color3(0.6,1,0.6)); } }
  applyRecoil(0.02);
  }
}

scene.onBeforeRenderObservable.add(()=>{
  const dt = engine.getDeltaTime()/1000;
  const moveDir = new Vector3(0,0,0);
  if(input.forward) moveDir.addInPlace(camera.getDirection(new Vector3(0,0,1)));
  if(input.back) moveDir.addInPlace(camera.getDirection(new Vector3(0,0,-1)));
  if(input.left) moveDir.addInPlace(camera.getDirection(new Vector3(-1,0,0)));
  if(input.right) moveDir.addInPlace(camera.getDirection(new Vector3(1,0,0)));
  moveDir.y = 0;
  if(moveDir.length() > 0.01){
    moveDir.normalize();
  const runMult = (isRunning || isSprinting) ? 1.6 : 1.0;
  const sp = camera.speed * runMult;
  const distance = sp * dt * 6;
  const steps = Math.max(4, Math.ceil(distance / 0.05));
    let blocked = false;
    for(let s=1;s<=steps;s++){
      const t = s/steps;
      const sample = camera.position.add(moveDir.scale(distance * t));
    for(const m of scene.meshes){
        if(m.metadata && m.metadata.solid){
      if(pointNearMesh(m, new Vector3(sample.x, sample.y, sample.z), PLAYER_RADIUS)){
            blocked = true; break;
          }
        }
      }
      if(blocked) break;
    }
  if(!blocked){ camera.position = camera.position.add(moveDir.scale(distance)); }
    else{
      const tryX = camera.position.add(new Vector3(moveDir.x,0,0).scale(distance));
      let blockedX = false;
      for(const m of scene.meshes){ if(m.metadata && m.metadata.solid && pointNearMesh(m, tryX, PLAYER_RADIUS)){ blockedX = true; break; }}
      if(!blockedX){ camera.position = tryX; }
      else{
        const tryZ = camera.position.add(new Vector3(0,0,moveDir.z).scale(distance));
        let blockedZ = false;
        for(const m of scene.meshes){ if(m.metadata && m.metadata.solid && pointNearMesh(m, tryZ, PLAYER_RADIUS)){ blockedZ = true; break; }}
        if(!blockedZ){ camera.position = tryZ; }
      }
    }
  }
  try{
    const ahead = camera.position.add(camera.getDirection(new Vector3(0,0,1)).normalize().scale(0.8));
    for(const m of scene.meshes){
      if(m.metadata && m.metadata.climbable){
        if(pointNearMesh(m, ahead, 0.9)){
          const bb = m.getBoundingInfo().boundingBox;
          const top = bb.maximumWorld.y;
          if(top - camera.position.y <= 1.2 && top - camera.position.y > 0.05){
            camera.position.y = top + 0.05;
            break;
          }
        }
      }
    }
  }catch(e){}

  if(isSliding){
    const sdt = engine.getDeltaTime()/1000;
    const speedNow = camera.speed * SLIDE_SPEED_MULT * 1.6;
    const move = slideDir.scale(speedNow * sdt * 6);
    const totalDist = move.length();
    const steps = Math.max(3, Math.ceil(totalDist / 0.05));
    let blocked = false;
    for(let s=1;s<=steps;s++){
      const t = s/steps;
      const sample = camera.position.add(slideDir.scale(totalDist * t));
      if(sample.y < 1.9){ blocked = true; break; }
      for(const m of scene.meshes){
        if(m === null) continue;
        if(m.metadata && m.metadata.solid){
          if(pointNearMesh(m, new Vector3(sample.x, sample.y, sample.z), PLAYER_RADIUS)) { blocked = true; break; }
        }
      }
      if(blocked) break;
      camera.position = sample;
    }
  if(blocked){ isSliding = false; showWeapon(currentWeapon); }
  else{ slideRemaining -= totalDist; if(slideRemaining <= 0){ isSliding = false; showWeapon(currentWeapon); } }
  }
  camera.position.x = Math.max(-MAP_HALF+1, Math.min(MAP_HALF-1, camera.position.x));
  camera.position.z = Math.max(-MAP_HALF+1, Math.min(MAP_HALF-1, camera.position.z));
  if(!isOnGround || velY !== 0){
    velY += gravity * dt;
    camera.position.y += velY * dt;
    if(camera.position.y <= 2){
      camera.position.y = 2;
      velY = 0;
      isOnGround = true;
    }
  }

  if(!sprintHintEl) sprintHintEl = document.getElementById('sprintHint');
  if(camera){
    const target = isSprinting ? SPRINT_FOV : DEFAULT_FOV;
    const dt = engine.getDeltaTime()/1000;
    camera.fov += (target - camera.fov) * Math.min(1, FOV_LERP_SPEED * dt);
  }
  if(sprintHintEl){
    if(isSprinting && !isSliding){ sprintHintEl.style.display = 'block'; sprintHintEl.style.opacity = '1'; }
    else { sprintHintEl.style.opacity = '0'; setTimeout(()=>{ if(sprintHintEl) sprintHintEl.style.display = 'none'; }, 300); }
  }
  {
    const dt = engine.getDeltaTime()/1000;
    recoilVel.scaleInPlace(Math.max(0, 1 - RECOIL_DAMP * dt));
    recoilOffset.addInPlace(recoilVel.scale(dt * 60));
    recoilOffset = recoilOffset.scale(1 - Math.min(1, RECOIL_RETURN * dt)).add(baseWeaponPos.scale(Math.min(1, RECOIL_RETURN * dt)));
    recoilRotVel.scaleInPlace(Math.max(0, 1 - RECOIL_DAMP * dt));
    recoilRot.addInPlace(recoilRotVel.scale(dt * 60));
    recoilRot = recoilRot.scale(1 - Math.min(1, RECOIL_RETURN * dt)).add(baseWeaponRot.scale(Math.min(1, RECOIL_RETURN * dt)));
    try{
      weaponRoot.position = baseWeaponPos.add(recoilOffset);
      weaponRoot.rotation.x = recoilRot.x;
      weaponRoot.rotation.y = recoilRot.y;
      weaponRoot.rotation.z = recoilRot.z;
    }catch(e){}
  }
  for(let i=projectiles.length-1;i>=0;i--){
    const p = projectiles[i];
    p.mesh.position.addInPlace(p.dir.scale(p.speed * dt));
    p.life -= dt;
    if(p.life <= 0){
      p.mesh.dispose();
      projectiles.splice(i,1);
      continue;
    }
    for(let j=bots.length-1;j>=0;j--){
      const b = bots[j];
      if(b.mesh && b.mesh.position.subtract(p.mesh.position).length() < 1){
        b.hp -= 34;
        p.mesh.dispose();
        projectiles.splice(i,1);
        if(b.hp <= 0){
          b.mesh.dispose();
          bots.splice(j,1);
          player.kills++;
          updateHUD();
          showKillMsg('Bot eliminated');
        }
        break;
      }
    }
    for(const m of scene.meshes){
      if(m.metadata && m.metadata.solid){
        if(m !== p.mesh && pointNearMesh(m, p.mesh.position, 0.3)){
          try{ p.mesh.dispose(); }catch(e){}
          projectiles.splice(i,1);
          break;
        }
      }
    }
  }
});

scene.onBeforeRenderObservable.add(()=>{
  const now = performance.now();
  for(const tp of teleporters){
    const d = tp.mesh.position.subtract(camera.position).length();
    if(d < 1.3 && now - lastTeleportTime > 800){
      camera.position = tp.to.clone();
      lastTeleportTime = now;
    }
    for(const b of bots){
      if(b.mesh && b.mesh.position.subtract(tp.mesh.position).length() < 1.3){
        b.mesh.position = tp.to.clone().add(new Vector3((Math.random()*4)-2,0,(Math.random()*4)-2));
      }
    }
  }
});

function showKillMsg(text){
  const el = document.createElement('div');
  el.innerText = text;
  el.style.position = 'absolute';
  el.style.left = '50%';
  el.style.top = '8px';
  el.style.transform = 'translateX(-50%)';
  el.style.color = 'white';
  el.style.background = 'rgba(0,0,0,0.4)';
  el.style.padding = '6px 12px';
  el.style.borderRadius = '6px';
  document.body.appendChild(el);
  setTimeout(()=>el.remove(), 2000);
}

function spawnBots(count=8){
  for(let i=0;i<count;i++){
    const x = (Math.random()* (MAP_SIZE-80)) - (MAP_HALF-40);
    const z = (Math.random()* (MAP_SIZE-80)) - (MAP_HALF-40);
    if(x > -90 && x < -60 && z > -90 && z < -60){ i--; continue; }
  const root = new Vector3(x,1.0,z);
  const torso = MeshBuilder.CreateBox(uniqueName('botTorso'), {width:1.2, height:1.4, depth:0.6}, scene);
  torso.position = new Vector3(x,1.0 + 0.9,z);
  const head = MeshBuilder.CreateSphere(uniqueName('botHead'), {diameter:0.6, segments:6}, scene);
  head.position = new Vector3(x,1.9,z);
  const leftLeg = MeshBuilder.CreateBox(uniqueName('botLeg'), {width:0.3, height:0.9, depth:0.3}, scene);
  leftLeg.position = new Vector3(x-0.3,0.45,z);
  const rightLeg = MeshBuilder.CreateBox(uniqueName('botLeg'), {width:0.3, height:0.9, depth:0.3}, scene);
  rightLeg.position = new Vector3(x+0.3,0.45,z);
  const leftArm = MeshBuilder.CreateBox(uniqueName('botArm'), {width:0.25, height:0.9, depth:0.25}, scene);
  leftArm.position = new Vector3(x-0.9,1.2,z);
  const rightArm = MeshBuilder.CreateBox(uniqueName('botArm'), {width:0.25, height:0.9, depth:0.25}, scene);
  rightArm.position = new Vector3(x+0.9,1.2,z);
  const bmat = new StandardMaterial(uniqueName('botMat'), scene);
  bmat.diffuseColor = pickRandom(botPalette);
  torso.material = bmat; head.material = bmat; leftLeg.material = bmat; rightLeg.material = bmat; leftArm.material = bmat; rightArm.material = bmat;
  markSolid(torso); markSolid(head);
  const bot = {mesh:torso, hp:100, state:'patrol', waypoints:[], wpIndex:0, parts:[torso, head, leftLeg, rightLeg, leftArm, rightArm]};
    for(let w=0;w<4;w++){
      if(buildingsList.length > 0 && Math.random() < 0.25){
        const b = pickRandom(buildingsList);
        const rx = b.cx + (Math.random()* b.w) - (b.w/2);
        const rz = b.cz + (Math.random()* b.d) - (b.d/2);
        bot.waypoints.push(new Vector3(rx, b.top + 0.8, rz));
      } else {
        bot.waypoints.push(new Vector3((Math.random()* (MAP_SIZE-40)) - (MAP_HALF-20),1,(Math.random()* (MAP_SIZE-40)) - (MAP_HALF-20)));
      }
    }
    bots.push(bot);
  }
}

spawnBots(4);

function generateCoverAndPlatforms(){
  const covers = [];
  const coverCount = 12;
  for(let i=0;i<coverCount;i++){
    const w = 2 + Math.random()*4;
    const d = 2 + Math.random()*4;
    const x = (Math.random()*160)-80;
    const z = (Math.random()*160)-80;
    if(x < -90 && z < -90) { i--; continue; }
  const box = MeshBuilder.CreateBox(uniqueName('cover'),{width:w*1.2, depth:d*1.2, height:2.2}, scene);
  box.position = new Vector3(x,1.1,z);
  const cmat = new StandardMaterial(uniqueName('coverMat'), scene);
  cmat.diffuseColor = pickRandom(coverPalette);
  cmat.specularColor = new Color3(0.03,0.03,0.03);
  box.material = cmat;
  markSolid(box);
  box.metadata.climbable = true;
    covers.push(box);
  }

  const platCount = 2 + Math.floor(Math.random()*2);
  for(let p=0;p<platCount;p++){
    const px = (Math.random()*120)-60;
    const pz = (Math.random()*120)-60;
  const platform = MeshBuilder.CreateBox('plat'+p,{width:14, depth:14, height:2.4}, scene);
  platform.position = new Vector3(px,2.7,pz);
    const pmat = new StandardMaterial(uniqueName('platMat'), scene);
    pmat.diffuseColor = pickRandom(coverPalette);
    platform.material = pmat;
  markSolid(platform);
  platform.metadata.climbable = true;
  const ramp = MeshBuilder.CreateBox(uniqueName('rampSmall'),{width:7, depth:7, height:1.2}, scene);
  ramp.position = new Vector3(px-7,1.6,pz);
  ramp.rotation.x = -0.33;
  const rmat = new StandardMaterial(uniqueName('rmatSmall'), scene);
  rmat.diffuseColor = pickRandom(rampPalette);
  ramp.material = rmat;
  markSolid(ramp);
  }
}

generateCoverAndPlatforms();

function createAdditionalBuildings(){
  createBuilding(-40, -160, 28, 20, 7);
  createBuilding(80, -160, 34, 24, 7);
  createBuilding(120, -120, 30, 28, 8);
  createBuilding(-180, 120, 36, 30, 8);
  createBuilding(30, -70, 12, 10, 5);
  createBuilding(60, 90, 14, 12, 5);
}

function createGasStation(x,z){
  const pad = MeshBuilder.CreateGround(uniqueName('gas_pad'), {width:18, height:28}, scene);
  pad.position = new Vector3(x,0.02,z);
  const padMat = new StandardMaterial(uniqueName('padMat'), scene); padMat.diffuseColor = new Color3(0.86,0.86,0.86);
  pad.material = padMat; markSolid(pad);
  const canopy = MeshBuilder.CreateBox(uniqueName('gas_canopy'), {width:12, height:0.6, depth:20}, scene);
  canopy.position = new Vector3(x,2.8,z);
  const cm = new StandardMaterial(uniqueName('canMat'), scene); cm.diffuseColor = new Color3(0.08,0.2,0.6); canopy.material = cm; markSolid(canopy);
  for(let i=-1;i<=1;i+=2){
    for(let j=-1;j<=1;j+=2){
      const px = x + i*5; const pz = z + j*8;
      const p = MeshBuilder.CreateCylinder(uniqueName('gas_pillar'), {diameter:0.4, height:5.4, tessellation:12}, scene);
      p.position = new Vector3(px,1.1,pz); const pm = new StandardMaterial(uniqueName('pillMat'), scene); pm.diffuseColor = new Color3(0.95,0.95,0.95); p.material = pm; markSolid(p);
    }
  }
  for(let i=-1;i<=1;i+=2){
    const pump = MeshBuilder.CreateBox(uniqueName('pump'), {width:0.6, height:1.1, depth:0.6}, scene);
    pump.position = new Vector3(x + i*2.5, 0.55, z - 3); const pum = new StandardMaterial(uniqueName('pumpMat'), scene); pum.diffuseColor = new Color3(0.9,0.1,0.1); pump.material = pum; markSolid(pump);
    const pump2 = pump.clone(uniqueName('pump2')); pump2.position = new Vector3(x + i*2.5, 0.55, z + 3); markSolid(pump2);
  }
  const shop = MeshBuilder.CreateBox(uniqueName('gas_shop'), {width:6, height:3.2, depth:6}, scene);
  shop.position = new Vector3(x + 7.5, 1.6, z - 6); const sm = new StandardMaterial(uniqueName('shopMat'), scene); sm.diffuseColor = new Color3(0.6,0.12,0.12); shop.material = sm; markSolid(shop);
}

function spawnCars(count=6){
  for(let i=0;i<count;i++){
    const carRoot = new TransformNode(uniqueName('carRoot'), scene);
    if(spawnPoints.length > 0){
      const idx = Math.floor(Math.random() * spawnPoints.length);
      const sp = spawnPoints.splice(idx, 1)[0];
      carRoot.position = sp.clone();
    } else {
      const sx = (Math.random()*220) - 110;
      const sz = (Math.random()*220) - 110;
      carRoot.position = new Vector3(sx, 0.5, sz);
    }
    
    const body = MeshBuilder.CreateBox(uniqueName('carBody'), {width:2.2, height:1.0, depth:4.0}, scene);
  body.parent = carRoot; 
  body.position = new Vector3(0, 0.5, 0);
    const bmat = new StandardMaterial(uniqueName('carMat'), scene); 
    bmat.diffuseColor = new Color3(Math.random()*0.6+0.4, Math.random()*0.6+0.4, Math.random()*0.6+0.4); 
    bmat.specularColor = new Color3(0.1, 0.1, 0.1);
    body.material = bmat;
    
    const windshield = MeshBuilder.CreateBox(uniqueName('windshield'), {width:1.6, height:0.6, depth:0.1}, scene);
  windshield.parent = carRoot;
  windshield.position = new Vector3(0, 0.85, 1.4);
    const wsMat = new StandardMaterial(uniqueName('windMat'), scene);
    wsMat.diffuseColor = new Color3(0.1, 0.3, 0.8);
    wsMat.alpha = 0.7;
    windshield.material = wsMat;
    
    for(let w=-1; w<=1; w+=2){ 
      for(let f=-1; f<=1; f+=2){ 
        const wheel = MeshBuilder.CreateCylinder(uniqueName('wheel'), {diameter:0.6, height:0.3, tessellation:12}, scene); 
  wheel.rotation.x = Math.PI/2; 
  wheel.parent = carRoot; 
  wheel.position = new Vector3(w*0.8, 0.22, f*1.2); 
        const wmat = new StandardMaterial(uniqueName('wmat'), scene); 
        wmat.diffuseColor = new Color3(0.02,0.02,0.02); 
        wheel.material = wmat; 
      }
    }
    
    markSolid(body);

    for(const oc of cars){
      if(!oc.root) continue;
      try{
        if(oc.root.position.subtract(carRoot.position).length() < 1.5){
          carRoot.position.addInPlace(new Vector3((Math.random()*1.6)-0.8, 0, (Math.random()*1.6)-0.8));
        }
      }catch(e){}
    }
    
    let beacon = null;
    if(DEBUG_SHOW_CARS){
      const cap = MeshBuilder.CreateBox(uniqueName('carCap'), {width:0.8, height:0.2, depth:1.0}, scene);
      cap.parent = carRoot; cap.position = new Vector3(0,1.2,0); 
      const cm = new StandardMaterial(uniqueName('capMat'), scene); 
      cm.emissiveColor = new Color3(1,0.6,0.2); 
      cap.material = cm; 
      cap.isPickable = false;
      
      beacon = MeshBuilder.CreateCylinder(uniqueName('carBeacon'), {diameter:0.6, height:1.5, tessellation:12}, scene);
      beacon.position = carRoot.position.clone().add(new Vector3(0,1.0,0));
      const beaconMat = new StandardMaterial(uniqueName('carBeaconMat'), scene); 
      beaconMat.emissiveColor = new Color3(0.95,0.3,0.1); 
      beacon.material = beaconMat; 
      beacon.isPickable = false;
    }
    
    let p1 = carRoot.position.clone(); 
    let p2 = p1.clone();
  const speed = 12.0 + Math.random()*8.0;
    
    if(roads.length > 0){
      const road = pickRandom(roads);
      const bb = road.getBoundingInfo().boundingBox;
      const min = bb.minimumWorld; const max = bb.maximumWorld;
      if((max.x - min.x) > (max.z - min.z)){
  p1 = new Vector3(min.x + 2, road.position.y, road.position.z);
  p2 = new Vector3(max.x - 2, road.position.y, road.position.z);
  carRoot.position.z = road.position.z;
  carRoot.position.y = road.position.y;
        if(carRoot.position.x <= min.x + 2.5 || carRoot.position.x >= max.x - 2.5){
          const span = Math.max(6, (max.x - min.x) - 8);
          carRoot.position.x = min.x + 4 + Math.random() * span;
        }
      } else {
  p1 = new Vector3(road.position.x, road.position.y, min.z + 2);
  p2 = new Vector3(road.position.x, road.position.y, max.z - 2);
  carRoot.position.x = road.position.x;
  carRoot.position.y = road.position.y;
        if(carRoot.position.z <= min.z + 2.5 || carRoot.position.z >= max.z - 2.5){
          const span = Math.max(6, (max.z - min.z) - 8);
          carRoot.position.z = min.z + 4 + Math.random() * span;
        }
      }
      const chosenRoad = road;
      let nextLight = null;
      if(trafficLights.length > 0){
        let best = 99999;
        const tol = 4.0;
        for(const tl of trafficLights){
          if((max.x - min.x) > (max.z - min.z)){
            if(tl.pos.x >= min.x + 1 && tl.pos.x <= max.x - 1 && Math.abs(tl.pos.z - road.position.z) < tol){
              const d = Math.abs(tl.pos.x - carRoot.position.x);
              if(d < best){ best = d; nextLight = tl; }
            }
          } else {
            if(tl.pos.z >= min.z + 1 && tl.pos.z <= max.z - 1 && Math.abs(tl.pos.x - road.position.x) < tol){
              const d = Math.abs(tl.pos.z - carRoot.position.z);
              if(d < best){ best = d; nextLight = tl; }
            }
          }
        }
      }
      cars.push({ root: carRoot, body: body, path:[p1,p2], t:0, dir:1, speed: speed, road: chosenRoad, nextLight, beacon: beacon });
    } else {
      p2 = p1.add(new Vector3(Math.random()*40-20, 0, Math.random()*40-20));
      cars.push({ root: carRoot, body: body, path:[p1,p2], t:0, dir:1, speed: speed, beacon: beacon });
    }
  }
  console.log('spawned cars, total:', cars.length);
  if(DEBUG_SHOW_CARS){
    for(let i=0;i<Math.min(8,cars.length);i++){
      const c = cars[i]; if(!c) continue; console.log(`car[${i}] pos=`, c.root.position.x.toFixed(1), c.root.position.y.toFixed(1), c.root.position.z.toFixed(1));
    }
  }
}

generateWinterMap();

let carUpdateAcc = 0;
const CAR_UPDATE_STEP = 1/15;
scene.onBeforeRenderObservable.add(()=>{
  const dt = engine.getDeltaTime()/1000;
  carUpdateAcc += dt;
  if(carUpdateAcc < CAR_UPDATE_STEP) return;
  carUpdateAcc = 0;
  for(const c of cars){
    if(!c.root) continue;
    const pos = c.root.position;
    let target = c.dir > 0 ? c.path[1] : c.path[0];
    if(c.road){
      const bb = c.road.getBoundingInfo().boundingBox; const min = bb.minimumWorld; const max = bb.maximumWorld;
      if((max.x - min.x) > (max.z - min.z)){
        target = new Vector3(target.x, target.y, c.road.position.z);
        pos.z = c.road.position.z; 
      } else {
        target = new Vector3(c.road.position.x, target.y, target.z);
        pos.x = c.road.position.x;
      }
    }
    const toT = target.subtract(pos);
    const dist = toT.length();
    if(dist < 0.5){ c.dir *= -1; continue; }
    const desired = toT.normalize().scale(c.speed * CAR_UPDATE_STEP);
    if(c.nextLight){
      const tl = c.nextLight;
      const dToLight = tl.pos.subtract(pos).length();
      if(dToLight < 6){
        const movingX = Math.abs(toT.x) > Math.abs(toT.z);
        const redForUs = (movingX && tl.state === 'NS') || (!movingX && tl.state === 'EW');
        if(redForUs){ continue; }
      }
    }
    let blockedByCar = false;
    const ahead = pos.add(desired.scale(1.0));
    for(const oc of cars){
      if(oc === c || !oc.root) continue;
      if(oc.root.position.subtract(ahead).length() < 1.0){ blockedByCar = true; break; }
    }
    if(blockedByCar) continue;
    const next = pos.add(desired);
    c.root.position = next;
    try{ c.body.rotation.y = Math.atan2(toT.x, toT.z); }catch(e){}
    try{ if(c.beacon) c.beacon.position = c.root.position.clone().add(new Vector3(0,0.6,0)); }catch(e){}
  }
});

scene.onBeforeRenderObservable.add(()=>{
  const dt = engine.getDeltaTime()/1000;
  for(const tl of trafficLights){
    tl.timer += dt;
    if(tl.timer >= tl.cycle){ tl.timer = 0; tl.state = (tl.state === 'NS') ? 'EW' : 'NS'; }
    try{
      if(tl.state === 'NS'){ tl.lm.emissiveColor = new Color3(0.05,0.9,0.05); }
      else { tl.lm.emissiveColor = new Color3(0.9,0.05,0.05); }
      tl.lightSphere.material = tl.lm;
    }catch(e){}
  }
  
  for(const b of bots){
    if(!b.mesh) continue;
    
    if(!b.changeTime) b.changeTime = 0;
    b.changeTime += dt;
    
    if(b.changeTime > 3 + Math.random() * 4) {
      if(!b.direction) b.direction = Math.random() * Math.PI * 2;
      b.direction = Math.random() * Math.PI * 2;
      b.changeTime = 0;
    }
    
    if(!b.direction) b.direction = Math.random() * Math.PI * 2;
    const forward = new Vector3(Math.sin(b.direction), 0, Math.cos(b.direction));
    const moveVec = forward.scale(b.speed * dt);
    const newPos = b.mesh.position.add(moveVec);
    
    if(Math.abs(newPos.x) > MAP_HALF - 20 || Math.abs(newPos.z) > MAP_HALF - 20) {
      b.direction += Math.PI;
      continue;
    }
    
    let blocked = false;
    for(const m of scene.meshes) {
      if(m === b.mesh) continue;
      if(m.metadata && m.metadata.solid) {
        if(pointNearMesh(m, newPos, BOT_RADIUS)) {
          blocked = true;
          break;
        }
      }
    }
    
    if(!blocked) {
      b.mesh.position = newPos;
      b.mesh.rotation.y = b.direction;
    } else {
      b.direction += Math.PI/2 + (Math.random() - 0.5) * Math.PI/4;
    }
    
    b.mesh.position.y = 1;
  }
  
  if(!sprintHintEl) sprintHintEl = document.getElementById('sprintHint');
  if(camera){
    let target = isSprinting ? SPRINT_FOV : DEFAULT_FOV;
    if(isScoped && weapons[currentWeapon].id === 'sniper') target = SCOPE_FOV;
    const fd = engine.getDeltaTime()/1000;
    camera.fov += (target - camera.fov) * Math.min(1, FOV_LERP_SPEED * fd);
  }
});

scene.onBeforeRenderObservable.add(()=>{
  const dt = engine.getDeltaTime()/1000;
  for(let i=projectiles.length-1;i>=0;i--){
    const p = projectiles[i];
    if(p.mesh.position.subtract(camera.position).length() < 1){
      player.hp -= 10;
      p.mesh.dispose();
      projectiles.splice(i,1);
      updateHUD();
      if(player.hp <= 0){
        respawnPlayer();
      }
    }
  }
});

function respawnPlayer(){
  dead = false;
  player.hp = 100;
  const w = weapons[currentWeapon];
  player.readyAmmo = w.magSize;
  player.spareAmmo = w.totalAmmo;
  camera.position = new Vector3(-95,2,-95);
  isOnGround = true;
  velY = 0;
  updateHUD();
}

respawnPlayer();

window.addEventListener('keydown', (e)=>{
  const k = e.key.toLowerCase();
  if(k === 'shift'){
  setSprinting(true);
  }
  if(k === ' '){
    if(isOnGround && !dead){ velY = jumpStrength; isOnGround = false; }
  }
});

window.addEventListener('keyup', (e)=>{
  const k = e.key.toLowerCase();
  if(k === 'shift') { setSprinting(false); }
});

engine.runRenderLoop(()=>{
  scene.render();
});

window.addEventListener('resize', ()=>{ engine.resize(); });

document.getElementById('playBtn').addEventListener('click', ()=>{
  document.getElementById('startScreen').style.display = 'none';
  canvas.requestPointerLock();
});

scene.onBeforeRenderObservable.add(()=>{
  const prompt = ensureLadderPrompt();
  ladderState.near = false;
  ladderState.activeLadder = null;
  const camPos = camera.position;
  for(const m of scene.meshes){
    if(m.metadata && m.metadata.isLadder){
      const dx = camPos.x - m.position.x; const dz = camPos.z - m.position.z; const horiz = Math.sqrt(dx*dx + dz*dz);
      if(horiz < 1.2 && Math.abs(camPos.y - m.metadata.bottomY) < 1.2){
        ladderState.near = true; ladderState.activeLadder = m; ladderState.climbTopY = m.metadata.topY; ladderState.climbStartY = m.metadata.bottomY;
        break;
      }
    }
  }
  if(ladderState.near && !ladderState.climbing){
    prompt.style.display = 'block'; prompt.innerText = 'Hold F to climb';
    if(fDown && ladderState.activeLadder){ ladderState.climbing = true; ladderState.climbCurY = camera.position.y; }
  } else {
    if(!ladderState.climbing) prompt.style.display = 'none';
  }

  if(ladderState.climbing){
    if(fDown){
      const targetY = ladderState.climbTopY + 0.6;
      const climbSpeed = 2.8 * engine.getDeltaTime() / 1000;
      camera.position.y = Math.min(targetY, camera.position.y + climbSpeed);
      if(ladderState.activeLadder){ camera.position.x = ladderState.activeLadder.position.x; camera.position.z = ladderState.activeLadder.position.z; }
      prompt.style.display = 'block'; prompt.innerText = 'Release F to cancel (will teleport down)';
      if(camera.position.y >= targetY - 0.01){ ladderState.climbing = false; prompt.style.display = 'none'; }
    } else {
      ladderState.climbing = false; prompt.style.display = 'none';
      if(ladderState.activeLadder){ camera.position.y = ladderState.activeLadder.metadata.bottomY + 0.6; camera.position.x = ladderState.activeLadder.position.x; camera.position.z = ladderState.activeLadder.position.z; }
    }
  }
});