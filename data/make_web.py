# 경상권 후보 가게 CSV -> 데모용 data/sbiz/ (시군구별 압축 JSON, 상권 목록)
import csv, json, math, os, re, collections, sys
SRC = sys.argv[1]; OUT = sys.argv[2]
os.makedirs(OUT, exist_ok=True)
JUNK = re.compile(r"업소명없음|빨래방|세탁|부동산|주유소|철물|공인중개|노래빠|가라오케|단란|유흥|나이트|퍼블릭|룸살롱|룸싸롱|노래주점|노래클럽|룸서비스|룸주점|키즈|성인|키스방|안마|마사지")
rows = [r for r in csv.DictReader(open(SRC, encoding="utf-8-sig")) if r["상권업종소분류명"] != "그 외 기타 상품 전문 소매업" and not JUNK.search(r["상호명"]) and r["상호명"].strip()]
norm = lambda n: re.sub(r"\s|\(.*?\)", "", n)
# 체인 판별: "○○점"으로 끝나는 서로 다른 상호가 8개 이상 같은 앞부분(3자 이상)을 공유하면 그 앞부분을 브랜드로 봄
branchy = {norm(r["상호명"]) + norm(r["지점명"]) for r in rows}
branchy = {n for n in branchy if n.endswith("점") and len(n) >= 5}
pc = collections.Counter()
for n in branchy:
    for k in range(3, min(len(n) - 2, 10) + 1): pc[n[:k]] += 1
BR = {b for b, v in pc.items() if v >= 8}
def is_chain(r):
    n = norm(r["상호명"]) + norm(r["지점명"])
    return any(n[:k] in BR for k in range(3, min(len(n), 10) + 1))
G = ["식사","카페","디저트","술","놀거리","체험","꽃·소품","숙박"]
CELL = 0.0027
by = collections.defaultdict(list)
for r in rows: by[(r["시도명"], r["시군구명"])].append(r)
index = []
for (sido, sgg), lst in sorted(by.items()):
    lst.sort(key=lambda r: (G.index(r["그룹"]), r["상호명"]))
    subs = sorted({r["상권업종소분류명"] for r in lst}); dongs = sorted({r["행정동명"] for r in lst})
    P = []
    cells = collections.defaultdict(list)
    for i, r in enumerate(lst):
        lat, lon = float(r["위도"]), float(r["경도"])
        name = r["상호명"] + (" " + r["지점명"] if r["지점명"] else "")
        P.append([r["상가업소번호"], name, G.index(r["그룹"]), subs.index(r["상권업종소분류명"]), dongs.index(r["행정동명"]),
                  (r["도로명주소"] or r["지번주소"]).replace(sido, "").strip(), r["층정보"], round(lat, 6), round(lon, 6), 1 if is_chain(r) else 0])
        cells[(round(lat / CELL), round(lon / (CELL / math.cos(math.radians(lat)))))].append(i)
    # 상권 점수 (주변 8칸 포함 도보권)
    spots = []
    for c, ids in cells.items():
        a = collections.Counter(); pts = []
        for di in (-1, 0, 1):
            for dj in (-1, 0, 1):
                for i in cells.get((c[0]+di, c[1]+dj), []): a[lst[i]["그룹"]] += 1
        own = collections.Counter(lst[i]["그룹"] for i in ids)
        if own["카페"] + own["식사"] + own["디저트"] < 5 or a["카페"] < 2 or a["식사"] < 2: continue
        kinds = sum(1 for g in G[:7] if a[g] > 0)
        score = kinds*10 + math.log1p(a["카페"])*15 + math.log1p(a["식사"])*10 + math.log1p(a["놀거리"]+a["체험"])*12 + math.log1p(a["디저트"])*8 + math.log1p(a["술"])*4
        lat = sum(float(lst[i]["위도"]) for i in ids)/len(ids); lon = sum(float(lst[i]["경도"]) for i in ids)/len(ids)
        dong = collections.Counter(lst[i]["행정동명"] for i in ids).most_common(1)[0][0]
        spots.append({"dong": dong, "lat": round(lat, 6), "lon": round(lon, 6), "score": round(score, 1), "cnt": {g: a[g] for g in G[:7]}})
    spots.sort(key=lambda s: -s["score"])
    top, used = [], set()
    for s in spots:
        # 같은 행정동은 1개, 이미 고른 곳과 600m 안이면 건너뜀
        if s["dong"] in used: continue
        if any(math.hypot((s["lat"]-t["lat"])*111000, (s["lon"]-t["lon"])*111000*math.cos(math.radians(s["lat"]))) < 600 for t in top): continue
        top.append(s); used.add(s["dong"])
        if len(top) >= 8: break
    PIN = {("경상남도","진주시"): ["가호동","천전동","중앙동"], ("경상남도","김해시"): ["회현동","활천동","장유3동","내외동"]}
    for d in PIN.get((sido, sgg), []):
        if d not in {t["dong"] for t in top}:
            best = next((x for x in spots if x["dong"] == d), None)
            if best: top.insert(0, best)
    NICK = {"가호동":"경상국립대 앞","천전동":"칠암·남강","중앙동":"원도심·로데오" if sgg=="진주시" else "","회현동":"봉리단길","활천동":"인제대 앞","장유3동":"율하",
            "부전2동":"서면","전포1동":"전포 카페거리","전포2동":"전포","성내1동":"동성로","성내2동":"동성로","중1동":"해운대 해수욕장" if sgg=="해운대구" else "",
            "광안2동":"광안리","상남동":"상남동 상권"}
    for t in top: t["nick"] = NICK.get(t["dong"], "")
    fn = f"{sido}_{sgg}.json".replace(" ", "")
    json.dump({"sido": sido, "sgg": sgg, "groups": G, "subs": subs, "dongs": dongs, "p": P}, open(os.path.join(OUT, fn), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    index.append({"sido": sido, "sgg": sgg, "file": fn, "n": len(P), "spots": top})
json.dump({"source": "소상공인시장진흥공단 상가(상권)정보 2026-09-30 기준 (공공데이터포털 15083033, 이용허락범위 제한 없음)",
           "built": "2026-11-27", "regions": index}, open(os.path.join(OUT, "index.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(len(index), "regions", sum(x["n"] for x in index), "places")
