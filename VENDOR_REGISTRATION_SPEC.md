# Vendor Registration & Management - Specification

## Overview

Standardized Vendor Registration and Management module following LogixSphere design system and patterns.

## Vendor Data Structure

### Core Fields

#### Identification
- **Vendor ID** (Auto-generated, Unique)
- **Legal Name** (Mandatory, min 3 chars, max 100 chars)
- **Trade Name** (Optional, max 100 chars)
- **Vendor Type** (Mandatory): 
  - Individual (Pessoa Física)
  - Company (Pessoa Jurídica)
  - Cooperative (Cooperativa)

#### Tax & Legal Information
- **Document Number** (Mandatory, Unique)
  - For Individual: CPF (formatted: XXX.XXX.XXX-XX)
  - For Company: CNPJ (formatted: XX.XXX.XXX/XXXX-XX)
- **Registration Status** (Mandatory):
  - Active (Ativo)
  - Inactive (Inativo)
  - Suspended (Suspenso)
  - Blocked (Bloqueado)

#### Contact Information
- **Email** (Mandatory, valid email format)
- **Primary Phone** (Mandatory, phone mask: +55 (XX) XXXXX-XXXX)
- **Secondary Phone** (Optional, same mask)
- **Fax** (Optional, phone mask)
- **Website** (Optional, valid URL format)

#### Address Information
- **Street** (Mandatory, max 100 chars)
- **Number** (Mandatory, max 10 chars)
- **Complement** (Optional, max 100 chars)
- **Neighborhood** (Mandatory, max 50 chars)
- **City** (Mandatory, max 50 chars)
- **State** (Mandatory, 2-char format: SP, RJ, etc.)
- **ZIP Code** (Mandatory, format: XXXXX-XXX)
- **Country** (Mandatory, default: Brazil)
- **Reference Points** (Optional, max 200 chars)

#### Service Information
- **Services Provided** (Mandatory, multi-select):
  - Delivery (Entrega)
  - Pickup (Coleta)
  - Distribution (Distribuição)
  - Handling (Movimentação)
  - Consultation (Consultoria)
  - Other (Outro)

- **Service Areas** (Mandatory):
  - States covered (multi-select)
  - Cities covered (multi-select)
  - Coverage type: Full Country / Regional / City-based

#### Operational Information
- **Operating Since** (Mandatory, date picker)
- **Employees** (Optional, number)
- **Vehicles** (Optional, number)
- **Certifications** (Optional, multi-select):
  - ISO 9001
  - ISO 14001
  - ISO 45001
  - NBR
  - Other

#### Financial Information
- **Bank Name** (Optional)
- **Account Number** (Optional, masked)
- **Account Type** (Optional): Checking / Savings
- **Routing Number** (Optional)
- **Tax Regime** (Optional):
  - Simples Nacional
  - Lucro Presumido
  - Lucro Real

#### Contract Information
- **Contract Status** (Mandatory):
  - Not Signed (Não Assinado)
  - Signed (Assinado)
  - Under Review (Em Análise)
  - Expired (Expirado)

- **Contract Start Date** (Conditional, if status is Signed)
- **Contract End Date** (Conditional, if status is Signed)
- **Contract Document** (Optional, file upload)

#### Additional Information
- **Notes** (Optional, rich text editor, max 2000 chars)
- **Internal Rating** (Optional, 1-5 stars)
- **Tags** (Optional, multi-select)
- **Created Date** (Auto, read-only)
- **Modified Date** (Auto, read-only)
- **Created By** (Auto, read-only)
- **Modified By** (Auto, read-only)

## Validations

### Mandatory Fields
- Legal Name (must not be empty, min 3 chars)
- Vendor Type (must select one)
- Document Number (must be valid format)
- Email (must be valid email)
- Primary Phone (must be valid phone)
- Street, Number, City, State, ZIP Code
- Services Provided (at least one)
- Service Areas (at least one)
- Operating Since (must be valid date)
- Contract Status

