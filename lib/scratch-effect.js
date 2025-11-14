/**
 * 刮刮乐效果实现库
 */

/**
 * 创建基础刮刮乐DOM结构
 * @param {Blob} imageBlob 图片Blob
 * @param {HTMLElement} imgContainer 图片容器元素
 * @returns {Object} 包含container、img、canvas、hint的对象
 */
function createScratchDOM(imageBlob, imgContainer) {
    // 清空图片容器
    imgContainer.innerHTML = ''

    // 清除 DOM 缓存，防止缓存指向已移除的元素导致后续重建失败
    if (typeof DOM_CACHE !== 'undefined' && DOM_CACHE.clear) {
        DOM_CACHE.clear('display-img')
        DOM_CACHE.clear('empty-state')
        DOM_CACHE.clear('processing-state')
    }

    // 创建刮刮乐容器
    const scratchContainer = document.createElement('div')
    scratchContainer.className = 'scratch-container'

    // 创建图片元素
    const scratchImg = document.createElement('img')
    scratchImg.className = 'scratch-image'
    scratchImg.src = URL.createObjectURL(imageBlob)

    // 创建画布（遮罩层）
    const canvas = document.createElement('canvas')
    canvas.className = 'scratch-canvas'

    // 组装元素
    scratchContainer.appendChild(scratchImg)
    scratchContainer.appendChild(canvas)
    imgContainer.appendChild(scratchContainer)
    imgContainer.classList.add('has-image')

    return { container: scratchContainer, img: scratchImg, canvas, imgContainer }
}

/**
 * 绑定通用的鼠标和触摸事件
 * @param {HTMLCanvasElement} canvas 画布元素
 * @param {Function} onStart 开始刮擦时的回调
 * @param {Function} onMove 刮擦移动时的回调
 * @param {Function} onEnd 结束刮擦时的回调
 */
function bindScratchEvents(canvas, onStart, onMove, onEnd) {
    let isDrawing = false
    let lastX = 0
    let lastY = 0

    const handleStart = (x, y) => {
        isDrawing = true
        lastX = x
        lastY = y
        onStart(x, y)
    }

    const handleMove = (x, y) => {
        if (!isDrawing) return
        onMove(lastX, lastY, x, y)
        lastX = x
        lastY = y
    }

    const handleEnd = () => {
        isDrawing = false
        if (onEnd) onEnd()
    }

    // 鼠标事件
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect()
        handleStart(e.clientX - rect.left, e.clientY - rect.top)
    })

    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect()
        handleMove(e.clientX - rect.left, e.clientY - rect.top)
    })

    // 只在鼠标释放时停止，而不是在离开时
    document.addEventListener('mouseup', handleEnd)
    
    // 移除 mouseleave 事件，这样离开容器不会停止

    // 触摸事件支持
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault()
        const rect = canvas.getBoundingClientRect()
        const touch = e.touches[0]
        handleStart(touch.clientX - rect.left, touch.clientY - rect.top)
    })

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault()
        const rect = canvas.getBoundingClientRect()
        const touch = e.touches[0]
        handleMove(touch.clientX - rect.left, touch.clientY - rect.top)
    })

    // 只在触摸结束时停止
    document.addEventListener('touchend', handleEnd)
}

/**
 * 初始化画布通用设置
 * @param {HTMLCanvasElement} canvas 画布元素
 * @param {HTMLImageElement} img 图片元素
 * @returns {CanvasRenderingContext2D} 画布上下文
 */
function initializeCanvasContext(canvas, img) {
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    canvas.style.width = img.offsetWidth + 'px'
    canvas.style.height = img.offsetHeight + 'px'
    return canvas.getContext('2d')
}

/**
 * 绘制提示文字到画布
 * @param {CanvasRenderingContext2D} ctx 画布上下文
 * @param {HTMLCanvasElement} canvas 画布元素
 * @param {string} text 提示文字
 * @param {number} alpha 透明度 (0-1)
 */
