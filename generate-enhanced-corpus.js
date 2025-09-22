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

// Import the realistic names generator
import {
  generateProjectName,
  generateClientName,
  generateProjectManager,
  generateLocation,
  generateProjectTags,
  generateProjectMetadata,
  getRandomItem
} from './realistic-names-generator.js';

// Enhanced corpus with relationship metadata
function generateEnhancedCorpus() {
  console.log('🚀 Generating enhanced corpus with relationship metadata...');
  
  const corpusDir = path.join(__dirname, 'public', 'corpus-parts');
  const indexFile = path.join(corpusDir, 'index.json');
  
  // Read existing index
  const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
  
  // Generate enhanced corpus parts with relationships
  const enhancedParts = 3;
  const documentsPerPart = 30;
  
  // Create a pool of organizations and people for relationships
  const organizations = [
    { id: 'org-001', name: 'Evergreen Mechanical', type: 'Subcontractor', trade: 'HVAC & Controls', contact: 'Sofia Ramirez' },
    { id: 'org-002', name: 'Cascade Electrical Cooperative', type: 'Subcontractor', trade: 'Electrical Systems', contact: 'Noah Patel' },
    { id: 'org-003', name: 'Summit HVAC Services', type: 'Subcontractor', trade: 'HVAC & Controls', contact: 'Harper Singh' },
    { id: 'org-004', name: 'Precision Concrete Partners', type: 'Subcontractor', trade: 'Concrete & Foundation', contact: 'Caleb Winters' },
    { id: 'org-005', name: 'Evergreen Millworks', type: 'Vendor', trade: 'Custom Millwork', contact: 'Rebecca Miles' },
    { id: 'org-006', name: 'UrbanCore GC Alliance', type: 'General Contractor', trade: 'General Construction', contact: 'Aaron Patel' },
    { id: 'org-007', name: 'Summit Commercial Group', type: 'Client', trade: 'Commercial Development', contact: 'Tanya Singh' },
    { id: 'org-008', name: 'Evergreen Builders Network', type: 'Client', trade: 'Residential Construction', contact: 'Maria Rodriguez' }
  ];
  
  const people = [
    { id: 'person-001', name: 'Sofia Ramirez', role: 'Project Manager', org: 'Evergreen Mechanical', email: 'sofia@evergreenmechanical.pro' },
    { id: 'person-002', name: 'Noah Patel', role: 'Electrical Supervisor', org: 'Cascade Electrical Cooperative', email: 'noah@cascadeelectrical.coop' },
    { id: 'person-003', name: 'Harper Singh', role: 'HVAC Technician', org: 'Summit HVAC Services', email: 'harper@summithvac.pro' },
    { id: 'person-004', name: 'Caleb Winters', role: 'Concrete Foreman', org: 'Precision Concrete Partners', email: 'caleb@precisionconcrete.com' },
    { id: 'person-005', name: 'Rebecca Miles', role: 'Millwork Specialist', org: 'Evergreen Millworks', email: 'rebecca@evergreenmillworks.com' },
    { id: 'person-006', name: 'Aaron Patel', role: 'General Contractor', org: 'UrbanCore GC Alliance', email: 'aaron@urbancore.com' },
    { id: 'person-007', name: 'Tanya Singh', role: 'Project Manager', org: 'Summit Commercial Group', email: 'tanya@summitcommercial.com' },
    { id: 'person-008', name: 'Maria Rodriguez', role: 'Client Representative', org: 'Evergreen Builders Network', email: 'maria@evergreenbuilders.com' }
  ];
  
  for (let partNum = 1; partNum <= enhancedParts; partNum++) {
    const partIndex = index.files.length + partNum;
    const filename = `corpus-part-${String(partIndex).padStart(2, '0')}.json`;
    
    console.log(`📄 Generating ${filename} with relationship metadata...`);
    
    const documents = [];
    const documentIds = [];
    
    // Generate documents with relationship metadata
    for (let i = 0; i < documentsPerPart; i++) {
      const docId = `document-${String(partIndex * 30 + i + 1).padStart(3, '0')}`;
      documentIds.push(docId);
      
      // Create a document with varied entity types
      const entityTypes = ['ClientInvoice', 'PurchaseOrder', 'Bill', 'Receipt', 'Payment', 'Document', 'Person', 'Organization'];
      const entityType = entityTypes[Math.floor(Math.random() * entityTypes.length)];
      
      // Select random organization and person for relationships
      const selectedOrg = organizations[Math.floor(Math.random() * organizations.length)];
      const selectedPerson = people[Math.floor(Math.random() * people.length)];
      
      let document;
      
      if (entityType === 'Bill') {
        document = {
          id: docId,
          entityType: 'Bill',
          title: `Bill from ${selectedOrg.name}`,
          summary: `Vendor bill from ${selectedOrg.name} for recent ${selectedOrg.trade.toLowerCase()} work on ${generateProjectName()}.`,
          project: generateProjectName(),
          client: generateClientName(),
          status: ['Received', 'Approved', 'Pending', 'Paid'][Math.floor(Math.random() * 4)],
          updatedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
          tags: ['Construction', 'Phase ' + partNum, selectedOrg.trade],
          metadata: {
            vendor: selectedOrg.name,
            vendorTrade: selectedOrg.trade,
            projectPhase: ['Planning', 'Construction', 'Finishing', 'Completion'][Math.floor(Math.random() * 4)],
            costCode: `${Math.floor(Math.random() * 9) + 1}000`,
            paymentTerms: 'Net 30',
            primaryContact: selectedOrg.contact
          },
          totalValue: Math.floor(Math.random() * 50000) + 5000,
          issuedDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
          dueDate: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
          lineItems: []
        };
      } else if (entityType === 'Person') {
        document = {
          id: docId,
          entityType: 'Person',
          title: selectedPerson.name,
          summary: `${selectedPerson.role} at ${selectedPerson.org} specializing in construction project management for ${generateProjectName()}.`,
          project: generateProjectName(),
          client: generateClientName(),
          status: 'Active',
          updatedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
          tags: ['Contact', selectedPerson.org, 'Construction'],
          metadata: {
            associatedOrganization: selectedPerson.org,
            lastInteraction: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
          },
          personType: 'Contact',
          jobTitle: selectedPerson.role,
          associatedOrganization: selectedPerson.org,
          email: selectedPerson.email,
          phone: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
          location: 'Portland, OR',
          tradeFocus: selectedOrg.trade
        };
      } else if (entityType === 'Organization') {
        document = {
          id: docId,
          entityType: 'Organization',
          title: selectedOrg.name,
          summary: `${selectedOrg.type} specializing in ${selectedOrg.trade.toLowerCase()} for construction projects including ${generateProjectName()}.`,
          project: generateProjectName(),
          client: generateClientName(),
          status: ['Preferred', 'Active', 'Inactive'][Math.floor(Math.random() * 3)],
          updatedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
          tags: [selectedOrg.type, selectedOrg.trade, 'Construction'],
          metadata: {
            licenseStatus: `OR-CCB-${Math.floor(Math.random() * 900000) + 100000}`,
            crewSize: Math.floor(Math.random() * 50) + 10,
            avgProjectValue: Math.floor(Math.random() * 1000000) + 100000,
            safetyRating: ['A', 'A-', 'B+', 'B'][Math.floor(Math.random() * 4)]
          },
          organizationType: selectedOrg.type,
          tradeFocus: selectedOrg.trade,
          serviceArea: 'Portland Metro & Surrounding Areas',
          primaryContact: selectedOrg.contact,
          phone: `(${Math.floor(Math.random() * 900) + 100}) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
          email: `contact@${selectedOrg.name.toLowerCase().replace(/\s+/g, '')}.com`,
          website: `https://${selectedOrg.name.toLowerCase().replace(/\s+/g, '')}.com`
        };
      } else if (entityType === 'ClientInvoice') {
        document = {
          id: docId,
          entityType: 'ClientInvoice',
          title: `Invoice for ${selectedOrg.name} Services - ${generateProjectName()}`,
          summary: `Client invoice for ${selectedOrg.trade.toLowerCase()} services provided by ${selectedOrg.name} for ${generateProjectName()}.`,
          project: generateProjectName(),
          client: generateClientName(),
          status: ['Draft', 'Sent', 'Paid', 'Overdue'][Math.floor(Math.random() * 4)],
          updatedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
          tags: ['Invoice', selectedOrg.trade, 'Client'],
          metadata: {
            vendor: selectedOrg.name,
            vendorTrade: selectedOrg.trade,
            projectPhase: ['Planning', 'Construction', 'Finishing', 'Completion'][Math.floor(Math.random() * 4)],
            costCode: `${Math.floor(Math.random() * 9) + 1}000`,
            paymentTerms: 'Net 30',
            primaryContact: selectedOrg.contact
          },
          totalValue: Math.floor(Math.random() * 100000) + 10000,
          issuedDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
          dueDate: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
          lineItems: []
        };
      } else {
        // Default document structure
        document = {
          id: docId,
          entityType: entityType,
          title: `${entityType} ${docId} - ${generateProjectName()}`,
          summary: `Detailed ${entityType.toLowerCase()} for ${generateProjectName()} covering multiple trades and cost codes.`,
          project: generateProjectName(),
          client: generateClientName(),
          status: ['Pending', 'Approved', 'In Review', 'Completed'][Math.floor(Math.random() * 4)],
          updatedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
          tags: ['Construction', 'Phase ' + partNum, 'Multi-trade'],
          metadata: {
            projectPhase: ['Planning', 'Construction', 'Finishing', 'Completion'][Math.floor(Math.random() * 4)],
            projectManager: `Manager ${partNum}`,
            location: `Location ${partNum}`,
            revision: `R${partNum}`,
            tradeFocus: ['General', 'Specialized', 'Multi-trade'][Math.floor(Math.random() * 3)]
          }
        };
      }
      
      // Add line items for financial records
      if (['Bill', 'ClientInvoice', 'PurchaseOrder', 'Receipt', 'Payment'].includes(entityType)) {
        const lineItemCount = Math.floor(Math.random() * 20) + 5; // 5-24 line items
        document.lineItems = generateLineItems(docId, entityType, lineItemCount);
        document.totalValue = document.lineItems.reduce((sum, item) => sum + item.lineItemTotal, 0);
      }
      
      documents.push(document);
    }
    
    // Write the enhanced corpus part
    const filePath = path.join(corpusDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(documents, null, 2));
    
    console.log(`✅ Generated ${filename} with ${documents.length} documents`);
  }
  
  // Update the index file
  for (let partNum = 1; partNum <= enhancedParts; partNum++) {
    const partIndex = index.files.length + partNum;
    const filename = `corpus-part-${String(partIndex).padStart(2, '0')}.json`;
    
    index.files.push({
      filename: filename,
      count: documentsPerPart,
      generated: new Date().toISOString(),
      enhanced: true
    });
  }
  
  fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));
  
  console.log('🎉 Enhanced corpus generation complete!');
  console.log(`📊 Generated ${enhancedParts} new corpus parts with relationship metadata`);
  console.log('🔗 Each document now includes vendor, contact, and organization relationships');
}

// Run the enhanced corpus generation
if (import.meta.url === `file://${process.argv[1]}`) {
  generateEnhancedCorpus();
}

export { generateEnhancedCorpus };
