import costCodesTaxonomy from '../data/costCodesTaxonomy.json';

interface CostCode {
  code: string;
  name: string;
  fullName: string;
}

interface CostCodeCategory {
  id: string;
  name: string;
  codes: CostCode[];
}

interface CostCodesTaxonomy {
  categories: Record<string, CostCodeCategory>;
  allCodes: string[];
  codeToCategory: Record<string, string>;
}

const taxonomy = costCodesTaxonomy as CostCodesTaxonomy;

// Keyword mappings for smart cost code assignment
const KEYWORD_MAPPINGS: Record<string, string[]> = {
  // Preparation and Preliminaries (1000-1999)
  '1000': ['permit', 'permits', 'permission', 'license', 'licensing'],
  '1010': ['plan', 'blueprint', 'blueprints', 'drawing', 'drawings', 'architectural'],
  '1020': ['design', 'engineering', 'engineer', 'architect', 'designer'],
  '1030': ['survey', 'surveys', 'surveying', 'boundary', 'topographic'],
  '1040': ['supervision', 'supervisor', 'site supervision', 'oversight'],
  '1050': ['equipment rental', 'rental equipment', 'equipment rent', 'rental'],
  '1060': ['temporary electric', 'temp electric', 'temporary power', 'temp power'],
  '1070': ['well', 'wells', 'water well', 'drilling'],
  '1080': ['water service', 'water connection', 'water hookup'],
  '1090': ['septic', 'septic system', 'sewer treatment'],
  '1100': ['sewer', 'sewer system', 'sewer connection', 'sewer hookup'],
  '1110': ['gas service', 'gas connection', 'gas hookup', 'natural gas'],
  '1120': ['electric service', 'electrical service', 'power connection'],
  '1130': ['telephone', 'phone', 'telecom', 'telecommunications'],
  '1140': ['utility', 'utilities', 'utility connection'],
  '1150': ['clearing', 'lot clearing', 'site clearing', 'tree removal'],
  '1160': ['fill', 'fill dirt', 'fill material', 'backfill'],
  '1170': ['demolition material', 'demo material', 'demolition debris'],
  '1180': ['demolition labor', 'demo labor', 'demolition work', 'demo work'],

  // Excavation and Foundation (2000-2999)
  '2000': ['excavation', 'excavating', 'digging', 'backfill'],
  '2010': ['grading', 'rough grading', 'site grading'],
  '2020': ['hauling', 'earth hauling', 'dirt hauling', 'material hauling'],
  '2030': ['shoring', 'shoring system', 'retaining wall'],
  '2040': ['underground plumbing', 'plumbing material', 'pipe material'],
  '2050': ['underground plumbing labor', 'plumbing labor'],
  '2060': ['footing', 'footings', 'foundation material', 'concrete foundation'],
  '2070': ['foundation labor', 'footing labor', 'concrete labor'],
  '2080': ['rebar', 'reinforcing steel', 'rebar steel'],
  '2090': ['waterproofing', 'waterproof', 'sealing'],
  '2100': ['termite', 'termite protection', 'pest control'],

  // Rough Structure (3000-3999)
  '3000': ['structural steel', 'steel frame', 'steel structure'],
  '3010': ['framing material', 'lumber', 'wood frame', 'structural lumber'],
  '3020': ['framing labor', 'framing work', 'carpenter'],
  '3030': ['rough plumbing material', 'plumbing rough', 'plumbing supply'],
  '3040': ['rough plumbing labor', 'plumbing rough labor'],
  '3050': ['rough electrical material', 'electrical rough', 'electrical supply'],
  '3060': ['rough electrical labor', 'electrical rough labor'],
  '3070': ['rough hvac material', 'hvac rough', 'hvac supply'],
  '3080': ['rough hvac labor', 'hvac rough labor'],

  // Full Enclosure (4000-4999)
  '4000': ['roofing material', 'roof material', 'shingle', 'roofing supply'],
  '4010': ['roofing labor', 'roofing work', 'roofer'],
  '4020': ['gutter', 'gutters', 'downspout', 'downspouts'],
  '4030': ['fireplace', 'chimney', 'hearth'],
  '4040': ['masonry material', 'brick', 'stone', 'block'],
  '4050': ['masonry labor', 'masonry work', 'mason'],
  '4060': ['window material', 'windows', 'window supply'],
  '4070': ['window install', 'window installation', 'window labor'],
  '4080': ['exterior door material', 'exterior doors', 'door material'],
  '4090': ['exterior door install', 'door installation', 'door labor'],
  '4100': ['insulation material', 'insulation', 'insulating'],
  '4110': ['insulation labor', 'insulation work', 'insulation install'],
  '4120': ['siding', 'exterior siding', 'trim material', 'exterior trim'],
  '4130': ['siding labor', 'trim labor', 'exterior finish'],
  '4140': ['exterior painting material', 'exterior paint', 'exterior primer'],
  '4150': ['exterior painting labor', 'exterior painting', 'exterior painter'],

  // Finishing Trades (5000-5999)
  '5000': ['drywall material', 'sheetrock', 'gypsum', 'drywall supply'],
  '5010': ['drywall labor', 'drywall work', 'drywall install'],
  '5020': ['flooring material', 'tile material', 'carpet material', 'hardwood'],
  '5030': ['flooring labor', 'tile labor', 'carpet install', 'flooring work'],
  '5040': ['interior trim material', 'trim material', 'molding', 'baseboard'],
  '5050': ['interior trim labor', 'trim labor', 'trim work'],
  '5060': ['interior door material', 'interior doors', 'door supply'],
  '5070': ['interior door install', 'door installation', 'door labor'],
  '5080': ['interior painting material', 'interior paint', 'primer'],
  '5090': ['interior painting labor', 'interior painting', 'painter'],
  '5100': ['cabinet material', 'cabinets', 'countertop material', 'countertops'],
  '5110': ['cabinet labor', 'cabinet install', 'countertop install'],
  '5120': ['shower door', 'mirror', 'accessories', 'bathroom accessory'],
  '5130': ['appliance', 'appliances', 'kitchen appliance'],
  '5140': ['appliance install', 'appliance installation', 'appliance labor'],
  '5150': ['finish plumbing material', 'plumbing fixture', 'faucet', 'toilet'],
  '5160': ['finish plumbing labor', 'plumbing finish', 'fixture install'],
  '5170': ['finish electrical material', 'electrical fixture', 'light fixture'],
  '5180': ['finish electrical labor', 'electrical finish', 'fixture install'],
  '5190': ['finish hvac material', 'hvac fixture', 'vent', 'register'],
  '5200': ['finish hvac labor', 'hvac finish', 'vent install'],

  // Completion and Inspection (6000-6999)
  '6000': ['cleanup', 'cleaning', 'final cleanup', 'construction cleanup'],
  '6010': ['final grade', 'final grading', 'site finish'],
  '6020': ['flatwork', 'driveway', 'patio', 'sidewalk', 'concrete flatwork'],
  '6030': ['flatwork labor', 'concrete labor', 'paving labor'],
  '6040': ['deck material', 'deck lumber', 'deck supply'],
  '6050': ['deck install', 'deck labor', 'deck construction'],
  '6060': ['fence material', 'fencing', 'fence supply'],
  '6070': ['fence labor', 'fencing labor', 'fence install'],
  '6080': ['irrigation', 'sprinkler', 'landscape irrigation'],
  '6090': ['landscaping material', 'landscape material', 'plants', 'mulch'],
  '6100': ['landscaping labor', 'landscape labor', 'landscaping work'],
  '6110': ['pool material', 'pool supply', 'pool equipment'],
  '6120': ['pool labor', 'pool construction', 'pool install'],
  '6130': ['punchlist', 'punch list', 'final inspection', 'walkthrough'],

  // Operations (7000-7999)
  '7000': ['overhead', 'business cost', 'administrative'],
  '7010': ['contingency', 'contingency fund', 'reserve'],
  '7020': ['tax', 'taxes', 'taxation'],
  '7030': ['builder fee', 'contractor fee', 'management fee'],
  '7040': ['change order', 'change order fee', 'modification fee'],
  '7050': ['warranty', 'warranty fee', 'guarantee']
};

