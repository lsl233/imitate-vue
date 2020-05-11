import directives from './directives'
import filters from './filters'

const prefix = 'sd'

// 通过指令名去查找，绑定指令的元素
const selector = Object.keys(directives).map((directiveName) => `[${prefix}-${directiveName}]`).join()

class Seed {
    constructor(opts) {
        const rootEle = document.getElementById(opts.id)
        const eles = rootEle.querySelectorAll(selector)
        const bindings = {}
        this.scope = {}
        /**
         * 处理节点
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

        for (const key in bindings) {
            this.scope[key] = opts.scope[key]
        }

        console.log(this)
    }
}

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

function bindAccessors (seed, key, binding) {
    Object.defineProperty(seed.scope, key, {
        get() {
            return binding.value
        },
        set(value) {
            binding.value = value
            binding.directives.forEach(directive => {
                if (value && directive.filters) {
                    value = applyFilters(value, directive)
                }

                directive.update(directive.el, value)
            })
        }
    })
}

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