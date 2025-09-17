import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Construction terms to work with
const CONSTRUCTION_TERMS = [
  'concrete', 'demolition', 'cabinet', 'deck', 'bathroom', 'carpet', 'cabinets', 
  'countertop', 'counter', 'building', 'ceiling', 'base', 'countertops', 
  'cabinetry', 'baseboard', 'bill', 'appliances', 'cleaning', 'bath', 'custom', 
  'cost', 'design', 'delivery', 'basement', 'contingency', 'closet', 'carpentry', 'clean'
];

// Variations and forms of terms
const TERM_VARIATIONS = {
  'concrete': ['concrete', 'Concrete', 'CONCRETE', 'concreting', 'concreted'],
  'demolition': ['demolition', 'Demolition', 'DEMOLITION', 'demo', 'Demo', 'DEMO', 'demolishing', 'demolished'],
  'cabinet': ['cabinet', 'Cabinet', 'CABINET', 'cabinets', 'Cabinets', 'CABINETS', 'cabinetry', 'Cabinetry', 'CABINETRY'],
  'deck': ['deck', 'Deck', 'DECK', 'decking', 'Decking', 'DECKING', 'decks', 'Decks', 'DECKS'],
  'bathroom': ['bathroom', 'Bathroom', 'BATHROOM', 'bath', 'Bath', 'BATH', 'bathrooms', 'Bathrooms', 'BATHROOMS'],
  'carpet': ['carpet', 'Carpet', 'CARPET', 'carpeting', 'Carpeting', 'CARPETING', 'carpets', 'Carpets', 'CARPETS'],
  'countertop': ['countertop', 'Countertop', 'COUNTERTOP', 'countertops', 'Countertops', 'COUNTERTOPS', 'counter', 'Counter', 'COUNTER', 'counters', 'Counters', 'COUNTERS'],
  'building': ['building', 'Building', 'BUILDING', 'buildings', 'Buildings', 'BUILDINGS', 'build', 'Build', 'BUILD', 'building work', 'construction'],
  'ceiling': ['ceiling', 'Ceiling', 'CEILING', 'ceilings', 'Ceilings', 'CEILINGS', 'ceiling work', 'ceiling installation'],
  'base': ['base', 'Base', 'BASE', 'baseboard', 'Baseboard', 'BASEBOARD', 'baseboards', 'Baseboards', 'BASEBOARDS', 'base work', 'base installation'],
  'appliances': ['appliances', 'Appliances', 'APPLIANCES', 'appliance', 'Appliance', 'APPLIANCE', 'kitchen appliances', 'bathroom appliances'],
  'cleaning': ['cleaning', 'Cleaning', 'CLEANING', 'clean', 'Clean', 'CLEAN', 'cleaned', 'Cleaned', 'CLEANED', 'cleanup', 'Cleanup', 'CLEANUP'],
  'custom': ['custom', 'Custom', 'CUSTOM', 'customized', 'Customized', 'CUSTOMIZED', 'custom work', 'custom design'],
  'cost': ['cost', 'Cost', 'COST', 'costs', 'Costs', 'COSTS', 'costing', 'Costing', 'COSTING', 'pricing', 'Pricing', 'PRICING'],
  'design': ['design', 'Design', 'DESIGN', 'designs', 'Designs', 'DESIGNS', 'designing', 'Designing', 'DESIGNING', 'design work'],
  'delivery': ['delivery', 'Delivery', 'DELIVERY', 'deliveries', 'Deliveries', 'DELIVERIES', 'delivering', 'Delivering', 'DELIVERING', 'delivery service'],
  'basement': ['basement', 'Basement', 'BASEMENT', 'basements', 'Basements', 'BASEMENTS', 'basement work', 'basement finishing'],
  'contingency': ['contingency', 'Contingency', 'CONTINGENCY', 'contingencies', 'Contingencies', 'CONTINGENCIES', 'contingency fund', 'contingency budget'],
  'closet': ['closet', 'Closet', 'CLOSET', 'closets', 'Closets', 'CLOSETS', 'closet work', 'closet installation'],
  'carpentry': ['carpentry', 'Carpentry', 'CARPENTRY', 'carpenter', 'Carpenter', 'CARPENTER', 'carpenters', 'Carpenters', 'CARPENTERS', 'carpentry work']
};

