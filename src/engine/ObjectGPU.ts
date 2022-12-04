import { Object3D } from "./Object3D";
import { Renderer } from "./Renderer";
import { cubeModel } from "./model";
import { Mat4, Vec3 } from "./math";
import { Camera } from "./Camera";

export class ObjectGPU extends Object3D {

    isInstance: boolean
    instanceNum: number

    isReady: boolean

    model: {
        data: number[],
        vertexCount: number,
        index?: number[],
        arrayStride: number[],
        isChange?: boolean
    }

    vertexBuffer: GPUBuffer

    indexBuffer: GPUBuffer

    modelsMatBuffer: GPUBuffer

    modelMatBuffer: GPUBuffer

    renderPL: GPURenderPipeline

    topology: GPUPrimitiveTopology

    cullmode: GPUCullMode

    wgsl: {
        value: string,
        vertEntry?: string,
        fragEntry?: string,
    }

    bindGroup: GPUBindGroup

    bindingBuffers: Array<GPUBuffer | GPUSampler | GPUTextureView>

    modelMatsData: number[]

    onRenderCb: Function

    isInstanceBufferNeedChange = false

    constructor(params?: {
        paramsGPU?: {
            instanceNum?: number
            model?: {
                data: number[],
                vertexCount: number,
                arrayStride: number[],
                index?: number[],
                isChange?: boolean
            }
            wgsl?: {
                value: string,
                vertEntry?: string,
                fragEntry?: string,
            },
            topology?: GPUPrimitiveTopology,
            cullmode?: GPUCullMode,
            bindingBuffers?: GPUBuffer[],
            isReady?: boolean,
        },
        paramsTransf?: {
            position?: { x: number, y: number, z: number }
            rotation?: { x: number, y: number, z: number }
            scale?: { x: number, y: number, z: number }
        }
    }) {
        const { paramsTransf, paramsGPU } = params
        super(paramsTransf)
        let { instanceNum, model, wgsl, bindingBuffers, topology,cullmode ,isReady} = paramsGPU || {}
        this.bindingBuffers = bindingBuffers ?? []
        this.wgsl = wgsl 
        this.topology = topology ?? 'triangle-list'
        this.cullmode = cullmode ?? 'back'
        this.instanceNum = instanceNum ?? 1
        this.isInstance = this.instanceNum !== 1
        if(this.isInstance) this.modelMatsData = []
        this.model = model ?? cubeModel
        this.isReady = isReady ?? true
        this.isReady && this.init()
    }

    init() {
        this.initWGSL()
        this.initBuffer()
        this.initRenderPipeLine()
        this.initBindGroup()
    }

    frameObjecGPU(passEncoder: GPURenderPassEncoder) {
        if(!this.isReady) return
        this.onRenderCb && this.onRenderCb()
        if(this.isBufferNeedChange){
            Renderer.device.queue.writeBuffer(this.modelMatBuffer, 0, new Float32Array(this.worldMatrix.elements))
            this.isBufferNeedChange = false
        }
        if(this.isInstanceBufferNeedChange) {
            Renderer.device.queue.writeBuffer(this.modelsMatBuffer, 0, new Float32Array(this.modelMatsData))
            this.isInstanceBufferNeedChange = false
        }
        if(this.model.isChange) {
            Renderer.device.queue.writeBuffer(this.vertexBuffer, 0, new Float32Array(this.model.data))
            this.model.isChange = false
        }
        if(this.model.index) {
            passEncoder.setIndexBuffer(this.indexBuffer,'uint16')
        }
        passEncoder.setPipeline(this.renderPL)
        passEncoder.setVertexBuffer(0, this.vertexBuffer)
        passEncoder.setBindGroup(0, this.bindGroup)
        if (this.model.index) {
            passEncoder.drawIndexed(this.model.index.length, this.instanceNum || 1)
        } else {
            passEncoder.draw(this.model.vertexCount, this.instanceNum || 1)
        }      
    }

