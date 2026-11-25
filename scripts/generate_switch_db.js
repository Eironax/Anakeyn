import fs from 'fs';

const rawData = JSON.parse(fs.readFileSync('all_switches.json', 'utf8'));

// High-precision curated English translations and brand mappings
const translations = {
  // GATERON
  '磁玉轴': { en: 'Magnetic Jade', brand: 'Gateron', desc: 'The esports standard. Box stem with closed bottom clack.' },
  '磁玉Pro': { en: 'Magnetic Jade Pro', brand: 'Gateron', desc: 'Pre-lubed dual-rail stability with shortened bottom-out.' },
  '磁玉Gaming': { en: 'Magnetic Jade Gaming', brand: 'Gateron', desc: 'Light initial force for lightning counter-strafing.' },
  '磁玉Air': { en: 'Magnetic Jade Air', brand: 'Gateron', desc: 'Feather-light actuation with air-cushioned bottom-out.' },
  '玉京子轴': { en: 'Jade King (Yujingzi)', brand: 'Gateron', desc: 'Custom acoustic blend housing with 3.42mm travel.' },
  '绿龙轴': { en: 'Green Dragon', brand: 'Gateron', desc: 'High magnetic flux density core with crisp clack.' },
  '阿波罗轴': { en: 'Apollo Ultra-Short', brand: 'Gateron', desc: 'Ultra-low 3.13mm bottom-out for maximum reaction speed.' },
  '磁玉Max': { en: 'Magnetic Jade Max', brand: 'Gateron', desc: 'Reinforced stem walls for near-zero stem rock.' },
  '花火轴': { en: 'Hanabi / Fireworks', brand: 'Gateron', desc: '3.15mm short-throw speed switch with vibrant polycarbonate housing.' },
  '磁玉Pom': { en: 'Magnetic Jade POM', brand: 'Gateron', desc: 'Full POM construction for self-lubricating silky glide.' },
  '紫龙轴': { en: 'Purple Dragon', brand: 'Gateron', desc: 'High-energy rare earth magnet with 3.335mm stroke.' },
  '赤龙轴(自润)': { en: 'Red Dragon (Lubed)', brand: 'Gateron', desc: 'Factory lubricated speed linear with 3.38mm travel.' },
  '星轨磁轴': { en: 'Star Orbit Magnetic', brand: 'Gateron', desc: 'Extended 3.945mm keystroke with smooth Hall linearity.' },
  '金龙轴': { en: 'Golden Dragon', brand: 'Gateron', desc: 'Gold-plated spring with crisp 3.34mm bottom-out.' },
  '封底雪刀轴': { en: 'Snow Blade', brand: 'Gateron', desc: 'Esports collaboration switch with optimized Rapid Trigger curve.' },
  '麒麟轴': { en: 'Kirin / Qilin', brand: 'Gateron', desc: 'Mythical Kirin theme with 3.44mm linear travel.' },
  '樱花轴': { en: 'Sakura Pink', brand: 'Gateron', desc: 'Lightweight spring with fast bottom-out clack.' },
  '灰玉轴Pro': { en: 'Grey Jade Pro', brand: 'Gateron', desc: 'Heavy linear spring variant with solid low-end acoustics.' },
  '玄武轴(全润)': { en: 'Xuanwu (Fully Lubed)', brand: 'Gateron', desc: 'Balanced linear travel with thick stem dampening.' },
  '双轨磁白轴': { en: 'Dual-Rail White', brand: 'Gateron', desc: 'Dual-rail zero stem wobble design with extended 4.015mm stroke.' },
  '双轨磁橙轴': { en: 'Dual-Rail Orange', brand: 'Gateron', desc: 'Dual-rail stabilization with warm acoustic sound profile.' },
  '磁黄轴': { en: 'Magnetic Yellow', brand: 'Gateron', desc: 'Extended 3.97mm travel with rapid magnetic reset flux.' },
  '磁黑轴': { en: 'Magnetic Black', brand: 'Gateron', desc: 'Firm heavy resistance preventing accidental fat-finger presses.' },
  '磁橙轴': { en: 'Magnetic Orange', brand: 'Gateron', desc: 'Vibrant orange stem with 3.935mm natural linear descent.' },
  '磁绿轴': { en: 'Magnetic Green', brand: 'Gateron', desc: 'Crisp green housing with 3.895mm deep bottoming clack.' },
  '悟静轴': { en: 'Silent Zen (Wujing)', brand: 'Gateron', desc: 'Acoustically silenced magnetic switch for whisper-quiet typing.' },
  '粉磁玉轴Pro': { en: 'Pink Jade Pro', brand: 'Gateron', desc: 'Pastel aesthetic with factory dry-film lubricant.' },
  '粉玉轴': { en: 'Pink Jade', brand: 'Gateron', desc: '3.355mm short bottom-out for rapid rapid-fire rhythm gaming.' },
  '翠玉轴': { en: 'Emerald Jade', brand: 'Gateron', desc: 'Deep mineral jade finish with 3.355mm stroke.' },
  '玉刃轴': { en: 'Jade Blade', brand: 'Gateron', desc: 'Sharpened magnetic flux curve for consistent RT latency.' },

  // TTC
  '万磁王': { en: 'Magneto King', brand: 'TTC', desc: 'Alnico high-purity permanent magnet with dual-track guidance.' },
  '万磁王RGB': { en: 'Magneto King RGB', brand: 'TTC', desc: 'Optical condenser lens for maximum RGB diffusion.' },
  'Pom万磁王': { en: 'POM Magneto King', brand: 'TTC', desc: 'Full POM construction with deep clack and low friction.' },
  '青蛇轴': { en: 'Green Snake', brand: 'TTC', desc: 'High-speed esports linear with 3.42mm travel.' },
  '白蛇轴': { en: 'White Snake', brand: 'TTC', desc: 'Crisp tactile bottoming clack with 3.41mm travel.' },
  '爱心万磁王': { en: 'Sweetheart Magneto', brand: 'TTC', desc: 'Pastel pink dual-rail switch with silky keystroke.' },
  '紫心万磁王': { en: 'Purple Heart Magneto', brand: 'TTC', desc: 'Strengthened neodymium core with 3.42mm stroke.' },
  '圣心万磁王': { en: 'Sacred Heart Magneto', brand: 'TTC', desc: 'Flagship TTC magnetic switch with tightest magnetic tolerance.' },
  '太阳神轴': { en: 'Sun God / Apollo', brand: 'TTC', desc: '3.42mm linear travel with rapid reset flux.' },
  '天王轴': { en: 'Sky King', brand: 'TTC', desc: 'Smooth 3.46mm keystroke engineered for FPS stability.' },
  '天王轴电竞': { en: 'Sky King Esports', brand: 'TTC', desc: 'Enhanced initial resistance for zero misclicks.' },
  '天王SE': { en: 'Sky King SE', brand: 'TTC', desc: 'Special edition with 3.44mm stroke.' },
  '兵王轴': { en: 'Soldier King', brand: 'TTC', desc: 'Heavy bottom-out acoustics with 3.48mm travel.' },
  '兵王轴Pro': { en: 'Soldier King Pro', brand: 'TTC', desc: 'Upgraded stem stability with 3.44mm travel.' },
  '凌雪轴': { en: 'Ice Snow (Lingxue)', brand: 'TTC', desc: 'Frosty clear housing with 3.51mm travel.' },
  '龙神轴': { en: 'Dragon God', brand: 'TTC', desc: 'Deep violet housing with 3.47mm bottom-out.' },
  '精灵王轴': { en: 'Elf King', brand: 'TTC', desc: 'Ultra-smooth POM stem with 3.47mm travel.' },
  '太阿磁轴': { en: 'Tai-A Sword', brand: 'TTC', desc: 'Crisp bottom-out acoustics and rapid RT trigger.' },
  '科泰轴': { en: 'Kotai Magnetic', brand: 'TTC', desc: 'Stable 3.42mm stroke with linear flux.' },

  // EVERGLIDE / JIANG WAN
  '库里南轴': { en: 'Cullinan', brand: 'Everglide', desc: 'WS Studio x Everglide diamond-cut high transparency switch with 3.60mm travel.' },
  '悟空轴': { en: 'Wukong', brand: 'Everglide', desc: 'Stock AE64 Pro switch with 3.39mm linear stroke and neodymium core.' },

  // OTHER NOTABLE
  '登神Pro': { en: 'Ascension Pro', brand: 'Other', desc: 'Latenpow Looting Ascension Pro. FPS esports flagship with HiFi acoustic sound.' },
  '冰皇轴': { en: 'Ice Emperor', brand: 'Other', desc: 'Crystal clear housing with 3.36mm travel.' },
  'ti轴': { en: 'Titanium Ti', brand: 'Other', desc: 'Titanium alloy aesthetic with 3.34mm stroke.' },
  'UR冰磁轴': { en: 'UR Ice Magnetic', brand: 'Other', desc: 'Ultra-rapid ice magnetic switch with 3.31mm stroke.' },
  '锦鲤轴': { en: 'Koi Carp', brand: 'Other', desc: 'Crimson linear with 3.34mm stroke.' },
  '粉皇轴': { en: 'Pink Emperor', brand: 'Other', desc: 'Bright 3.45mm linear with fast return spring.' },
  '形意轴': { en: 'Xingyi Martial', brand: 'Other', desc: 'Firm 3.38mm travel with balanced clack.' },
  '天际线轴': { en: 'Skyline Magnetic', brand: 'Other', desc: 'Smooth 3.50mm-3.55mm linear travel.' },
  '磁神轴': { en: 'God of Magnetism', brand: 'Other', desc: 'Precision engineered linear with 3.47mm travel.' },
  '天青轴Pro': { en: 'Azure Sky Pro', brand: 'Other', desc: 'High-precision esports switch with 3.61mm stroke.' },
  '紫星轴': { en: 'Purple Star', brand: 'Other', desc: 'Vibrant purple housing with 3.55mm stroke.' },
  '赤霄轴': { en: 'Chixiao Imperial Sword', brand: 'Other', desc: 'Imperial yellow stem with 3.54mm travel.' },
  '极磁轴Pro+': { en: 'Ultra-Magnetic Pro+', brand: 'Other', desc: 'Extended 3.65mm travel with high flux density.' },
  '极磁轴Pro': { en: 'Ultra-Magnetic Pro', brand: 'Other', desc: 'Stable 3.585mm stroke.' },
  '极磁轴RGB': { en: 'Ultra-Magnetic RGB', brand: 'Other', desc: 'RGB optimized housing with 3.58mm stroke.' },
  '极磁-灼华轴': { en: 'Ultra-Mag Zhuohua', brand: 'Other', desc: 'Pastel purple 3.645mm linear switch.' },
  '极磁-混元轴': { en: 'Ultra-Mag Hunyuan', brand: 'Other', desc: 'Neutral grey 3.655mm linear.' },
  '极磁-墨玉轴': { en: 'Ultra-Mag Black Jade', brand: 'Other', desc: 'Dark green clack switch with 3.605mm stroke.' },
  '极磁-樱澈轴': { en: 'Ultra-Mag Sakura Clear', brand: 'Other', desc: 'Crystal pink with 3.625mm stroke.' },
  '冰曜轴': { en: 'Bingyao Obsidian', brand: 'Other', desc: 'Speed switch with 3.20mm stroke and 25728 coefficient.' },
  '雪曜轴': { en: 'Xueyao Snow Obsidian', brand: 'Other', desc: 'Speed switch with 3.20mm stroke and 25728 coefficient.' },
  '035轴': { en: 'Studio 035', brand: 'Other', desc: 'Minimalist grey 3.40mm linear.' },
  '八宝轴α': { en: 'Babao Alpha', brand: 'Other', desc: 'Diamond-cut octagonal housing with 3.50mm travel.' },
  '八宝轴L': { en: 'Babao Linear', brand: 'Other', desc: 'Smooth 3.50mm travel with 20200 coefficient.' },
};