// Line item templates with realistic construction scenarios
const LINE_ITEM_TEMPLATES = [
  // Concrete related
  { base: 'concrete', templates: [
    'Concrete foundation pour - {quantity} cubic yards',
    'Concrete slab installation - {quantity} sq ft',
    'Concrete finishing work - {quantity} sq ft',
    'Concrete delivery and placement - {quantity} cubic yards',
    'Concrete repair and patching - {quantity} sq ft',
    'Concrete stamping and texturing - {quantity} sq ft',
    'Concrete sealing and waterproofing - {quantity} sq ft'
  ]},
  
  // Demolition related
  { base: 'demolition', templates: [
    'Demolition work - {quantity} sq ft',
    'Demo and removal - {quantity} hours',
    'Demolition debris disposal - {quantity} cubic yards',
    'Selective demolition - {quantity} sq ft',
    'Interior demolition - {quantity} sq ft',
    'Exterior demolition - {quantity} sq ft',
    'Demolition cleanup - {quantity} hours'
  ]},
  
  // Cabinet related
  { base: 'cabinet', templates: [
    'Kitchen cabinets installation - {quantity} linear feet',
    'Bathroom cabinets - {quantity} units',
    'Custom cabinet work - {quantity} units',
    'Cabinet hardware installation - {quantity} pieces',
    'Cabinet refinishing - {quantity} units',
    'Cabinet doors and drawers - {quantity} pieces',
    'Cabinet countertop installation - {quantity} linear feet'
  ]},
  
  // Deck related
  { base: 'deck', templates: [
    'Deck construction - {quantity} sq ft',
    'Deck framing and structure - {quantity} sq ft',
    'Deck boards installation - {quantity} sq ft',
    'Deck railing installation - {quantity} linear feet',
    'Deck staining and sealing - {quantity} sq ft',
    'Deck repair and maintenance - {quantity} sq ft',
    'Deck demolition and removal - {quantity} sq ft'
  ]},
  
  // Bathroom related
  { base: 'bathroom', templates: [
    'Bathroom renovation - {quantity} bathrooms',
    'Bathroom fixtures installation - {quantity} units',
    'Bathroom tile work - {quantity} sq ft',
    'Bathroom plumbing rough-in - {quantity} bathrooms',
    'Bathroom electrical work - {quantity} bathrooms',
    'Bathroom ventilation installation - {quantity} units',
    'Bathroom waterproofing - {quantity} sq ft'
  ]},
  
  // Carpet related
  { base: 'carpet', templates: [
    'Carpet installation - {quantity} sq ft',
    'Carpet removal and disposal - {quantity} sq ft',
    'Carpet padding installation - {quantity} sq ft',
    'Carpet cleaning and maintenance - {quantity} sq ft',
    'Carpet repair and patching - {quantity} sq ft',
    'Carpet stretching and reinstallation - {quantity} sq ft',
    'Carpet delivery and handling - {quantity} sq ft'
  ]},
  
  // Countertop related
  { base: 'countertop', templates: [
    'Countertop installation - {quantity} linear feet',
    'Countertop fabrication - {quantity} linear feet',
    'Countertop edge finishing - {quantity} linear feet',
    'Countertop removal and disposal - {quantity} linear feet',
    'Countertop sealing and maintenance - {quantity} linear feet',
    'Countertop cutouts and modifications - {quantity} pieces',
    'Countertop delivery and installation - {quantity} linear feet'
  ]},
  
  // Building related
  { base: 'building', templates: [
    'Building construction - {quantity} sq ft',
    'Building permit and inspection - {quantity} permits',
    'Building materials delivery - {quantity} loads',
    'Building cleanup and site preparation - {quantity} hours',
    'Building maintenance and repair - {quantity} hours',
    'Building inspection and testing - {quantity} inspections',
    'Building documentation and reporting - {quantity} hours'
  ]},
  
  // Ceiling related
  { base: 'ceiling', templates: [
    'Ceiling installation - {quantity} sq ft',
    'Ceiling repair and patching - {quantity} sq ft',
    'Ceiling painting and finishing - {quantity} sq ft',
    'Ceiling texture application - {quantity} sq ft',
    'Ceiling insulation installation - {quantity} sq ft',
    'Ceiling lighting installation - {quantity} fixtures',
    'Ceiling demolition and removal - {quantity} sq ft'
  ]},
  
  // Baseboard related
  { base: 'baseboard', templates: [
    'Baseboard installation - {quantity} linear feet',
    'Baseboard removal and disposal - {quantity} linear feet',
    'Baseboard painting and finishing - {quantity} linear feet',
    'Baseboard caulking and sealing - {quantity} linear feet',
    'Baseboard repair and replacement - {quantity} linear feet',
    'Baseboard delivery and handling - {quantity} linear feet',
    'Baseboard custom cutting and fitting - {quantity} linear feet'
  ]},
  
  // Appliances related
  { base: 'appliances', templates: [
    'Kitchen appliances installation - {quantity} units',
    'Bathroom appliances installation - {quantity} units',
    'Appliance delivery and setup - {quantity} units',
    'Appliance electrical connections - {quantity} units',
    'Appliance plumbing connections - {quantity} units',
    'Appliance removal and disposal - {quantity} units',
    'Appliance maintenance and service - {quantity} units'
  ]},
  
  // Cleaning related
  { base: 'cleaning', templates: [
    'Construction cleanup - {quantity} hours',
    'Final cleaning and detailing - {quantity} hours',
    'Debris removal and disposal - {quantity} cubic yards',
    'Site cleanup and preparation - {quantity} hours',
    'Post-construction cleaning - {quantity} hours',
    'Deep cleaning and sanitizing - {quantity} hours',
    'Cleaning supplies and materials - {quantity} units'
  ]},
  
  // Custom related
  { base: 'custom', templates: [
    'Custom design work - {quantity} hours',
    'Custom fabrication - {quantity} units',
    'Custom installation - {quantity} hours',
    'Custom finishing work - {quantity} hours',
    'Custom modifications - {quantity} hours',
    'Custom consultation and planning - {quantity} hours',
    'Custom materials and supplies - {quantity} units'
  ]},
  
  // Cost related
  { base: 'cost', templates: [
    'Cost analysis and estimation - {quantity} hours',
    'Cost tracking and reporting - {quantity} hours',
    'Cost control and management - {quantity} hours',
    'Cost consultation and planning - {quantity} hours',
    'Cost documentation and records - {quantity} hours',
    'Cost review and approval - {quantity} hours',
    'Cost contingency planning - {quantity} hours'
  ]},
  
  // Design related
  { base: 'design', templates: [
    'Design consultation and planning - {quantity} hours',
    'Design development and refinement - {quantity} hours',
    'Design documentation and drawings - {quantity} hours',
    'Design review and approval - {quantity} hours',
    'Design modifications and changes - {quantity} hours',
    'Design coordination and management - {quantity} hours',
    'Design materials and supplies - {quantity} units'
  ]},
  
  // Delivery related
  { base: 'delivery', templates: [
    'Material delivery and handling - {quantity} loads',
    'Equipment delivery and setup - {quantity} units',
    'Delivery coordination and scheduling - {quantity} hours',
    'Delivery tracking and confirmation - {quantity} hours',
    'Delivery documentation and receipts - {quantity} hours',
    'Delivery inspection and acceptance - {quantity} hours',
    'Delivery contingency and backup - {quantity} hours'
  ]},
  
  // Basement related
  { base: 'basement', templates: [
    'Basement finishing work - {quantity} sq ft',
    'Basement waterproofing - {quantity} sq ft',
    'Basement insulation installation - {quantity} sq ft',
    'Basement electrical work - {quantity} hours',
    'Basement plumbing rough-in - {quantity} hours',
    'Basement flooring installation - {quantity} sq ft',
    'Basement lighting installation - {quantity} fixtures'
  ]},
  
  // Contingency related
  { base: 'contingency', templates: [
    'Contingency fund allocation - {quantity} dollars',
    'Contingency planning and management - {quantity} hours',
    'Contingency documentation and tracking - {quantity} hours',
    'Contingency review and approval - {quantity} hours',
    'Contingency reporting and analysis - {quantity} hours',
    'Contingency coordination and communication - {quantity} hours',
    'Contingency materials and supplies - {quantity} units'
  ]},
  
  // Closet related
  { base: 'closet', templates: [
    'Closet installation and setup - {quantity} closets',
    'Closet organization systems - {quantity} units',
    'Closet shelving and storage - {quantity} linear feet',
    'Closet doors and hardware - {quantity} units',
    'Closet lighting installation - {quantity} fixtures',
    'Closet repair and maintenance - {quantity} hours',
    'Closet customization and design - {quantity} hours'
  ]},
  
  // Carpentry related
  { base: 'carpentry', templates: [
    'Finish carpentry work - {quantity} hours',
    'Rough carpentry and framing - {quantity} hours',
    'Custom carpentry and millwork - {quantity} hours',
    'Carpentry repair and restoration - {quantity} hours',
    'Carpentry installation and assembly - {quantity} hours',
    'Carpentry finishing and detailing - {quantity} hours',
    'Carpentry materials and supplies - {quantity} units'
  ]}
];

