import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Weather conditions and descriptions
const WEATHER_CONDITIONS = [
  'Clear skies',
  'Partly cloudy',
  'Overcast',
  'Light rain',
  'Heavy rain',
  'Thunderstorms',
  'Snow',
  'Fog',
  'Windy',
  'Hot and humid',
  'Cool and dry',
  'Partly cloudy with isolated showers',
  'Sunny with light winds',
  'Cloudy with occasional rain',
  'Clear and cold'
];

// Construction progress scenarios
const PROGRESS_SCENARIOS = [
  'Completed foundation pour for main structure',
  'Finished framing work on second floor',
  'Installed electrical rough-in for kitchen',
  'Completed drywall installation in living areas',
  'Finished painting interior walls',
  'Installed kitchen cabinets and countertops',
  'Completed bathroom tile work',
  'Finished flooring installation throughout',
  'Installed HVAC system and ductwork',
  'Completed exterior siding installation',
  'Finished roofing work and gutters',
  'Completed landscaping and final cleanup',
  'Installed windows and doors',
  'Finished plumbing rough-in',
  'Completed insulation installation',
  'Installed lighting fixtures',
  'Finished trim work and baseboards',
  'Completed final inspections',
  'Delivered and staged materials for next phase',
  'Cleaned up construction debris and site'
];

// Common construction issues
const ISSUE_SCENARIOS = [
  'Material delivery delayed due to weather',
  'Subcontractor scheduling conflict resolved',
  'Minor plumbing leak discovered and repaired',
  'Electrical permit inspection required',
  'Concrete truck arrived late, causing minor delay',
  'Weather conditions affecting outdoor work',
  'Client requested design change for kitchen layout',
  'Building inspector found minor code violation',
  'Equipment malfunction caused brief work stoppage',
  'Material shortage for custom millwork',
  'Utility company delayed connection',
  'Neighbor complaint about construction noise',
  'Foundation crack discovered during inspection',
  'HVAC system installation behind schedule',
  'Paint color approval pending from client'
];

// Materials commonly delivered
const MATERIALS_DELIVERED = [
  'Concrete and rebar for foundation',
  'Lumber and framing materials',
  'Drywall and joint compound',
  'Paint and primer supplies',
  'Kitchen cabinets and hardware',
  'Bathroom fixtures and tile',
  'Electrical wire and outlets',
  'Plumbing pipes and fittings',
  'HVAC ductwork and equipment',
  'Insulation and vapor barrier',
  'Windows and exterior doors',
  'Roofing materials and shingles',
  'Siding and trim materials',
  'Flooring materials and underlayment',
  'Lighting fixtures and switches',
  'Countertops and backsplash tile',
  'Hardware and fasteners',
  'Landscaping materials and plants'
];

// Author names (project managers, superintendents, etc.)
const AUTHORS = [
  'Mike Rodriguez',
  'Sarah Chen',
  'David Thompson',
  'Lisa Martinez',
  'James Wilson',
  'Maria Garcia',
  'Robert Johnson',
  'Jennifer Davis',
  'Michael Brown',
  'Amanda Taylor',
  'Christopher Lee',
  'Jessica Anderson',
  'Daniel White',
  'Ashley Thomas',
  'Matthew Jackson'
];

// Generate random number between min and max
function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate weather conditions
function generateWeatherConditions() {
  const condition = WEATHER_CONDITIONS[randomBetween(0, WEATHER_CONDITIONS.length - 1)];
  const currentTemp = randomBetween(45, 95);
  const lowTemp = currentTemp - randomBetween(5, 20);
  const windSpeed = randomBetween(0, 25);
  const humidity = randomBetween(30, 100);
  const precipitation = Math.random() < 0.3 ? randomBetween(0, 2) : 0;
  
  return {
    description: condition,
    temperature: {
      current: currentTemp,
      low: lowTemp,
      unit: 'F'
    },
    wind: {
      speed: windSpeed,
      unit: 'mph'
    },
    humidity: humidity,
    precipitation: {
      total: precipitation,
      unit: 'in'
    },
    timestamp: new Date(Date.now() - randomBetween(0, 8) * 60 * 60 * 1000).toISOString()
  };
}

// Generate weather notes
function generateWeatherNotes(weather) {
  const notes = [];
  
  if (weather.precipitation.total > 0) {
    notes.push('Rain expected throughout the day, covered materials properly');
  }
  
  if (weather.temperature.current > 85) {
    notes.push('Hot weather conditions, ensured proper hydration for crew');
  }
  
  if (weather.temperature.current < 50) {
    notes.push('Cold weather, adjusted concrete curing schedule');
  }
  
  if (weather.wind.speed > 15) {
    notes.push('High winds, secured loose materials and equipment');
  }
  
  if (weather.humidity > 80) {
    notes.push('High humidity, extended paint drying times');
  }
  
  return notes.length > 0 ? notes.join('. ') : undefined;
}

// Generate structured notes
function generateStructuredNotes() {
  const progress = PROGRESS_SCENARIOS[randomBetween(0, PROGRESS_SCENARIOS.length - 1)];
  
  // 70% chance of having issues
  const issues = Math.random() < 0.7 ? 
    ISSUE_SCENARIOS[randomBetween(0, ISSUE_SCENARIOS.length - 1)] : undefined;
  
  // 60% chance of materials delivered
  const materialsDelivered = Math.random() < 0.6 ? 
    MATERIALS_DELIVERED[randomBetween(0, MATERIALS_DELIVERED.length - 1)] : undefined;
  
  // 30% chance of additional notes
  const additional = Math.random() < 0.3 ? 
    'Crew worked efficiently despite challenging conditions. Quality control checks completed.' : undefined;
  
  return {
    progress,
    issues,
    materialsDelivered,
    additional
  };
}

