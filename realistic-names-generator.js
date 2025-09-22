import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Realistic construction project names
const PROJECT_NAMES = [
  // Residential Projects
  'Riverside Manor', 'Sunset Heights', 'Oakwood Estates', 'Pine Valley Homes', 'Cedar Ridge Development',
  'Maple Grove Subdivision', 'Willow Creek Village', 'Birchwood Commons', 'Elm Street Renovation', 'Ashford Place',
  'Riverside Condos', 'Mountain View Apartments', 'Garden District Townhomes', 'Park Place Residences', 'Harbor View Condos',
  'Downtown Lofts', 'Urban Heights', 'Metro Square', 'City Center Plaza', 'Waterfront Residences',
  
  // Commercial Projects
  'Portland Business Center', 'Metro Office Complex', 'Industrial Park Phase 2', 'Tech Campus Expansion', 'Medical Plaza',
  'Retail District', 'Shopping Center Renovation', 'Office Tower', 'Warehouse Complex', 'Distribution Center',
  'Corporate Headquarters', 'Research Facility', 'Manufacturing Plant', 'Data Center', 'Call Center',
  
  // Mixed-Use Projects
  'Riverside Mixed-Use', 'Downtown Gateway', 'Transit-Oriented Development', 'Live-Work Complex', 'Urban Village',
  'Community Center', 'Civic Plaza', 'Cultural District', 'Arts Quarter', 'Entertainment Complex',
  
  // Infrastructure Projects
  'Highway 26 Expansion', 'Bridge Replacement', 'Transit Station', 'Parking Garage', 'Utility Upgrade',
  'Water Treatment Plant', 'Wastewater Facility', 'Power Substation', 'Telecommunications Hub', 'Transportation Hub',
  
  // Renovation Projects
  'Historic Building Restoration', 'School Modernization', 'Hospital Expansion', 'Library Renovation', 'Museum Addition',
  'Theater Renovation', 'Stadium Upgrade', 'Convention Center', 'Hotel Renovation', 'Restaurant Buildout'
];

// Realistic client names (companies and individuals)
const CLIENT_NAMES = [
  // Individual Clients
  'Maria & Carlos Rodriguez', 'Jennifer & Michael Thompson', 'Sarah & David Chen', 'Lisa & Robert Johnson',
  'Amanda & James Wilson', 'Rachel & Christopher Brown', 'Michelle & Daniel Davis', 'Nicole & Matthew Miller',
  'Stephanie & Andrew Garcia', 'Ashley & Joshua Martinez', 'Jessica & Ryan Anderson', 'Samantha & Kevin Taylor',
  'Emily & Brandon Thomas', 'Lauren & Justin Jackson', 'Megan & Tyler White', 'Kayla & Jordan Harris',
  'Brittany & Austin Martin', 'Danielle & Cameron Thompson', 'Courtney & Hunter Garcia', 'Rebecca & Connor Martinez',
  
  // Corporate Clients
  'Summit Commercial Group', 'Evergreen Builders Network', 'Pacific Northwest Development', 'Cascade Construction Partners',
  'UrbanCore Development', 'Metro Builders Alliance', 'Portland Construction Group', 'Willamette Valley Builders',
  'Columbia River Development', 'Mount Hood Construction', 'Oregon Coast Builders', 'Valley View Construction',
  'Premier Development Corp', 'Elite Construction Group', 'Superior Builders Inc', 'Quality Construction Services',
  'Professional Builders LLC', 'Reliable Construction Co', 'Trusted Builders Group', 'Excellence Construction',
  
  // Government/Institutional Clients
  'City of Portland', 'Multnomah County', 'Portland Public Schools', 'Oregon Health & Science University',
  'Portland State University', 'Portland Community College', 'Metro Regional Government', 'Port of Portland',
  'Oregon Department of Transportation', 'Portland Parks & Recreation', 'Portland Housing Bureau', 'Bureau of Environmental Services',
  
  // Healthcare Clients
  'Providence Health System', 'Legacy Health', 'Kaiser Permanente', 'OHSU Hospital', 'Adventist Health',
  'PeaceHealth', 'Salem Health', 'St. Charles Health System', 'Asante Health System', 'Bay Area Hospital',
  
  // Educational Clients
  'Portland Public Schools', 'Beaverton School District', 'Hillsboro School District', 'Gresham-Barlow School District',
  'Lake Oswego School District', 'West Linn-Wilsonville School District', 'Tigard-Tualatin School District',
  'North Clackamas School District', 'David Douglas School District', 'Centennial School District',
  
  // Retail/Commercial Clients
  'Nike Inc', 'Intel Corporation', 'Columbia Sportswear', 'Powell\'s Books', 'New Seasons Market',
  'Fred Meyer', 'Safeway', 'Whole Foods Market', 'Target Corporation', 'Costco Wholesale',
  'Home Depot', 'Lowe\'s', 'Best Buy', 'Starbucks Corporation', 'McDonald\'s Corporation'
];

// Realistic project managers and contacts
const PROJECT_MANAGERS = [
  'Tanya Singh', 'Aaron Patel', 'Maria Rodriguez', 'David Chen', 'Sarah Johnson',
  'Michael Thompson', 'Lisa Wang', 'Robert Garcia', 'Jennifer Martinez', 'Christopher Brown',
  'Amanda Davis', 'James Wilson', 'Rachel Miller', 'Daniel Anderson', 'Michelle Taylor',
  'Andrew Thomas', 'Nicole Jackson', 'Matthew White', 'Stephanie Harris', 'Joshua Martin',
  'Ashley Thompson', 'Ryan Garcia', 'Jessica Martinez', 'Brandon Anderson', 'Samantha Taylor',
  'Kevin Thomas', 'Emily Jackson', 'Justin White', 'Lauren Harris', 'Tyler Martin'
];

