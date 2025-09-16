# Corpus Expansion Summary

## Overview
Successfully expanded the search corpus with creative construction-related line items using the provided terms. The expansion includes realistic quantities, descriptions, and pricing for residential construction and remodeling projects.

## People & Organization Metadata Plan

- **People (entityType: Person)**
  - Core fields: `personType` (Client | Contact), `jobTitle`, `associatedOrganization`, `location`, `email`, `phone`, optional `tradeFocus`
  - Search tags capture relationship context (e.g. homeowner, architect, procurement)
  - Metadata keys extend discoverability: `relationshipDepth`, `preferredContactMethod`, `projectPortfolio`
  - Projects reference their primary engagement so existing facet flows remain useful

- **Organizations (entityType: Organization)**
  - Core fields: `organizationType` (Subcontractor | Vendor), `tradeFocus`, `serviceArea`, `primaryContact`, `email`, `phone`, optional `website`
  - Metadata keys include compliance info (`licenseStatus`), diversity certifications, and capacity signals (`crewSize`, `avgProjectValue`)
  - Contacts cross-link via `contactOrganization` facet so users can pivot between people and companies during search

These structures surface in new facets (`personType`, `contactOrganization`, `organizationType`, `tradeFocus`) and populate summary metadata in both the quick-search dialog and full results experience.

## Key Features Implemented

### 1. Corpus Generator Script (`corpus-generator.js`)
- **ES Module compatible** - Works with the project's module system
- **Comprehensive term variations** - Handles capitalization, pluralization, gerunds
- **Realistic line item templates** - 150+ templates covering all construction terms
- **Smart quantity generation** - Varies from 1-50 units with realistic pricing
- **Multiple unit types** - sq ft, linear feet, cubic yards, units, hours, pieces, loads, fixtures, bathrooms, closets, permits, inspections, dollars, ls

### 2. Line Item Distribution
- **Documents**: 0-4 line items (average ~2)
- **Client Invoices**: 2-12 line items (average ~6)
- **Purchase Orders**: 2-12 line items (average ~6)
- **Payments**: 1-6 line items (average ~3)
- **Bills**: 2-15 line items normally, 30-80 line items for 30% of bills
- **Receipts**: 2-15 line items normally, 30-80 line items for 30% of receipts

### 3. Construction Terms Used
All 28 provided terms are incorporated with creative variations:
- concrete, demolition, cabinet, deck, bathroom, carpet, cabinets, countertop, counter, building, ceiling, base, countertops, cabinetry, baseboard, bill, appliances, cleaning, bath, custom, cost, design, delivery, basement, contingency, closet, carpentry, clean

### 4. Line Item Types
- **Material**: Raw materials and supplies
- **Labor**: Work performed by employees
- **Subcontractor**: Work performed by external contractors
- **Equipment**: Equipment rental and usage
- **Other**: Miscellaneous items and services

### 5. Realistic Pricing
- Base prices vary by unit type (e.g., $2-25/sq ft, $5-50/linear foot)
- Adjusted by line item type (Labor +50%, Equipment +100%, etc.)
- Realistic quantities and totals

## Results Achieved

### High Line Item Count Examples
- **receipt-001**: 68 line items (total value: $2,218,116)
- **bill-001**: 23+ line items (total value: $437,843)
- **bill-016**: 8 line items (total value: $284,228)

### Creative Line Item Examples
- "Concrete sealing and waterproofing - 49 sq ft"
- "Cabinet doors and drawers - 36 pieces"
- "Post-construction cleaning - 47 hours"
- "Closet customization and design - 15 hours"
- "Countertop edge finishing - 34 linear feet"
- "Basement lighting installation - 32 fixtures"

## Usage

### To Regenerate Corpus
```bash
node corpus-generator.js
```

### To Modify Terms or Templates
Edit the `CONSTRUCTION_TERMS`, `TERM_VARIATIONS`, and `LINE_ITEM_TEMPLATES` arrays in `corpus-generator.js`.

### To Adjust Line Item Counts
Modify the `getLineItemCount()` function to change the distribution of line items per document type.

## Future Enhancements
- Add more construction-specific terms
- Include seasonal pricing variations
- Add regional pricing differences
- Include more specialized trades and materials
- Add warranty and maintenance line items