### Format Validations
- **CPF**: Must pass CPF check digit validation
- **CNPJ**: Must pass CNPJ check digit validation
- **Email**: RFC 5322 compliant
- **Phone**: Must be 10-11 digits (Brazil)
- **ZIP Code**: Format XXXXX-XXX
- **URL**: Must be valid protocol (http, https)
- **Date**: ISO 8601 format (YYYY-MM-DD)

### Business Rules
1. CPF/CNPJ must be unique in system
2. Email must be unique (unless marked as deleted)
3. Cannot deactivate vendor with active contracts
4. Cannot delete vendor (only soft-delete via status change)
5. Document type must match Vendor Type:
   - Individual → CPF only
   - Company → CNPJ only
   - Cooperative → CNPJ only
6. Contract end date must be after start date

## UI/UX Specifications

### Form Layout
- **Multi-step Form** (Recommended):
  - Step 1: Basic Information (Name, Type, Document)
  - Step 2: Contact & Address (Email, Phone, Address)
  - Step 3: Services (Service Type, Areas)
  - Step 4: Contract (Status, Dates, Document)
  - Step 5: Banking & Additional (Financial info, Notes)

- **Alternative**: Single page with sections (for edit mode)

### Input Masking
- CPF: XXX.XXX.XXX-XX
- CNPJ: XX.XXX.XXX/XXXX-XX
- Phone: +55 (XX) XXXXX-XXXX
- ZIP Code: XXXXX-XXX
- Date: DD/MM/YYYY (display), YYYY-MM-DD (storage)

### Field Groups (Visual Organization)
1. **Identification Block**
   - Legal Name | Trade Name
   - Vendor Type | Registration Status

2. **Document Block**
   - Document Number
   - Document Type (Display only, derived from Vendor Type)

3. **Contact Block**
   - Email | Primary Phone | Secondary Phone
   - Website | Fax

4. **Address Block**
   - Street | Number | Complement
   - Neighborhood | City | State | ZIP
   - Country (defaulted)
   - Reference Points

5. **Services Block**
   - Services Provided (checkboxes)
   - Service Areas (state selection)
   - Coverage Type

6. **Operational Block**
   - Operating Since | Employees | Vehicles
   - Certifications (checkboxes)

7. **Financial Block**
   - Bank Name | Account Number | Account Type
   - Routing Number | Tax Regime

8. **Contract Block**
   - Contract Status
   - Contract Start Date | Contract End Date (conditional)
   - Contract Document (upload)

9. **Additional Block**
   - Internal Rating (star picker)
   - Tags (autocomplete)
   - Notes (text editor)

## Features

### List View
- **Columns**: 
  - Vendor ID
  - Legal Name
  - Trade Name
  - Vendor Type
  - Email
  - Primary Phone
  - City
  - Status
  - Rating
  - Actions (Edit, View, Delete)

- **Filters**:
  - Status (Active, Inactive, Suspended, Blocked)
  - Vendor Type
  - Service Type
  - State
  - Rating
  - Created Date Range

- **Search**: 
  - By name, email, phone, document number
  - Full-text search

- **Sorting**:
  - By Name, Status, City, Rating, Created Date
  - Ascending/Descending

- **Pagination**: 25, 50, 100 per page

### Detail View
- **Display**: Read-only version of form
- **Actions**: Edit, Delete, Download, Print
- **History Tab**: Show all changes (audit log)
- **Related Contracts Tab**: Show linked contracts

### Edit View
- **Form**: Same as create form
- **Pre-fill**: Load existing data
- **Validation**: Same as create
- **Save & Continue**: Save and continue editing
- **Save & Close**: Save and return to list

### Create View
- **Multi-step form** recommended
- **Progress indicator**: Show current step
- **Back/Next buttons**: Navigate between steps
- **Save Draft**: Ability to save as draft
- **Preview**: Show summary before final submit

## Integration Points

### Database/Backend
- REST API endpoints for CRUD operations
- Real-time validation endpoints (for email, document uniqueness)
- File upload for contract documents
- Audit log for all changes

### Existing Systems
- **Contract Management**: Link to contracts
- **Performance Tracking**: Link to vendor performance
- **Financial System**: Integration with billing
- **Route Management**: Link vendors to routes
- **Reporting**: Export vendor data to reports

