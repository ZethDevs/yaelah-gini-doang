const crypto = require('crypto');

const PREFIX =
'"The child pretends to be sick and misses school, the father pretends to be healthy to get up early to go to work."';

const SOURCE = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

// 65 KANJI UNIK (HARUS SAMA DI SEMUA TEMPAT)
const KANJI_POOL = [
  "天","地","玄","黄","宇","宙","洪","荒","日","月",
  "盈","昃","辰","宿","列","張","寒","來","暑","往",
  "秋","收","冬","藏","闰","餘","成","歲","律","吕",
  "調","陽","雲","騰","致","雨","露","結","為","霜",
  "金","生","麗","水","玉","出","崑","岡","劍","號",
  "巨","闕","珠","稱","夜","光","果","珍","李","柰",
  "菜","重","芥","龍","虎"
];

// nonce visual (hex → kanji)
const HEX = "0123456789abcdef";
const HEX_VIS = [
  "天","地","玄","黄",
  "宇","宙","洪","荒",
  "日","月","盈","昃",
  "辰","宿","列","張"
];

function prng(seed){
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0);
}
function shuffle(arr, seed){
  const rnd = prng(seed), a = arr.slice();
  for (let i=a.length-1;i>0;i--){
    const j = rnd()%(i+1);
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}

function randNonce(){
  let n = "";
  for (let i=0;i<4;i++) n += HEX[Math.floor(Math.random()*16)];
  return n;
}

function encryptAES(text, key) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', 
    crypto.createHash('sha256').update(key).digest(), 
    iv);
  
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  // Gabungkan IV dan ciphertext TANPA pemisah ':'
  // IV selalu 24 karakter (base64 dari 16 bytes)
  const ivBase64 = iv.toString('base64');
  return ivBase64 + encrypted; // Tidak ada ':' lagi
}

function encode(jsCode, aesKey){
  // Enkripsi dengan AES
  const encryptedData = encryptAES(jsCode, aesKey);
  
  const nonce = randNonce();

  let seed = 0;
  for (const c of nonce) seed += c.charCodeAt(0);

  const shuffled = shuffle(KANJI_POOL, seed);
  const map = {};
  for (let i=0;i<SOURCE.length;i++) map[SOURCE[i]] = shuffled[i];

  let body = "";
  for (const c of encryptedData) body += map[c];

  const nonceVis = Array.from(nonce).map(h=>HEX_VIS[HEX.indexOf(h)]).join("");

  return PREFIX + nonceVis + body + nonceVis;
}

module.exports = { encode, PREFIX, KANJI_POOL, SOURCE, HEX_VIS };