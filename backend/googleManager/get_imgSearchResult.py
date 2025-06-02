import requests
from bs4 import BeautifulSoup

def google_image_search(query, num_images=5) -> list[str]:

    search_url = "https://www.google.com/search"
    params = {"q": query, "tbm": "isch"}
    headers = {
        "User-Agent": "Mozilla/5.0"
    }

    response = requests.get(search_url, params=params, headers=headers)
    soup = BeautifulSoup(response.text, "html.parser")

    image_urls = []
    for img in soup.find_all("img"):
        url = img.get("data-iurl") or img.get("data-src") or img.get("src")
        if url and url.startswith("http"):
            image_urls.append(url)
        if len(image_urls) >= num_images:
            break

    return image_urls

if __name__ == "__main__":
    print(google_image_search("아이유 콘서트", num_images=3))