// Unit types for different line items
const UNIT_TYPES = ['sq ft', 'linear feet', 'cubic yards', 'units', 'hours', 'pieces', 'loads', 'fixtures', 'bathrooms', 'closets', 'permits', 'inspections', 'dollars', 'ls'];

// Line item types
const LINE_ITEM_TYPES = ['Material', 'Labor', 'Subcontractor', 'Other', 'Equipment'];

// Generate random number between min and max
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate random price based on quantity and type
function generatePrice(quantity, unitType, lineItemType, entityType = null) {
  let basePrice = 1;
  
  // Base price by unit type - reduced for more realistic totals
  switch (unitType) {
    case 'sq ft': basePrice = randomBetween(1, 8); break;
    case 'linear feet': basePrice = randomBetween(2, 15); break;
    case 'cubic yards': basePrice = randomBetween(25, 120); break;
    case 'units': basePrice = randomBetween(15, 400); break;
    case 'hours': basePrice = randomBetween(25, 85); break;
    case 'pieces': basePrice = randomBetween(3, 150); break;
    case 'loads': basePrice = randomBetween(50, 200); break;
    case 'fixtures': basePrice = randomBetween(30, 400); break;
    case 'bathrooms': basePrice = randomBetween(500, 3000); break;
    case 'closets': basePrice = randomBetween(150, 800); break;
    case 'permits': basePrice = randomBetween(25, 250); break;
    case 'inspections': basePrice = randomBetween(40, 150); break;
    case 'dollars': basePrice = 1; break;
    case 'ls': basePrice = randomBetween(150, 1200); break;
    default: basePrice = randomBetween(5, 50); break;
  }
  
  // Adjust by line item type
  switch (lineItemType) {
    case 'Material': basePrice *= randomBetween(0.8, 1.2); break;
    case 'Labor': basePrice *= randomBetween(1.0, 1.5); break;
    case 'Subcontractor': basePrice *= randomBetween(0.9, 1.3); break;
    case 'Equipment': basePrice *= randomBetween(1.2, 2.0); break;
    case 'Other': basePrice *= randomBetween(0.7, 1.4); break;
  }
  
  // Special adjustment for Client Invoices to allow higher figures
  if (entityType === 'ClientInvoice') {
    basePrice *= randomBetween(2, 5); // 2-5x multiplier for client invoices
  }
  
  return Math.round(basePrice);
}

