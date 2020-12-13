import * as THREE from "./lib/Three.js";
import { FBXLoader } from "./lib/loaders/FBXLoader.js";
import { TGALoader } from "./lib/loaders/TGALoader.js";
import { OBJLoader } from "./lib/loaders/OBJLoader.js";
import * as Doppler from "./doppler_shader.js";
import { Matrix4, Object3D, ObjectLoader, Quaternion, Uniform, Vector3 } from "./lib/Three.js";
import { MTLLoader } from "./lib/loaders/MTLLoader.js";
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
let currExp = 2;
let uniformC = { value: 3 * 10 ** currExp };
let currentDirection = 0;
let currentSpeed = 0;
const maxSpeed = 5;
const accelaration = 8;
interface Object {
    object: THREE.Object3D;
    pickingObject: THREE.Object3D;
    v: THREE.Vector3;
    omega: THREE.Vector3;
};
const objects: Object[] = [];
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
        color: objects.length + 1,
    });
    const pickingObject = new THREE.Mesh(geometry, pickingMaterial);
    objects.push({
        object: realObject,
        pickingObject: pickingObject,
        v: new THREE.Vector3(0, 0, 0),
        omega: new THREE.Vector3(0, 0, 0)
    })
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

    let cone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1, 10), new THREE.MeshPhongMaterial({ color: 0xABCDEF }));
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
            v: new THREE.Uniform(0),
            omega: new THREE.Uniform(new Vector3()),
            color: new THREE.Uniform(new Vector3(0.5)),
            center: new THREE.Uniform(new Vector3(1)),
            c: uniformC,
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
        // objects.push({object: customObject, pickingObject: null, v: new Vector3(), omega: new Vector3()})
        objects.push({ object: customObject, pickingObject: null, v: new Vector3(), omega: new Vector3(0, 2, 0) })
        scene.add(customObject);
    }
    {
        const inFrontOfCamera = new THREE.Object3D();
        inFrontOfCamera.position.z = -5;
        camera.add(inFrontOfCamera);
        light.target = inFrontOfCamera;
        lightTarget = inFrontOfCamera;
    } //, new THREE.MeshPhongMaterial({ color: 0xABCDEF, bumpMap: bird })
    const groundTexture = textureLoader.load("./red_sandstone.png");
    groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(20000, 20000);
    const groundMaterial = new THREE.MeshPhongMaterial({ map: groundTexture, bumpMap: groundTexture, bumpScale: 10 });
    let ground = new THREE.Mesh(new THREE.PlaneBufferGeometry(20000, 20000), groundMaterial);
    ground.position.y = -1;
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    {
        // THREE.DefaultLoadingManager.addHandler(/\.tga$/i, new TGALoader());
        const loader = new FBXLoader();
        loader.load("./unity/unitychan.fbx", (obj) => {
            obj.scale.set(0.005, 0.005, 0.005);
            obj.position.z = -2;
            obj.traverse(obj => obj.castShadow = true);
            scene.add(obj as THREE.Object3D);
        });
        const mtl = new MTLLoader();
        mtl.load("./jess/Jess_Casual_Walking_001_D.png", (material) => {
            const objLoader = new OBJLoader();
            objLoader.setMaterials(material);
            objLoader.load("./jess/jess.obj", (obj: Object3D) => {
                obj.scale.set(0.001, 0.001, 0.001);
                obj.rotation.x = -Math.PI / 2;
                obj.position.y = ground.position.y;
                obj.position.z = 0.7;
                obj.traverse(obj => obj.castShadow = true);
                scene.add(obj as THREE.Object3D);
            })
        })
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
    for (let i = 0; i < 8; ++i) {
        ret.push(new THREE.Quaternion().setFromAxisAngle(yAxisVector, i * Math.PI / 4));
    }
    return ret;
})();

