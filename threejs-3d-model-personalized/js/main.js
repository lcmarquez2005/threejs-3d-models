import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

const manager = new THREE.LoadingManager();

let camera, scene, renderer, stats, object, loader, guiMorphsFolder;
let mixer;
let currentAction = null;
let currentIndex = 0;

const clock = new THREE.Clock();

const assets = [
    // 'Samba Dancing',
    // 'morph_test',
    'Capoeira',
    'Rumba Dancing',
    'Reaction'
];

const params = {
    asset: assets[currentIndex],
};

init();
animate();

function init() {
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    container.style.border = '1px solid #ccc';
    container.style.margin = '20px auto';
    document.querySelector('main').appendChild(container);
    
    camera = new THREE.PerspectiveCamera(45, 800 / 600, 1, 2000);
    camera.position.set(100, 200, 300);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xa0a0a0);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 5);
    hemiLight.position.set(0, 200, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 5);
    dirLight.position.set(0, 200, 100);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 180;
    dirLight.shadow.camera.bottom = -100;
    dirLight.shadow.camera.left = -120;
    dirLight.shadow.camera.right = 120;
    scene.add(dirLight);

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const grid = new THREE.GridHelper(2000, 20, 0x000000, 0x000000);
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    scene.add(grid);

    loader = new FBXLoader(manager);
    loadAsset(params.asset);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(800, 600);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 100, 0);
    controls.update();

    window.addEventListener('resize', onWindowResize);

    stats = new Stats();
    container.appendChild(stats.dom);

    const gui = new GUI();
    gui.add(params, 'asset', assets).onChange((value) => {
        currentIndex = assets.indexOf(value);
        loadAsset(value);
    });

    guiMorphsFolder = gui.addFolder('Morphs').hide();

    // Keyboard listener
    window.addEventListener('keydown', (event) => {
        const num = parseInt(event.key);
        if (!isNaN(num) && num >= 1 && num <= assets.length) {
            currentIndex = num - 1;
            params.asset = assets[currentIndex];
            loadAsset(params.asset);
        }
    });
}

function loadAsset(assetName) {
    loader.load('../models/fbx/' + assetName + '.fbx', function (group) {
        if (object) {
            object.traverse(function (child) {
                if (child.material) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    materials.forEach(material => {
                        if (material.map) material.map.dispose();
                        material.dispose();
                    });
                }
                if (child.geometry) child.geometry.dispose();
            });
            scene.remove(object);
        }

        object = group;

        guiMorphsFolder.children.forEach(child => child.destroy());
        guiMorphsFolder.hide();

        object.traverse(child => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                if (child.morphTargetDictionary) {
                    guiMorphsFolder.show();
                    const meshFolder = guiMorphsFolder.addFolder(child.name || child.uuid);
                    Object.keys(child.morphTargetDictionary).forEach(key => {
                        meshFolder.add(child.morphTargetInfluences, child.morphTargetDictionary[key], 0, 1, 0.01);
                    });
                }
            }
        });

        scene.add(object);

        if (object.animations && object.animations.length) {
            mixer = new THREE.AnimationMixer(object);

            const newAction = mixer.clipAction(object.animations[0]);
            newAction.reset();
            newAction.enabled = true;
            newAction.setEffectiveWeight(1);
            newAction.setLoop(THREE.LoopOnce);
            newAction.clampWhenFinished = true;

            if (currentAction) {
                currentAction.crossFadeTo(newAction, 1.0, false);
            }

            newAction.play();
            currentAction = newAction;

            mixer.addEventListener('finished', () => {
                currentIndex = (currentIndex + 1) % assets.length;
                params.asset = assets[currentIndex];
                loadAsset(params.asset);
            });

        } else {
            mixer = null;
            currentAction = null;
        }
    });
}

function onWindowResize() {
    // Nada que hacer, porque el tamaño es fijo
}

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    if (mixer) mixer.update(delta);

    renderer.render(scene, camera);
    stats.update();
}