// Realistic locations in the Pacific Northwest
const LOCATIONS = [
  'Portland, OR', 'Beaverton, OR', 'Hillsboro, OR', 'Gresham, OR', 'Lake Oswego, OR',
  'West Linn, OR', 'Tigard, OR', 'Tualatin, OR', 'Milwaukie, OR', 'Oregon City, OR',
  'Clackamas, OR', 'Happy Valley, OR', 'Wilsonville, OR', 'Sherwood, OR', 'Forest Grove, OR',
  'Cornelius, OR', 'North Plains, OR', 'Banks, OR', 'Gaston, OR', 'Yamhill, OR',
  'Newberg, OR', 'Dundee, OR', 'Dayton, OR', 'McMinnville, OR', 'Salem, OR',
  'Eugene, OR', 'Springfield, OR', 'Bend, OR', 'Medford, OR', 'Ashland, OR',
  'Vancouver, WA', 'Battle Ground, WA', 'Camas, WA', 'Washougal, WA', 'Ridgefield, WA'
];

// Realistic trade specialties
const TRADE_SPECIALTIES = [
  'General Construction', 'Residential Construction', 'Commercial Construction', 'Industrial Construction',
  'Concrete & Foundation', 'Framing & Structure', 'Roofing & Siding', 'Electrical Systems',
  'Plumbing & Mechanical', 'HVAC & Controls', 'Flooring & Finishes', 'Cabinetry & Millwork',
  'Painting & Staining', 'Landscaping & Hardscaping', 'Demolition & Excavation', 'Insulation & Weatherproofing',
  'Windows & Doors', 'Countertops & Surfaces', 'Lighting & Fixtures', 'Appliances & Equipment'
];

// Realistic organization types
const ORGANIZATION_TYPES = [
  'General Contractor', 'Subcontractor', 'Vendor', 'Supplier', 'Consultant', 'Architect', 'Engineer',
  'Client', 'Owner', 'Developer', 'Property Manager', 'Facility Manager', 'Project Manager'
];

// Function to get a random item from an array
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Function to get multiple random items from an array
function getRandomItems(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Function to generate a realistic project name
function generateProjectName() {
  return getRandomItem(PROJECT_NAMES);
}

// Function to generate a realistic client name
function generateClientName() {
  return getRandomItem(CLIENT_NAMES);
}

// Function to generate a realistic project manager
function generateProjectManager() {
  return getRandomItem(PROJECT_MANAGERS);
}

// Function to generate a realistic location
function generateLocation() {
  return getRandomItem(LOCATIONS);
}

// Function to generate realistic tags based on project type
function generateProjectTags(projectName, clientName) {
  const baseTags = ['Construction'];
  
  // Add tags based on project name keywords
  if (projectName.toLowerCase().includes('residential') || 
      projectName.toLowerCase().includes('home') || 
      projectName.toLowerCase().includes('condo') ||
      projectName.toLowerCase().includes('apartment')) {
    baseTags.push('Residential');
  }
  
  if (projectName.toLowerCase().includes('commercial') || 
      projectName.toLowerCase().includes('office') || 
      projectName.toLowerCase().includes('business') ||
      projectName.toLowerCase().includes('retail')) {
    baseTags.push('Commercial');
  }
  
  if (projectName.toLowerCase().includes('renovation') || 
      projectName.toLowerCase().includes('restoration') || 
      projectName.toLowerCase().includes('upgrade')) {
    baseTags.push('Renovation');
  }
  
  if (projectName.toLowerCase().includes('mixed-use') || 
      projectName.toLowerCase().includes('development')) {
    baseTags.push('Mixed-Use');
  }
  
  // Add location-based tags
  if (projectName.toLowerCase().includes('portland') || 
      clientName.toLowerCase().includes('portland')) {
    baseTags.push('Portland');
  }
  
  // Add random specialty tags
  const specialtyTags = getRandomItems(TRADE_SPECIALTIES, 2);
  baseTags.push(...specialtyTags);
  
  return baseTags;
}

// Function to generate realistic metadata
function generateProjectMetadata(projectName, clientName) {
  const phases = ['Planning', 'Design', 'Pre-Construction', 'Construction', 'Finishing', 'Completion', 'Closeout'];
  const tradeFocuses = ['General', 'Specialized', 'Multi-trade', 'Single-trade'];
  
  return {
    projectPhase: getRandomItem(phases),
    projectManager: generateProjectManager(),
    location: generateLocation(),
    revision: `R${Math.floor(Math.random() * 5) + 1}`,
    tradeFocus: getRandomItem(tradeFocuses),
    estimatedDuration: `${Math.floor(Math.random() * 12) + 3} months`,
    budget: `$${(Math.floor(Math.random() * 5000000) + 500000).toLocaleString()}`,
    squareFootage: Math.floor(Math.random() * 50000) + 5000,
    buildingType: projectName.toLowerCase().includes('residential') ? 'Residential' : 'Commercial'
  };
}

// Export all the functions and data
export {
  PROJECT_NAMES,
  CLIENT_NAMES,
  PROJECT_MANAGERS,
  LOCATIONS,
  TRADE_SPECIALTIES,
  ORGANIZATION_TYPES,
  generateProjectName,
  generateClientName,
  generateProjectManager,
  generateLocation,
  generateProjectTags,
  generateProjectMetadata,
  getRandomItem,
  getRandomItems
};
