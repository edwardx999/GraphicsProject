import * as THREE from "./lib/Three.js";
import { FBXLoader } from "./lib/loaders/FBXLoader.js";
import { TGALoader } from "./lib/loaders/TGALoader.js";
import { OBJLoader } from "./lib/loaders/OBJLoader.js";
import * as Doppler from "./doppler_shader.js";
import { Matrix4, Mesh, MeshPhongMaterial, Object3D, ObjectLoader, Quaternion, Uniform, Vector3 } from "./lib/Three.js";
import { MTLLoader } from "./lib/loaders/MTLLoader.js";
let camera: THREE.PerspectiveCamera;
let light: THREE.SpotLight;
let lightTarget: THREE.Object3D;
let scene: THREE.Scene;
const pickingScene: THREE.Scene = new THREE.Scene();
pickingScene.background = new THREE.Color(0);
let renderer: THREE.WebGLRenderer;
let customObject: THREE.Mesh;
let uniformC = { value: 3 * 10 ** 2 };
let currentDirection = 0;
let currentSpeed = 0;
const maxSpeed = 5;
const accelaration = 10;
interface Object {
    object: THREE.Object3D;
    pickingObject: THREE.Object3D;
    v: THREE.Vector3;
    omega: THREE.Vector3;
    animation?: (obj: Object, timeMs: number, elapsedS: number) => any;
};
const objects: Object[] = [];

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

const setSol = (solExponent: number) => {
    uniformC.value = 3 * 10 ** solExponent;
    (<HTMLLabelElement>document.getElementById("sol-label")).textContent = `Speed of Light: ${uniformC.value.toPrecision(8)} m/s`;
}

