# Vendor Registration Module - Implementation Guide

## Overview

The Vendor Registration module provides comprehensive vendor management functionality for logix-subsistem, following the standardized structure and design patterns established in the VENDOR_REGISTRATION_SPEC.md. This implementation includes a full-featured web interface with list view, detail view, create/edit forms, filtering, search, sorting, and pagination capabilities.

## Architecture

### Component Structure

```
sp-portal-react/src/pages/Vendors/
├── Vendors.tsx                 # Main component with all views
├── types.ts                    # TypeScript interfaces (defined inline)
└── styles/
    └── legacy/vendors.css      # Styling

routing:
├── App.tsx                     # Route registration
└── layout/BeamSidebar.tsx      # Navigation menu
```

### Core Components

#### 1. Main Vendors Component
- **Location**: `sp-portal-react/src/pages/Vendors/Vendors.tsx`
- **Responsibility**: Main page component handling routing between views
- **Views**:
  - List view (default) - table with filters, search, sort, pagination
  - Detail view - read-only vendor information
  - Create view - form to add new vendor
  - Edit view - form to modify existing vendor

#### 2. Sub-Components (inline)
- **VendorDetailView**: Displays vendor information in read-only format
- **VendorFormView**: Multi-section form for create/edit operations

### Data Model

#### Vendor Interface
```typescript
interface Vendor {
  id: number;
  legalName: string;
  tradeName?: string;
  vendorType: VendorType;
  documentNumber: string;
  email: string;
  primaryPhone: string;
  secondaryPhone?: string;
  website?: string;
  fax?: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  referencePoints?: string;
  services: ServiceType[];
  operatingSince: string;
  employees?: number;
  vehicles?: number;
  certifications?: string[];
  bankName?: string;
  accountNumber?: string;
  accountType?: 'checking' | 'savings';
  routingNumber?: string;
  taxRegime?: 'simple' | 'presumed' | 'real';
  contractStatus: ContractStatus;
  contractStartDate?: string;
  contractEndDate?: string;
  contractDocument?: string;
  notes?: string;
  rating?: number;
  tags?: string[];
  status: RegistrationStatus;
  createdDate: string;
  modifiedDate: string;
  createdBy: string;
  modifiedBy: string;
}
```

#### Type Definitions
```typescript
type VendorType = 'individual' | 'company' | 'cooperative';
type RegistrationStatus = 'active' | 'inactive' | 'suspended' | 'blocked';
type ContractStatus = 'not_signed' | 'signed' | 'under_review' | 'expired';
type ServiceType = 'delivery' | 'pickup' | 'distribution' | 'handling' | 'consultation' | 'other';
type SortKey = 'name' | 'email' | 'phone' | 'city' | 'status' | 'rating' | 'createdDate';
type ViewMode = 'list' | 'detail' | 'create' | 'edit';
```

## Features

### 1. List View

#### Display
- Table with 7 columns: Name, Email, Phone, City, Status, Rating, Actions
- 25 rows per page (configurable to 50 or 100)
- Vendor count and pagination info
- Row highlighting by status (color-coded left border)

#### Filtering
- **Status Filter**: Active, Inactive, Suspended, Blocked
- **Vendor Type Filter**: Individual, Company, Cooperative
- **State Filter**: All 27 Brazilian states
- **Page Size**: 25, 50, or 100 per page
- All filters work together (AND logic)

#### Search
- Full-text search across:
  - Legal name
  - Email
  - Primary phone
  - Document number
- Real-time filtering with page reset to 0

#### Sorting
- Clickable column headers: Name, Email, Phone, City, Status, Rating, Created Date
- Toggle sort direction (ascending/descending)
- Visual indicators (chevron icon) showing sort column and direction

#### Pagination
- Previous/Next buttons (disabled at boundaries)
- Page indicator: "Page X of Y (N vendors)"
- Respects all active filters and sorts

### 2. Detail View

#### Content Sections
1. **Basic Information**
   - Legal Name, Trade Name, Vendor Type, Status
   - Document Number, Rating

2. **Contact Information**
   - Email, Primary Phone, Secondary Phone
   - Website, Fax

3. **Address**
   - Street, Number, Complement
   - Neighborhood, City, State, ZIP Code
   - Country, Reference Points

4. **Services**
   - Color-coded service badges
   - Multi-select display

5. **Operational Information**
   - Operating Since, Employees, Vehicles
   - Certifications (if any)

