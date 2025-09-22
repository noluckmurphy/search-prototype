import { SearchRecord, isFinancialRecord, isPersonRecord, isOrganizationRecord } from '../types';

// Relationship types for extensibility
export type RelationshipType = 
  | 'vendor'           // Bill → Organization (vendor)
  | 'primaryContact'   // Organization → Person (primary contact)
  | 'associatedOrg'    // Person → Organization (associated organization)
  | 'project'          // Any entity → Project (via project field)
  | 'client'           // Any entity → Client (via client field)
  | 'inferred'         // Inferred from text content
  | 'temporal'         // Recent activity with same entities
  | 'financial'        // Financial relationships (bills, payments, etc.);

// Relationship confidence levels
export type RelationshipConfidence = 'explicit' | 'inferred' | 'weak';

// Relationship interface
export interface Relationship {
  id: string;
  type: RelationshipType;
  confidence: RelationshipConfidence;
  sourceEntityId: string;
  targetEntityId: string;
  targetEntityType: string;
  targetEntityTitle: string;
  metadata?: {
    sourceField?: string;        // Which field in source entity created this relationship
    targetField?: string;        // Which field in target entity matched
    matchScore?: number;         // For inferred relationships
    lastInteraction?: string;    // For temporal relationships
  };
}

// Smart action interface
export interface SmartAction {
  id: string;
  label: string;
  description?: string;
  href: string;
  icon?: string;
  priority: number; // Lower number = higher priority
  relationshipType?: RelationshipType;
  entityTypes: string[]; // Which entity types this action applies to
}

// Relationship lookup tables for fast access
export interface RelationshipLookup {
  bySource: Map<string, Relationship[]>;     // sourceEntityId → relationships
  byTarget: Map<string, Relationship[]>;     // targetEntityId → relationships
  byType: Map<RelationshipType, Relationship[]>; // relationshipType → relationships
}

// Smart actions configuration
export const SMART_ACTIONS: Record<string, SmartAction[]> = {
  'Bill': [
    {
      id: 'pay-bill',
      label: 'Pay bill',
      description: 'Process payment for this bill',
      href: '#',
      icon: 'credit-card',
      priority: 1,
      relationshipType: 'vendor',
      entityTypes: ['Bill']
    },
    {
      id: 'view-vendor-bills',
      label: 'View all bills from vendor',
      description: 'See all bills from this vendor',
      href: '#',
      icon: 'list',
      priority: 2,
      relationshipType: 'vendor',
      entityTypes: ['Bill']
    },
    {
      id: 'contact-vendor',
      label: 'Contact vendor',
      description: 'Get in touch with the vendor',
      href: '#',
      icon: 'mail',
      priority: 3,
      relationshipType: 'vendor',
      entityTypes: ['Bill']
    },
    {
      id: 'view-payment-history',
      label: 'View payment history',
      description: 'See payment history for this vendor',
      href: '#',
      icon: 'history',
      priority: 4,
      relationshipType: 'vendor',
      entityTypes: ['Bill']
    },
    {
      id: 'view-project-bills',
      label: 'View all project bills',
      description: 'See all bills for this project',
      href: '#',
      icon: 'folder',
      priority: 5,
      relationshipType: 'project',
      entityTypes: ['Bill']
    }
  ],
  'Person': [
    {
      id: 'send-message',
      label: 'Send message',
      description: 'Send a message to this person',
      href: '#',
      icon: 'message',
      priority: 1,
      entityTypes: ['Person']
    },
    {
      id: 'view-all-activity',
      label: 'View all activity',
      description: 'See all activity with this person',
      href: '#',
      icon: 'activity',
      priority: 2,
      entityTypes: ['Person']
    },
    {
      id: 'view-organization',
      label: 'View organization',
      description: 'See organization details',
      href: '#',
      icon: 'building',
      priority: 3,
      relationshipType: 'associatedOrg',
      entityTypes: ['Person']
    },
    {
      id: 'schedule-meeting',
      label: 'Schedule meeting',
      description: 'Schedule a meeting with this person',
      href: '#',
      icon: 'calendar',
      priority: 4,
      entityTypes: ['Person']
    },
    {
      id: 'view-project-activity',
      label: 'View project activity',
      description: 'See all activity for this project',
      href: '#',
      icon: 'folder',
      priority: 5,
      relationshipType: 'project',
      entityTypes: ['Person']
    }
  ],
  'Organization': [
    {
      id: 'view-all-bills',
      label: 'View all bills',
      description: 'See all bills from this organization',
      href: '#',
      icon: 'list',
      priority: 1,
      entityTypes: ['Organization']
    },
    {
      id: 'payment-summary',
      label: 'Payment summary',
      description: 'View payment summary for this vendor',
      href: '#',
      icon: 'dollar-sign',
      priority: 2,
      entityTypes: ['Organization']
    },
    {
      id: 'contact-primary-person',
      label: 'Contact primary person',
      description: 'Get in touch with the primary contact',
      href: '#',
      icon: 'user',
      priority: 3,
      relationshipType: 'primaryContact',
      entityTypes: ['Organization']
    },
    {
      id: 'view-all-projects',
      label: 'View all projects',
      description: 'See all projects with this organization',
      href: '#',
      icon: 'folder',
      priority: 4,
      entityTypes: ['Organization']
    },
    {
      id: 'performance-summary',
      label: 'Performance summary',
      description: 'View vendor performance metrics',
      href: '#',
      icon: 'bar-chart',
      priority: 5,
      entityTypes: ['Organization']
    }
  ]
};

