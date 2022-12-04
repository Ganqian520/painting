
const script = document.createElement('script')
const config = [{
        key: 'triangle',
        id: 0,
    },{
        key: 'instance',
        id: 1,
    },{
        key: 'frameBuffer',
        id: 2,
    },{
        key: 'wave',
        id: 3,
    },{
        key: 'gaussian-blur',
        id: 4,
    },{
        key: 'vao',
        id: 5,
    },{
        key: 'bloom',
        id: 6,
    }
]
const key = config.find(v => v.id === 0).key
let src = `./src/learn-webgl/${key}.ts`
window.location.hash ='/'+ key
src = './src/demos/firework/index.ts'
// src = './src/demos/musicDance/index.ts'

script.src = src
script.type = 'module'
document.body.appendChild(script)