import requests
from bs4 import BeautifulSoup
def _fetch_metadata(url):
    headers = {
        "User-Agent": "Mozilla/5.0"  # 봇 차단 방지용
    }
    response = requests.get(url, headers=headers)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    title = soup.title.string if soup.title else None

    meta_tags = {}
    for tag in soup.find_all("meta"):
        name = tag.get("name") or tag.get("property")
        content = tag.get("content")
        if name and content:
            if name in ['og:title', 'og:description']:
                meta_tags[name] = content

    # 텍스트
    text = soup.get_text()[:50].replace('\n', ' ').strip()  # 처음 50글자만 가져오기

    return {
        "title": title,
        "meta": meta_tags,
        'text': text,
        "url": url
    }

def google_search(query, num_results=5):
    from googlesearch import search
    result =  search(query, num_results=num_results, lang="ko", safe="active", ssl_verify=True, region="KR")
    ret = []
    for i in result:
        print(i)
        fetch = _fetch_metadata(i)
        if not fetch['meta']:
            continue
        ret.append(fetch)
    return ret


