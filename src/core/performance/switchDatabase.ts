/**
 * Anakeyn — Built-in Magnetic Switch Profiles Database
 * 100% Reverse-engineered from official SparkLink / Everglide OEM protocol v2.
 * 100% offline, local, and zero-cloud.
 */

export interface MagneticSwitchProfile {
  id: number;
  nameEn: string;
  nameZh: string;
  brand: 'Everglide' | 'Gateron' | 'TTC' | 'Other';
  maxTravelMm: number;
  stemColor: string;
  housingColor: string;
  axisV2Id: number;
  axisRangeMax: number; // in um (microns)
  axisCoefficient: number;
  description: string;
}

export const SWITCH_DATABASE: MagneticSwitchProfile[] = [
  {
    "id": 100,
    "nameEn": "Siren V4",
    "nameZh": "海妖V4轴",
    "brand": "Everglide",
    "maxTravelMm": 3.4,
    "stemColor": "#0ea5e9",
    "housingColor": "rgba(14, 165, 233, 0.25)",
    "axisV2Id": 14544,
    "axisRangeMax": 3400,
    "axisCoefficient": 17664,
    "description": "Everglide flagship linear magnetic switch. 3.40mm bottom-out, high 640 Gs flux, 20mm extended spring, and creamy acoustics."
  },
  {
    "id": 200,
    "nameEn": "Magnetic Jade",
    "nameZh": "磁玉轴",
    "brand": "Gateron",
    "maxTravelMm": 3.43,
    "stemColor": "#dbfdcd",
    "housingColor": "#dbfdcd33",
    "axisV2Id": 4112,
    "axisRangeMax": 3430,
    "axisCoefficient": 22800,
    "description": "The esports standard. Box stem with closed bottom clack."
  },
  {
    "id": 201,
    "nameEn": "Magnetic Jade Pro",
    "nameZh": "磁玉Pro",
    "brand": "Gateron",
    "maxTravelMm": 3.39,
    "stemColor": "#adfb8c",
    "housingColor": "#adfb8c33",
    "axisV2Id": 4128,
    "axisRangeMax": 3390,
    "axisCoefficient": 20000,
    "description": "Pre-lubed dual-rail stability with shortened bottom-out."
  },
  {
    "id": 202,
    "nameEn": "Magnetic Jade Gaming",
    "nameZh": "磁玉Gaming",
    "brand": "Gateron",
    "maxTravelMm": 3.4,
    "stemColor": "#69ff51",
    "housingColor": "#69ff5133",
    "axisV2Id": 4144,
    "axisRangeMax": 3400,
    "axisCoefficient": 19000,
    "description": "Light initial force for lightning counter-strafing."
  },
  {
    "id": 203,
    "nameEn": "Magnetic Jade Air",
    "nameZh": "磁玉Air",
    "brand": "Gateron",
    "maxTravelMm": 3.43,
    "stemColor": "#f0f6bb",
    "housingColor": "#f0f6bb33",
    "axisV2Id": 4160,
    "axisRangeMax": 3430,
    "axisCoefficient": 19600,
    "description": "Feather-light actuation with air-cushioned bottom-out."
  },
  {
    "id": 204,
    "nameEn": "Jade King (Yujingzi)",
    "nameZh": "玉京子轴",
    "brand": "Gateron",
    "maxTravelMm": 3.42,
    "stemColor": "#ff3f3f",
    "housingColor": "#ff3f3f33",
    "axisV2Id": 4176,
    "axisRangeMax": 3420,
    "axisCoefficient": 20350,
    "description": "Custom acoustic blend housing with 3.42mm travel."
  },
  {
    "id": 205,
    "nameEn": "Green Dragon",
    "nameZh": "绿龙轴",
    "brand": "Gateron",
    "maxTravelMm": 3.35,
    "stemColor": "#a8ff47",
    "housingColor": "#a8ff4733",
    "axisV2Id": 4192,
    "axisRangeMax": 3350,
    "axisCoefficient": 21300,
    "description": "High magnetic flux density core with crisp clack."
  },
  {
    "id": 206,
    "nameEn": "Apollo Ultra-Short",
    "nameZh": "阿波罗轴",
    "brand": "Gateron",
    "maxTravelMm": 3.13,
    "stemColor": "#ffe919",
    "housingColor": "#ffe91933",
    "axisV2Id": 4208,
    "axisRangeMax": 3130,
    "axisCoefficient": 24500,
    "description": "Ultra-low 3.13mm bottom-out for maximum reaction speed."
  },
  {
    "id": 207,
    "nameEn": "Magnetic Jade Max",
    "nameZh": "磁玉Max",
    "brand": "Gateron",
    "maxTravelMm": 3.41,
    "stemColor": "#f9e892",
    "housingColor": "#f9e89233",
    "axisV2Id": 4224,
    "axisRangeMax": 3410,
    "axisCoefficient": 19500,
    "description": "Reinforced stem walls for near-zero stem rock."
  },
  {
    "id": 208,
    "nameEn": "Hanabi / Fireworks",
    "nameZh": "花火轴",
    "brand": "Gateron",
    "maxTravelMm": 3.15,
    "stemColor": "#ffa70e",
    "housingColor": "#ffa70e33",
    "axisV2Id": 4256,
    "axisRangeMax": 3150,
    "axisCoefficient": 26800,
    "description": "3.15mm short-throw speed switch with vibrant polycarbonate housing."
  },
  {
    "id": 209,
    "nameEn": "Magnetic Jade POM",
    "nameZh": "磁玉Pom",
    "brand": "Gateron",
    "maxTravelMm": 3.3,
    "stemColor": "#defccb",
    "housingColor": "#defccb33",
    "axisV2Id": 4240,
    "axisRangeMax": 3300,
    "axisCoefficient": 20480,
    "description": "Full POM construction for self-lubricating silky glide."
  },
  {
    "id": 210,
    "nameEn": "Purple Dragon",
    "nameZh": "紫龙轴",
    "brand": "Gateron",
    "maxTravelMm": 3.33,
    "stemColor": "#8174f8",
    "housingColor": "#8174f833",
    "axisV2Id": 4272,
    "axisRangeMax": 3335,
    "axisCoefficient": 20300,
    "description": "High-energy rare earth magnet with 3.335mm stroke."
  },
  {
    "id": 211,
    "nameEn": "Red Dragon (Lubed)",
    "nameZh": "赤龙轴(自润)",
    "brand": "Gateron",
    "maxTravelMm": 3.38,
    "stemColor": "#ff4141",
    "housingColor": "#ff414133",
    "axisV2Id": 4288,
    "axisRangeMax": 3380,
    "axisCoefficient": 20044,
    "description": "Factory lubricated speed linear with 3.38mm travel."
  },
  {
    "id": 212,
    "nameEn": "Star Orbit Magnetic",
    "nameZh": "星轨磁轴",
    "brand": "Gateron",
    "maxTravelMm": 3.94,
    "stemColor": "#0099ff",
    "housingColor": "#0099ff33",
    "axisV2Id": 4304,
    "axisRangeMax": 3945,
    "axisCoefficient": 15000,
    "description": "Extended 3.945mm keystroke with smooth Hall linearity."
  },
  {
    "id": 213,
    "nameEn": "Golden Dragon",
    "nameZh": "金龙轴",
    "brand": "Gateron",
    "maxTravelMm": 3.34,
    "stemColor": "#fcca74",
    "housingColor": "#fcca7433",
    "axisV2Id": 4320,
    "axisRangeMax": 3340,
    "axisCoefficient": 21600,
    "description": "Gold-plated spring with crisp 3.34mm bottom-out."
  },
  {
    "id": 214,
    "nameEn": "Snow Blade",
    "nameZh": "封底雪刀轴",
    "brand": "Gateron",
    "maxTravelMm": 3.43,
    "stemColor": "#d9d9d9",
    "housingColor": "#d9d9d933",
    "axisV2Id": 4336,
    "axisRangeMax": 3430,
    "axisCoefficient": 22250,
    "description": "Esports collaboration switch with optimized Rapid Trigger curve."
  },
  {
    "id": 215,
    "nameEn": "Kirin / Qilin",
    "nameZh": "麒麟轴",
    "brand": "Gateron",
    "maxTravelMm": 3.44,
    "stemColor": "#38bdf8",
    "housingColor": "#38bdf833",
    "axisV2Id": 4352,
    "axisRangeMax": 3440,
    "axisCoefficient": 19100,
    "description": "Mythical Kirin theme with 3.44mm linear travel."
  },
  {
    "id": 216,
    "nameEn": "Sakura Pink",
    "nameZh": "樱花轴",
    "brand": "Gateron",
    "maxTravelMm": 3.39,
    "stemColor": "#f4abff",
    "housingColor": "#f4abff33",
    "axisV2Id": 4368,
    "axisRangeMax": 3390,
    "axisCoefficient": 22000,
    "description": "Lightweight spring with fast bottom-out clack."
  },
  {
    "id": 217,
    "nameEn": "Grey Jade Pro",
    "nameZh": "灰玉轴Pro",
    "brand": "Gateron",
    "maxTravelMm": 3.38,
    "stemColor": "#e9fcc9",
    "housingColor": "#e9fcc933",
    "axisV2Id": 4384,
    "axisRangeMax": 3385,
    "axisCoefficient": 23300,
    "description": "Heavy linear spring variant with solid low-end acoustics."
  },
  {
    "id": 218,
    "nameEn": "Xuanwu (Fully Lubed)",
    "nameZh": "玄武轴(全润)",
    "brand": "Gateron",
    "maxTravelMm": 3.37,
    "stemColor": "#4dfb32",
    "housingColor": "#4dfb3233",
    "axisV2Id": 4400,
    "axisRangeMax": 3365,
    "axisCoefficient": 20800,
    "description": "Balanced linear travel with thick stem dampening."
  },
  {
    "id": 219,
    "nameEn": "Dual-Rail White",
    "nameZh": "双轨磁白轴",
    "brand": "Gateron",
    "maxTravelMm": 4.01,
    "stemColor": "#fff3f3",
    "housingColor": "#fff3f333",
    "axisV2Id": 4416,
    "axisRangeMax": 4015,
    "axisCoefficient": 13300,
    "description": "Dual-rail zero stem wobble design with extended 4.015mm stroke."
  },
  {
    "id": 220,
    "nameEn": "Dual-Rail Orange",
    "nameZh": "双轨磁橙轴",
    "brand": "Gateron",
    "maxTravelMm": 4,
    "stemColor": "#fccb68",
    "housingColor": "#fccb6833",
    "axisV2Id": 4432,
    "axisRangeMax": 4005,
    "axisCoefficient": 15200,
    "description": "Dual-rail stabilization with warm acoustic sound profile."
  },
  {
    "id": 221,
    "nameEn": "Magnetic Yellow",
    "nameZh": "磁黄轴",
    "brand": "Gateron",
    "maxTravelMm": 3.97,
    "stemColor": "#fff06f",
    "housingColor": "#fff06f33",
    "axisV2Id": 4464,
    "axisRangeMax": 3970,
    "axisCoefficient": 15300,
    "description": "Extended 3.97mm travel with rapid magnetic reset flux."
  },
  {
    "id": 222,
    "nameEn": "Magnetic Black",
    "nameZh": "磁黑轴",
    "brand": "Gateron",
    "maxTravelMm": 3.4,
    "stemColor": "#c1bfbf",
    "housingColor": "#c1bfbf33",
    "axisV2Id": 4480,
    "axisRangeMax": 3400,
    "axisCoefficient": 17600,
    "description": "Firm heavy resistance preventing accidental fat-finger presses."
  },
  {
    "id": 223,
    "nameEn": "Magnetic Orange",
    "nameZh": "磁橙轴",
    "brand": "Gateron",
    "maxTravelMm": 3.94,
    "stemColor": "#ffc527",
    "housingColor": "#ffc52733",
    "axisV2Id": 4496,
    "axisRangeMax": 3935,
    "axisCoefficient": 19700,
    "description": "Vibrant orange stem with 3.935mm natural linear descent."
  },
  {
    "id": 224,
    "nameEn": "Magnetic Green",
    "nameZh": "磁绿轴",
    "brand": "Gateron",
    "maxTravelMm": 3.9,
    "stemColor": "#75ff30",
    "housingColor": "#75ff3033",
    "axisV2Id": 4512,
    "axisRangeMax": 3895,
    "axisCoefficient": 17200,
    "description": "Crisp green housing with 3.895mm deep bottoming clack."
  },
  {
    "id": 225,
    "nameEn": "Silent Zen (Wujing)",
    "nameZh": "悟静轴",
    "brand": "Gateron",
    "maxTravelMm": 3.62,
    "stemColor": "#f1f888",
    "housingColor": "#f1f88833",
    "axisV2Id": 4528,
    "axisRangeMax": 3615,
    "axisCoefficient": 16800,
    "description": "Acoustically silenced magnetic switch for whisper-quiet typing."
  },
  {
    "id": 226,
    "nameEn": "Pink Jade Pro",
    "nameZh": "粉磁玉轴Pro",
    "brand": "Gateron",
    "maxTravelMm": 3.42,
    "stemColor": "#f4bdff",
    "housingColor": "#f4bdff33",
    "axisV2Id": 4544,
    "axisRangeMax": 3415,
    "axisCoefficient": 23000,
    "description": "Pastel aesthetic with factory dry-film lubricant."
  },
  {
    "id": 227,
    "nameEn": "Pink Jade",
    "nameZh": "粉玉轴",
    "brand": "Gateron",
    "maxTravelMm": 3.35,
    "stemColor": "#f85ed9",
    "housingColor": "#f85ed933",
    "axisV2Id": 4560,
    "axisRangeMax": 3355,
    "axisCoefficient": 21300,
    "description": "3.355mm short bottom-out for rapid rapid-fire rhythm gaming."
  },
  {
    "id": 228,
    "nameEn": "Emerald Jade",
    "nameZh": "翠玉轴",
    "brand": "Gateron",
    "maxTravelMm": 3.35,
    "stemColor": "#4bff09",
    "housingColor": "#4bff0933",
    "axisV2Id": 4592,
    "axisRangeMax": 3355,
    "axisCoefficient": 22200,
    "description": "Deep mineral jade finish with 3.355mm stroke."
  },
  {
    "id": 229,
    "nameEn": "Jade Blade",
    "nameZh": "玉刃轴",
    "brand": "Gateron",
    "maxTravelMm": 3.48,
    "stemColor": "#38bdf8",
    "housingColor": "#38bdf833",
    "axisV2Id": 4608,
    "axisRangeMax": 3475,
    "axisCoefficient": 22200,
    "description": "Sharpened magnetic flux curve for consistent RT latency."
  },
  {
    "id": 230,
    "nameEn": "Magneto King",
    "nameZh": "万磁王",
    "brand": "TTC",
    "maxTravelMm": 3.42,
    "stemColor": "#fb4848",
    "housingColor": "#fb484833",
    "axisV2Id": 8208,
    "axisRangeMax": 3420,
    "axisCoefficient": 20500,
    "description": "Alnico high-purity permanent magnet with dual-track guidance."
  },
  {
    "id": 231,
    "nameEn": "Magneto King RGB",
    "nameZh": "万磁王RGB",
    "brand": "TTC",
    "maxTravelMm": 3.39,
    "stemColor": "#ff2121",
    "housingColor": "#ff212133",
    "axisV2Id": 8224,
    "axisRangeMax": 3390,
    "axisCoefficient": 20100,
    "description": "Optical condenser lens for maximum RGB diffusion."
  },
  {
    "id": 232,
    "nameEn": "POM Magneto King",
    "nameZh": "Pom万磁王",
    "brand": "TTC",
    "maxTravelMm": 3.39,
    "stemColor": "#e3dcff",
    "housingColor": "#e3dcff33",
    "axisV2Id": 8240,
    "axisRangeMax": 3390,
    "axisCoefficient": 21400,
    "description": "Full POM construction with deep clack and low friction."
  },
  {
    "id": 233,
    "nameEn": "Green Snake",
    "nameZh": "青蛇轴",
    "brand": "TTC",
    "maxTravelMm": 3.42,
    "stemColor": "#69ff1f",
    "housingColor": "#69ff1f33",
    "axisV2Id": 8256,
    "axisRangeMax": 3420,
    "axisCoefficient": 20600,
    "description": "High-speed esports linear with 3.42mm travel."
  },
  {
    "id": 234,
    "nameEn": "White Snake",
    "nameZh": "白蛇轴",
    "brand": "TTC",
    "maxTravelMm": 3.41,
    "stemColor": "#e8e8e8",
    "housingColor": "#e8e8e833",
    "axisV2Id": 8272,
    "axisRangeMax": 3410,
    "axisCoefficient": 20800,
    "description": "Crisp tactile bottoming clack with 3.41mm travel."
  },
  {
    "id": 235,
    "nameEn": "Sweetheart Magneto",
    "nameZh": "爱心万磁王",
    "brand": "TTC",
    "maxTravelMm": 3.39,
    "stemColor": "#f8d4e0",
    "housingColor": "#f8d4e033",
    "axisV2Id": 8288,
    "axisRangeMax": 3390,
    "axisCoefficient": 20500,
    "description": "Pastel pink dual-rail switch with silky keystroke."
  },
  {
    "id": 236,
    "nameEn": "Purple Heart Magneto",
    "nameZh": "紫心万磁王",
    "brand": "TTC",
    "maxTravelMm": 3.42,
    "stemColor": "#6f43fd",
    "housingColor": "#6f43fd33",
    "axisV2Id": 8304,
    "axisRangeMax": 3420,
    "axisCoefficient": 21000,
    "description": "Strengthened neodymium core with 3.42mm stroke."
  },
  {
    "id": 237,
    "nameEn": "Sacred Heart Magneto",
    "nameZh": "圣心万磁王",
    "brand": "TTC",
    "maxTravelMm": 3.45,
    "stemColor": "#fffafa",
    "housingColor": "#fffafa33",
    "axisV2Id": 8320,
    "axisRangeMax": 3450,
    "axisCoefficient": 19800,
    "description": "Flagship TTC magnetic switch with tightest magnetic tolerance."
  },
  {
    "id": 238,
    "nameEn": "Sun God / Apollo",
    "nameZh": "太阳神轴",
    "brand": "TTC",
    "maxTravelMm": 3.42,
    "stemColor": "#ff8000",
    "housingColor": "#ff800033",
    "axisV2Id": 8336,
    "axisRangeMax": 3420,
    "axisCoefficient": 21000,
    "description": "3.42mm linear travel with rapid reset flux."
  },
  {
    "id": 239,
    "nameEn": "Sky King",
    "nameZh": "天王轴",
    "brand": "TTC",
    "maxTravelMm": 3.46,
    "stemColor": "#60daff",
    "housingColor": "#60daff33",
    "axisV2Id": 8352,
    "axisRangeMax": 3460,
    "axisCoefficient": 20900,
    "description": "Smooth 3.46mm keystroke engineered for FPS stability."
  },
  {
    "id": 240,
    "nameEn": "Sky King Esports",
    "nameZh": "天王轴电竞",
    "brand": "TTC",
    "maxTravelMm": 3.45,
    "stemColor": "#f9a748",
    "housingColor": "#f9a74833",
    "axisV2Id": 8368,
    "axisRangeMax": 3450,
    "axisCoefficient": 20100,
    "description": "Enhanced initial resistance for zero misclicks."
  },
  {
    "id": 241,
    "nameEn": "Sky King SE",
    "nameZh": "天王SE",
    "brand": "TTC",
    "maxTravelMm": 3.44,
    "stemColor": "#e8fff4",
    "housingColor": "#e8fff433",
    "axisV2Id": 8384,
    "axisRangeMax": 3440,
    "axisCoefficient": 18352,
    "description": "Special edition with 3.44mm stroke."
  },
  {
    "id": 242,
    "nameEn": "Soldier King",
    "nameZh": "兵王轴",
    "brand": "TTC",
    "maxTravelMm": 3.48,
    "stemColor": "#af7c05",
    "housingColor": "#af7c0533",
    "axisV2Id": 8400,
    "axisRangeMax": 3480,
    "axisCoefficient": 20500,
    "description": "Heavy bottom-out acoustics with 3.48mm travel."
  },
  {
    "id": 243,
    "nameEn": "Soldier King Pro",
    "nameZh": "兵王轴Pro",
    "brand": "TTC",
    "maxTravelMm": 3.44,
    "stemColor": "#ffdf5d",
    "housingColor": "#ffdf5d33",
    "axisV2Id": 8416,
    "axisRangeMax": 3440,
    "axisCoefficient": 21000,
    "description": "Upgraded stem stability with 3.44mm travel."
  },
  {
    "id": 244,
    "nameEn": "Ice Snow (Lingxue)",
    "nameZh": "凌雪轴",
    "brand": "TTC",
    "maxTravelMm": 3.51,
    "stemColor": "#28f0ff",
    "housingColor": "#28f0ff33",
    "axisV2Id": 8432,
    "axisRangeMax": 3510,
    "axisCoefficient": 20000,
    "description": "Frosty clear housing with 3.51mm travel."
  },
  {
    "id": 245,
    "nameEn": "Dragon God",
    "nameZh": "龙神轴",
    "brand": "TTC",
    "maxTravelMm": 3.47,
    "stemColor": "#9131fd",
    "housingColor": "#9131fd33",
    "axisV2Id": 8448,
    "axisRangeMax": 3470,
    "axisCoefficient": 19100,
    "description": "Deep violet housing with 3.47mm bottom-out."
  },
  {
    "id": 246,
    "nameEn": "Elf King",
    "nameZh": "精灵王轴",
    "brand": "TTC",
    "maxTravelMm": 3.47,
    "stemColor": "#6cfff6",
    "housingColor": "#6cfff633",
    "axisV2Id": 8464,
    "axisRangeMax": 3470,
    "axisCoefficient": 19500,
    "description": "Ultra-smooth POM stem with 3.47mm travel."
  },
  {
    "id": 247,
    "nameEn": "Tai-A Sword",
    "nameZh": "太阿磁轴",
    "brand": "TTC",
    "maxTravelMm": 3.47,
    "stemColor": "#ffb93f",
    "housingColor": "#ffb93f33",
    "axisV2Id": 8480,
    "axisRangeMax": 3470,
    "axisCoefficient": 19700,
    "description": "Crisp bottom-out acoustics and rapid RT trigger."
  },
  {
    "id": 248,
    "nameEn": "Kotai Magnetic",
    "nameZh": "科泰轴",
    "brand": "TTC",
    "maxTravelMm": 3.42,
    "stemColor": "#f2bc05",
    "housingColor": "#f2bc0533",
    "axisV2Id": 8496,
    "axisRangeMax": 3420,
    "axisCoefficient": 16672,
    "description": "Stable 3.42mm stroke with linear flux."
  },
  {
    "id": 249,
    "nameEn": "Cullinan",
    "nameZh": "库里南轴",
    "brand": "Everglide",
    "maxTravelMm": 3.6,
    "stemColor": "#eaeaea",
    "housingColor": "#eaeaea33",
    "axisV2Id": 19504,
    "axisRangeMax": 3600,
    "axisCoefficient": 19456,
    "description": "WS Studio x Everglide diamond-cut high transparency switch with 3.60mm travel."
  },
  {
    "id": 250,
    "nameEn": "Ice Emperor",
    "nameZh": "冰皇轴",
    "brand": "Other",
    "maxTravelMm": 3.36,
    "stemColor": "#eeeeee",
    "housingColor": "#eeeeee33",
    "axisV2Id": 12368,
    "axisRangeMax": 3360,
    "axisCoefficient": 20500,
    "description": "Crystal clear housing with 3.36mm travel."
  },
  {
    "id": 251,
    "nameEn": "Titanium Ti",
    "nameZh": "ti轴",
    "brand": "Other",
    "maxTravelMm": 3.34,
    "stemColor": "#d9c5b3",
    "housingColor": "#d9c5b333",
    "axisV2Id": 12400,
    "axisRangeMax": 3340,
    "axisCoefficient": 20200,
    "description": "Titanium alloy aesthetic with 3.34mm stroke."
  },
  {
    "id": 252,
    "nameEn": "Ascension Pro",
    "nameZh": "登神Pro",
    "brand": "Other",
    "maxTravelMm": 3.36,
    "stemColor": "#caa1ff",
    "housingColor": "#caa1ff33",
    "axisV2Id": 12416,
    "axisRangeMax": 3360,
    "axisCoefficient": 21300,
    "description": "Latenpow Looting Ascension Pro. FPS esports flagship with HiFi acoustic sound."
  },
  {
    "id": 253,
    "nameEn": "UR Ice Magnetic",
    "nameZh": "UR冰磁轴",
    "brand": "Other",
    "maxTravelMm": 3.31,
    "stemColor": "#ffd9d9",
    "housingColor": "#ffd9d933",
    "axisV2Id": 12432,
    "axisRangeMax": 3310,
    "axisCoefficient": 20500,
    "description": "Ultra-rapid ice magnetic switch with 3.31mm stroke."
  },
  {
    "id": 254,
    "nameEn": "Koi Carp",
    "nameZh": "锦鲤轴",
    "brand": "Other",
    "maxTravelMm": 3.34,
    "stemColor": "#fcadad",
    "housingColor": "#fcadad33",
    "axisV2Id": 12448,
    "axisRangeMax": 3340,
    "axisCoefficient": 21500,
    "description": "Crimson linear with 3.34mm stroke."
  },
  {
    "id": 255,
    "nameEn": "Wukong",
    "nameZh": "悟空轴",
    "brand": "Everglide",
    "maxTravelMm": 3.39,
    "stemColor": "#ebebeb",
    "housingColor": "#ebebeb33",
    "axisV2Id": 12464,
    "axisRangeMax": 3390,
    "axisCoefficient": 20100,
    "description": "Stock AE64 Pro switch with 3.39mm linear stroke and neodymium core."
  },
  {
    "id": 256,
    "nameEn": "Pink Emperor",
    "nameZh": "粉皇轴",
    "brand": "Other",
    "maxTravelMm": 3.45,
    "stemColor": "#ffe043",
    "housingColor": "#ffe04333",
    "axisV2Id": 12512,
    "axisRangeMax": 3450,
    "axisCoefficient": 21600,
    "description": "Bright 3.45mm linear with fast return spring."
  },
  {
    "id": 257,
    "nameEn": "Xingyi Martial",
    "nameZh": "形意轴",
    "brand": "Other",
    "maxTravelMm": 3.38,
    "stemColor": "#dddddd",
    "housingColor": "#dddddd33",
    "axisV2Id": 12560,
    "axisRangeMax": 3380,
    "axisCoefficient": 20000,
    "description": "Firm 3.38mm travel with balanced clack."
  },
  {
    "id": 258,
    "nameEn": "Skyline Magnetic",
    "nameZh": "天际线轴",
    "brand": "Other",
    "maxTravelMm": 3.55,
    "stemColor": "#d3e4ff",
    "housingColor": "#d3e4ff33",
    "axisV2Id": 12608,
    "axisRangeMax": 3550,
    "axisCoefficient": 18600,
    "description": "Smooth 3.50mm-3.55mm linear travel."
  },
  {
    "id": 259,
    "nameEn": "God of Magnetism",
    "nameZh": "磁神轴",
    "brand": "Other",
    "maxTravelMm": 3.47,
    "stemColor": "#049217",
    "housingColor": "#04921733",
    "axisV2Id": 12656,
    "axisRangeMax": 3470,
    "axisCoefficient": 21000,
    "description": "Precision engineered linear with 3.47mm travel."
  },
  {
    "id": 260,
    "nameEn": "Azure Sky Pro",
    "nameZh": "天青轴Pro",
    "brand": "Other",
    "maxTravelMm": 3.61,
    "stemColor": "#74e1fd",
    "housingColor": "#74e1fd33",
    "axisV2Id": 12704,
    "axisRangeMax": 3610,
    "axisCoefficient": 18100,
    "description": "High-precision esports switch with 3.61mm stroke."
  },
  {
    "id": 261,
    "nameEn": "Purple Star",
    "nameZh": "紫星轴",
    "brand": "Other",
    "maxTravelMm": 3.55,
    "stemColor": "#cbadff",
    "housingColor": "#cbadff33",
    "axisV2Id": 12720,
    "axisRangeMax": 3550,
    "axisCoefficient": 18600,
    "description": "Vibrant purple housing with 3.55mm stroke."
  },
  {
    "id": 262,
    "nameEn": "Chixiao Imperial Sword",
    "nameZh": "赤霄轴",
    "brand": "Other",
    "maxTravelMm": 3.54,
    "stemColor": "#fff897",
    "housingColor": "#fff89733",
    "axisV2Id": 12736,
    "axisRangeMax": 3540,
    "axisCoefficient": 19900,
    "description": "Imperial yellow stem with 3.54mm travel."
  },
  {
    "id": 263,
    "nameEn": "Ultra-Magnetic Pro+",
    "nameZh": "极磁轴Pro+",
    "brand": "Other",
    "maxTravelMm": 3.65,
    "stemColor": "#fcc4b5",
    "housingColor": "#fcc4b533",
    "axisV2Id": 13088,
    "axisRangeMax": 3650,
    "axisCoefficient": 17300,
    "description": "Extended 3.65mm travel with high flux density."
  },
  {
    "id": 264,
    "nameEn": "Ultra-Magnetic Pro",
    "nameZh": "极磁轴Pro",
    "brand": "Other",
    "maxTravelMm": 3.58,
    "stemColor": "#fedada",
    "housingColor": "#fedada33",
    "axisV2Id": 13104,
    "axisRangeMax": 3585,
    "axisCoefficient": 18500,
    "description": "Stable 3.585mm stroke."
  },
  {
    "id": 265,
    "nameEn": "Ultra-Magnetic RGB",
    "nameZh": "极磁轴RGB",
    "brand": "Other",
    "maxTravelMm": 3.58,
    "stemColor": "#fff6f6",
    "housingColor": "#fff6f633",
    "axisV2Id": 13120,
    "axisRangeMax": 3580,
    "axisCoefficient": 19000,
    "description": "RGB optimized housing with 3.58mm stroke."
  },
  {
    "id": 266,
    "nameEn": "Ultra-Mag Zhuohua",
    "nameZh": "极磁-灼华轴",
    "brand": "Other",
    "maxTravelMm": 3.65,
    "stemColor": "#f7d8fe",
    "housingColor": "#f7d8fe33",
    "axisV2Id": 13136,
    "axisRangeMax": 3645,
    "axisCoefficient": 16950,
    "description": "Pastel purple 3.645mm linear switch."
  },
  {
    "id": 267,
    "nameEn": "Ultra-Mag Hunyuan",
    "nameZh": "极磁-混元轴",
    "brand": "Other",
    "maxTravelMm": 3.65,
    "stemColor": "#e4e4e4",
    "housingColor": "#e4e4e433",
    "axisV2Id": 13152,
    "axisRangeMax": 3655,
    "axisCoefficient": 19200,
    "description": "Neutral grey 3.655mm linear."
  },
  {
    "id": 268,
    "nameEn": "Ultra-Mag Black Jade",
    "nameZh": "极磁-墨玉轴",
    "brand": "Other",
    "maxTravelMm": 3.6,
    "stemColor": "#d3f89c",
    "housingColor": "#d3f89c33",
    "axisV2Id": 13168,
    "axisRangeMax": 3605,
    "axisCoefficient": 18900,
    "description": "Dark green clack switch with 3.605mm stroke."
  },
  {
    "id": 269,
    "nameEn": "Ultra-Mag Sakura Clear",
    "nameZh": "极磁-樱澈轴",
    "brand": "Other",
    "maxTravelMm": 3.63,
    "stemColor": "#f2b9f8",
    "housingColor": "#f2b9f833",
    "axisV2Id": 13184,
    "axisRangeMax": 3625,
    "axisCoefficient": 22200,
    "description": "Crystal pink with 3.625mm stroke."
  },
  {
    "id": 270,
    "nameEn": "Skyline Magnetic",
    "nameZh": "天际线轴",
    "brand": "Other",
    "maxTravelMm": 3.5,
    "stemColor": "#4dd1f9",
    "housingColor": "#4dd1f933",
    "axisV2Id": 13472,
    "axisRangeMax": 3500,
    "axisCoefficient": 17536,
    "description": "Smooth 3.50mm-3.55mm linear travel."
  },
  {
    "id": 271,
    "nameEn": "Bingyao Obsidian",
    "nameZh": "冰曜轴",
    "brand": "Other",
    "maxTravelMm": 3.2,
    "stemColor": "#54a9e1",
    "housingColor": "#54a9e133",
    "axisV2Id": 13665,
    "axisRangeMax": 3200,
    "axisCoefficient": 25728,
    "description": "Speed switch with 3.20mm stroke and 25728 coefficient."
  },
  {
    "id": 272,
    "nameEn": "Xueyao Snow Obsidian",
    "nameZh": "雪曜轴",
    "brand": "Other",
    "maxTravelMm": 3.2,
    "stemColor": "#ffffff",
    "housingColor": "#ffffff33",
    "axisV2Id": 13681,
    "axisRangeMax": 3200,
    "axisCoefficient": 25728,
    "description": "Speed switch with 3.20mm stroke and 25728 coefficient."
  },
  {
    "id": 273,
    "nameEn": "Studio 035",
    "nameZh": "035轴",
    "brand": "Other",
    "maxTravelMm": 3.4,
    "stemColor": "#ababab",
    "housingColor": "#ababab33",
    "axisV2Id": 14864,
    "axisRangeMax": 3400,
    "axisCoefficient": 18688,
    "description": "Minimalist grey 3.40mm linear."
  },
  {
    "id": 274,
    "nameEn": "Babao Alpha",
    "nameZh": "八宝轴α",
    "brand": "Other",
    "maxTravelMm": 3.5,
    "stemColor": "#f2f2f2",
    "housingColor": "#f2f2f233",
    "axisV2Id": 12336,
    "axisRangeMax": 3500,
    "axisCoefficient": 22000,
    "description": "Diamond-cut octagonal housing with 3.50mm travel."
  },
  {
    "id": 275,
    "nameEn": "Babao Linear",
    "nameZh": "八宝轴L",
    "brand": "Other",
    "maxTravelMm": 3.5,
    "stemColor": "#ece8e8",
    "housingColor": "#ece8e833",
    "axisV2Id": 12352,
    "axisRangeMax": 3500,
    "axisCoefficient": 20200,
    "description": "Smooth 3.50mm travel with 20200 coefficient."
  }
];

