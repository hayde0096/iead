/**
 * 图片加载和处理核心库
 */

/**
 * 执行处理操作并显示处理状态
 * @param {HTMLImageElement} img 图片元素
 * @param {HTMLElement} imgContainer 图片容器
 * @param {Function} handler 处理函数 (encryptAndDisplay 或 decryptAndDisplay)
 * @param {HTMLElement} processingState 处理状态元素
 * @param {HTMLElement} emptyState 空状态元素
 * @param {boolean} skipAuto 是否跳过自动处理
 * @param {boolean} preserveExif 是否保留EXIF数据
 */
function performImageOperation(img, imgContainer, handler, processingState, emptyState, skipAuto, preserveExif) {
    showProcessing(processingState, img, emptyState, imgContainer)
    requestAnimationFrame(() => {
        handler(img, imgContainer, skipAuto, preserveExif)
    })
}

/**
 * 显示处理状态
 * @param {HTMLElement} processingState 处理状态元素
 * @param {HTMLElement} img 图片元素
 * @param {HTMLElement} emptyState 空状态元素
 * @param {HTMLElement} imgContainer 图片容器
 */
function showProcessing(processingState, img, emptyState, imgContainer) {
    if (img) img.style.display = "none"
    if (emptyState) emptyState.style.display = "none"
    if (processingState) processingState.style.display = "block"
    imgContainer.classList.add("has-image")
}

/**
 * 隐藏处理状态
 * @param {HTMLElement} processingState 处理状态元素
 */
function hideProcessing(processingState) {
    if (processingState) processingState.style.display = "none"
}

/**
 * 获取当前选中的自动处理选项
 * @returns {string} 'none' | 'encrypt' | 'decrypt'
 */
function getAutoAction() {
    return getRadioValue('auto-action') || 'none'
}

/**
 * 获取当前选中的显示模式
 * @returns {string} 'direct' | 'scratch' | 'scratch-transparent'
 */
function getDisplayMode() {
    return getRadioValue('display-mode') || 'direct'
}

/**
 * 重建图片容器的DOM - 通过重用元素优化
 * @param {HTMLElement} imgContainer 图片容器
 * @returns {Object} 返回重建后的元素对象 {img, emptyState, processingState}
 */
function rebuildImageDOM(imgContainer) {
    let img = getElement("display-img")
    let emptyState = getElement("empty-state")
    let processingState = getElement("processing-state")
    
    // 如果元素已存在，重用它们；否则创建新的
    if (!img) {
        img = createElement("img", {id: "display-img"})
        img.style.display = "none"
        imgContainer.appendChild(img)
        DOM_CACHE.set("display-img", img)
    }
    
    if (!emptyState) {
        emptyState = createElement("div", {
            id: "empty-state",
            className: "empty-state",
            html: `拖拽图片到此处 / 点击选择 / 按 Ctrl+V 粘贴<br>
            <small style="opacity: 0.7;">支持拖放、剪切板粘贴、文件选择</small>`
        })
        imgContainer.appendChild(emptyState)
        DOM_CACHE.set("empty-state", emptyState)
    }
    
    if (!processingState) {
        processingState = createElement("div", {
            id: "processing-state",
            className: "processing-state",
            text: "正在处理图片"
        })
        imgContainer.appendChild(processingState)
        DOM_CACHE.set("processing-state", processingState)
    }
    
    // 重置显示状态
    img.src = ""
    hideElement(img)
    showElement(emptyState)
    hideElement(processingState)
    
    return { img, emptyState, processingState }
}

/**
 * 设置图片源并处理元数据
 * @param {string} src 图片数据URL或Blob URL
 * @param {HTMLElement} imgContainer 图片容器
 * @param {HTMLElement} img 图片元素
 * @param {HTMLElement} emptyState 空状态元素
 * @param {HTMLElement} processingState 处理状态元素
 * @param {boolean} skipAuto 是否跳过自动处理
 * @param {boolean} preserveExif 是否保留EXIF数据
 * @param {Blob} sourceBlob 源Blob对象
 * @returns {Promise<void>}
 */