function drawCanvasText(ctx, canvas, text, alpha) {
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`
    ctx.font = `bold ${canvas.width / 15}px Arial`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, canvas.width / 2, canvas.height / 2)
}

/**
 * 自动清除遮罩（达到阈值时）
 * @param {HTMLCanvasElement} canvas 画布元素
 * @param {number} threshold 阈值百分比（0-100）
 * @param {Function} shouldRemove 是否应该移除的条件函数
 */
function autoRemoveOverlay(canvas, threshold, shouldRemove) {
    if (shouldRemove && shouldRemove()) {
        canvas.style.transition = 'opacity 0.5s ease'
        canvas.style.opacity = '0'
        setTimeout(() => {
            canvas.remove()
            setScratchingStatus(false) // 完成刮刮乐
        }, 500)
    }
}

/**
 * 创建标准刮刮乐效果（完全不透明的银色遮罩）
 * @param {Blob} imageBlob 图片Blob
 * @param {HTMLElement} imgContainer 图片容器元素
 * @returns {void}
 */
function createScratchEffect(imageBlob, imgContainer) {
    const { img: scratchImg, canvas } = createScratchDOM(imageBlob, imgContainer)

    // 等待图片加载完成后初始化画布
    scratchImg.onload = () => {
        const ctx = initializeCanvasContext(canvas, scratchImg)

        // 绘制遮罩层 - 银色刮刮乐效果
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
        gradient.addColorStop(0, '#c0c0c0')
        gradient.addColorStop(0.5, '#e0e0e0')
        gradient.addColorStop(1, '#a8a8a8')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // 添加纹理效果
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
        for (let i = 0; i < canvas.height; i += 4) {
            ctx.fillRect(0, i, canvas.width, 2)
        }

        // 添加文字提示在遮罩上
        drawCanvasText(ctx, canvas, '刮开查看', 0.3)

        ctx.globalCompositeOperation = 'destination-out'

        // 计算刮开百分比
        function calculateScratchPercentage() {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            let transparent = 0
            for (let i = 3; i < imageData.data.length; i += 4) {
                if (imageData.data[i] === 0) transparent++
            }
            return (transparent / (canvas.width * canvas.height)) * 100
        }

        // 绘制刮痕
        function scratch(x, y) {
            const scale = canvas.width / canvas.offsetWidth
            const scaledX = x * scale
            const scaledY = y * scale

            ctx.beginPath()
            ctx.arc(scaledX, scaledY, 30, 0, Math.PI * 2)
            ctx.fill()

            autoRemoveOverlay(canvas, 50, () => calculateScratchPercentage() > 50)
        }

        // 绘制刮痕线段
        function scratchLine(x1, y1, x2, y2) {
            const scale = canvas.width / canvas.offsetWidth
            ctx.beginPath()
            ctx.lineWidth = 60
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'
            ctx.moveTo(x1 * scale, y1 * scale)
            ctx.lineTo(x2 * scale, y2 * scale)
            ctx.stroke()

            autoRemoveOverlay(canvas, 50, () => calculateScratchPercentage() > 50)
        }

        // 绑定事件
        bindScratchEvents(canvas, 
            (x, y) => {
                setScratchingStatus(true) // 开始刮刮乐
                scratch(x, y)
            },
            (x1, y1, x2, y2) => scratchLine(x1, y1, x2, y2),
            null
        )
    }
}

/**
 * 创建半透明刮刮乐效果（磨砂玻璃效果）
 * @param {Blob} imageBlob 图片Blob
 * @param {HTMLElement} imgContainer 图片容器元素
 * @returns {void}
 */
function createTransparentScratchEffect(imageBlob, imgContainer) {
    const { img: scratchImg, canvas } = createScratchDOM(imageBlob, imgContainer)

    // 等待图片加载完成后初始化画布
    scratchImg.onload = () => {
        const ctx = initializeCanvasContext(canvas, scratchImg)

        // 绘制半透明遮罩层 - 磨砂玻璃效果
        const gradient = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 2
        )
        gradient.addColorStop(0, 'rgba(200, 200, 200, 0.95)')
        gradient.addColorStop(0.5, 'rgba(180, 180, 180, 0.90)')
        gradient.addColorStop(1, 'rgba(160, 160, 160, 0.85)')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // 添加磨砂效果
        for (let i = 0; i < canvas.height; i += 3) {
            const alpha = 0.1 + Math.random() * 0.1
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
            ctx.fillRect(0, i, canvas.width, 2)
        }

        // 添加文字提示
        drawCanvasText(ctx, canvas, '刮开查看', 0.4)

        ctx.globalCompositeOperation = 'destination-out'

        let scratchedPixels = 0
        const totalPixels = canvas.width * canvas.height

        // 计算透明度百分比
        function calculateTransparency() {
            return (scratchedPixels / totalPixels) * 100
        }

        // 更新遮罩透明度
        function updateCanvasOpacity() {
            const transparency = calculateTransparency()
            const opacity = Math.max(0, 1 - (transparency / 50))
            canvas.style.opacity = opacity.toString()

            autoRemoveOverlay(canvas, 50, () => transparency > 50)
        }

        // 绘制刮痕并计算刮开的像素
        function scratch(x, y) {
            const scale = canvas.width / canvas.offsetWidth
            const scaledX = x * scale
            const scaledY = y * scale
            const radius = 30

            ctx.beginPath()
            ctx.arc(scaledX, scaledY, radius, 0, Math.PI * 2)
            ctx.fill()

            scratchedPixels += Math.PI * radius * radius
            updateCanvasOpacity()
        }

        // 绘制刮痕线段
        function scratchLine(x1, y1, x2, y2) {
            const scale = canvas.width / canvas.offsetWidth
            const lineWidth = 60

            ctx.beginPath()
            ctx.lineWidth = lineWidth
            ctx.lineCap = 'round'
            ctx.lineJoin = 'round'
            ctx.moveTo(x1 * scale, y1 * scale)
            ctx.lineTo(x2 * scale, y2 * scale)
            ctx.stroke()

            const distance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2) * scale
            scratchedPixels += distance * lineWidth
            updateCanvasOpacity()
        }

        // 绑定事件
        bindScratchEvents(canvas,
            (x, y) => {
                setScratchingStatus(true) // 开始刮刮乐
                scratch(x, y)
            },
            (x1, y1, x2, y2) => scratchLine(x1, y1, x2, y2),
            null
        )
    }
}