const seenV2Ids = new Set();
const profiles = [];

// First add Siren V4 (Everglide flagship)
profiles.push({
  id: 100,
  nameEn: 'Siren V4',
  nameZh: '海妖V4轴',
  brand: 'Everglide',
  maxTravelMm: 3.40,
  stemColor: '#0ea5e9',
  housingColor: 'rgba(14, 165, 233, 0.25)',
  axisV2Id: 19504, // Official Everglide / Jiang Wan hardware ID accepted and burned to onboard flash by AE64 MCU
  axisRangeMax: 3400, // 3.40mm bottom-out stroke
  axisCoefficient: 19456,
  description: 'Everglide flagship linear magnetic switch. 3.40mm bottom-out, high 640 Gs flux, 20mm extended spring, and creamy acoustics.',
});

let idCounter = 200;

for (const brandGroup of rawData) {
  for (const sw of brandGroup.list || []) {
    const detail = sw.aixsDetail && sw.aixsDetail[0];
    if (!detail) continue;
    const v2Id = Number(detail.axis_id);
    if (seenV2Ids.has(v2Id)) continue;
    seenV2Ids.add(v2Id);

    const nameZh = sw.axis_name;
    const info = translations[nameZh] || {
      en: nameZh,
      brand: brandGroup.type_name_en === 'GATERON' ? 'Gateron' : brandGroup.type_name_en === 'TTC' ? 'TTC' : 'Other',
      desc: `High performance Hall effect switch with ${detail.axis_range_max / 1000}mm travel.`,
    };

    const maxTravelMm = Number((detail.axis_range_max / 1000).toFixed(2));
    const hex = (sw.axis_color && sw.axis_color !== '#') ? sw.axis_color : '#38bdf8';

    profiles.push({
      id: idCounter++,
      nameEn: info.en,
      nameZh: nameZh,
      brand: info.brand,
      maxTravelMm: maxTravelMm,
      stemColor: hex,
      housingColor: hex.startsWith('#') ? `${hex}33` : 'rgba(56, 189, 248, 0.2)',
      axisV2Id: v2Id,
      axisRangeMax: detail.axis_range_max,
      axisCoefficient: detail.axis_coefficient,
      description: info.desc || `${info.en} magnetic switch with ${maxTravelMm}mm travel.`,
    });
  }
}

