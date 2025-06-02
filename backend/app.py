# backend/app.py
from flask import Flask, jsonify, request
from flask_cors import CORS
import requests, openai
from youtubeManager.get_searchResult import search_youtube
from youtubeManager.get_script import get_youtube_transcript
from googleManager.get_searchResult import google_search
from googleManager.get_imgSearchResult import google_image_search
from bs4 import BeautifulSoup
import re

app = Flask(__name__)
CORS(app)

API_KEY = open('API_KEY.txt', 'r', encoding='UTF-8').read().strip()

@app.route("/api/data")
def get_data():
    return jsonify({"message": "Hello from Flask!"})

@app.route("/api/youtube/search/<query>")
def api_youtube_search(query):
    """
    유튜브 검색 API 엔드포인트입니다.
    :param query: str, 검색어입니다.
    :return: JSON, 검색 결과를 포함하는 리스트입니다.
    """
    try:
        results = search_youtube(query, max_results=5)
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/youtube/getVideoSummary/<video_id>")
def api_youtube_get_video_summary(video_id):
    """
    유튜브 영상 요약 API 엔드포인트입니다.
    :param video_id: str, 유튜브 영상 ID입니다.
    :return: JSON, 영상 요약 정보를 포함하는 딕셔너리입니다.
    """
    script_Text = get_youtube_transcript(video_id, languages=['ko'])
    Text = ''
    for item in script_Text:
        Text += str(item['start']) + ':' + str(item['duration']) + ':' + item['text'] + '\n'
    try:
        # ChatGPT API를 사용하여 영상 요약을 생성합니다.
        
        # API 키 설정
        client = openai.OpenAI(api_key=API_KEY)

        # GPT-4 or GPT-3.5 모델 호출
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",  # 또는 "gpt-4"
            messages=[
                {"role": "system", "content": "당신은 유튜브 자막데이터를 이용하여 영상 요약을 생성하는 AI입니다. 영상의 핵심 내용을 간결하게 요약해주세요."},
                {"role": "user", "content": "아래 자막을 바탕으로 영상의 핵심 내용을 요약해주세요. 자막: " + Text}
            ],
            temperature=0.7
        )

        # 출력
        return jsonify({"status": "success", "Result": response.choices[0].message.content})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/google/getSearchResult/<query>")
def api_google_search(query):
    """
    구글 검색 API 엔드포인트입니다.
    :param query: str, 검색어입니다.
    :return: JSON, 검색 결과를 포함하는 리스트입니다.
    """
    try:
        results = google_search(query, num_results=5)
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/google/getImgSearchResult/<query>")
def api_google_image_search(query):
    """
    구글 이미지 검색 API 엔드포인트입니다.
    :param query: str, 검색어입니다.
    :return: JSON, 이미지 URL 리스트를 포함하는 리스트입니다.
    """
    try:
        results = google_image_search(query, num_images=5)
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/getSummary", methods=['POST'])
def api_get_summary():
    """
    OpenAI API를 사용하여 텍스트 요약을 생성하는 엔드포인트입니다.
    :return: JSON, 요약된 텍스트를 포함하는 딕셔너리입니다.
    """
    try:
        data = request.json
        text = data.get("text", "")
        if not text:
            return jsonify({"error": "No text provided"}), 400

        # OpenAI API를 사용하여 요약 생성
        client = openai.OpenAI(api_key=API_KEY)
        
        prompt = f"""다음 텍스트를 분석하고 JSON 형식으로 요약해주세요.

요구사항:
{{
  "title": "한 줄 제목",
  "keywords": ["키워드1", "키워드2", ...],
  "summary": [
    "요약1",
    "요약2",
    "요약3",
    ...
  ],
  "insights": "특별히 주목해야 할 내용이나 인사이트"
}}

분석할 텍스트:
{text}"""

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "당신은 주어진 텍스트를 분석하고 JSON 형식으로 요약하는 AI입니다."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7
        )

        summary = response.choices[0].message.content
        return jsonify({"status": "success", "summary": summary})
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

@app.route("/api/crawl", methods=['POST'])
def api_crawl():
    """
    웹 페이지 크롤링 API 엔드포인트입니다.
    :return: JSON, 크롤링된 텍스트를 포함하는 딕셔너리입니다.
    """
    try:
        data = request.json
        url = data.get("url", "")
        if not url:
            return jsonify({"error": "URL이 제공되지 않았습니다."}), 400

        # 웹 페이지 가져오기
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers)
        response.raise_for_status()

        # HTML 파싱
        soup = BeautifulSoup(response.text, 'html.parser')

        # 불필요한 태그 제거
        for tag in soup(['script', 'style', 'nav', 'footer', 'header']):
            tag.decompose()

        # 텍스트 추출 및 정제
        text = soup.get_text()
        text = re.sub(r'\s+', ' ', text)  # 여러 공백을 하나로
        text = text.strip()

        return jsonify({
            "status": "success",
            "text": text,
            "title": soup.title.string if soup.title else "제목 없음"
        })
    except Exception as e:
        print(e)
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=False)