// Generate attachments (references to existing documents)
function generateAttachments() {
  const attachmentTypes = [
    'invoice',
    'photo',
    'report',
    'permit',
    'inspection',
    'receipt',
    'drawing',
    'specification'
  ];
  
  const count = randomBetween(0, 3);
  const attachments = [];
  
  for (let i = 0; i < count; i++) {
    const type = attachmentTypes[randomBetween(0, attachmentTypes.length - 1)];
    const id = randomBetween(1, 100);
    attachments.push(`${type}-${String(id).padStart(3, '0')}`);
  }
  
  return attachments;
}

// Generate a single daily log
function generateDailyLog(logId, projectName, clientName) {
  const logDate = new Date(Date.now() - randomBetween(0, 90) * 24 * 60 * 60 * 1000);
  const author = AUTHORS[randomBetween(0, AUTHORS.length - 1)];
  const weatherConditions = generateWeatherConditions();
  const weatherNotes = generateWeatherNotes(weatherConditions);
  const structuredNotes = generateStructuredNotes();
  const attachments = generateAttachments();
  
  // Create title based on progress
  const progressWords = structuredNotes.progress.split(' ').slice(0, 3).join(' ');
  const title = `${progressWords} - ${projectName}`;
  
  // Create summary
  let summary = `Daily log for ${projectName}. ${structuredNotes.progress}.`;
  if (structuredNotes.issues) {
    summary += ` Issues: ${structuredNotes.issues}.`;
  }
  
  // Generate tags based on content
  const tags = ['Daily Log', 'Progress'];
  if (structuredNotes.issues) tags.push('Issues');
  if (structuredNotes.materialsDelivered) tags.push('Materials');
  if (weatherConditions.precipitation.total > 0) tags.push('Weather');
  
  // Add trade-specific tags based on progress
  if (structuredNotes.progress.includes('electrical')) tags.push('Electrical');
  if (structuredNotes.progress.includes('plumbing')) tags.push('Plumbing');
  if (structuredNotes.progress.includes('concrete')) tags.push('Concrete');
  if (structuredNotes.progress.includes('framing')) tags.push('Framing');
  if (structuredNotes.progress.includes('painting')) tags.push('Painting');
  
  return {
    id: logId,
    entityType: 'DailyLog',
    title: title,
    summary: summary,
    project: projectName,
    client: clientName,
    status: 'Published',
    logDate: logDate.toISOString().split('T')[0] + 'T00:00:00.000Z',
    author: author,
    weatherConditions: weatherConditions,
    weatherNotes: weatherNotes,
    structuredNotes: structuredNotes,
    attachments: attachments,
    tags: tags,
    createdAt: logDate.toISOString(),
    updatedAt: logDate.toISOString(),
    metadata: {
      projectPhase: ['Planning', 'Construction', 'Finishing', 'Completion'][randomBetween(0, 3)],
      projectManager: author,
      location: generateLocation(),
      logType: 'Daily Progress',
      weatherImpact: weatherConditions.precipitation.total > 0 ? 'Yes' : 'No'
    }
  };
}

// Generate daily log corpus
function generateDailyLogCorpus() {
  console.log('📝 Generating Daily Log corpus...');
  
  const corpusDir = path.join(__dirname, 'public', 'corpus-parts');
  const indexFile = path.join(corpusDir, 'index.json');
  
  // Read existing index
  const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
  
  // Generate daily log corpus parts
  const dailyLogParts = 2; // Generate 2 parts of daily logs
  const logsPerPart = 25; // 25 daily logs per part
  
  for (let partNum = 1; partNum <= dailyLogParts; partNum++) {
    const partIndex = index.files.length + partNum;
    const filename = `corpus-part-${String(partIndex).padStart(2, '0')}.json`;
    
    console.log(`📄 Generating ${filename} with Daily Logs...`);
    
    const dailyLogs = [];
    const logIds = [];
    
    // Generate daily logs
    for (let i = 0; i < logsPerPart; i++) {
      const logId = `dailylog-${String(partIndex * 25 + i + 1).padStart(3, '0')}`;
      logIds.push(logId);
      
      const projectName = generateProjectName();
      const clientName = generateClientName();
      
      const dailyLog = generateDailyLog(logId, projectName, clientName);
      dailyLogs.push(dailyLog);
    }
    
    // Write the daily log corpus part
    const filePath = path.join(corpusDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(dailyLogs, null, 2));
    
    console.log(`✅ Generated ${filename} with ${dailyLogs.length} daily logs`);
  }
  
  // Update the index file
  for (let partNum = 1; partNum <= dailyLogParts; partNum++) {
    const partIndex = index.files.length + partNum;
    const filename = `corpus-part-${String(partIndex).padStart(2, '0')}.json`;
    
    index.files.push({
      filename: filename,
      count: logsPerPart,
      generated: new Date().toISOString(),
      entityType: 'DailyLog'
    });
  }
  
  // Update total counts
  index.totalDocuments += dailyLogParts * logsPerPart;
  index.totalFiles += dailyLogParts;
  
  fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));
  
  console.log('🎉 Daily Log corpus generation complete!');
  console.log(`📊 Generated ${dailyLogParts} new corpus parts with ${dailyLogParts * logsPerPart} daily logs`);
  console.log('🌤️ Each daily log includes weather conditions, progress notes, and realistic construction scenarios');
}

// Run the daily log corpus generation
if (import.meta.url === `file://${process.argv[1]}`) {
  generateDailyLogCorpus();
}

export { generateDailyLogCorpus, generateDailyLog };
