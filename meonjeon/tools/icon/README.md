# 아이콘 다시 뽑기

```
pip install cairosvg fonttools brotli
cd tools/icon && python3 mkicon.py
mv *.png ../../
```

`son_raw.txt` 는 Noto Serif KR 700 의 '손' 글리프를 윤곽선으로 떠둔 것입니다
(Google Fonts, SIL Open Font License 1.1). 글자를 바꾸려면 폰트를 받아
`fontTools` 로 다시 뜨면 됩니다 — `mkicon.py` 머리말에 적어뒀습니다.

## 아이콘을 바꾸면 두 곳을 더 고쳐야 합니다

폰은 한 번 받은 아이콘을 아주 오래 들고 있습니다. 그래서 그림이 바뀌면
주소 뒤의 표(`?v=…`)를 같이 올려야 새 파일로 봅니다.

- `manifest.json` 의 `icons[].src` — `/icon-192.png?v=da`
- `index.html` 의 `apple-touch-icon` — `/apple-touch-icon.png?v=da`

빌드마다가 아니라 **그림이 바뀔 때만** 올립니다.
`vercel.json` 에 아이콘은 캐시하지 말라고 적어뒀습니다.

그래도 **이미 홈 화면에 담아둔 앱의 아이콘은 안 바뀝니다** — iOS·안드로이드가
담을 때 찍어둔 그림을 씁니다. 지웠다가 다시 담아야 합니다.