// Get a cost code by its code string
export function getCostCodeByCode(code: string): CostCode | null {
  for (const category of Object.values(taxonomy.categories)) {
    const costCode = category.codes.find(c => c.code === code);
    if (costCode) {
      return costCode;
    }
  }
  return null;
}

// Get category information by category ID
export function getCategoryById(categoryId: string): CostCodeCategory | null {
  return taxonomy.categories[categoryId] || null;
}

// Get all available cost codes
export function getAllCostCodes(): string[] {
  return taxonomy.allCodes;
}

// Smart assignment based on line item content
export function assignCostCode(lineItemTitle: string, lineItemDescription: string): {
  code: string;
  name: string;
  fullName: string;
  categoryId: string;
  categoryName: string;
} {
  const searchText = `${lineItemTitle} ${lineItemDescription}`.toLowerCase();
  
  // Try to find a match using keyword mappings
  for (const [code, keywords] of Object.entries(KEYWORD_MAPPINGS)) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        const costCode = getCostCodeByCode(code);
        if (costCode) {
          const categoryId = taxonomy.codeToCategory[code];
          const category = getCategoryById(categoryId);
          return {
            code: costCode.code,
            name: costCode.name,
            fullName: costCode.fullName,
            categoryId: categoryId,
            categoryName: category?.name || ''
          };
        }
      }
    }
  }
  
  // If no smart match found, return a random cost code
  return getRandomCostCode();
}

