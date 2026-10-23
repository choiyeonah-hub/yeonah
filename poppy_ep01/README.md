# 뽀삐의 다음 장면 1화: 제작 패키지

> 현재 MP4는 **움직이는 스토리보드(파일럿)**입니다. 완전한 캐릭터 애니메이션이 아닙니다.
> 장면 이미지는 Canva AI가 만든 결과의 **112×199 미리보기**를 확대한 것이라 화면이 흐립니다.
> 원본 이미지로 교체하면 같은 명령으로 1080×1920 선명본을 다시 만들 수 있습니다(아래 참조).

## 파일
| 경로 | 내용 |
|---|---|
| `out/poppy_ep01_preview_lowres.mp4` | 1080×1920, 30fps, 35.0초, H.264/AAC (저해상도 이미지로 만든 미리보기) |
| `subs/poppy_ep01_ko.srt` | 한국어 자막 (영상에는 자막이 이미 들어가 있으며, 이 파일은 별도 업로드·CapCut용) |
| `images/s1~s5_*.png` | 장면 이미지 5장 (Canva 미리보기 해상도) |
| `audio/voice_*.wav` | 대사별 음성 (상자 속 음성은 먹먹하게 처리한 버전) |
| `audio/track_{voice,music,ambience,sfx}.wav` | 트랙별 오디오 (CapCut에서 레이어별로 조절 가능) |
| `audio/mix.wav` | 최종 믹스 |
| `edit_table_ep01.csv` | 컷·음성·효과음·자막 편집표 |
| `story_bible_ep01.md` | 캐릭터 외형과 1화에서 확정된 사실 |
| `upload_text_ep01.md` | 제목·설명문·고정 댓글 |
| `CREDITS.md` | 사용 권한·출처 기록 |
| `timeline.py` / `audio.py` / `render.py` / `tts.py` | 자동 편집 스크립트 (모든 타이밍은 timeline.py 한 곳에서 관리) |

## 원본 이미지로 선명본 만들기
1. 아래 Canva 링크에서 각 이미지를 내려받습니다(가능하면 PNG).
   - s1_wide (전경, 기준 컷): https://www.canva.com/M/MAHYzAg9SQ8
   - s2_label (이름표 클로즈업): https://www.canva.com/M/MAHYzHho5ts
   - s3_sniff (냄새 맡기): https://www.canva.com/M/MAHYzL11_yU
   - s4_paw (앞발로 건드림): https://www.canva.com/M/MAHYzFseqrY
   - s5_face (얼굴 클로즈업): https://www.canva.com/M/MAHYzPLKQTg
2. 같은 파일 이름으로 `poppy_ep01/images/`에 넣습니다. 예: GitHub 웹에서 이 폴더에 업로드.
3. `cd poppy_ep01 && python3 audio.py && python3 render.py images out/poppy_ep01.mp4`

이미지 비율이 9:16이면 이름표 글자와 빛 효과 위치가 그대로 맞습니다. 구도가 달라지면 `timeline.py`의 `LABELS` 좌표와 `SEAMS` 좌표를 수정하세요.

## CapCut
- 이 작업 환경은 클라우드 리눅스 컨테이너입니다. CapCut이 설치되어 있지 않고 연결된 CapCut MCP도 없어서 **CapCut 프로젝트는 만들지 않았습니다.**
- CapCut에서 **완성 MP4를 불러오는 것**은 바로 가능합니다(레이어 수정은 불가).
- **레이어별로 수정하려면**: 새 프로젝트를 만들고 `images/` 5장, `audio/track_*.wav` 4개를 각각 다른 트랙에 넣은 뒤, `edit_table_ep01.csv`의 시간대로 배치하고 `subs/poppy_ep01_ko.srt`를 자막으로 불러오면 됩니다. 이 과정은 수동입니다.
