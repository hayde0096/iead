/**
 * UI事件处理库
 */

/**
 * 初始化所有UI事件处理器
 * @param {HTMLElement} ipt 文件输入元素
 * @param {HTMLElement} imgContainer 图片容器
 * @param {HTMLElement} btnEnc 加密按钮
 * @param {HTMLElement} btnDec 解密按钮
 * @param {HTMLElement} btnRestore 还原按钮
 * @param {HTMLElement} btnPaste 粘贴按钮
 */
function initializeUIHandlers(ipt, imgContainer, btnEnc, btnDec, btnRestore, btnPaste) {
    // 文件输入变化事件
    initFileInputHandler(ipt, imgContainer)
    
    // 容器点击打开文件选择
    initContainerClickHandler(ipt, imgContainer)
    
    // 加密按钮点击事件
    initEncryptButtonHandler(btnEnc, imgContainer)
    
    // 解密按钮点击事件
    initDecryptButtonHandler(btnDec, imgContainer)
    
    // 还原按钮点击事件
    initRestoreButtonHandler(btnRestore, ipt, imgContainer)
    
    // 粘贴按钮点击事件
    initPasteButtonHandler(btnPaste)
    
    // 全局键盘事件
    initKeyboardHandler()
    
    // 页面粘贴事件
    initPagePasteHandler(imgContainer)
    
    // 拖拽上传功能
    initDragDropHandler(imgContainer)
    
    // 单选按钮点击优化
    initRadioOptionsHandler()
}

/**
 * 初始化文件输入处理器
 */
function initFileInputHandler(ipt, imgContainer) {
    ipt.onchange = () => {
        if(ipt.files.length > 0){
            const file = ipt.files[0]
            const elements = rebuildImageDOM(imgContainer)
            setSrc(URL.createObjectURL(file), imgContainer, elements.img, elements.emptyState, elements.processingState, false, true, file)
        }
    }
}

/**
 * 初始化容器点击事件 - 点击容器打开文件选择
 */
function initContainerClickHandler(ipt, imgContainer) {
    imgContainer.addEventListener('click', (e) => {
        // 如果正在进行刮刮乐效果，阻止点击打开文件选择
        if (isScratchingActive()) {
            return
        }
        // 点击容器时打开文件选择
        ipt.click()
    })
}

/**
 * 通用处理函数 - 处理加密/解密等需要"显示处理状态"的操作
 * @param {Function} handleFunction 处理函数（encryptAndDisplay 或 decryptAndDisplay）
 * @param {HTMLElement} imgContainer 图片容器
 */
function createImageOperationHandler(handleFunction, imgContainer) {
    return () => {
        const currentImg = getElement("display-img")
        if(currentImg && currentImg.src){
            const processingState = getElement("processing-state")
            const emptyState = getElement("empty-state")
            showProcessing(processingState, currentImg, emptyState, imgContainer)
            requestAnimationFrame(() => {
                handleFunction(currentImg, imgContainer)
            })
        }
    }
}

/**
 * 初始化加密按钮处理器
 */
function initEncryptButtonHandler(btnEnc, imgContainer) {
    btnEnc.onclick = createImageOperationHandler(encryptAndDisplay, imgContainer)
}

/**
 * 初始化解密按钮处理器
 */
function initDecryptButtonHandler(btnDec, imgContainer) {
    btnDec.onclick = createImageOperationHandler(decryptAndDisplay, imgContainer)
}

/**
 * 初始化还原按钮处理器
 */
function initRestoreButtonHandler(btnRestore, ipt, imgContainer) {
    btnRestore.onclick = () => {
        if(ipt.files.length > 0){
            const file = ipt.files[0]
            const elements = rebuildImageDOM(imgContainer)
            setSrc(URL.createObjectURL(file), imgContainer, elements.img, elements.emptyState, elements.processingState, false, true, file)
        }
    }
}

/**
 * 初始化粘贴按钮处理器
 */
function initPasteButtonHandler(btnPaste) {
    btnPaste.onclick = () => {
        pasteFromClipboard()
    }
}

/**
 * 从剪切板粘贴图片
 */
async function pasteFromClipboard() {
    try {
        const clipboardItems = await navigator.clipboard.read()
        for (const item of clipboardItems) {
            for (const type of item.types) {
                if (type.startsWith('image/')) {
                    const blob = await item.getType(type)
                    const imgContainer = getImageContainer()
                    const elements = rebuildImageDOM(imgContainer)
                    setSrc(URL.createObjectURL(blob), imgContainer, elements.img, elements.emptyState, elements.processingState, false, true, blob)
                    return true
                }
            }
        }
        alert('剪切板中没有图片')
        return false
    } catch (err) {
        console.error('读取剪切板失败:', err)
        alert('无法读取剪切板，请确保已授予权限')
        return false
    }
}

/**
 * 初始化全局键盘事件处理器
 */
