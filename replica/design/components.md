# Components (replica-design)

Measured from the reference screenshots, scaled to a 390 px wide screen. Values live in `tokens.json`; colours are ours.

**Name pill** (S07, S09): glass pill top-left, 42 px tall, 17 px label + chevron, opens Profile. Real `<button>`, visible focus.

**Glass button** (S07, S12, S08): 48 px circle, translucent + blur. Uses: full-conversation toggle (`aria-pressed`), back, plus.

**Message bubble** (S07): full-radius pill (28 px), 15/22 px padding, 17 px text, no border, soft shadow. Hers: light bubble, dark text. Yours: accent bubble, white text. Timestamps hidden on the main screen and shown in the full-conversation view. Tap opens reactions and 👍/👎, Remember and Copy. States: typing (3 dots), failed (Retry/Dismiss), offline tag.

**Selfie card** (S07 photos): rounded 26 px photo card, ±3° tilt, white edge, caption bubble under it.

**Composer** (S07): 52 px "+" glass circle, plus a 52 px glass pill with the textarea. The right action is Call, and turns into Send while typing. Enter sends; Shift+Enter adds a new line.

**Call controls** (S08): 58 px dark glass circles (speaker, camera, mic; `aria-pressed`) and a wide accent "End" pill. Voice-wave dots at the top animate while she speaks. Corner camera preview (your camera, local only). Captions centred near the bottom, hers bright and yours dim.

**Look carousel** (S12): snap-scrolling cards (56% width, 3:4, 30 px radius), the selected one scaled up with a white border and a check badge, plus page dots.

**Memory card** (S11): 30 px radius, blurred photo background, centred title + 2-line preview, "N facts" count pill top-right. Opens the facts sheet.

**Person card** (S11): horizontal snap row of cards: initial avatar, name, relation, note. "+ Add someone" last.

**Profile | Memory switch** (S11): bottom segmented pill (two 50 px tabs) plus a 62 px accent FAB (+). Content scrolls under a fade.

**Sheets, toasts, chips, cards:** unchanged from the first build.
