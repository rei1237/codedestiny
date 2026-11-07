// Original renderer from pet-saju.html; parity is checked in pet-tree.test.mjs.
export function buildTreeSvg(tree, accent){
  var NS = "http://www.w3.org/2000/svg";
  var svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 320 300");
  svg.setAttribute("class", "tree__svg");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label",
    "운명의 나무 — 잎 " + tree.leaves + "단계, 꽃 " + tree.blossoms + "단계, 줄기 " + tree.trunk +
    "단계, 열매 " + tree.fruits + "단계, 연못 " + tree.pond + "단계");

  function add(tag, attrs, delay, parent){
    var node = document.createElementNS(NS, tag);
    for (var key in attrs) { if (Object.prototype.hasOwnProperty.call(attrs, key)) node.setAttribute(key, attrs[key]); }
    node.setAttribute("class", "tree__part");
    node.style.animationDelay = (delay || 0) + "ms";
    (parent || svg).appendChild(node);
    return node;
  }
  // 배치용 <g>. sprout 애니메이션의 CSS transform이 SVG transform 속성을 덮어쓰므로
  // 좌표 변환은 애니메이션이 걸리지 않는 그룹에 둔다.
  function placed(transform){
    var group = document.createElementNS(NS, "g");
    group.setAttribute("transform", transform);
    svg.appendChild(group);
    return group;
  }

  // 부족한 기운의 빛 — 캐노피 뒤 은은한 글로우(그림자 대신 글로우)
  var defs = document.createElementNS(NS, "defs");
  var glow = document.createElementNS(NS, "radialGradient");
  glow.setAttribute("id", "petTreeGlow");
  var stopA = document.createElementNS(NS, "stop");
  stopA.setAttribute("offset", "0%"); stopA.setAttribute("stop-color", accent); stopA.setAttribute("stop-opacity", "0.34");
  var stopB = document.createElementNS(NS, "stop");
  stopB.setAttribute("offset", "100%"); stopB.setAttribute("stop-color", accent); stopB.setAttribute("stop-opacity", "0");
  glow.appendChild(stopA); glow.appendChild(stopB);
  defs.appendChild(glow);
  svg.appendChild(defs);
  add("circle", { cx: 160, cy: 118, r: 104, fill: "url(#petTreeGlow)" }, 0);

  // 연못(수) — 클수록 나무 아래 물이 넓어진다
  if (tree.pond > 0) {
    add("ellipse", { cx: 160, cy: 266, rx: 34 + tree.pond * 16, ry: 7 + tree.pond * 2.2,
      fill: "#69a7f7", opacity: 0.14 + tree.pond * 0.05 }, 60);
  }
  add("path", { d: "M52 266 Q160 258 268 266", stroke: "#f4bed1", "stroke-width": 1.4,
    fill: "none", opacity: 0.24, "stroke-linecap": "round" }, 90);

  // 줄기(토) — 단계가 오를수록 굵고 뿌리가 벌어진다
  var half = 5 + tree.trunk * 3.4;
  var top = half * 0.4;
  add("path", {
    d: "M" + (160 - half - tree.trunk * 2) + " 266 Q" + (160 - half) + " 250," + (160 - half * 0.8) + " 214"
      + " C" + (160 - half * 0.7) + " 190," + (160 - top) + " 178," + (160 - top) + " 158"
      + " L" + (160 + top) + " 158"
      + " C" + (160 + top) + " 178," + (160 + half * 0.7) + " 190," + (160 + half * 0.8) + " 214"
      + " Q" + (160 + half) + " 250," + (160 + half + tree.trunk * 2) + " 266 Z",
    fill: "#caa45a", opacity: 0.4 + tree.trunk * 0.1
  }, 140);

  // 가지 — 잎이 붙을 자리로 뻗는다
  var BRANCH = [[-1, 58, 138], [1, 58, 134], [-1, 34, 112], [1, 38, 108], [0, 0, 96]];
  BRANCH.slice(0, Math.max(2, tree.leaves)).forEach(function(branch, index){
    if (branch[0] === 0) return;
    add("path", {
      d: "M160 " + (198 - index * 14) + " Q" + (160 + branch[0] * branch[1] * 0.55) + " " + (branch[2] + 18) + ","
        + (160 + branch[0] * branch[1]) + " " + branch[2],
      stroke: "#caa45a", "stroke-width": 3.2 - index * 0.4, fill: "none",
      "stroke-linecap": "round", opacity: 0.46
    }, 200 + index * 70);
  });

  // 잎(목) — 가지 끝마다 물방울 모양 잎사귀 다발
  // 잎은 가지 끝(BRANCH 종점)에서 자라도록 좌표를 맞춘다 — 떠 있으면 나무로 안 읽힌다.
  var LEAF = [[160, 152, 1.32, 0], [102, 138, 1.02, -36], [218, 134, 1.02, 36], [126, 112, 0.9, -20], [198, 108, 0.9, 20]];
  for (var i = 0; i < tree.leaves; i += 1) {
    var leaf = LEAF[i];
    add("path", {
      d: "M0 0 C-19 -13 -19 -40 0 -52 C19 -40 19 -13 0 0 Z",
      fill: "#5fd198", opacity: 0.36 + i * 0.03
    }, 420 + i * 100, placed("translate(" + leaf[0] + " " + leaf[1] + ") rotate(" + leaf[3] + ") scale(" + leaf[2] + ")"));
  }
  if (tree.leaves === 0) {
    add("text", { x: 160, y: 120, "text-anchor": "middle", fill: "rgba(255,203,226,.62)", "font-size": 12 }, 420)
      .textContent = "아직 잎이 자라지 않았어요";
  }

  // 꽃(화) — 다섯 장 꽃잎
  var BLOSSOM = [[160, 104], [122, 102], [198, 98], [140, 74], [180, 70]];
  for (var b = 0; b < tree.blossoms; b += 1) {
    for (var petal = 0; petal < 5; petal += 1) {
      var angle = (petal / 5) * Math.PI * 2;
      add("circle", { cx: BLOSSOM[b][0] + Math.cos(angle) * 4.4, cy: BLOSSOM[b][1] + Math.sin(angle) * 4.4,
        r: 3.4, fill: "#f08a8a", opacity: 0.9 }, 900 + b * 110);
    }
    add("circle", { cx: BLOSSOM[b][0], cy: BLOSSOM[b][1], r: 2, fill: "#ead089", opacity: 0.95 }, 900 + b * 110);
  }

  // 열매(금) — 잎 아래로 매달아 캐노피에 묻히지 않게 한다
  var FRUIT = [[120, 158], [200, 154], [142, 172], [180, 176], [160, 148]];
  for (var f = 0; f < tree.fruits; f += 1) {
    add("path", { d: "M" + FRUIT[f][0] + " " + (FRUIT[f][1] - 9) + " L" + FRUIT[f][0] + " " + (FRUIT[f][1] - 4),
      stroke: "#caa45a", "stroke-width": 1.4, opacity: 0.6 }, 1240 + f * 100);
    add("circle", { cx: FRUIT[f][0], cy: FRUIT[f][1], r: 5.2, fill: "#d9d3c1", opacity: 0.95 }, 1240 + f * 100);
  }
  return svg;
}