    private initRenderPipeLine(params?: {

    }) {
        let arrayStride = this.model.arrayStride.reduce((p,c)=>p+c) * Float32Array.BYTES_PER_ELEMENT

        let lastOffset = 0
        let attributes = this.model.arrayStride.map((v, i) => {
            let obj = {
                shaderLocation: i,
                offset: lastOffset,
                format: 'float32x' + v,
            }
            lastOffset += v*Float32Array.BYTES_PER_ELEMENT
            return obj as GPUVertexAttribute
        })

        this.renderPL = Renderer.device.createRenderPipeline({
            layout: 'auto',
            vertex: {
                module: Renderer.device.createShaderModule({ code: this.wgsl.value }),
                entryPoint: this.wgsl.vertEntry,
                buffers: [{
                    arrayStride,
                    attributes,
                }]
            },
            fragment: {
                module: Renderer.device.createShaderModule({ code: this.wgsl.value }),
                entryPoint: this.wgsl.fragEntry,
                targets: [{ format: Renderer.format }]
            },
            primitive: {
                topology: this.topology,
                cullMode: this.cullmode,
                frontFace: 'ccw'
            },
            depthStencil: {
                depthWriteEnabled: true,
                depthCompare: 'less',
                format: 'depth24plus'
            },
            multisample: {
                count: 4,
            }
        })
    }

    private initWGSL() {

        this.wgsl ??= {
            vertEntry: 'v_main',
            fragEntry: 'f_main',
            value: /* wgsl */`
                @group(0) @binding(0) var<uniform> vpMat: mat4x4<f32>;
                @group(0) @binding(1) ${this.isInstance ? 'var<storage,read> modelMats : array<mat4x4<f32>>' : 'var<uniform> modelMat : mat4x4<f32>'};

                struct Output {
                    @builtin(position) Position : vec4<f32>,
                    @location(0) fragUV : vec2<f32>,
                    @location(1) fragPosition: vec4<f32>,
                }

                @vertex
                fn v_main(
                    @builtin(instance_index) instanceIndex : u32,
                    @builtin(vertex_index) a: u32,
                    @location(0) position : vec4<f32>,
                    @location(1) uv: vec2<f32>
                ) -> Output {
                    var output: Output;
                    output.Position = vpMat * ${this.isInstance ? 'modelMats[instanceIndex]' : 'modelMat'} * position;
                    // output.Position.z = - output.Position.z;
                    output.fragUV = uv;
                    output.fragPosition = 0.5 * (position + vec4<f32>(1.0, 1.0, 1.0, 1.0));
                    return output;
                }

                @fragment
                fn f_main(
                    @location(0) fragUV: vec2<f32>,
                    @location(1) fragPosition: vec4<f32>
                ) -> @location(0) vec4<f32> {
                    return fragPosition;
                    // return vec4<f32>(1,1,1,1);
                }
            `
        }

        this.wgsl.fragEntry ??= 'f_main'
        this.wgsl.vertEntry ??= 'v_main'
    }

    private initBindGroup() {
        const bindings = [{
            binding: 0,
            resource: {
                buffer: Renderer.vpMatBuffer
            }
        } as GPUBindGroupEntry, {
            binding: 1,
            resource: {
                buffer: this.isInstance ? this.modelsMatBuffer : this.modelMatBuffer,
            }
        } as GPUBindGroupEntry]
        this.bindingBuffers?.forEach((buffer, i) => {
            let resource = buffer instanceof GPUBuffer
                ? {
                    buffer: buffer
                }
                : buffer
            bindings.push({
                binding: i + 2,
                resource,
            } as GPUBindGroupEntry)
        })
        this.bindGroup = Renderer.device.createBindGroup({
            layout: this.renderPL.getBindGroupLayout(0),
            entries: bindings,
        })
    }

    private initBuffer() {
        const { device } = Renderer

        this.vertexBuffer = Renderer.device.createBuffer({
            size: this.model.data.length * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        })
        Renderer.device.queue.writeBuffer(this.vertexBuffer, 0, new Float32Array(this.model.data))

        if (this.isInstance) {
            this.modelsMatBuffer = Renderer.device.createBuffer({
                size: this.instanceNum * 16 * Float32Array.BYTES_PER_ELEMENT,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            })
        }

        this.modelMatBuffer = Renderer.device.createBuffer({
            size: 16 * Float32Array.BYTES_PER_ELEMENT,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        })

        if(this.model.index) {
            const index = new Uint16Array(this.model.index)
            this.indexBuffer = Renderer.device.createBuffer({
                size: index.byteLength,
                usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
            })
            device.queue.writeBuffer(this.indexBuffer,0,index)
        }
    }
}