async function setSrc(src, imgContainer, img, emptyState, processingState, skipAuto = false, preserveExif = true, sourceBlob = null) {
    // 重置元数据
    resetMetadata()
    
    // 先检查并重建DOM（如果需要）
    if (!document.getElementById('display-img')) {
        const elements = rebuildImageDOM(imgContainer)
        img = elements.img
        emptyState = elements.emptyState
        processingState = elements.processingState
    } else {
        // 即使 DOM 存在，也要确保获取最新的引用
        img = getElement('display-img') || img
        emptyState = getElement('empty-state') || emptyState
        processingState = getElement('processing-state') || processingState
    }

    // 清除旧的资源
    if (img && img.src && img.src.startsWith('blob:')) {
        URL.revokeObjectURL(img.src)
    }

    // 清除之前的 onload 事件
    if (img) img.onload = null

    console.log('setSrc 被调用:', {src: src.substring(0, 50), skipAuto, preserveExif, hasBlob: !!sourceBlob})

    // 提取元数据（只在首次加载时）
    if (preserveExif && !skipAuto && sourceBlob) {
        console.log('开始提取元数据...')
        // 先提取 PNG 元数据
        setOriginalPngMetadata(await extractPngMetadata(sourceBlob))

        // 设置 onload 事件（必须在设置 src 之前）
        img.onload = async () => {
            console.log('图片加载完成, 开始提取EXIF...')
            console.log('img 元素信息:', {
                width: img.width,
                height: img.height,
                display: img.style.display,
                src: img.src.substring(0, 50)
            })
            try {
                // 提取 EXIF 数据
                setOriginalExifData(await extractExifData(img))

                // 立即清除 onload，防止后续重复触发
                img.onload = null

                // 根据设置自动处理图片
                const autoAction = getAutoAction()
                console.log('自动处理选项:', autoAction)
                if (autoAction === 'encrypt') {
                    performImageOperation(img, imgContainer, encryptAndDisplay, processingState, emptyState, skipAuto, preserveExif)
                } else if (autoAction === 'decrypt') {
                    performImageOperation(img, imgContainer, decryptAndDisplay, processingState, emptyState, skipAuto, preserveExif)
                } else {
                    console.log('不进行自动处理,确保图片可见')
                    // 确保所有元素状态正确
                    const currentImg = getElement("display-img")
                    const currentEmpty = getElement("empty-state")
                    const currentProcessing = getElement("processing-state")

                    if(currentImg) {
                        currentImg.style.display = "block"
                        console.log('已设置 img display 为 block')
                    }
                    if(currentEmpty) {
                        currentEmpty.style.display = "none"
                        console.log('已隐藏 empty state')
                    }
                    if(currentProcessing) {
                        currentProcessing.style.display = "none"
                        console.log('已隐藏 processing state')
                    }
                    imgContainer.classList.add('has-image')
                    console.log('已添加 has-image class')
                }
            } catch (error) {
                console.error('图片处理出错:', error)
                hideProcessing(processingState)
                alert('处理图片时出错: ' + error.message)
            }
        }

        // 设置 onerror 事件用于调试
        img.onerror = (e) => {
            console.error('图片加载失败:', e)
        }

        // 设置 src 触发加载（必须在 onload 之后）
        img.src = src
        img.style.display = "block"
        emptyState.style.display = "none"
        processingState.style.display = "none"
    } else if (!skipAuto) {
        console.log('不提取元数据,检查自动处理...')
        // 根据设置自动处理图片（不提取元数据）
        const autoAction = getAutoAction()
        console.log('自动处理选项:', autoAction)
        if (autoAction === 'encrypt') {
            img.onload = () => {
                img.onload = null
                showProcessing(processingState, img, emptyState, imgContainer)
                requestAnimationFrame(() => {
                    encryptAndDisplay(img, imgContainer, skipAuto, preserveExif)
                })
            }
        } else if (autoAction === 'decrypt') {
            img.onload = () => {
                img.onload = null
                showProcessing(processingState, img, emptyState, imgContainer)
                requestAnimationFrame(() => {
                    decryptAndDisplay(img, imgContainer, skipAuto, preserveExif)
                })
            }
        }

        // 设置 src 触发加载
        img.src = src
        img.style.display = "block"
        emptyState.style.display = "none"
        processingState.style.display = "none"
    } else {
        // skipAuto = true，直接显示
        console.log('skipAuto=true, 直接显示图片')
        img.src = src
        img.style.display = "block"
        emptyState.style.display = "none"
        processingState.style.display = "none"
        imgContainer.classList.add("has-image")
    }
}

