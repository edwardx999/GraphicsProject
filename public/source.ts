import * as THREE from "./lib/Three.js"

let camera: THREE.PerspectiveCamera;
let light: THREE.SpotLight;
let scene: THREE.Scene;
let renderer: THREE.WebGLRenderer;
let geometry: THREE.Geometry;
let material: THREE.Material;
let cube: THREE.Mesh;
let cube2: THREE.Mesh;
const enum KeysDown {
    FORWARD,
    BACKWARD,
    LEFT,
    RIGHT,
    CCW,
    CW
};
const keysDownTime: Record<KeysDown, number | false> = [0, 0, 0, 0, 0, 0];
const keysActive: Record<KeysDown, boolean> = [false, false, false, false, false, false];


function init() {

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
    camera.position.z = 1;
    document.getElementById("fov").setAttribute("value", "70");

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcce0ff);
    scene.add(camera);

    geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    material = new THREE.MeshPhongMaterial();

    cube = new THREE.Mesh(geometry, material);
    cube.castShadow = true;
    cube.receiveShadow = true;
    scene.add(cube);

    cube2 = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1, 10), material);
    cube2.castShadow = true;
    cube2.receiveShadow = true;
    cube2.position.z = -1;
    scene.add(cube2);

    light = new THREE.SpotLight(0xFFFFFF, 1);

    light.distance = 15;
    light.penumbra = 0.05;
    light.distance = 50;
    light.decay = 0.5;
    light.position.set(0, 1, 0);
    light.target = cube;
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;

    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 400;
    light.shadow.camera.fov = 30;

    light.shadow.camera.far = 1000;
    camera.add(light);

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
const yAxisVector = new THREE.Vector3(0, 1, 0);
const directions = (() => {
    const ret: THREE.Quaternion[] = [];
    const scale = new THREE.Quaternion(0, 0, 0, 0.05);
    for (let i = 0; i < 8; ++i) {
        ret.push(new THREE.Quaternion().setFromAxisAngle(yAxisVector, i * Math.PI / 4).multiply(scale));
    }
    return ret;
})();

const testPressed = (key: KeysDown, antiKey: KeysDown) => {
    return keysDownTime[key] && (!keysDownTime[antiKey] || (keysDownTime[key] > keysDownTime[antiKey]));
};

const animate: FrameRequestCallback = (time) => {
    if (lastTime === undefined) {
        lastTime = time;
    }
    const elapsed = time - lastTime;
    lastTime = time;
    requestAnimationFrame(animate);
    cube.rotation.x += 0.001 * elapsed;
    cube.rotation.y += 0.002 * elapsed;
    if (keysActive[KeysDown.CCW]) {
        camera.rotation.y += 0.001 * elapsed;
    }
    else if (keysActive[KeysDown.CW]) {
        camera.rotation.y += -0.001 * elapsed;
    }
    {
        const applyMovement = (proportion: number) => {
            const facing = new THREE.Vector3();
            camera.getWorldDirection(facing);
            camera.position.add(facing.applyQuaternion(directions[proportion]).multiplyScalar(elapsed));
        };
        if (keysActive[KeysDown.FORWARD]) {
            if (keysActive[KeysDown.LEFT]) {
                applyMovement(1);
            }
            else if (keysActive[KeysDown.RIGHT]) {
                applyMovement(7);
            }
            else {
                applyMovement(0);
            }
        }
        else if (keysActive[KeysDown.BACKWARD]) {
            if (keysActive[KeysDown.LEFT]) {
                applyMovement(3);
            }
            else if (keysActive[KeysDown.RIGHT]) {
                applyMovement(5);
            }
            else {
                applyMovement(4);
            }
        }
        else if (keysActive[KeysDown.LEFT]) {
            applyMovement(2);
        }
        else if (keysActive[KeysDown.RIGHT]) {
            applyMovement(6);
        }
    }
    renderer.render(scene, camera);
}

init();
requestAnimationFrame(animate);

let keyTime = 0;
const setKeyActive = (key: KeysDown, antiKey: KeysDown) => {
    const active = (keysActive[key] = testPressed(key, antiKey));
    if (!active) {
        keysActive[antiKey] = testPressed(antiKey, key);
    }
};
const setKeyDown = (key: KeysDown, antiKey: KeysDown) => {
    const wasKeyDown = keysDownTime[key];
    if (!wasKeyDown) {
        keysDownTime[key] = ++keyTime;
        setKeyActive(key, antiKey);
    }
};
window.addEventListener("keydown", (ev) => {
    const facing = new THREE.Vector3()
    camera.getWorldDirection(facing);
    switch (ev.key) {
        case "w":
            setKeyDown(KeysDown.FORWARD, KeysDown.BACKWARD);
            break;
        case "s":
            setKeyDown(KeysDown.BACKWARD, KeysDown.FORWARD);
            break;
        case "a":
            setKeyDown(KeysDown.LEFT, KeysDown.RIGHT);
            break;
        case "d":
            setKeyDown(KeysDown.RIGHT, KeysDown.LEFT);
            break;
        case "q":
            setKeyDown(KeysDown.CCW, KeysDown.CW);
            break;
        case "e":
            setKeyDown(KeysDown.CW, KeysDown.CCW);
            break;
        default:
            return;
    }
});

const setKeyUp = (key: KeysDown, antiKey: KeysDown) => {
    keysDownTime[key] = false;
    setKeyActive(key, antiKey);
};
window.addEventListener("keyup", (ev) => {
    switch (ev.key) {
        case "w":
            setKeyUp(KeysDown.FORWARD, KeysDown.BACKWARD);
            break;
        case "s":
            setKeyUp(KeysDown.BACKWARD, KeysDown.FORWARD);
            break;
        case "a":
            setKeyUp(KeysDown.LEFT, KeysDown.RIGHT);
            break;
        case "d":
            setKeyUp(KeysDown.RIGHT, KeysDown.LEFT);
            break;
        case "q":
            setKeyUp(KeysDown.CCW, KeysDown.CW);
            break;
        case "e":
            setKeyUp(KeysDown.CW, KeysDown.CCW);
            break;

    }
})

const setFov = (newFov: number) => {
    camera.fov = newFov;
    camera.updateProjectionMatrix();
}

document.getElementById("fov").addEventListener("change", (val) => {
    setFov((val.target as HTMLInputElement).valueAsNumber);
});