6. **Contract**
   - Contract Status, Start Date, End Date

7. **Notes**
   - Full notes text (if present)

8. **System Information**
   - Created date/user, Modified date/user

#### Actions
- Edit button: Switch to edit form
- Delete button: Remove vendor from list
- Back button: Return to list view

### 3. Create/Edit Form View

#### Form Organization
Form is organized into logical sections, each in a separate card:

1. **Basic Information**
   - Legal Name (required), Trade Name
   - Vendor Type (required), Status (required)
   - Document Number (required), Rating

2. **Contact Information**
   - Email (required), Primary Phone (required)
   - Secondary Phone, Website, Fax

3. **Address**
   - Street (required), Number (required), Complement
   - Neighborhood (required), City (required), State (required)
   - ZIP Code (required), Reference Points (textarea)

4. **Services**
   - Checkboxes for all 6 service types
   - Multi-select (at least 1 required)

5. **Operational Information**
   - Operating Since (required), Employees, Vehicles

6. **Contract**
   - Contract Status (required)
   - Conditional fields (Start/End dates shown only if status='signed')

7. **Notes**
   - Textarea for additional information (max 2000 chars)

#### Validation
- Required field validation on submit
- Email format validation (built-in HTML5)
- Date format validation (HTML5 date picker)
- Phone format hint displayed in placeholder
- Document number format hint in placeholder
- ZIP code format hint (XXXXX-XXX)

#### Form Actions
- Cancel button: Return to list without saving
- Submit button: "Create Vendor" (create mode) or "Update Vendor" (edit mode)
- Both buttons at bottom of form

### 4. Status Badges & Visual Indicators

#### Status Colors
- **Active**: Green background, dark green text
- **Inactive**: Gray background, gray text, reduced opacity row
- **Suspended**: Yellow/orange background, dark text
- **Blocked**: Red background, white text

#### Service Badges
- Blue background with primary color text
- Rounded corners, 0.4rem padding
- Flexbox layout with wrapping

#### Rating Display
- Star emoji (⭐) followed by "X/5"
- Dash (—) when no rating

### 5. Mock Data Generation

Function `generateMockVendors(count: number)` creates realistic test data:
- Random vendor names with adjective + noun pattern
- Document numbers formatted as CPF or CNPJ
- Realistic addresses with Brazilian cities and states
- Random service selections (1-3 services per vendor)
- Random status distribution
- Operating since dates spread across years
- Optional employees, vehicles, certifications
- Random contract status
- Optional ratings (1-5)

## User Workflows

### Workflow 1: Browse Vendors
1. User navigates to /vendors
2. List view displays all vendors (first 25)
3. User can sort by clicking column headers
4. User can filter by status, type, or state
5. User can search by name, email, phone, or document
6. User can change page size or navigate pages

### Workflow 2: View Vendor Details
1. User clicks 👁️ (eye icon) for a vendor
2. Detail view opens showing all vendor information
3. User can edit or delete from this view
4. User can return to list via Back button

### Workflow 3: Create New Vendor
1. User clicks "+ Add Vendor" button
2. Form view opens with empty fields
3. User fills required fields (indicated with *)
4. User fills optional fields as needed
5. User clicks "Create Vendor"
6. Toast notification shows success
7. List view displays with new vendor at top

### Workflow 4: Edit Vendor
1. User clicks ✏️ (pencil icon) for a vendor
2. Edit form opens with vendor data pre-filled
3. User modifies fields
4. User clicks "Update Vendor"
5. Toast notification shows success
6. List view displays with updated vendor

### Workflow 5: Delete Vendor
1. User clicks 🗑️ (trash icon) for a vendor
2. Vendor is immediately removed
3. Toast notification shows deletion success
4. List view updates without the vendor

## Styling

### CSS Classes

#### Layout
- `.vendors-container`: Main container with PortalLayout
- `.vendors-list`: Wrapper for list view content
- `.vendors-detail-view`: Wrapper for detail view
- `.vendors-form-view`: Wrapper for form view

#### Table
- `.vendors-table-wrapper`: Scrollable table container
- `.vendors-table`: Main table element
- `.vendor-row`: Table row with status-based styling
- `.sort-header`: Sortable column header
- `.vendor-actions`: Action buttons cell

#### Forms
- `.form-section`: Card container for form section
- `.form-grid`: CSS grid layout for form fields
- `.form-group`: Individual form field wrapper
- `.checkbox-group`: Grid layout for checkboxes

