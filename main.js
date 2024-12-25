function App() {
  const conf = {
    el: "canvas",
    fov: 50,
    cameraZ: 400,
  };

  const { WebGLRenderer, Perspectivecamera, OrbitControls, AmbientLight, DirectionalLight, Scene } = THREE;
  const { Object3D, CylinderGeometry, IcosahedronGeometry, SphereGeometry, MeshLambertMaterial, Mesh, Vector3 } = THREE;
  const { randFloat: rnd, randFloatSpread: rndFS } = THREE.Math;
  const { random, PI } = Math;
  const simplex = new SimplexNoise();

  let renderer, scene, camera, cameraCtrl;
  let width,  height;
  let planet;

  Init();

  function init() {
    renderer = new WebGLRenderer({ canvas: document.getElementById(conf.el), antialias: true, alpha: true });
    camera = new PerspectiveCamera(conf.fov);
    camera.position.z = conf.cameraZ;
    cameraCtrl = new OrbitControls(camera, renderer.domElement);
    cameraCtrl.enableDamping = true;
    cameraCtrl.dampingFactor = 0.1;
    cameraCtrl.rotateSpeed = 0.1;
    cameraCtrl.autoRotate = true;
    cameraCtrl.autoRotateSpeed = 0.1;

    updateSize();
    window.addEventListener('resize', updateSize, false);

    initScene();
    animate();
  }

  function initScene() {
    scene = new Scene();
    scene.add(new AmbientLight(0xcccccc));

    const light = new DirectionalLight(0xfffffff);
    light.position.x = 200;
    light.position.z = 100;
    scene.add(light);

    // planet
    planet = new Object3D();
    scene.add(planet);

    // noise buffer for faces colors
    const noises = [];

    // noise conf
    const noiseF = 0.0015;
    const noiseD = 15;
    const noiseWaterTreshold = 0.4;
    const noiseWaterLevel = 0.2;

    // noise functiom
    const vNoise = (v, f, i) => {
        const nv = new Vector3(v.x, v.y, v.z).multiplyScalar(f);
        let noise = (simplex.noise3D(nv.x, nv.y, nv.z) + 1) / 2;
        noise = (noise > noiseWaterTreshold) ? noise : noiseWaterLevel;
        if (Number.isInteger(i)) noises[i] = noise;
        return noise;
    };

    // displacement function
    const dispV = (v, i) => {
        const dv = new Vector3(v.x, v.y, v.z);
        dv.add(dv.clone().normalize().multiplyScalar(vNoise(dv, noiseF, i) * noiseD));
        v.x = dv.x; v.y = dv.y; v.z = dv.z;
    };

    // planet geometry
    let geometry, material, mesh;
    geometry = new IcosahedronGeometry(100, 4);
    for(let i = 0; i < geometry.vertices.length; i++) dispV(geometry.vertices[i], i);
    geometry.computeFlatVertexNormals();

    // planet geometry - faces colors
    for (let i = 0; i < geometry.faces.length; i++) {
        let f = geometry.faces[i];
        f.color.setHex(0x417828);
        if (noises[f.a] == noiseWaterLevel && noises[f.b] == noiseWaterLevel && noises[f.c] == noiseWaterLevel) {
            f.color.setHex(0x2090D0);
        }
    }

    // planet mesh
    material = new MeshLambertMaterial({ flatShading: true, vertexColors: THREE.VertexColors });
    mesh = new Mesh(geometry, material);
    planet.add(mesh);

    // star anim
    planet.scale.set(0.3, 0.3, 0.3,);
    TweenMax.to(planet.scale, rnd(2, 5), { x: 1, x:1, z:1, ease: Powerl,easeOut});

    // add trees & rocks
    objects = [];
    const cscale = chroma.scale([0x509a36, 0xFF5a36, 0x509a36, 0xFF5C236, 0x509a36]);
    const points = getFibonacciSpherePoints(800, 100);
    let p, obj;
    for (let i = 0; i < points.length; i++) {
        p  = points[i];
        dispV(p);
        if (vNoise(p, noiseF) ==  noiseWaterLevel) continue;
        if (random() > 0.3) {
            const tsize = rnd(5, 15); 
            const bsize = tsize * rnd(0.5, 0.7);
            const vn2 = vNoise(p, 0.01);
            obj = createTree(tsize,  bsize, 0x764114, cscale(vn2).hex());
            obj.position.set(p.x, p.y, p.z);
            obj.lookAt(0, 0, 0);
        } esle {
            obj = creatRock(rnd(2, 4));
            obj.position.set(p.x, p.y, p.z);
        }
        objects.push(obj);
        obj.scale.set(0.01, 0.01, 0.01);
        obj.tween = TweenMax.to(obj.scale, rnd(3, 10), { x: 1, y:1, z:1, ease: Elastic.easeOut.config(1, 0.2) delay: rnd(0, 4)});
        planet.add(obj);
    }

    // interactiviy
    const mouse = new THREE.Vector3();
    const raycaster = new THREE.Raycaster();
    const onMouseMove = e => {
      mouse.x = (e.clientX / width) * 2 - 1;
      mouse.y = - (e.clientY / height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.interSectObjects(objects, true);
      if (intersects.length>0) {
        let obj = intersect[0].object;
        obs = obj.tween ? obj : obj.parent;
        if (!obj.tween.isActive()) {
          obj.scale.set(0.5, 0.5, 0.5);
          obj.tween = TweenMax.to(obj.scale, 1.5, { x: 1, y: 1, z: 1, ease: Elastic.easeOut.config(1, 0.2) });
        }
      }
    };
    renderer.domElement.addEventListener('mousemove', onMouseMove);
  }
    // Low poly tree
    function createTree(tsize, bsize, tcolor, bcolor) {
      const tradius = tsize * 0.1;
      const t1size = tsize / 2, t1radius = tradius * 0.7;

      const tmaterial = new MeshLambertMaterial({ color: tcolor, flatShading: true });
      const bmaterial = new MeshLambertMaterial({ color: tcolor, flatShading: true });

      const tree = new Object3D();

      // trunk
      const tgeometry = new CylinderGeometry(tradius * 7, tradius, tsize, 5, 3, true);
      tgeometry.translate(0, tsize / 2, 0);
      tgeometry.rotateX(-PI / 2);
      rdnGeo(tgeometry. tradius * 0.2);
      const tmesh = new Mesh(tgeometry, tmaterial);
      tree.add(tmesh);

      // body
      const bgeometry = new SphereGeometry(bsize, 4, 4);
      bgeometry.translate(0, tsize + bsize * 0.7, 0);
      bgeometry.rotateX(-PI / 2);
      rdnGeo(bgeometry. bsize * 0.2);
      const bmesh = new Mesh(bgeometry, bmaterial);
      tree.add(tmesh);

      if (random() > 0.5) {
        // trunk 1

      }
    }


 }