// Simple cost code assignment logic (since we can't import the TypeScript module in JS)
function assignCostCode(lineItemTitle, lineItemDescription) {
  const searchText = `${lineItemTitle} ${lineItemDescription}`.toLowerCase();
  
  // Smart keyword matching
  const keywordMappings = {
    'cabinet': '5100',
    'countertop': '5100',
    'appliance': '5130',
    'demolition': '1180',
    'demo': '1180',
    'concrete': '2060',
    'foundation': '2060',
    'footing': '2060',
    'framing': '3010',
    'lumber': '3010',
    'roofing': '4000',
    'roof': '4000',
    'window': '4060',
    'door': '4080',
    'insulation': '4100',
    'drywall': '5000',
    'flooring': '5020',
    'tile': '5020',
    'carpet': '5020',
    'painting': '5080',
    'plumbing': '5150',
    'electrical': '5170',
    'hvac': '5190',
    'cleanup': '6000',
    'cleaning': '6000',
    'deck': '6040',
    'fence': '6060',
    'landscaping': '6100',
    'pool': '6110',
    'punchlist': '6130',
    'permit': '1000',
    'design': '1020',
    'survey': '1030',
    'excavation': '2000',
    'grading': '2010',
    'masonry': '4040',
    'brick': '4040',
    'siding': '4120',
    'trim': '5040',
    'molding': '5040'
  };
  
  // Try to find a match
  for (const [keyword, code] of Object.entries(keywordMappings)) {
    if (searchText.includes(keyword)) {
      return {
        code: code,
        name: `${code} - ${keyword.charAt(0).toUpperCase() + keyword.slice(1)} work`,
        fullName: `${code} - ${keyword.charAt(0).toUpperCase() + keyword.slice(1)} work`,
        categoryId: getCategoryIdByCode(code),
        categoryName: getCategoryNameByCode(code)
      };
    }
  }
  
  // If no match, return random weighted distribution
  return getRandomCostCode();
}