#### Badges & Status
- `.status-badge.status-{status}`: Color-coded status indicators
- `.service-badge`: Service type indicator
- `.vendor-row.status-{status}`: Row styling based on status

#### Controls
- `.btn`: Base button styling
- `.btn-primary`, `.btn-secondary`, `.btn-danger`: Button variants
- `.btn-ghost`: Transparent button
- `.btn-icon`: Icon-only button
- `.filter-select`: Filter dropdown styling
- `.search-input`: Search input styling

### CSS Variables
```css
--primary: #0d6efd;              /* Primary action color */
--danger: #dc3545;               /* Danger/delete actions */
--success: #198754;              /* Success indicator */
--warning: #ffc107;              /* Warning indicator */
--info: #0dcaf0;                 /* Info indicator */
--surface-1: #ffffff;            /* Primary background */
--surface-2: #f5f6f7;            /* Secondary background */
--ink: #1a1a1a;                  /* Text color */
--border-color: #dee2e6;         /* Border color */
--text-muted: #6c757d;           /* Muted text */
--hairline: #e0e0e0;             /* Thin border */
```

### Responsive Design
- Mobile-first approach with breakpoint at 768px
- Form fields stack to single column on mobile
- Table scrolls horizontally on small screens
- Buttons expand to full width on mobile
- Flexbox and CSS Grid for layout

## Integration Points

### Routing
- **Route**: `/vendors`
- **Component**: `Vendors` (default export)
- **Navigation**: Added to BeamSidebar under "Setup" group
- **URL Parameter**: Respects `?sp=` query param for service provider context

### State Management
- React `useState` for all state
- Derived state with `useMemo` for filtered/sorted vendors
- Pagination state managed separately

### Data Persistence
- Mock data generation on component mount
- In-memory state (resets on page reload)
- Ready for API integration (see API Integration section below)

## API Integration

### Expected Backend Endpoints

When integrating with a real backend, implement these endpoints:

```
GET    /api/vendors                    # List all vendors
POST   /api/vendors                    # Create new vendor
GET    /api/vendors/:id                # Get vendor details
PUT    /api/vendors/:id                # Update vendor
DELETE /api/vendors/:id                # Delete vendor (soft-delete)

GET    /api/vendors/search             # Search vendors
GET    /api/vendors/export             # Export as CSV/Excel
POST   /api/vendors/:id/documents      # Upload contract document

GET    /api/vendors/check-email        # Check email uniqueness
GET    /api/vendors/check-document     # Check document uniqueness
```

### Integration Steps

1. **Create API client**
   ```typescript
   // src/api/vendors-api.ts
   export async function getVendors(params: {
     page: number;
     pageSize: number;
     sort?: SortKey;
     sortDir?: SortDir;
     filters?: FilterState;
     search?: string;
   }): Promise<{ vendors: Vendor[]; total: number }> {
     // Fetch from API
   }
   ```

2. **Replace mock data**
   ```typescript
   useEffect(() => {
     setLoading(true);
     getVendors(params).then((data) => {
       setVendors(data.vendors);
       setTotal(data.total);
       setLoading(false);
     });
   }, [page, pageSize, filters, search, sort]);
   ```

3. **Handle create/update/delete**
   ```typescript
   const handleSaveVendor = async (vendor: Vendor) => {
     if (viewMode === 'create') {
       await createVendor(vendor);
     } else {
       await updateVendor(vendor);
     }
     // Refresh list
   };
   ```

## Validation Rules

### Mandatory Fields
- Legal Name (min 3 chars)
- Vendor Type
- Document Number (unique, formatted)
- Email (unique, valid format)
- Primary Phone (valid format)
- Street, Number, City, State, ZIP Code
- Services (at least 1)
- Operating Since
- Contract Status

### Format Validations
- **Email**: RFC 5322 compliant (HTML5 email input)
- **Phone**: +55 (XX) 9XXXX-XXXX format
- **ZIP Code**: XXXXX-XXX format
- **Date**: YYYY-MM-DD (HTML5 date input)
- **URL**: Must start with http:// or https://

### Business Rules
1. CPF/CNPJ must be unique across all vendors
2. Email must be unique (unless soft-deleted)
3. Cannot deactivate vendor with active contracts
4. Document type must match Vendor Type:
   - Individual → CPF only
   - Company/Cooperative → CNPJ only