function initKeyboardHandler() {
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
            // 如果焦点不在输入框中，才拦截粘贴事件
            if (document.activeElement.tagName !== 'INPUT' &&
                document.activeElement.tagName !== 'TEXTAREA') {
                e.preventDefault()
                pasteFromClipboard()
            }
        }
    })
}

/**
 * 初始化页面粘贴事件处理器
 */
function initPagePasteHandler(imgContainer) {
    document.addEventListener('paste', (e) => {
        const items = e.clipboardData?.items
        if (!items) return

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.startsWith('image/')) {
                e.preventDefault()
                const blob = items[i].getAsFile()
                if (blob) {
                    const elements = rebuildImageDOM(imgContainer)
                    setSrc(URL.createObjectURL(blob), imgContainer, elements.img, elements.emptyState, elements.processingState, false, true, blob)
                }
                break
            }
        }
    })
}

/**
 * 初始化拖拽上传功能
 */
function initDragDropHandler(imgContainer) {
    const dragCounter = { value: 0 }

    // 图片容器拖拽事件 - 只用于视觉反馈
    imgContainer.addEventListener('dragenter', (e) => {
        e.preventDefault()
        dragCounter.value++
        imgContainer.classList.add('drag-over')
    })

    imgContainer.addEventListener('dragover', (e) => {
        e.preventDefault()
    })

    imgContainer.addEventListener('dragleave', (e) => {
        e.preventDefault()
        dragCounter.value--
        if (dragCounter.value === 0) {
            imgContainer.classList.remove('drag-over')
        }
    })

    // 在 document 上处理 drop 事件（允许页面任意位置拖放并替换）
    document.addEventListener('drop', (e) => {
        e.preventDefault()
        e.stopPropagation()
        
        // 重置容器状态
        dragCounter.value = 0
        imgContainer.classList.remove('drag-over')
        imgContainer.style.outline = 'none'

        // 如果存在残留的刮刮乐 DOM（scratch-container），先移除它们
        try {
            const scratchNodes = imgContainer.querySelectorAll('.scratch-container')
            if (scratchNodes && scratchNodes.length > 0) {
                scratchNodes.forEach(n => n.remove())
                // 清理 DOM 缓存，避免缓存指向已移除的元素
                if (typeof DOM_CACHE !== 'undefined' && DOM_CACHE.clear) {
                    DOM_CACHE.clear('display-img')
                    DOM_CACHE.clear('empty-state')
                    DOM_CACHE.clear('processing-state')
                }
            }
        } catch (err) {
            console.warn('清理 scratch-container 时出错:', err)
        }

        const files = e.dataTransfer?.files
        if (!files || files.length === 0) return

        // 查找第一个图片文件并重建容器以确保干净的 DOM
        for (let i = 0; i < files.length; i++) {
            if (files[i].type.startsWith('image/')) {
                const file = files[i]
                const elements = rebuildImageDOM(imgContainer)
                setSrc(URL.createObjectURL(file), imgContainer, elements.img, elements.emptyState, elements.processingState, false, true, file)
                break
            }
        }
    }, true) // 使用捕获阶段，确保优先处理

    // 全局拖进/拖出事件
    let globalDragCounter = 0

    document.addEventListener('dragenter', (e) => {
        e.preventDefault()
        globalDragCounter++
        if (e.dataTransfer?.types.includes('Files')) {
            imgContainer.style.outline = '3px solid #667eea'
        }
    })

    document.addEventListener('dragleave', (e) => {
        e.preventDefault()
        globalDragCounter--
        if (globalDragCounter === 0) {
            imgContainer.style.outline = 'none'
        }
    })
}

/**
 * 初始化单选按钮点击优化
 */
function initRadioOptionsHandler() {
    // 为所有单选按钮选项添加点击事件
    const radioOptions = getRadioOptions('.radio-option')
    
    radioOptions.forEach(option => {
        // 整个选项区域点击处理
        option.addEventListener('click', function(e) {
            // 防止触发两次（当直接点击radio时）
            if (e.target.tagName === 'INPUT' && e.target.type === 'radio') {
                return
            }
            
            const radioInput = this.querySelector('input[type="radio"]')
            if (radioInput) {
                radioInput.checked = true
                // 触发 change 事件以确保其他代码能检测到变化
                radioInput.dispatchEvent(new Event('change', { bubbles: true }))
            }
        })
        
        // 鼠标按下反馈效果
        option.addEventListener('mousedown', function(e) {
            // 避免在已选中时重复显示动画
            if (e.button === 0) { // 左键
                this.style.transform = 'scale(0.98)'
                this.style.transition = 'transform 0.1s ease'
            }
        })
        
        // 鼠标抬起恢复
        option.addEventListener('mouseup', function() {
            this.style.transform = 'scale(1)'
        })
        
        // 鼠标离开恢复
        option.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)'
        })
    })
}