function getCategoryIdByCode(code) {
  if (code >= '1000' && code <= '1999') return '1000-1999';
  if (code >= '2000' && code <= '2999') return '2000-2999';
  if (code >= '3000' && code <= '3999') return '3000-3999';
  if (code >= '4000' && code <= '4999') return '4000-4999';
  if (code >= '5000' && code <= '5999') return '5000-5999';
  if (code >= '6000' && code <= '6999') return '6000-6999';
  if (code >= '7000' && code <= '7999') return '7000-7999';
  return 'buildertrend-default';
}

function getCategoryNameByCode(code) {
  const categoryId = getCategoryIdByCode(code);
  const categoryNames = {
    '1000-1999': '1000 - 1999 Preparation Preliminaries',
    '2000-2999': '2000 - 2999 Excavation and Foundation',
    '3000-3999': '3000 - 3999 Rough Structure',
    '4000-4999': '4000 - 4999 Full Enclosure',
    '5000-5999': '5000 - 5999 Finishing Trades',
    '6000-6999': '6000 - 6999 Completion and Inspection',
    '7000-7999': '7000 - 7999 Operations',
    'buildertrend-default': 'Buildertrend Default'
  };
  return categoryNames[categoryId] || 'Unknown Category';
}

function getRandomCostCode() {
  // 2% chance for Buildertrend Flat Rate
  if (Math.random() < 0.02) {
    return {
      code: 'buildertrend-flat-rate',
      name: 'Buildertrend Flat Rate',
      fullName: 'Buildertrend Flat Rate',
      categoryId: 'buildertrend-default',
      categoryName: 'Buildertrend Default'
    };
  }
  
  // Weighted distribution across categories
  const categoryWeights = {
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
      // Generate a random code within the category range
      const baseCode = parseInt(categoryId.split('-')[0]);
      const randomOffset = Math.floor(Math.random() * 20) * 10; // 0-190 in steps of 10
      const code = (baseCode + randomOffset).toString();
      
      return {
        code: code,
        name: `${code} - Construction work`,
        fullName: `${code} - Construction work`,
        categoryId: categoryId,
        categoryName: getCategoryNameByCode(code)
      };
    }
  }
  
  // Fallback
  return {
    code: 'buildertrend-flat-rate',
    name: 'Buildertrend Flat Rate',
    fullName: 'Buildertrend Flat Rate',
    categoryId: 'buildertrend-default',
    categoryName: 'Buildertrend Default'
  };
}

