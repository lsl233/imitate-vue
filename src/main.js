import directives from './directives'
import filters from './filters'

const prefix = 'sd'

// 通过指令名去查找，绑定指令的元素
const selector = Object.keys(directives).map((directiveName) => `[${prefix}-${directiveName}]`).join()

class Seed {
    constructor(opts) {
        // 根元素
        const rootEle = document.getElementById(opts.id)
        // 获取所有自定义属性的元素`sd-text="msg"`, `sd-show="show"`
        const eles = rootEle.querySelectorAll(selector)
        const bindings = {}
        this.scope = {}

        /**
         * 处理节点
         * 1. 克隆元素属性
         * 2. 解析指令
         * 3. 绑定指令
         */
        const processNode = (el) => {
            cloneAttributes(el.attributes).forEach((attr) => {
                const directive = parseDirective(attr)
                if (directive) {
                    bindDirective(this, el, bindings, directive)
                }
            })
        };

        [].forEach.call(eles, processNode)
        processNode(rootEle)

        // 指令存入 scope
        for (const key in bindings) {
            this.scope[key] = opts.scope[key]
        }
    }
}


/**
 * 克隆DOM属性并转换为数组
 * @param {*} attributes 
 */
function cloneAttributes(attributes) {
    return [].map.call(attributes, (attr) => {
        const { name, value } = attr
        return { name, value }
    })
}

/**
 * 解析转换指令
 * @param {*} attr 
 */
function parseDirective(attr) {
    // 验证是否自定义属性
    if (attr.name.indexOf(prefix) === -1) return null

    // 移除`sd`前缀
    const noPrefix = attr.name.slice(prefix.length + 1)
    const argIndex = noPrefix.indexOf('-')

    const dirname = argIndex === -1 ? noPrefix : noPrefix.slice(0, argIndex)
    const def = directives[dirname]
    const arg = argIndex === -1 ? null : noPrefix.slice(argIndex + 1)

    const exp = attr.value
    const pipeIndex = exp.indexOf('|')
    const key = pipeIndex === -1 ? exp.trim() : exp.slice(0, pipeIndex).trim()
    const filters = pipeIndex === -1 ? null : exp.slice(pipeIndex + 1).split('|').map(filter => filter.trim())
    
    const directive = {
        attr,
        key,
        filters,
        definition: def,
        argument: arg,
        update: typeof def === 'function' ? def : def.update
    }

    return def ? directive : null
}


/**
 * 绑定指令
 * @param {*} seed 
 * @param {*} el 
 * @param {*} bindings 
 * @param {*} directive 
 */
function bindDirective (seed, el, bindings, directive) {
    // 删除自定义属性
    el.removeAttribute(directive.attr.name)

    const key = directive.key
    let binding = bindings[key]

    if (!binding) {
        bindings[key] = binding = {
            value: void 0,
            directives: []
        }
    }

    directive.el = el
    binding.directives.push(directive)

    if (directive.bind) {
        directive.bind(el, bindings.value)
    }

    if (!seed.scope.hasOwnProperty(key)) {
        bindAccessors(seed, key, binding)
    }
}

/**
 * 绑定 存取器，getter setter
 * @param {*} seed 
 * @param {*} key 
 * @param {*} binding 
 */
function bindAccessors (seed, key, binding) {
    Object.defineProperty(seed.scope, key, {
        get() {
            return binding.value
        },
        set(value) {
            binding.value = value
            binding.directives.forEach(directive => {
                // 处理filter
                if (value && directive.filters) {
                    value = applyFilters(value, directive)
                }
                
                // 更新DOM
                directive.update(directive.el, value)
            })
        }
    })
}

// 加载fitler
function applyFilters (value, directive) {
    if (directive.definition.customFilter) {
        return directive.definition.customFilter(value, directive.filters)
    }

    directive.filters.forEach((filter) => {
        if (filters[filter]) {
            value = filters[filter](value)
        }
    })
    return value
}


export default {
    create: (opts) => new Seed(opts)
}