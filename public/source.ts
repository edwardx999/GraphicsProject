import * as THREE from "./lib/Three.js";
import { FBXLoader } from "./lib/loaders/FBXLoader.js";
import { TGALoader } from "./lib/loaders/TGALoader.js";
import * as Doppler from "./doppler_shader.js";
import { Matrix4, Vector3 } from "./lib/Three.js";
let camera: THREE.PerspectiveCamera;
let light: THREE.SpotLight;
let lightTarget: THREE.Object3D;
let scene: THREE.Scene;
const pickingScene: THREE.Scene = new THREE.Scene();
pickingScene.background = new THREE.Color(0);
let renderer: THREE.WebGLRenderer;
let geometry: THREE.Geometry;
let material: THREE.Material;
let customObject: THREE.Mesh;
interface Object {
    object: THREE.Mesh;
    pickingObject: THREE.Mesh;
    v: number;
    omega: number;

};
const objects: THREE.Mesh[] = [];
let cube: THREE.Mesh;

const enum KeysDown {
    FORWARD,
    BACKWARD,
    LEFT,
    RIGHT,
    CCW,
    CW
};
const keysActive: Record<KeysDown, boolean> = [false, false, false, false, false, false];

function createObject(geometry: THREE.Geometry, material: THREE.Material) {
    const realObject = new THREE.Mesh(geometry, material);
    const pickingMaterial = new THREE.MeshPhongMaterial({
        color: objects.length + 1
    });
    const pickingObject = new THREE.Mesh(geometry, pickingMaterial);

}

function init() {

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
    camera.position.z = 1;
    document.getElementById("fov").setAttribute("value", "70");

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcce0ff);
    scene.add(camera);

    const textureLoader = new THREE.TextureLoader();
    const bird = textureLoader.load("./bird.png")
    geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
    material = new THREE.MeshPhongMaterial({ map: bird });

    cube = new THREE.Mesh(geometry, material);
    cube.castShadow = true;
    cube.receiveShadow = true;
    scene.add(cube);

    let cone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1, 10), new THREE.MeshPhongMaterial({ color: 0xABCDEF, bumpMap: bird }));
    cone.castShadow = true;
    cone.receiveShadow = true;
    cone.position.z = -1;
    scene.add(cone);

    light = new THREE.SpotLight(0xFFFFFF, 1);

    light.distance = 15;
    light.penumbra = 0.05;
    light.distance = 50;
    light.decay = 0.5;
    light.angle = Math.PI / 5;
    light.castShadow = true;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;

    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 400;
    light.shadow.camera.fov = 30;
    {
        const uniforms: Doppler.UntexturedUniforms = {
            v: {value: 0.3},
            omega: new THREE.Uniform(new Vector3()),
            color: new THREE.Uniform(new Vector3(0.5)),
            center: new THREE.Uniform(new Vector3(1)),
            c: {value: 1},
            cameraForward: new THREE.Uniform(new Matrix4())
        }
        customObject = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.ShaderMaterial({
            uniforms: uniforms,
            vertexShader: Doppler.vertexShader.untextured,
            fragmentShader: Doppler.fragmentShader.untextured
        }));
        customObject.position.x = 1;
        customObject.receiveShadow = true;
        customObject.castShadow = true;
        scene.add(customObject);
    }
    {
        const inFrontOfCamera = new THREE.Object3D();
        inFrontOfCamera.position.z = -5;
        camera.add(inFrontOfCamera);
        light.target = inFrontOfCamera;
        lightTarget = inFrontOfCamera;
    }
    const groundTexture = textureLoader.load("./red_sandstone.png");
    groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(20000, 20000);
    const groundMaterial = new THREE.MeshPhongMaterial({ map: groundTexture });
    let ground = new THREE.Mesh(new THREE.PlaneBufferGeometry(20000, 20000), groundMaterial);
    ground.position.y = -1;
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    {
        THREE.DefaultLoadingManager.addHandler(/\.tga$/i, new TGALoader());
        const loader = new FBXLoader();
        loader.load("./unity/unitychan.fbx", (obj) => {
            obj.scale.set(0.005, 0.005, 0.005);
            obj.position.z = -2;
            obj.traverse(obj => obj.castShadow = true);
            scene.add(obj as THREE.Object3D);
        });
        loader.load("./rock/Rock1a.fbx", (obj) => {
            obj.scale.set(0.05, 0.05, 0.05);
            obj.position.y = ground.position.y + 0.3;
            obj.position.z = 0.7;
            obj.traverse(obj => obj.castShadow = true);
            scene.add(obj as THREE.Object3D);
        });
    }

    camera.add(light);

    {
        const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.1);
        scene.add(ambientLight);

        const sun = new THREE.DirectionalLight(0xFFFFFF, 0.4);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 1024;
        sun.shadow.mapSize.height = 1024;

        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 400;

        sun.position.set(0, 100, 0);
        scene.add(sun);
    }

    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById("canvas") as HTMLCanvasElement });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setSize(window.innerWidth, window.innerHeight);
}

let lastTime: number;
const directions = (() => {
    const ret: THREE.Quaternion[] = [];
    const yAxisVector = new THREE.Vector3(0, 1, 0);
    const scale = new THREE.Quaternion(0, 0, 0, 0.05);
    for (let i = 0; i < 8; ++i) {
        ret.push(new THREE.Quaternion().setFromAxisAngle(yAxisVector, i * Math.PI / 4).multiply(scale));
    }
    return ret;
})();
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
            const facing = new THREE.Vector3(-Math.sin(camera.rotation.y), 0, -Math.cos(camera.rotation.y));
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
    {
        lightTarget.position.y = -0.5 + Math.sin(time / 1000) / 10;
        lightTarget.position.x = Math.sin(time / 823) / 10;
        light.position.y = -0.5 + Math.sin(time / 777) / 80;
        light.position.x = Math.sin(time / 931) / 80;
    }
    renderer.render(scene, camera);
}

init();
requestAnimationFrame(animate);

{
    let keyTime = 0;
    const keysDownTime: Record<KeysDown, number | false> = [false, false, false, false, false, false];
    const testPressed = (key: KeysDown, antiKey: KeysDown) => {
        return keysDownTime[key] && (!keysDownTime[antiKey] || (keysDownTime[key] > keysDownTime[antiKey]));
    };
    const setKeyActive = (key: KeysDown, antiKey: KeysDown) => {
        const active = (keysActive[key] = testPressed(key, antiKey));
        if (!active) {
            keysActive[antiKey] = testPressed(antiKey, key);
        }
        else {
            keysActive[antiKey] = false;
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
        keysActive[key] = false;
        keysActive[antiKey] = testPressed(antiKey, key);
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
    });
}

const setFov = (newFov: number) => {
    camera.fov = newFov;
    camera.updateProjectionMatrix();
}

document.getElementById("fov").addEventListener("change", (val) => {
    setFov((val.target as HTMLInputElement).valueAsNumber);
});

window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});