/**
 * 加密图片并显示结果
 * @param {HTMLImageElement} img 图片元素
 * @param {HTMLElement} imgContainer 图片容器
 * @param {boolean} skipAuto 是否跳过自动处理
 * @param {boolean} preserveExif 是否保留EXIF数据
 * @returns {Promise<void>}
 */
async function encryptAndDisplay(img, imgContainer, skipAuto = true, preserveExif = false) {
    const canvas = await encryptImage(img)

    // 根据原始格式输出
    if (getOriginalImageFormat() === 'png') {
        // 输出 PNG 并注入元数据
        canvas.toBlob(async (blob) => {
            // 注入 PNG 元数据
            const blobWithMetadata = await injectPngMetadata(blob, getOriginalPngMetadata())
            const elements = rebuildImageDOM(imgContainer)
            setSrc(URL.createObjectURL(blobWithMetadata), imgContainer, elements.img, elements.emptyState, elements.processingState, true, false)
        }, 'image/png')
    } else {
        // 输出 JPEG 并注入 EXIF
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
        const dataUrlWithExif = injectExifToDataUrl(dataUrl, getOriginalExifData())
        fetch(dataUrlWithExif)
            .then(res => res.blob())
            .then(blob => {
                const elements = rebuildImageDOM(imgContainer)
                setSrc(URL.createObjectURL(blob), imgContainer, elements.img, elements.emptyState, elements.processingState, true, false)
            })
    }
}

/**
 * 解密图片并显示结果
 * @param {HTMLImageElement} img 图片元素
 * @param {HTMLElement} imgContainer 图片容器
 * @param {boolean} skipAuto 是否跳过自动处理
 * @param {boolean} preserveExif 是否保留EXIF数据
 * @returns {Promise<void>}
 */
async function decryptAndDisplay(img, imgContainer, skipAuto = true, preserveExif = false) {
    const canvas = await decryptImage(img)
    const displayMode = getDisplayMode()

    // 获取处理状态元素用于隐藏
    const processingState = document.getElementById("processing-state")

    // 根据原始格式输出
    if (getOriginalImageFormat() === 'png') {
        // 输出 PNG 并注入元数据
        canvas.toBlob(async (blob) => {
            // 注入 PNG 元数据
            const blobWithMetadata = await injectPngMetadata(blob, getOriginalPngMetadata())

            // 根据显示模式选择显示方式
            if (displayMode === 'scratch') {
                createScratchEffect(blobWithMetadata, imgContainer)
            } else if (displayMode === 'scratch-transparent') {
                createTransparentScratchEffect(blobWithMetadata, imgContainer)
            } else {
                const elements = rebuildImageDOM(imgContainer)
                setSrc(URL.createObjectURL(blobWithMetadata), imgContainer, elements.img, elements.emptyState, elements.processingState, true, false)
            }
            hideProcessing(processingState)
        }, 'image/png')
    } else {
        // 输出 JPEG 并注入 EXIF
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
        const dataUrlWithExif = injectExifToDataUrl(dataUrl, getOriginalExifData())
        fetch(dataUrlWithExif)
            .then(res => res.blob())
            .then(blob => {
                // 根据显示模式选择显示方式
                if (displayMode === 'scratch') {
                    createScratchEffect(blob, imgContainer)
                } else if (displayMode === 'scratch-transparent') {
                    createTransparentScratchEffect(blob, imgContainer)
                } else {
                    const elements = rebuildImageDOM(imgContainer)
                    setSrc(URL.createObjectURL(blob), imgContainer, elements.img, elements.emptyState, elements.processingState, true, false)
                }
                hideProcessing(processingState)
            })
    }
}
