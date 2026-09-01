# 아이콘 다시 뽑기

```
pip install cairosvg fonttools brotli
cd tools/icon && python3 mkicon.py
mv *.png ../../
```

`son_raw.txt` 는 Noto Serif KR 700 의 '손' 글리프를 윤곽선으로 떠둔 것입니다
(Google Fonts, SIL Open Font License 1.1). 글자를 바꾸려면 폰트를 받아
`fontTools` 로 다시 뜨면 됩니다 — `mkicon.py` 머리말에 적어뒀습니다.