// Generate a single line item
function generateLineItem(lineItemId, term, entityType = null) {
  const termVariations = TERM_VARIATIONS[term] || [term];
  const selectedTerm = termVariations[randomBetween(0, termVariations.length - 1)];
  
  // Find matching template
  const templateGroup = LINE_ITEM_TEMPLATES.find(group => 
    group.base === term || group.base === term.toLowerCase()
  );
  
  let title, description;
  
  if (templateGroup) {
    const template = templateGroup.templates[randomBetween(0, templateGroup.templates.length - 1)];
    const quantity = randomBetween(1, 25);
    const unitType = UNIT_TYPES[randomBetween(0, UNIT_TYPES.length - 1)];
    const lineItemType = LINE_ITEM_TYPES[randomBetween(0, LINE_ITEM_TYPES.length - 1)];
    
    title = template.replace('{quantity}', quantity);
    description = `${lineItemType} for ${title.toLowerCase()} on Building core areas`;
    
    const unitPrice = generatePrice(quantity, unitType, lineItemType, entityType);
    const total = quantity * unitPrice;
    
    // Assign cost code
    const costCode = assignCostCode(title, description);
    
    return {
      lineItemId: lineItemId,
      lineItemTitle: title,
      lineItemDescription: description,
      lineItemQuantity: quantity,
      lineItemQuantityUnitOfMeasure: unitType,
      lineItemUnitPrice: unitPrice,
      lineItemTotal: total,
      lineItemType: lineItemType,
      costCode: costCode.code,
      costCodeName: costCode.name,
      costCodeCategory: costCode.categoryId,
      costCodeCategoryName: costCode.categoryName,
      fieldMetadata: {
        lineItemTitle: 'non-monetary',
        lineItemDescription: 'non-monetary',
        lineItemQuantity: 'non-monetary',
        lineItemQuantityUnitOfMeasure: 'non-monetary',
        lineItemUnitPrice: 'monetary',
        lineItemTotal: 'monetary',
        lineItemType: 'non-monetary'
      }
    };
  } else {
    // Fallback for terms without specific templates
    const quantity = randomBetween(1, 15);
    const unitType = UNIT_TYPES[randomBetween(0, UNIT_TYPES.length - 1)];
    const lineItemType = LINE_ITEM_TYPES[randomBetween(0, LINE_ITEM_TYPES.length - 1)];
    const unitPrice = generatePrice(quantity, unitType, lineItemType, entityType);
    const total = quantity * unitPrice;
    
    title = `${selectedTerm} work`;
    description = `${lineItemType} for ${selectedTerm} work on Building core areas`;
    
    // Assign cost code
    const costCode = assignCostCode(title, description);
    
    return {
      lineItemId: lineItemId,
      lineItemTitle: title,
      lineItemDescription: description,
      lineItemQuantity: quantity,
      lineItemQuantityUnitOfMeasure: unitType,
      lineItemUnitPrice: unitPrice,
      lineItemTotal: total,
      lineItemType: lineItemType,
      costCode: costCode.code,
      costCodeName: costCode.name,
      costCodeCategory: costCode.categoryId,
      costCodeCategoryName: costCode.categoryName,
      fieldMetadata: {
        lineItemTitle: 'non-monetary',
        lineItemDescription: 'non-monetary',
        lineItemQuantity: 'non-monetary',
        lineItemQuantityUnitOfMeasure: 'non-monetary',
        lineItemUnitPrice: 'monetary',
        lineItemTotal: 'monetary',
        lineItemType: 'non-monetary'
      }
    };
  }
}

