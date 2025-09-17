import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the corpus generator functions
import { 
  generateLineItems,
  generateLineItem,
  CONSTRUCTION_TERMS,
  TERM_VARIATIONS,
  LINE_ITEM_TEMPLATES
} from './corpus-generator.js';

// Construction terms to work with
const CONSTRUCTION_TERMS_EXTENDED = [
  ...CONSTRUCTION_TERMS,
  'steel', 'metal', 'aluminum', 'copper', 'brass', 'bronze',
  'glass', 'mirror', 'acrylic', 'plastic', 'vinyl', 'composite',
  'stone', 'granite', 'marble', 'limestone', 'slate', 'tile',
  'wood', 'oak', 'pine', 'cedar', 'mahogany', 'walnut',
  'paint', 'stain', 'varnish', 'sealant', 'adhesive', 'caulk',
  'hardware', 'hinges', 'locks', 'handles', 'knobs', 'pulls',
  'lighting', 'fixtures', 'switches', 'outlets', 'wiring',
  'plumbing', 'fixtures', 'faucets', 'toilets', 'sinks', 'tubs',
  'hvac', 'ductwork', 'vents', 'thermostats', 'filters',
  'insulation', 'vapor', 'barrier', 'weather', 'stripping',
  'gutters', 'downspouts', 'flashing', 'siding', 'trim',
  'flooring', 'carpet', 'hardwood', 'laminate', 'tile', 'vinyl',
  'ceiling', 'acoustic', 'popcorn', 'texture', 'smooth',
  'doors', 'windows', 'skylights', 'blinds', 'shades',
  'stairs', 'railings', 'balusters', 'newels', 'treads',
  'fireplace', 'chimney', 'hearth', 'mantel', 'surround',
  'garage', 'driveway', 'walkway', 'patio', 'deck', 'porch',
  'fence', 'gate', 'retaining', 'wall', 'landscaping',
  'irrigation', 'sprinklers', 'drainage', 'septic', 'well',
  'electrical', 'panel', 'breaker', 'conduit', 'cable',
  'security', 'alarm', 'cameras', 'intercom', 'access',
  'automation', 'smart', 'home', 'controls', 'sensors'
];

// Generate additional corpus parts
function generateAdditionalCorpusParts() {
  console.log('Generating additional corpus parts...');
  
  const corpusDir = path.join(__dirname, 'public', 'corpus-parts');
  const indexFile = path.join(corpusDir, 'index.json');
  
  // Read existing index
  const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
  
  // Generate 3 additional corpus parts
  const additionalParts = 3;
  const documentsPerPart = 30;
  
  for (let partNum = 1; partNum <= additionalParts; partNum++) {
    const partIndex = index.files.length + partNum;
    const filename = `corpus-part-${String(partIndex).padStart(2, '0')}.json`;
    
    console.log(`Generating ${filename}...`);
    
    const documents = [];
    const documentIds = [];
    
    // Generate documents with more variety in cost codes
    for (let i = 0; i < documentsPerPart; i++) {
      const docId = `document-${String(partIndex * 30 + i + 1).padStart(3, '0')}`;
      documentIds.push(docId);
      
      // Create a document with varied entity types
      const entityTypes = ['ClientInvoice', 'PurchaseOrder', 'Bill', 'Receipt', 'Payment'];
      const entityType = entityTypes[Math.floor(Math.random() * entityTypes.length)];
      
      const document = {
        id: docId,
        entityType: entityType,
        title: `${entityType} ${docId} - Construction Project Phase ${partNum}`,
        summary: `Detailed ${entityType.toLowerCase()} for construction project phase ${partNum} covering multiple trades and cost codes.`,
        project: `Project Alpha-${partNum}`,
        client: `Client ${partNum}-${i + 1}`,
        status: ['Pending', 'Approved', 'In Review', 'Completed'][Math.floor(Math.random() * 4)],
        updatedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        tags: ['Construction', 'Phase ' + partNum, 'Multi-trade'],
        metadata: {
          projectPhase: ['Planning', 'Construction', 'Finishing', 'Completion'][Math.floor(Math.random() * 4)],
          projectManager: `Manager ${partNum}`,
          location: `Location ${partNum}`,
          revision: `R${partNum}`,
          tradeFocus: ['General', 'Specialized', 'Multi-trade'][Math.floor(Math.random() * 3)]
        },
        lineItems: [],
        totalValue: 0
      };
      
      // Add line items with cost codes
      if (entityType !== 'Document') {
        const lineItemCount = Math.floor(Math.random() * 20) + 5; // 5-24 line items
        document.lineItems = generateLineItems(docId, entityType, lineItemCount);
        document.totalValue = document.lineItems.reduce((sum, item) => sum + item.lineItemTotal, 0);
        
        // Add field metadata
        document.fieldMetadata = {
          title: 'non-monetary',
          summary: 'non-monetary',
          totalValue: 'monetary'
        };
      }
      
      documents.push(document);
    }
    
    // Write the corpus part file
    const filePath = path.join(corpusDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(documents, null, 2));
    
    // Update index
    index.files.push({
      filename: filename,
      documentCount: documentsPerPart,
      documentIds: documentIds
    });
    
    console.log(`Generated ${filename} with ${documentsPerPart} documents`);
  }
  
  // Update total counts
  index.totalDocuments += additionalParts * documentsPerPart;
  index.totalFiles += additionalParts;
  
  // Write updated index
  fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));
  
  console.log(`Generated ${additionalParts} additional corpus parts with ${additionalParts * documentsPerPart} total documents`);
  console.log(`Total corpus now has ${index.totalDocuments} documents across ${index.totalFiles} files`);
}

// Run the generation
if (import.meta.url === `file://${process.argv[1]}`) {
  generateAdditionalCorpusParts();
}

export { generateAdditionalCorpusParts };