export class RelationshipEngine {
  private relationships: Relationship[] = [];
  private lookup: RelationshipLookup = {
    bySource: new Map(),
    byTarget: new Map(),
    byType: new Map()
  };

  constructor(private corpus: SearchRecord[]) {
    this.buildRelationships();
  }

  /**
   * Build all relationships from the corpus
   */
  private buildRelationships(): void {
    this.relationships = [];
    this.lookup = {
      bySource: new Map(),
      byTarget: new Map(),
      byType: new Map()
    };

    // Build explicit relationships
    this.buildExplicitRelationships();
    
    // Build inferred relationships
    this.buildInferredRelationships();
    
    // Build temporal relationships
    this.buildTemporalRelationships();

    // Build lookup tables
    this.buildLookupTables();
  }

  /**
   * Build explicit relationships from entity metadata
   */
  private buildExplicitRelationships(): void {
    for (const entity of this.corpus) {
      // Bill → Organization (vendor relationship)
      if (isFinancialRecord(entity) && entity.entityType === 'Bill') {
        const vendorName = entity.metadata?.vendor as string;
        if (vendorName) {
          const vendorOrg = this.findOrganizationByName(vendorName);
          if (vendorOrg) {
            this.addRelationship({
              id: `bill-vendor-${entity.id}-${vendorOrg.id}`,
              type: 'vendor',
              confidence: 'explicit',
              sourceEntityId: entity.id,
              targetEntityId: vendorOrg.id,
              targetEntityType: vendorOrg.entityType,
              targetEntityTitle: vendorOrg.title,
              metadata: {
                sourceField: 'metadata.vendor',
                targetField: 'title'
              }
            });
          }
        }
      }

      // Organization → Person (primary contact relationship)
      if (isOrganizationRecord(entity)) {
        const primaryContactName = entity.primaryContact;
        if (primaryContactName) {
          const contactPerson = this.findPersonByName(primaryContactName);
          if (contactPerson) {
            this.addRelationship({
              id: `org-contact-${entity.id}-${contactPerson.id}`,
              type: 'primaryContact',
              confidence: 'explicit',
              sourceEntityId: entity.id,
              targetEntityId: contactPerson.id,
              targetEntityType: contactPerson.entityType,
              targetEntityTitle: contactPerson.title,
              metadata: {
                sourceField: 'primaryContact',
                targetField: 'title'
              }
            });
          }
        }
      }

      // Person → Organization (associated organization relationship)
      if (isPersonRecord(entity)) {
        const associatedOrgName = entity.associatedOrganization;
        if (associatedOrgName) {
          const associatedOrg = this.findOrganizationByName(associatedOrgName);
          if (associatedOrg) {
            this.addRelationship({
              id: `person-org-${entity.id}-${associatedOrg.id}`,
              type: 'associatedOrg',
              confidence: 'explicit',
              sourceEntityId: entity.id,
              targetEntityId: associatedOrg.id,
              targetEntityType: associatedOrg.entityType,
              targetEntityTitle: associatedOrg.title,
              metadata: {
                sourceField: 'associatedOrganization',
                targetField: 'title'
              }
            });
          }
        }
      }
    }
  }

