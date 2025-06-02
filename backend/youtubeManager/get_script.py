from youtube_transcript_api import YouTubeTranscriptApi

def get_youtube_transcript(video_id, languages=['ko']):
    """
    유튜브 영상의 자막을 가져오는 함수입니다.
    :param video_id: str, 유튜브 영상의 ID입니다.
    :param languages: list, 자막을 가져올 언어 목록입니다. 기본값은 ['ko'] (한국어)입니다.
    :return: list, 자막 항목의 리스트입니다. 각 항목은 시작 시간, 지속 시간, 텍스트를 포함합니다.
    - 완전히 작동하는지에 대한 여부는 검증되지 않았으니, 확인 부탁드립니다.
    """
    try:
        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=languages)

        # to JSON
        for entry in transcript:
            entry['start'] = round(entry['start'], 2)
            entry['duration'] = round(entry['duration'], 2)
        # Convert to JSON-like format
        transcript = [{'start': entry['start'], 'duration': entry['duration'], 'text': entry['text']} for entry in transcript]
        # Return the transcript


        return transcript
    except Exception as e:
        print(f"Error fetching transcript for video {video_id}: {e}")
        return []