/**
 * Finds a magnetic switch profile by hardware axisV2Id, preferred local profile ID, or travel distance.
 */
export function findSwitchById(axisV2Id: number, preferredProfileId?: number, axisRangeMax?: number): MagneticSwitchProfile {
  // If user specifically assigned a profile in Anakeyn (e.g. Siren V4 vs Cullinan)
  if (preferredProfileId) {
    const pref = SWITCH_DATABASE.find((s) => s.id === preferredProfileId);
    if (pref) return pref;
  }

  // If 0, null, or undefined, default to Siren V4 (100) or Ascension Pro (12416) or Wukong (12464)
  if (!axisV2Id || axisV2Id === 0) {
    return (
      SWITCH_DATABASE.find((s) => s.id === 100) ||
      SWITCH_DATABASE.find((s) => s.axisV2Id === 12416) ||
      SWITCH_DATABASE[0]
    );
  }

  // Handle Everglide / Jiang Wan hardware profile (14544, 19504):
  // In firmware v0.1.0.0, Everglide updated the factory default Siren V4 profile ID to 14544 (coeff 17664, 3.40mm).
  // Disambiguate between Siren V4 (3.40mm / 3400um) and Cullinan (3.60mm / 3600um)
  if (axisV2Id === 14544 || axisV2Id === 19504) {
    if (preferredProfileId === 249) return SWITCH_DATABASE.find((s) => s.id === 249)!;
    if (preferredProfileId === 100) return SWITCH_DATABASE.find((s) => s.id === 100)!;
    if (axisRangeMax && axisRangeMax > 3450) {
      // 3600um = Cullinan
      return SWITCH_DATABASE.find((s) => s.id === 249) || SWITCH_DATABASE.find((s) => s.id === 100)!;
    }
    // <= 3450um (3400um) = Siren V4
    return SWITCH_DATABASE.find((s) => s.id === 100) || SWITCH_DATABASE.find((s) => s.id === 249)!;
  }

  // Exact hardware match by axisV2Id
  const found = SWITCH_DATABASE.find((s) => s.axisV2Id === axisV2Id);
  if (found) return found;

  // Unknown hardware switch ID: return dynamic profile displaying real hardware ID
  return {
    id: 90000 + axisV2Id,
    nameEn: `HW Axis #${axisV2Id}`,
    nameZh: `硬件轴体 #${axisV2Id}`,
    brand: 'Other',
    maxTravelMm: 3.5,
    stemColor: '#a855f7',
    housingColor: 'rgba(168, 85, 247, 0.25)',
    axisV2Id: axisV2Id,
    axisRangeMax: axisRangeMax || 3500,
    axisCoefficient: 20000,
    description: `Hardware reported switch with ID ${axisV2Id}.`,
  };
}