## Design System Compliance

- **Colors**: Use Logixsphere color palette
- **Typography**: Use Logixsphere font stack
- **Components**: Use standard form components
- **Spacing**: Follow 8px grid
- **Icons**: Use Bootstrap Icons or project icon set
- **Buttons**: Follow standard button styles
- **Modals**: Use standard modal pattern
- **Notifications**: Use toast/alert pattern

## Error Handling

### Validation Errors
- Inline field-level errors (below each field)
- Error summary at top of form
- Red border/background for invalid fields
- Clear error messages (not technical)

### API Errors
- Retry logic for network errors
- User-friendly error messages
- Option to retry or contact support
- Error logging for monitoring

### Conflict Resolution
- Optimistic locking (version control)
- Conflict resolution dialog if someone else edited
- Option to refresh or force save

## Accessibility

- WCAG 2.1 AA compliant
- Keyboard navigation support
- Screen reader labels (aria-label, aria-describedby)
- Focus management
- Form field grouping with fieldset
- Required field indicators (*)
- Error announcements (aria-live)

## Performance

- Lazy load vendor list (pagination)
- Debounce search input (300ms)
- Cache dropdown options (state list, service types)
- Optimize image uploads (compression, sizing)
- Progressive enhancement (form works without JS)

## API Endpoints

```
GET    /api/vendors                    # List all vendors
POST   /api/vendors                    # Create new vendor
GET    /api/vendors/:id                # Get vendor details
PUT    /api/vendors/:id                # Update vendor
DELETE /api/vendors/:id                # Soft-delete vendor

GET    /api/vendors/search             # Search vendors
GET    /api/vendors/export             # Export as CSV/Excel
POST   /api/vendors/:id/documents      # Upload contract document

GET    /api/vendors/check-email        # Check email uniqueness
GET    /api/vendors/check-document     # Check document uniqueness
```

## Testing Checklist

- [ ] Create vendor with all mandatory fields
- [ ] Create vendor with optional fields
- [ ] Edit vendor (update fields)
- [ ] Delete vendor (soft-delete via status)
- [ ] Validate CPF format and check-digit
- [ ] Validate CNPJ format and check-digit
- [ ] Validate email format
- [ ] Validate phone format
- [ ] Validate ZIP code format
- [ ] Test unique email validation
- [ ] Test unique document validation
- [ ] Test conditional fields (contract dates)
- [ ] Test multi-step form navigation
- [ ] Test form validation on submit
- [ ] Test file upload for contract
- [ ] Test list view filtering
- [ ] Test list view search
- [ ] Test list view sorting
- [ ] Test list view pagination
- [ ] Test detail view (read-only)
- [ ] Test export functionality
- [ ] Test responsive design (mobile, tablet, desktop)
- [ ] Test accessibility (keyboard nav, screen reader)
- [ ] Test error handling (network, validation, conflict)

## Success Criteria

✅ Vendor registration form with all required fields  
✅ All validations and masks working correctly  
✅ List view with filtering, search, sorting, pagination  
✅ Detail view for viewing vendor information  
✅ Edit functionality for updating vendors  
✅ Delete functionality (soft-delete via status)  
✅ Design system compliance (matching Logixsphere)  
✅ Accessibility compliance (WCAG 2.1 AA)  
✅ Integration with existing systems  
✅ Comprehensive error handling  
✅ Performance optimizations  
✅ Complete test coverage  

## Next Steps

1. Confirm vendor fields and structure with stakeholders
2. Design UI mockups in Figma (following design system)
3. Create API specification (detailed endpoint documentation)
4. Implement backend endpoints
5. Implement frontend components
6. Integrate with existing systems (contracts, performance, etc.)
7. Comprehensive testing (unit, integration, E2E)
8. UAT (User Acceptance Testing)
9. Documentation (user guide, admin guide)
10. Production deployment

## Timeline Estimate

- UI Design: 1-2 weeks
- Backend Implementation: 2-3 weeks
- Frontend Implementation: 2-3 weeks
- Integration & Testing: 2 weeks
- UAT & Bug Fixes: 1-2 weeks
- **Total: 8-12 weeks**