// Get a random cost code (weighted towards more common categories)
export function getRandomCostCode(): {
  code: string;
  name: string;
  fullName: string;
  categoryId: string;
  categoryName: string;
} {
  // 2% chance for Buildertrend Flat Rate
  if (Math.random() < 0.02) {
    const category = getCategoryById('buildertrend-default');
    const costCode = category?.codes[0];
    if (costCode) {
      return {
        code: costCode.code,
        name: costCode.name,
        fullName: costCode.fullName,
        categoryId: 'buildertrend-default',
        categoryName: category.name
      };
    }
  }
  
  // Weighted distribution across categories
  const categoryWeights: Record<string, number> = {
    '5000-5999': 0.25, // Finishing Trades - most common
    '4000-4999': 0.20, // Full Enclosure
    '3000-3999': 0.15, // Rough Structure
    '6000-6999': 0.15, // Completion and Inspection
    '2000-2999': 0.10, // Excavation and Foundation
    '7000-7999': 0.10, // Operations
    '1000-1999': 0.05  // Preparation Preliminaries - least common
  };
  
  const random = Math.random();
  let cumulative = 0;
  
  for (const [categoryId, weight] of Object.entries(categoryWeights)) {
    cumulative += weight;
    if (random <= cumulative) {
      const category = getCategoryById(categoryId);
      if (category && category.codes.length > 0) {
        const randomCode = category.codes[Math.floor(Math.random() * category.codes.length)];
        return {
          code: randomCode.code,
          name: randomCode.name,
          fullName: randomCode.fullName,
          categoryId: categoryId,
          categoryName: category.name
        };
      }
    }
  }
  
  // Fallback to Buildertrend Flat Rate
  const category = getCategoryById('buildertrend-default');
  const costCode = category?.codes[0];
  return {
    code: costCode?.code || 'buildertrend-flat-rate',
    name: costCode?.name || 'Buildertrend Flat Rate',
    fullName: costCode?.fullName || 'Buildertrend Flat Rate',
    categoryId: 'buildertrend-default',
    categoryName: category?.name || 'Buildertrend Default'
  };
}

// Get cost code category name by code
export function getCategoryNameByCode(code: string): string {
  const categoryId = taxonomy.codeToCategory[code];
  const category = getCategoryById(categoryId);
  return category?.name || '';
}

// Check if a code exists in the taxonomy
export function isValidCostCode(code: string): boolean {
  return taxonomy.allCodes.includes(code);
}