  /**
   * Build inferred relationships from text content
   */
  private buildInferredRelationships(): void {
    for (const entity of this.corpus) {
      // Look for person names in text content
      const personNames = this.extractPersonNames(entity);
      for (const personName of personNames) {
        const person = this.findPersonByName(personName);
        if (person && person.id !== entity.id) {
          this.addRelationship({
            id: `inferred-person-${entity.id}-${person.id}`,
            type: 'inferred',
            confidence: 'inferred',
            sourceEntityId: entity.id,
            targetEntityId: person.id,
            targetEntityType: person.entityType,
            targetEntityTitle: person.title,
            metadata: {
              sourceField: 'text-content',
              targetField: 'title',
              matchScore: 0.8 // Basic fuzzy matching score
            }
          });
        }
      }

      // Look for organization names in text content
      const orgNames = this.extractOrganizationNames(entity);
      for (const orgName of orgNames) {
        const org = this.findOrganizationByName(orgName);
        if (org && org.id !== entity.id) {
          this.addRelationship({
            id: `inferred-org-${entity.id}-${org.id}`,
            type: 'inferred',
            confidence: 'inferred',
            sourceEntityId: entity.id,
            targetEntityId: org.id,
            targetEntityType: org.entityType,
            targetEntityTitle: org.title,
            metadata: {
              sourceField: 'text-content',
              targetField: 'title',
              matchScore: 0.8
            }
          });
        }
      }
    }
  }

  /**
   * Build temporal relationships (recent activity with same entities)
   */
  private buildTemporalRelationships(): void {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Group entities by project and client to find temporal relationships
    const projectGroups = new Map<string, SearchRecord[]>();
    const clientGroups = new Map<string, SearchRecord[]>();

    for (const entity of this.corpus) {
      if (entity.project) {
        if (!projectGroups.has(entity.project)) {
          projectGroups.set(entity.project, []);
        }
        projectGroups.get(entity.project)!.push(entity);
      }

      if (entity.client) {
        if (!clientGroups.has(entity.client)) {
          clientGroups.set(entity.client, []);
        }
        clientGroups.get(entity.client)!.push(entity);
      }
    }

    // Create temporal relationships for recent activity
    for (const [project, entities] of projectGroups) {
      const recentEntities = entities.filter(e => new Date(e.updatedAt) > thirtyDaysAgo);
      if (recentEntities.length > 1) {
        // Create relationships between recent entities in the same project
        for (let i = 0; i < recentEntities.length; i++) {
          for (let j = i + 1; j < recentEntities.length; j++) {
            const entity1 = recentEntities[i];
            const entity2 = recentEntities[j];
            
            this.addRelationship({
              id: `temporal-project-${entity1.id}-${entity2.id}`,
              type: 'temporal',
              confidence: 'weak',
              sourceEntityId: entity1.id,
              targetEntityId: entity2.id,
              targetEntityType: entity2.entityType,
              targetEntityTitle: entity2.title,
              metadata: {
                sourceField: 'project',
                targetField: 'project',
                lastInteraction: entity2.updatedAt
              }
            });
          }
        }
      }
    }
  }

  /**
   * Build lookup tables for fast relationship queries
   */
  private buildLookupTables(): void {
    for (const relationship of this.relationships) {
      // By source
      if (!this.lookup.bySource.has(relationship.sourceEntityId)) {
        this.lookup.bySource.set(relationship.sourceEntityId, []);
      }
      this.lookup.bySource.get(relationship.sourceEntityId)!.push(relationship);

      // By target
      if (!this.lookup.byTarget.has(relationship.targetEntityId)) {
        this.lookup.byTarget.set(relationship.targetEntityId, []);
      }
      this.lookup.byTarget.get(relationship.targetEntityId)!.push(relationship);

      // By type
      if (!this.lookup.byType.has(relationship.type)) {
        this.lookup.byType.set(relationship.type, []);
      }
      this.lookup.byType.get(relationship.type)!.push(relationship);
    }
  }

  /**
   * Add a relationship to the engine
   */
  private addRelationship(relationship: Relationship): void {
    this.relationships.push(relationship);
  }

  /**
   * Find organization by name (fuzzy matching)
   */
  private findOrganizationByName(name: string): SearchRecord | null {
    const normalizedName = name.toLowerCase().trim();
    
    for (const entity of this.corpus) {
      if (isOrganizationRecord(entity)) {
        const entityName = entity.title.toLowerCase().trim();
        if (entityName === normalizedName || 
            entityName.includes(normalizedName) || 
            normalizedName.includes(entityName)) {
          return entity;
        }
      }
    }
    
    return null;
  }

