import { Scene } from './Scene'
import { Camera } from './Camera'
import { ObjectGPU } from './ObjectGPU'
import { Object3D } from './Object3D'

export class Renderer {

    static device: GPUDevice
    static format: GPUTextureFormat
    static vpMatBuffer: GPUBuffer
    static size: {w:number,h:number}

    canvas: HTMLCanvasElement

    context: GPUCanvasContext
    device: GPUDevice
    renderPassDescriptor: GPURenderPassDescriptor
    format: GPUTextureFormat
    depthView: GPUTextureView
    MSAAView: GPUTextureView
    globalBindGroup: GPUBindGroup

    size: { w: number, h: number }

    objectGPUs: ObjectGPU[] = []

    constructor(params?: {

    }) {
        params ??= {}
        const { } = params

    }

    async init() {
        if (!navigator.gpu)
            throw new Error('Not Support WebGPU')
        const adapter = await navigator.gpu.requestAdapter({
            powerPreference: 'high-performance'
        })
        if (!adapter)
            throw new Error('No Adapter Found')

        this.canvas = document.createElement('canvas')
        this.canvas.width = window.innerWidth
        this.canvas.height = window.innerHeight
        this.canvas.style.display = 'block'
        this.device = await adapter.requestDevice()
        this.context = this.canvas.getContext('webgpu') as GPUCanvasContext
        this.format = navigator.gpu.getPreferredCanvasFormat()
        this.size = { w: this.canvas.width, h: this.canvas.height }
        this.context.configure({
            device: this.device, format: this.format,
            alphaMode: 'opaque'
        })
        this.depthView = this.device.createTexture({
            size: { width: this.size.w, height: this.size.h },
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
            format: 'depth24plus',
            sampleCount: 4,
        }).createView()
        this.MSAAView = this.device.createTexture({
            size: { width: this.size.w, height: this.size.h },
            usage: GPUTextureUsage.RENDER_ATTACHMENT,
            format: this.format,
            sampleCount: 4,
        }).createView()
        Renderer.device = this.device
        Renderer.format = this.format
        Renderer.vpMatBuffer = Renderer.device.createBuffer({
            size: 16 * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })
        Renderer.size = this.size
    }

    render(scene: Scene, camera: Camera) {
        const commandEncoder = this.device.createCommandEncoder()
        const renderPassDescriptor: GPURenderPassDescriptor = {
            colorAttachments: [{
                view: this.MSAAView,
                clearValue: { r: 0, g: 0, b: 0, a: 1 },
                loadOp: 'clear',
                storeOp: 'store',
                resolveTarget: this.context.getCurrentTexture().createView(),
            }],
            depthStencilAttachment: {
                view: this.depthView,
                depthClearValue: 1.0,
                depthLoadOp: 'clear',
                depthStoreOp: 'store'
            }
        }
        const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor)
        
        scene?.control?.update()
        if(camera.isBufferNeedChange) camera.updateVpMat()
        this.updateObjectGPU(scene,passEncoder)

    
        passEncoder.end()
        this.device.queue.submit([commandEncoder.finish()])
    }

    setSize(w: number, h: number) {
        this.size = { w, h }
        this.canvas.width = w
        this.canvas.height = h
    }

    updateObjectGPU(scene: Scene,passEncoder:GPURenderPassEncoder){
        const dfs = (obj:Object3D) => {
            if(obj instanceof ObjectGPU) obj.frameObjecGPU(passEncoder)
            obj.children?.forEach(v => dfs(v))
        }
        dfs(scene)
    }

    // initGlobalBindgroup() {
    //     this.globalBindGroup = this.device.createBindGroup({
    //         layout: 'auto',
    //         entries: bindings,
    //     })
    // }
}