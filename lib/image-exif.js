/**
 * 图片EXIF和PNG元数据处理库
 */

// 存储原始图片的 EXIF 数据和 PNG 元数据
let originalExifData = null
let originalPngMetadata = null
let originalImageFormat = 'jpeg' // 记录原始图片格式

/**
 * 从 Blob/File 中提取 PNG 元数据（tEXt chunks）
 * @param {Blob} blob PNG文件Blob
 * @returns {Promise<Object|null>} PNG元数据对象或null
 */
async function extractPngMetadata(blob) {
    try {
        const arrayBuffer = await blob.arrayBuffer()
        const bytes = new Uint8Array(arrayBuffer)

        // 检查 PNG 文件签名
        if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4E || bytes[3] !== 0x47) {
            console.log('不是 PNG 格式，跳过 PNG 元数据提取')
            originalImageFormat = 'jpeg'
            return null
        }

        originalImageFormat = 'png'
        const metadata = {}
        let offset = 8 // 跳过 PNG 签名

        while (offset < bytes.length) {
            // 读取块长度
            const length = (bytes[offset] << 24) | (bytes[offset + 1] << 16) |
                          (bytes[offset + 2] << 8) | bytes[offset + 3]
            offset += 4

            // 读取块类型
            const type = String.fromCharCode(bytes[offset], bytes[offset + 1],
                                            bytes[offset + 2], bytes[offset + 3])
            offset += 4

            // 如果是 tEXt 或 iTXt 块，提取数据
            if (type === 'tEXt' || type === 'iTXt') {
                const chunkData = bytes.slice(offset, offset + length)
                let keyword = ''
                let text = ''
                let i = 0

                // 读取关键字（以 null 结尾）
                while (i < chunkData.length && chunkData[i] !== 0) {
                    keyword += String.fromCharCode(chunkData[i])
                    i++
                }
                i++ // 跳过 null 分隔符

                // 读取文本内容
                if (type === 'tEXt') {
                    // tEXt: 直接读取 Latin-1 文本
                    const decoder = new TextDecoder('latin1')
                    text = decoder.decode(chunkData.slice(i))
                } else if (type === 'iTXt') {
                    // iTXt: 跳过压缩标志、压缩方法、语言标签、翻译关键字
                    i++ // 压缩标志
                    i++ // 压缩方法
                    while (i < chunkData.length && chunkData[i] !== 0) i++ // 语言标签
                    i++
                    while (i < chunkData.length && chunkData[i] !== 0) i++ // 翻译关键字
                    i++
                    const decoder = new TextDecoder('utf-8')
                    text = decoder.decode(chunkData.slice(i))
                }

                metadata[keyword] = text
            }

            offset += length + 4 // 跳过数据和 CRC

            // 如果遇到 IEND 块，停止
            if (type === 'IEND') break
        }

        if (Object.keys(metadata).length > 0) {
            console.log('提取到 PNG 元数据:', metadata)
            return metadata
        }

        console.log('PNG 文件中没有找到 tEXt 元数据')
        return null
    } catch (err) {
        console.error('提取 PNG 元数据失败:', err)
        return null
    }
}

/**
 * 提取图片的 EXIF 数据
 * @param {HTMLImageElement} imgElement 图片元素
 * @returns {Promise<Object|null>} EXIF数据对象或null
 */
function extractExifData(imgElement) {
    return new Promise((resolve) => {
        if (typeof EXIF === 'undefined') {
            console.warn('EXIF 库未加载')
            resolve(null)
            return
        }

        EXIF.getData(imgElement, function() {
            try {
                const allMetaData = EXIF.getAllTags(this)
                if (Object.keys(allMetaData).length > 0) {
                    console.log('提取到 EXIF 数据:', allMetaData)
                    resolve(allMetaData)
                } else {
                    console.log('图片没有 EXIF 数据')
                    resolve(null)
                }
            } catch (err) {
                console.error('提取 EXIF 失败:', err)
                resolve(null)
            }
        })
    })
}

/**
 * 将 PNG 元数据注入到 PNG 数据中
 * @param {Blob} pngBlob PNG文件Blob
 * @param {Object} metadata 元数据对象
 * @returns {Promise<Blob>} 注入元数据后的PNG Blob
 */