5. Contract end date must be after start date
6. Each vendor can have 1-6 services

## Performance Considerations

### Optimizations
- **Filtering**: O(n) single pass through vendors
- **Sorting**: O(n log n) using native Array.sort()
- **Pagination**: O(1) slice operation
- **Search**: O(n) linear search (suitable for <10k records)
- **Memoization**: useMemo for filtered/sorted vendors prevents re-computation

### Scalability
- Current implementation suitable for <10k vendors
- For larger datasets:
  - Implement server-side filtering/sorting/pagination
  - Add debounce to search input (300ms)
  - Use virtual scrolling for table
  - Implement lazy loading for modal details

## Testing Checklist

- [ ] List view displays all vendors with correct columns
- [ ] Sorting works on all sortable columns
- [ ] Filters work independently and together
- [ ] Search works across all searchable fields
- [ ] Pagination displays correct page count and respects page size
- [ ] Detail view displays all vendor information
- [ ] Create form has all required fields and validation
- [ ] Edit form pre-fills with existing vendor data
- [ ] Form saves correctly (create and update)
- [ ] Delete removes vendor from list
- [ ] Status badges display correct colors
- [ ] Service badges display and wrap correctly
- [ ] Rating displays correctly (stars or dash)
- [ ] Toast notifications show on create/update/delete
- [ ] Back buttons work to return to list
- [ ] Responsive design works on mobile (768px breakpoint)
- [ ] Required fields indicated with asterisk
- [ ] No TypeScript errors on build
- [ ] All CSS classes properly scoped

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Requires:
- CSS Grid support
- CSS Flexbox support
- ES6 support
- Fetch API support

## Accessibility

- Semantic HTML (headings, labels, inputs)
- ARIA labels on buttons (title attributes)
- Focus states on form fields
- Sufficient color contrast ratios
- Not reliant on color alone for meaning
- Tab navigation through form fields
- Screen reader compatible table structure
- Error messages (inline validation)

## Future Enhancements

### Phase 2
1. **Export Capability**
   - Export vendor list to CSV
   - Export individual vendor details to PDF

2. **Advanced Filtering**
   - Date range filters (created, modified)
   - Multi-select on service type
   - Rating filters (1-5 stars)
   - Custom filter combinations

3. **Batch Operations**
   - Select multiple vendors
   - Bulk status change
   - Bulk delete

### Phase 3
1. **Vendor Analytics**
   - Performance metrics per vendor
   - Delivery success rate
   - Cost analysis

2. **Document Management**
   - Upload/download contract files
   - Document version history
   - Digital signatures

3. **Integration**
   - Link to shipments/routes
   - Performance dashboard
   - Financial reconciliation

### Phase 4
1. **Real-time Updates**
   - WebSocket notifications
   - Vendor status changes
   - Contract expirations

2. **Advanced Search**
   - Full-text search with Elasticsearch
   - Faceted search
   - Search suggestions/autocomplete

3. **Compliance Tracking**
   - Document expiration alerts
   - Certification tracking
   - Audit trail

## Troubleshooting

### Common Issues

**Issue**: Form doesn't save
- Check that all required fields are filled
- Verify document number is valid format
- Check email format is correct

**Issue**: Filters not working
- Verify filter is applied (should show filtered count)
- Check that search term is cleared
- Try refreshing the page

**Issue**: Pagination shows wrong page count
- Verify pageSize is correct
- Check that filters are applied correctly
- Reset page to 0 after filter change

**Issue**: Styling looks wrong
- Verify CSS file is linked: `vendors.css`
- Check that Bootstrap CSS is loaded (for grid classes)
- Clear browser cache and hard refresh

## Maintenance Notes

- Keep `VENDOR_TYPE_LABELS`, `STATUS_LABELS`, etc. synchronized across codebase
- Update Brazil states list if administrative changes occur
- Review validation rules with compliance team annually
- Monitor performance metrics for scaling decisions
- Maintain test data generation for QA

## Related Documentation

- VENDOR_REGISTRATION_SPEC.md - Complete specification
- INVOICE_AUTOMATION.md - Invoice integration points
- SHIPMENT_DETAILS_FEATURE.md - Route/shipment reference

## Support & Contact

For issues, feature requests, or questions about the Vendor Registration module, please contact the development team or create an issue in the repository.

---

**Last Updated**: 2026-07-24  
**Version**: 1.0.0  
**Status**: Ready for Testing