  /**
   * Find person by name (fuzzy matching)
   */
  private findPersonByName(name: string): SearchRecord | null {
    const normalizedName = name.toLowerCase().trim();
    
    for (const entity of this.corpus) {
      if (isPersonRecord(entity)) {
        const entityName = entity.title.toLowerCase().trim();
        if (entityName === normalizedName || 
            entityName.includes(normalizedName) || 
            normalizedName.includes(entityName)) {
          return entity;
        }
      }
    }
    
    return null;
  }

  /**
   * Extract person names from entity text content
   */
  private extractPersonNames(entity: SearchRecord): string[] {
    const names: string[] = [];
    const text = `${entity.title} ${entity.summary}`.toLowerCase();
    
    // Look for person names in the corpus
    for (const person of this.corpus) {
      if (isPersonRecord(person) && person.id !== entity.id) {
        const personName = person.title.toLowerCase();
        if (text.includes(personName)) {
          names.push(person.title);
        }
      }
    }
    
    return names;
  }

  /**
   * Extract organization names from entity text content
   */
  private extractOrganizationNames(entity: SearchRecord): string[] {
    const names: string[] = [];
    const text = `${entity.title} ${entity.summary}`.toLowerCase();
    
    // Look for organization names in the corpus
    for (const org of this.corpus) {
      if (isOrganizationRecord(org) && org.id !== entity.id) {
        const orgName = org.title.toLowerCase();
        if (text.includes(orgName)) {
          names.push(org.title);
        }
      }
    }
    
    return names;
  }

  /**
   * Get relationships for a specific entity
   */
  getRelationships(entityId: string, options?: {
    type?: RelationshipType;
    confidence?: RelationshipConfidence;
    includeInferred?: boolean;
  }): Relationship[] {
    const relationships = this.lookup.bySource.get(entityId) || [];
    
    return relationships.filter(rel => {
      if (options?.type && rel.type !== options.type) return false;
      if (options?.confidence && rel.confidence !== options.confidence) return false;
      if (options?.includeInferred === false && rel.confidence === 'inferred') return false;
      return true;
    });
  }

  /**
   * Get smart actions for a specific entity
   */
  getSmartActions(entity: SearchRecord, includeInferred: boolean = true): SmartAction[] {
    const entityType = entity.entityType;
    const availableActions = SMART_ACTIONS[entityType] || [];
    
    // Get relationships for this entity
    const relationships = this.getRelationships(entity.id, { includeInferred });
    
    // Filter actions based on available relationships
    const applicableActions = availableActions.filter(action => {
      if (!action.relationshipType) return true; // Action doesn't require a relationship
      
      // Check if we have the required relationship type
      return relationships.some(rel => rel.type === action.relationshipType);
    });
    
    // Sort by priority
    return applicableActions.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Get related entities for a specific entity
   */
  getRelatedEntities(entityId: string, options?: {
    type?: RelationshipType;
    confidence?: RelationshipConfidence;
    includeInferred?: boolean;
    limit?: number;
  }): SearchRecord[] {
    const relationships = this.getRelationships(entityId, options);
    const relatedEntities: SearchRecord[] = [];
    
    for (const rel of relationships) {
      const entity = this.corpus.find(e => e.id === rel.targetEntityId);
      if (entity) {
        relatedEntities.push(entity);
      }
    }
    
    // Remove duplicates and apply limit
    const uniqueEntities = relatedEntities.filter((entity, index, self) => 
      index === self.findIndex(e => e.id === entity.id)
    );
    
    return options?.limit ? uniqueEntities.slice(0, options.limit) : uniqueEntities;
  }

  /**
   * Get all relationships (for debugging)
   */
  getAllRelationships(): Relationship[] {
    return [...this.relationships];
  }

  /**
   * Get relationship statistics
   */
  getStats(): {
    total: number;
    byType: Record<RelationshipType, number>;
    byConfidence: Record<RelationshipConfidence, number>;
  } {
    const stats = {
      total: this.relationships.length,
      byType: {} as Record<RelationshipType, number>,
      byConfidence: {} as Record<RelationshipConfidence, number>
    };
    
    for (const rel of this.relationships) {
      stats.byType[rel.type] = (stats.byType[rel.type] || 0) + 1;
      stats.byConfidence[rel.confidence] = (stats.byConfidence[rel.confidence] || 0) + 1;
    }
    
    return stats;
  }
}