console.log(`Generated ${profiles.length} switch profiles.`);

const code = `/**
 * Anakey — Built-in Magnetic Switch Profiles Database
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

export const SWITCH_DATABASE: MagneticSwitchProfile[] = ${JSON.stringify(profiles, null, 2)};

/**
 * Finds a magnetic switch profile by hardware axisV2Id, preferred local profile ID, or travel distance.
 */
export function findSwitchById(axisV2Id: number, preferredProfileId?: number, axisRangeMax?: number): MagneticSwitchProfile {
  // If user specifically assigned a profile in Anakey (e.g. Siren V4 vs Cullinan)
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

  // Handle Everglide / Jiang Wan hardware profile (19504):
  // Disambiguate between Siren V4 (3.40mm / 3400um) and Cullinan (3.60mm / 3600um)
  if (axisV2Id === 19504) {
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
    nameEn: \`HW Axis #\${axisV2Id}\`,
    nameZh: \`硬件轴体 #\${axisV2Id}\`,
    brand: 'Other',
    maxTravelMm: 3.5,
    stemColor: '#a855f7',
    housingColor: 'rgba(168, 85, 247, 0.25)',
    axisV2Id: axisV2Id,
    axisRangeMax: axisRangeMax || 3500,
    axisCoefficient: 20000,
    description: \`Hardware reported switch with ID \${axisV2Id}.\`,
  };
}
`;

fs.writeFileSync('src/core/performance/switchDatabase.ts', code, 'utf8');
console.log('Successfully wrote src/core/performance/switchDatabase.ts');
