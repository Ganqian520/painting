import { Renderer, Scene, Cube, SkyBox, AxesHelper, Fly1Control, OrbitControl, Mat4, Vec3, Camera } from "@/engine";
import { FireWork } from "./Firework1";
import { importImg } from '@/common/util'

let renderer: Renderer, scene: Scene, camera: Camera

renderer = new Renderer()

await renderer.init()

document.body.appendChild(renderer.canvas)

scene = new Scene({

})

camera = new Camera({
    position: { x: 0, y: 2, z: 100 },
    rotation: { x: 0, y: 0, z: 0 },
})


const fireWork = new FireWork({
    meteorNum: 150,
    pos: new Vec3(0, 0, 0)
})
scene.add(fireWork)

// const fireWork2 = new FireWork({
//     meteorNum: 100,
//     pos: new Vec3(10, 100, 0)
// })
// scene.add(fireWork2)
// const a45 = Math.PI/4
// const cube1 = new Cube({ position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 } })
// scene.add(cube1)

// const cube2 = new Cube({ position: { x: 3, y: 0, z: 0 } })
// cube1.add(cube2)

const axesHelper = new AxesHelper()
// scene.add(axesHelper)

// const skyBox = new SkyBox({
//     imgs: importImg(),
//     size: 10000,
// })
// scene.add(skyBox)

// const fly1Control = new Fly1Control(fireWork,renderer.canvas)
// scene.attachControl(fly1Control)
const orbitControl = new OrbitControl(camera, renderer.canvas)
scene.attachControl(orbitControl)
let id: number
let delta = 1 / 50
let debug = !true
let angle = 0
const rotation = { x: 0, y: 0, z: 0 }
async function frame() {

    angle += delta

    // if(rotation.x<Math.PI/4){
    //     rotation.x += delta
    //     cube1.setFromTRS({
    //         rotation,
    //     })
    // } else if (rotation.y < Math.PI / 4){
    //     rotation.y += delta
    //     cube1.setFromTRS({
    //         rotation,
    //     })
    // }

    // cube1.rotateY(delta)
    // cube2.rotateY(2*delta)
    // scene.rotateY(delta)

    // camera.rotateY(delta)
    // skyBox.rotateY(delta)
    // axesHelper.rotateY(delta)
    renderer.render(scene, camera)

    if (debug) {

        await new Promise(r => {
            setTimeout(() => {
                r(0)
            }, 3000)
        })
    }

    id = window.requestAnimationFrame(frame)
}

try {
    frame()
    // renderer.render(scene, camera)
    // console.log(cube1);
    // console.log(scene.children);
} catch (err) {
    console.log(err);
    window.cancelAnimationFrame(id)
}
