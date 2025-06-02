require('dotenv').config();
const OpenAI = require('openai');

// OpenAI API 키 설정
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 명령줄 인수에서 노트 내용 가져오기
const note = process.argv[2];

if (!note) {
  console.log('사용법: node app.js <노트 내용>');
  process.exit(1);
}

async function summarizeNote() {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "당신은 전문적인 요약가입니다. 주어진 텍스트를 핵심 내용 위주로 간단명료하게 요약해주세요."
        },
        {
          role: "user",
          content: note
        }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    console.log('\n=== 요약 결과 ===');
    console.log(completion.choices[0].message.content);
  } catch (error) {
    console.error('요약 중 오류가 발생했습니다:', error.message);
  }
}

summarizeNote(); 