const modularAdd = (a: number, b: number, n: number) => {
    const l = (a + b) % n;
    if (l < 0) {
        return l + n;
    }
    return l;
};
const animate: FrameRequestCallback = (time) => {
    if (lastTime === undefined) {
        lastTime = time;
    }
    const elapsed = (time - lastTime) / 1000;
    let uniformForward: Matrix4;
    let uniformForwardInverse: Matrix4;
    lastTime = time;
    requestAnimationFrame(animate);
    cube.rotation.x += 1 * elapsed;
    cube.rotation.y += 2 * elapsed;
    if (keysActive[KeysDown.CCW]) {
        camera.rotation.y += 1 * elapsed;
    }
    else if (keysActive[KeysDown.CW]) {
        camera.rotation.y += -1 * elapsed;
    }
    {
        const applyMovement = (proportion: number) => {
            if (currentDirection != proportion &&
                modularAdd(currentDirection, 1, 8) != proportion &&
                modularAdd(currentDirection, -1, 8) != proportion) {
                currentSpeed = 0;
            }
            else {
                currentSpeed += accelaration * elapsed;
            }
            currentDirection = proportion;
            if (currentSpeed > maxSpeed) {
                currentSpeed = maxSpeed;
            }
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
        else {
            currentSpeed -= accelaration * elapsed;
        }
        if (currentSpeed < 0) {
            currentSpeed = 0;
            uniformForward = new Matrix4();
            uniformForwardInverse = new Matrix4();
        }
        else {
            const facing = new THREE.Vector3(-Math.sin(camera.rotation.y), 0, -Math.cos(camera.rotation.y));
            const cameraVelocity = facing.applyQuaternion(directions[currentDirection]);
            uniformForward = new Matrix4().makeRotationFromQuaternion(new Quaternion().setFromUnitVectors(cameraVelocity, new Vector3(1, 0, 0)));
            uniformForwardInverse = uniformForward.clone().invert()
            camera.position.add(cameraVelocity.multiplyScalar(elapsed * currentSpeed));
        }
    }
    objects.forEach((obj) => {
        if (obj.object instanceof THREE.Mesh) {
            if (obj.object.material instanceof THREE.ShaderMaterial) {
                const objUniform = <Doppler.UntexturedUniforms>obj.object.material.uniforms;
                const objVelRotated = obj.v.clone().applyMatrix4(uniformForward)
                const cameraV = addVel(objVelRotated, currentSpeed)
                objUniform.v.value = cameraV.applyMatrix4(uniformForwardInverse).length();
                objUniform.cameraForward.value = new Matrix4().makeRotationFromQuaternion(new Quaternion().setFromUnitVectors(cameraV.clone().normalize(), new Vector3(1, 0, 0)))
                objUniform.omega.value = obj.omega;

                obj.object.rotation.x += obj.omega.x * elapsed
                obj.object.rotation.y += obj.omega.y * elapsed
                obj.object.rotation.z += obj.omega.z * elapsed
            }
        }
    })
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

const setSol = (newSol: number) => {
    currExp = newSol;
    uniformC.value = 3 * 10 ** newSol;
    (<HTMLLabelElement>document.getElementById("sol-label")).textContent = `Speed of Light: ${Math.floor(uniformC.value)}`;
}

const addVel = (v1: Vector3, v2: number) => {
    const sum = new Vector3()
    const c2 = uniformC.value * uniformC.value;
    const denom = (1.0 - v2 / c2 * v1.x);
    sum.x = (v1.x - v2) / denom;
    const gamma = Math.sqrt(1.0 - v2 * v2 / c2);
    const factor = gamma / denom;
    sum.y = factor * v1.y;
    sum.z = factor * v1.z;
    return sum;
}

document.getElementById("fov").addEventListener("change", (val) => {
    setFov((val.target as HTMLInputElement).valueAsNumber);
});

document.getElementById("sol").addEventListener("change", (val) => {
    setSol((val.target as HTMLInputElement).valueAsNumber);
});

window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});