function init() {
    setSol((<HTMLInputElement>document.getElementById("sol")).valueAsNumber);
    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);
    camera.position.z = 1;
    document.getElementById("fov").setAttribute("value", "70");

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xcce0ff);
    scene.add(camera);

    const textureLoader = new THREE.TextureLoader();

    {
        const bird = textureLoader.load("./bird.png");
        const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);

        const cube = new THREE.Mesh(geometry,
            Doppler.createShader({
                lightSpeed: uniformC,
                map: new Uniform(bird)
            }));
        cube.castShadow = true;
        cube.receiveShadow = true;
        objects.push({
            object: cube,
            pickingObject: null,
            omega: new Vector3(1, 2),
            v: new Vector3()
        });
        scene.add(cube);
    }
    {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1, 10), Doppler.createShader({
            lightSpeed: uniformC,
            diffuse: new Uniform(new THREE.Color(0xABCDEF))
        }));
        cone.castShadow = true;
        cone.receiveShadow = true;
        cone.position.z = -1;
        cone.position.x = -1;
        objects.push({
            object: cone,
            pickingObject: null,
            omega: new Vector3(),
            v: new Vector3()
        });
        scene.add(cone);
    }

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
        customObject = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1),
            Doppler.createShader(
                {
                    lightSpeed: uniformC,
                    diffuse: new THREE.Uniform(new THREE.Color(0x008800))
                }));
        customObject.position.x = 1;
        customObject.position.z = -1;
        customObject.receiveShadow = true;
        customObject.castShadow = true;
        // objects.push({object: customObject, pickingObject: null, v: new Vector3(), omega: new Vector3()})
        objects.push({ object: customObject, pickingObject: null, v: new Vector3(), omega: new Vector3(0, 2, 0) })
        scene.add(customObject);
    }
    {
        customObject = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1),
            Doppler.createShader(
                {
                    lightSpeed: uniformC,
                    diffuse: new THREE.Uniform(new THREE.Color(0x008800))
                }));
        customObject.position.x = 0;
        customObject.position.y = 2;
        customObject.position.z = 1;
        customObject.receiveShadow = true;
        customObject.castShadow = true;
        // objects.push({object: customObject, pickingObject: null, v: new Vector3(), omega: new Vector3()})
        objects.push({
            object: customObject, pickingObject: null, v: new Vector3(), omega: new Vector3(),
            animation: (obj, time) => {
                const timeS = time / 1000;
                //obj.object.position.x = Math.sin(timeS);
                obj.v.x = Math.cos(timeS);
                //obj.object.position.z = Math.cos(timeS);
                obj.v.z = -Math.sin(timeS);
            }
        });
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
    const groundMaterial = new MeshPhongMaterial({ map: groundTexture, bumpMap: groundTexture, bumpScale: 10 });
    // repeat mapping not working
    // const groundMaterial = Doppler.createShader({ lightSpeed: uniformC, map: new Uniform(groundTexture), bumpMap: new Uniform(groundTexture), bumpScale: { value: 10 } });
    const ground = new THREE.Mesh(new THREE.PlaneBufferGeometry(20000, 20000), groundMaterial);
    ground.position.y = -1;
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    objects.push(
        {
            object: ground,
            pickingObject: null,
            v: new Vector3(),
            omega: new Vector3()
        }
    );
    scene.add(ground);
    {
        // THREE.DefaultLoadingManager.addHandler(/\.tga$/i, new TGALoader());
        const loader = new FBXLoader();
        const material = Doppler.createShader({ lightSpeed: uniformC, diffuse: new Uniform(new THREE.Color(0x123456)) });
        material.side = THREE.DoubleSide;
        loader.load("./unity/unitychan.fbx", (obj: Object3D) => {
            obj.scale.set(0.01, 0.01, 0.01);
            obj.position.x = -2;
            obj.position.y = ground.position.y + 0.1;
            obj.rotation.y = Math.PI / 2;
            obj.traverse(obj => {
                obj.castShadow = true;
                obj.receiveShadow = true;
                if (obj instanceof THREE.Mesh) {
                    obj.material = material;
                }
            });
            scene.add(obj);
            objects.push({
                object: obj,
                pickingObject: null,
                v: new Vector3(),
                omega: new Vector3(0, 2, 0)
            });
        });
    }
    {
        const objLoader = new OBJLoader();
        const material = Doppler.createShader({
            lightSpeed: uniformC,
            map: new Uniform(textureLoader.load("./jess/Jess_Casual_Walking_001_D.png")),
            // normalMap: textureLoader.load("./jess/Jess_Casual_Walking_001_N.png"),
        });
        objLoader.load("./jess/jess.obj", (obj: Object3D) => {
            obj.scale.set(0.001, 0.001, 0.001);
            obj.rotation.x = -Math.PI / 2;
            obj.rotation.z = 3 * Math.PI / 2;
            obj.position.y = ground.position.y;
            obj.position.x = 2;
            // For any meshes in the model, add our material.
            obj.traverse((node: Object3D) => {
                if (node instanceof THREE.Mesh) {
                    node.material = material;
                }
                obj.castShadow = true;
                obj.receiveShadow = true;
            });
            scene.add(obj);
            objects.push({
                object: obj,
                pickingObject: null,
                v: new Vector3(),
                omega: new Vector3(0, 0, 0)
            });
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
    lastTime = time;
    requestAnimationFrame(animate);
    if (keysActive[KeysDown.CCW]) {
        camera.rotation.y += 1 * elapsed;
    }
    else if (keysActive[KeysDown.CW]) {
        camera.rotation.y += -1 * elapsed;
    }
    let toCameraMovingForward: Matrix4;
    let fromCameraMovingForward: Matrix4;
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
        if (currentSpeed <= 0) {
            currentSpeed = 0;
            toCameraMovingForward = new Matrix4();
            fromCameraMovingForward = toCameraMovingForward;
        }
        else {
            const facing = new THREE.Vector3(-Math.sin(camera.rotation.y), 0, -Math.cos(camera.rotation.y));
            const cameraVelocity = facing.applyQuaternion(directions[currentDirection]);
            toCameraMovingForward = new Matrix4().makeRotationFromQuaternion(new Quaternion().setFromUnitVectors(cameraVelocity, new Vector3(1, 0, 0)));
            fromCameraMovingForward = toCameraMovingForward.clone().invert();
            camera.position.add(cameraVelocity.multiplyScalar(elapsed * currentSpeed));
        }
    }
    objects.forEach((obj) => {
        const setObjUniforms = (objUniform: Doppler.Uniforms) => {
            let velocityRelCamera: number;
            let cameraForward: THREE.Matrix4;
            if (velocityRelCamera === undefined) {
                const objVelRotated = obj.v.clone().applyMatrix4(toCameraMovingForward);
                const cameraV = addVel(objVelRotated, currentSpeed).negate();
                cameraV.applyMatrix4(fromCameraMovingForward);
                velocityRelCamera = cameraV.length();
                cameraForward = new Matrix4().makeRotationFromQuaternion(new Quaternion().setFromUnitVectors(cameraV.clone().normalize(), new Vector3(1, 0, 0)));
            }
            objUniform.cameraForward.value = cameraForward;
            objUniform.velocityRelCamera.value = velocityRelCamera;
            objUniform.omega.value = obj.omega;
            objUniform.center.value = obj.object.position;
        };
        obj.object.traverse(child => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.ShaderMaterial) {
                const objUniform = <Doppler.Uniforms>child.material.uniforms;
                setObjUniforms(objUniform);
            }
        });
        if (obj.animation) {
            obj.animation(obj, time, elapsed);
        }
        obj.object.position.x += obj.v.x * elapsed;
        obj.object.position.y += obj.v.y * elapsed;
        obj.object.position.z += obj.v.z * elapsed;
        obj.object.rotation.x += obj.omega.x * elapsed;
        obj.object.rotation.y += obj.omega.y * elapsed;
        obj.object.rotation.z += obj.omega.z * elapsed;
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

const addVel = (v1: Vector3, v2: number) => {
    const sum = new Vector3();
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