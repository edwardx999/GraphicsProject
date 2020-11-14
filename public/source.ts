import * as THREE from "./lib/Three.js"
import { SpotLight } from "./lib/Three.js";

let camera: THREE.Camera;
let light: THREE.SpotLight;
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let geometry: THREE.Geometry;
let material: THREE.Material;
let cube: THREE.Mesh;
let cube2: THREE.Mesh;
let direction = [0, 0, 0];


function init() {

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
    camera.position.z = 1;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcce0ff);

    geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    material = new THREE.MeshPhongMaterial();

    cube = new THREE.Mesh(geometry, material);
    cube.castShadow = true;
    cube.receiveShadow = true;
    scene.add(cube);

    cube2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), material);
    cube2.castShadow = true;
    cube2.receiveShadow = true;
    cube2.position.z = -1;
    scene.add(cube2);

    light = new THREE.SpotLight(0xFFFFFF, 1);

    light.distance = 15;
    light.penumbra = 0.05;
    light.distance = 50;
    light.decay = 0.5;
    light.position.set(0, 2, 5);
    light.target = cube;
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;

    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 400;
    light.shadow.camera.fov = 30;

    light.shadow.camera.far = 1000;
    scene.add(light);

    const groundMaterial = new THREE.MeshPhongMaterial({ color: 0xABEFCD });
    let ground = new THREE.Mesh(new THREE.PlaneBufferGeometry(20000, 20000), groundMaterial);
    ground.position.y = -1;
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("canvas") as HTMLCanvasElement });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(window.innerWidth, window.innerHeight);
}

let lastTime: number;
const animate: FrameRequestCallback = (time) => {
    if (lastTime === undefined) {
        lastTime = time;
    }
    const elapsed = time - lastTime;
    lastTime = time;
    requestAnimationFrame(animate);
    cube.rotation.x += 0.001 * elapsed;
    cube.rotation.y += 0.002 * elapsed;
    camera.position.x += direction[0] * elapsed;
    camera.position.y += direction[1] * elapsed;
    camera.position.z += direction[2] * elapsed;
    light.position.copy(camera.position);
    light.position.y += 1;
    renderer.render(scene, camera);
}

init();
requestAnimationFrame(animate);

window.addEventListener("keydown", (ev) => {
    switch (ev.key) {
        case "w":
            direction = [0, 0, -0.005];
            break;
        case "s":
            direction = [0, 0, 0.005];
            break;
        case "a":
            direction = [-0.005, 0, 0];
            break;
        case "d":
            direction = [0.005, 0, 0];
            break;
        default:
            return;
    }
});

window.addEventListener("keyup", (ev) => {
    switch (ev.key) {
        case "w":
        case "s":
        case "a":
        case "d":
            direction = [0, 0, 0];
            break;
    }
})