async function injectPngMetadata(pngBlob, metadata) {
    if (!metadata || Object.keys(metadata).length === 0) {
        return pngBlob
    }

    try {
        const arrayBuffer = await pngBlob.arrayBuffer()
        const bytes = new Uint8Array(arrayBuffer)

        // 创建 tEXt 块的函数
        function createTextChunk(keyword, text) {
            const encoder = new TextEncoder()
            const keywordBytes = encoder.encode(keyword)
            const textBytes = encoder.encode(text)
            const chunkData = new Uint8Array(keywordBytes.length + 1 + textBytes.length)

            chunkData.set(keywordBytes, 0)
            chunkData[keywordBytes.length] = 0 // null 分隔符
            chunkData.set(textBytes, keywordBytes.length + 1)

            // 创建完整的块：长度 + 类型 + 数据 + CRC
            const chunk = new Uint8Array(4 + 4 + chunkData.length + 4)
            const view = new DataView(chunk.buffer)

            // 长度
            view.setUint32(0, chunkData.length, false)

            // 类型 "tEXt"
            chunk[4] = 116 // 't'
            chunk[5] = 69  // 'E'
            chunk[6] = 88  // 'X'
            chunk[7] = 116 // 't'

            // 数据
            chunk.set(chunkData, 8)

            // CRC
            const crc = calculateCRC(chunk.slice(4, 8 + chunkData.length))
            view.setUint32(8 + chunkData.length, crc, false)

            return chunk
        }

        // CRC32 计算
        function calculateCRC(data) {
            let crc = 0xFFFFFFFF
            for (let i = 0; i < data.length; i++) {
                crc = crc ^ data[i]
                for (let j = 0; j < 8; j++) {
                    crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0)
                }
            }
            return (crc ^ 0xFFFFFFFF) >>> 0
        }

        // 找到 IDAT 块的位置（在它之前插入 tEXt 块）
        let idatOffset = 8
        while (idatOffset < bytes.length) {
            const type = String.fromCharCode(bytes[idatOffset + 4], bytes[idatOffset + 5],
                                            bytes[idatOffset + 6], bytes[idatOffset + 7])
            if (type === 'IDAT') break

            const length = (bytes[idatOffset] << 24) | (bytes[idatOffset + 1] << 16) |
                          (bytes[idatOffset + 2] << 8) | bytes[idatOffset + 3]
            idatOffset += 4 + 4 + length + 4
        }

        // 构建新的 PNG
        const textChunks = []
        for (const [keyword, text] of Object.entries(metadata)) {
            textChunks.push(createTextChunk(keyword, text))
        }

        const totalTextLength = textChunks.reduce((sum, chunk) => sum + chunk.length, 0)
        const newBytes = new Uint8Array(bytes.length + totalTextLength)

        // 复制 PNG 头和 IHDR 等块
        newBytes.set(bytes.slice(0, idatOffset), 0)

        // 插入 tEXt 块
        let offset = idatOffset
        for (const chunk of textChunks) {
            newBytes.set(chunk, offset)
            offset += chunk.length
        }

        // 复制剩余部分（IDAT 和后续块）
        newBytes.set(bytes.slice(idatOffset), offset)

        console.log('PNG 元数据已注入')
        return new Blob([newBytes], { type: 'image/png' })
    } catch (err) {
        console.error('注入 PNG 元数据失败:', err)
        return pngBlob
    }
}

/**
 * 从 Data URL 中提取 EXIF 数据并注入到新图片
 * @param {string} dataUrl Data URL格式的图片
 * @param {Object} exifData EXIF数据对象
 * @returns {string} 注入EXIF后的Data URL
 */
function injectExifToDataUrl(dataUrl, exifData) {
    if (!exifData || typeof piexif === 'undefined') {
        return dataUrl
    }

    try {
        // 从原始 EXIF 数据构建 piexif 格式的数据
        const exifObj = {
            "0th": {},
            "Exif": {},
            "GPS": {},
            "Interop": {},
            "1st": {},
            "thumbnail": null
        }

        // 保留常见的 EXIF 字段
        if (exifData.Make) exifObj["0th"][piexif.ImageIFD.Make] = exifData.Make
        if (exifData.Model) exifObj["0th"][piexif.ImageIFD.Model] = exifData.Model
        if (exifData.Software) exifObj["0th"][piexif.ImageIFD.Software] = exifData.Software
        if (exifData.DateTime) exifObj["0th"][piexif.ImageIFD.DateTime] = exifData.DateTime
        if (exifData.Artist) exifObj["0th"][piexif.ImageIFD.Artist] = exifData.Artist
        if (exifData.Copyright) exifObj["0th"][piexif.ImageIFD.Copyright] = exifData.Copyright

        // Exif 字段
        if (exifData.DateTimeOriginal) exifObj["Exif"][piexif.ExifIFD.DateTimeOriginal] = exifData.DateTimeOriginal
        if (exifData.DateTimeDigitized) exifObj["Exif"][piexif.ExifIFD.DateTimeDigitized] = exifData.DateTimeDigitized
        if (exifData.ExposureTime) exifObj["Exif"][piexif.ExifIFD.ExposureTime] = exifData.ExposureTime
        if (exifData.FNumber) exifObj["Exif"][piexif.ExifIFD.FNumber] = exifData.FNumber
        if (exifData.ISO) exifObj["Exif"][piexif.ExifIFD.ISOSpeedRatings] = exifData.ISO
        if (exifData.FocalLength) exifObj["Exif"][piexif.ExifIFD.FocalLength] = exifData.FocalLength
        if (exifData.LensModel) exifObj["Exif"][piexif.ExifIFD.LensModel] = exifData.LensModel

        // GPS 数据
        if (exifData.GPSLatitude) exifObj["GPS"][piexif.GPSIFD.GPSLatitude] = exifData.GPSLatitude
        if (exifData.GPSLongitude) exifObj["GPS"][piexif.GPSIFD.GPSLongitude] = exifData.GPSLongitude

        const exifBytes = piexif.dump(exifObj)
        const newDataUrl = piexif.insert(exifBytes, dataUrl)
        console.log('EXIF 数据已注入到新图片')
        return newDataUrl
    } catch (err) {
        console.error('注入 EXIF 失败:', err)
        return dataUrl
    }
}

/**
 * 重置元数据（用于新图片加载）
 */
function resetMetadata() {
    originalExifData = null
    originalPngMetadata = null
    originalImageFormat = 'jpeg'
}

/**
 * 获取原始图片格式
 * @returns {string} 'jpeg' 或 'png'
 */
function getOriginalImageFormat() {
    return originalImageFormat
}

/**
 * 获取原始EXIF数据
 * @returns {Object|null}
 */
function getOriginalExifData() {
    return originalExifData
}

/**
 * 设置原始EXIF数据
 * @param {Object} data EXIF数据
 */
function setOriginalExifData(data) {
    originalExifData = data
}

/**
 * 获取原始PNG元数据
 * @returns {Object|null}
 */
function getOriginalPngMetadata() {
    return originalPngMetadata
}

/**
 * 设置原始PNG元数据
 * @param {Object} data PNG元数据
 */
function setOriginalPngMetadata(data) {
    originalPngMetadata = data
}
