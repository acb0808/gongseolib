const { createWorker } = require('tesseract.js');
const path = require('path');

// 이미지 경로를 커맨드 라인 인자로 받습니다
const imagePath = process.argv[2];

if (!imagePath) {
    console.error('사용법: node app.js <이미지_경로>');
    process.exit(1);
}

async function recognizeText() {
    try {
        console.log('OCR 처리를 시작합니다...');
        
        const worker = await createWorker('kor+eng');
        
        console.log('이미지를 처리중입니다...');
        const { data: { text } } = await worker.recognize(imagePath);
        
        console.log('\n인식 결과:');
        console.log('------------------------');
        console.log(text);
        console.log('------------------------');
        
        await worker.terminate();
    } catch (error) {
        console.error('에러 발생:', error.message);
    }
}

recognizeText();