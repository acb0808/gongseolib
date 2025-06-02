import requests
import re
import json

def search_youtube(query, max_results=5):
    search_url = "https://www.youtube.com/results"
    params = {"search_query": query}
    headers = {
        "User-Agent": "Mozilla/5.0"
    }

    response = requests.get(search_url, params=params, headers=headers)
    if response.status_code != 200:
        raise Exception("검색 요청 실패")

    match = re.search(r"var ytInitialData = ({.*?});</script>", response.text)
    if not match:
        raise Exception("ytInitialData 파싱 실패")

    data = json.loads(match.group(1))

    results = []
    try:
        sections = data["contents"]["twoColumnSearchResultsRenderer"]["primaryContents"]\
            ["sectionListRenderer"]["contents"]

        for section in sections:
            items = section.get("itemSectionRenderer", {}).get("contents", [])
            for item in items:
                if "videoRenderer" in item:
                    v = item["videoRenderer"]
                    video_id = v["videoId"]
                    title = "".join([r["text"] for r in v["title"]["runs"]])
                    thumbnail_url = v["thumbnail"]["thumbnails"][-1]["url"]
                    duration = v.get("lengthText", {}).get("simpleText", "LIVE")
                    results.append({
                        "title": title,
                        "thumbnail": thumbnail_url,
                        "duration": duration,
                        "videoId": video_id
                    })
                    if len(results) >= max_results:
                        return results
    except Exception as e:
        raise Exception("검색 결과 파싱 중 오류 발생:", e)

    return results

if __name__ == "__main__":
    # 검색어와 최대 결과 수를 지정하여 유튜브 검색
    results = search_youtube("아이유 콘서트", max_results=3)
    for i, video in enumerate(results):
        print(f"{i+1}. {video['title']} ({video['duration']})")
        print(f"   ▶ https://www.youtube.com/watch?v={video['videoId']}")
        print(f"   🖼️ {video['thumbnail']}")
