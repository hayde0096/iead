/**
 * DOM 工具库 - 提取公共 DOM 操作函数
 */

// 全局状态标志
let isScratchingEffect = false

/**
 * 设置刮刮乐状态
 * @param {boolean} status 是否正在进行刮刮乐
 */
function setScratchingStatus(status) {
    isScratchingEffect = status
}

/**
 * 获取刮刮乐状态
 * @returns {boolean}
 */
function isScratchingActive() {
    return isScratchingEffect
}

/**
 * DOM 缓存系统 - 避免重复查询
 */
const DOM_CACHE = {
    elements: {},
    get(id) {
        if (!this.elements[id]) {
            this.elements[id] = document.getElementById(id)
        }
        return this.elements[id]
    },
    set(id, element) {
        this.elements[id] = element
    },
    clear(id) {
        delete this.elements[id]
    },
    clearAll() {
        this.elements = {}
    }
}

/**
 * 获取或创建 ID 为 id 的元素
 * @param {string} id 元素 ID
 * @returns {HTMLElement|null}
 */
function getElement(id) {
    return DOM_CACHE.get(id)
}

/**
 * 显示元素
 * @param {HTMLElement|string} element 元素或元素 ID
 * @param {string} display 显示方式，默认 'block'
 */
function showElement(element, display = 'block') {
    const el = typeof element === 'string' ? getElement(element) : element
    if (el) {
        el.style.display = display
    }
}

/**
 * 隐藏元素
 * @param {HTMLElement|string} element 元素或元素 ID
 */
function hideElement(element) {
    const el = typeof element === 'string' ? getElement(element) : element
    if (el) {
        el.style.display = 'none'
    }
}

/**
 * 切换元素显示/隐藏
 * @param {HTMLElement|string} element 元素或元素 ID
 * @param {boolean} show 是否显示
 */
function toggleElement(element, show) {
    if (show) {
        showElement(element)
    } else {
        hideElement(element)
    }
}

/**
 * 添加样式类
 * @param {HTMLElement|string} element 元素或元素 ID
 * @param {string} className 样式类名
 */
function addClass(element, className) {
    const el = typeof element === 'string' ? getElement(element) : element
    if (el) {
        el.classList.add(className)
    }
}

/**
 * 移除样式类
 * @param {HTMLElement|string} element 元素或元素 ID
 * @param {string} className 样式类名
 */
function removeClass(element, className) {
    const el = typeof element === 'string' ? getElement(element) : element
    if (el) {
        el.classList.remove(className)
    }
}

/**
 * 获取选中的单选按钮值
 * @param {string} name 单选按钮 name 属性
 * @returns {string|null}
 */
function getRadioValue(name) {
    const selected = document.querySelector(`input[name="${name}"]:checked`)
    return selected ? selected.value : null
}

/**
 * 获取所有单选选项元素
 * @param {string} selector CSS 选择器
 * @returns {NodeList}
 */
function getRadioOptions(selector = '.radio-option') {
    return document.querySelectorAll(selector)
}

/**
 * 获取所有指定 ID 的核心图片容器元素
 * @returns {Object} {img, emptyState, processingState}
 */
function getImageElements() {
    return {
        img: getElement('display-img'),
        emptyState: getElement('empty-state'),
        processingState: getElement('processing-state')
    }
}

/**
 * 获取图片容器
 * @returns {HTMLElement|null}
 */
function getImageContainer() {
    return getElement('img-container')
}

/**
 * 设置文本内容
 * @param {HTMLElement|string} element 元素或元素 ID
 * @param {string} text 文本内容
 */
function setText(element, text) {
    const el = typeof element === 'string' ? getElement(element) : element
    if (el) {
        el.textContent = text
    }
}

/**
 * 获取文本内容
 * @param {HTMLElement|string} element 元素或元素 ID
 * @returns {string}
 */
function getText(element) {
    const el = typeof element === 'string' ? getElement(element) : element
    return el ? el.textContent : ''
}

/**
 * 设置样式属性
 * @param {HTMLElement|string} element 元素或元素 ID
 * @param {string} property 样式属性
 * @param {string} value 样式值
 */
function setStyle(element, property, value) {
    const el = typeof element === 'string' ? getElement(element) : element
    if (el) {
        el.style[property] = value
    }
}

/**
 * 创建新元素
 * @param {string} tag 标签名
 * @param {Object} options 选项 {id, className, text, html}
 * @returns {HTMLElement}
 */
function createElement(tag, options = {}) {
    const element = document.createElement(tag)
    if (options.id) element.id = options.id
    if (options.className) element.className = options.className
    if (options.text) element.textContent = options.text
    if (options.html) element.innerHTML = options.html
    return element
}

/**
 * 清空元素内容（保留子元素节点）
 * @param {HTMLElement|string} element 元素或元素 ID
 */
function clearContent(element) {
    const el = typeof element === 'string' ? getElement(element) : element
    if (el) {
        while (el.firstChild) {
            el.removeChild(el.firstChild)
        }
    }
}