// Generate line items for a document
function generateLineItems(documentId, entityType, lineItemCount) {
  const lineItems = [];
  
  // For documents with many line items (bills, receipts), use more terms
  const termsToUse = lineItemCount > 20 ? 
    CONSTRUCTION_TERMS : 
    CONSTRUCTION_TERMS.slice(0, randomBetween(2, 8));
  
  for (let i = 0; i < lineItemCount; i++) {
    const term = termsToUse[randomBetween(0, termsToUse.length - 1)];
    const lineItemId = `${documentId}-item-${i + 1}`;
    lineItems.push(generateLineItem(lineItemId, term, entityType));
  }
  
  return lineItems;
}

// Determine line item count based on entity type
function getLineItemCount(entityType) {
  switch (entityType) {
    case 'Bill':
    case 'Receipt':
      // Some bills and receipts should have many line items
      return randomBetween(1, 100) < 30 ? randomBetween(30, 80) : randomBetween(2, 15);
    case 'ClientInvoice':
    case 'PurchaseOrder':
      return randomBetween(2, 12);
    case 'Payment':
      return randomBetween(1, 6);
    case 'Document':
      return randomBetween(0, 4);
    default:
      return randomBetween(1, 8);
  }
}

// Update document with new line items
function updateDocumentWithLineItems(document) {
  const lineItemCount = getLineItemCount(document.entityType);
  
  if (lineItemCount > 0) {
    document.lineItems = generateLineItems(document.id, document.entityType, lineItemCount);
    
    // Update total value if it exists
    if (document.totalValue !== undefined) {
      document.totalValue = document.lineItems.reduce((sum, item) => sum + item.lineItemTotal, 0);
    }
  }
  
  // Add field metadata for financial records
  if (document.entityType === 'Bill' || document.entityType === 'ClientInvoice' || 
      document.entityType === 'PurchaseOrder' || document.entityType === 'Receipt' || 
      document.entityType === 'Payment') {
    document.fieldMetadata = {
      title: 'non-monetary',
      summary: 'non-monetary',
      totalValue: 'monetary'
    };
  }
  
  return document;
}

// Main function to process corpus files
function expandCorpus() {
  console.log('Starting corpus expansion...');
  
  const corpusDir = path.join(__dirname, 'public', 'corpus-parts');
  const indexFile = path.join(corpusDir, 'index.json');
  
  // Read index to get file list
  const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
  
  index.files.forEach(fileInfo => {
    const filePath = path.join(corpusDir, fileInfo.filename);
    console.log(`Processing ${fileInfo.filename}...`);
    
    // Read and parse the file
    const documents = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Update each document with expanded line items
    const updatedDocuments = documents.map(updateDocumentWithLineItems);
    
    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(updatedDocuments, null, 2));
    console.log(`Updated ${fileInfo.filename} with ${updatedDocuments.length} documents`);
  });
  
  console.log('Corpus expansion complete!');
}

// Run the expansion
if (import.meta.url === `file://${process.argv[1]}`) {
  expandCorpus();
}

export {
  expandCorpus,
  generateLineItems,
  generateLineItem,
  CONSTRUCTION_TERMS,
  TERM_VARIATIONS,
  LINE_ITEM_TEMPLATES
};
