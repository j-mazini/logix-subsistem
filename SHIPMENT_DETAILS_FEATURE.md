# Shipment Details Modal - Enhanced Route Visibility

## Overview

The Shipment Details feature provides a comprehensive, organized view of all shipments (stops/deliveries) for a specific route. This modal allows users to review detailed delivery information grouped by postcode areas with expand/collapse functionality, all while maintaining context with the Route Balance view.

## Feature Components

### 1. Access Point

**Button Location**: Route Balance table, Actions column
**Button Label**: "📦 See Shipment Details"
**Appearance**: Outlined button style

When clicked, opens a large modal dialog showing comprehensive shipment information for the selected route.

### 2. Modal Structure

#### Header Section
- Route identifier: "Shipment Details - Route A-01"
- Close button (X) to dismiss
- Large scrollable modal (modal-xl with scrollable content)

#### Summary Card
Displays key route metrics in an organized grid layout:

**Row 1 - Route Identification**
- Route ID (e.g., ROUTE-A-01)
- Driver name
- Vehicle identifier

**Row 2 - Stop Metrics**
- Total Stops (count)
- Deliveries / Pickups (breakdown)
- Completion percentage (highlighted in green)

**Row 3 - Special Indicators**
- Pre-12 stops count
- ASR (Any Safe Place) stops count
- DSR (Direct Safe Place) stops count

#### Shipment Details by Postcode Area

**Postcode Groups**:
- Each major postcode area (e.g., ME1, ME2, etc.) is a collapsible section
- Group header shows:
  - Postcode area badge (e.g., ME1)
  - Total stops in that area
  - Pre-12 badge if any stops have Pre-12 requirement
  - Completion percentage (right-aligned)

**Individual Postcodes Within Group**:
- Each full postcode (e.g., ME1 1AB) shows breakdown:
  - Number of deliveries (DEL)
  - Number of pickups (PU)

**Stop Details**:
Each stop in the shipment displays:
- **Stop Number**: Sequential number (1, 2, 3, etc.)
- **Type Badge**: 📦 DEL (green) or 📍 PU (blue)
- **Address**: Full street address
- **Customer**: Customer name/reference
- **Status Indicator**: 
  - ✓ (green circle) for completed stops
  - ○ (gray circle) for pending stops
- **Indicators**: 
  - Pre-12 (orange badge) - if delivery must happen before 12:00
  - ASR (blue badge) - if placed safely without signature
  - DSR (red badge) - if placed directly at safe place
  - PM (gray badge) - if this is a PM (afternoon) delivery

### 3. Expand/Collapse Functionality

Each postcode group has a collapsible arrow that rotates when clicked:
- **Expanded State**: Arrow points down ▼, stops visible
- **Collapsed State**: Arrow points right ►, stops hidden

This allows users to focus on specific postcode areas without scrolling through the entire list.

### 4. Sorting & Grouping

Stops are automatically grouped by:
1. **Subpostcode Area** (ME1, ME2, ME3, etc.)
   - Groups with Pre-12 stops appear first
2. **Full Postcode** (ME1 1AB, ME1 2CD, etc.)
   - Organized within each subpostcode area
3. **Stop Order** (1, 2, 3, etc.)
   - Sequential order within each postcode

## Data Display Details

### Summary Metrics

| Field | Source | Purpose |
|-------|--------|---------|
| Route ID | route.name | Unique route identifier |
| Driver | route.driver | Driver assigned to route |
| Vehicle | route.vehicle | Vehicle/Van identifier |
| Total Stops | route.stops.length | Count of all stops |
| Deliveries | stops with type='DEL' | Count of delivery stops |
| Pickups | stops with type='PU' | Count of pickup stops |
| Completion | route.completion | Percentage of completed stops |
| Pre-12 | stops with pre12=true | Count of pre-12 deadline stops |
| ASR | stops with asr=true | Count of Any Safe Place stops |
| DSR | stops with dsr=true | Count of Direct Safe Place stops |

### Stop Information

| Field | Type | Example | Purpose |
|-------|------|---------|---------|
| Stop Number | number | 1, 2, 3 | Sequential order in route |
| Type | string | DEL, PU | Delivery or Pickup indicator |
| Address | string | "123 High Street" | Full delivery address |
| Customer | string | "Customer 456" | Customer/business name |
| Status | string | completed, pending | Completion status |
| Pre-12 | boolean | true/false | Before 12:00 deadline |
| ASR | boolean | true/false | Any Safe Place |
| DSR | boolean | true/false | Direct Safe Place |
| PM | boolean | true/false | Afternoon delivery |

## User Workflows

### Scenario 1: Quick Route Overview

1. User opens Route Balance dashboard
2. Finds route "A-05" with driver "Ana Costa"
3. Clicks "📦 See Shipment Details" button
4. Modal opens showing all 28 stops organized by postcode
5. Summary shows: 20 deliveries, 8 pickups, 75% completion
6. User can quickly scan special indicators (Pre-12, ASR, DSR)

### Scenario 2: Investigating Specific Postcode Area

1. User wants to check all stops in ME2 area
2. Opens Shipment Details modal
3. Finds ME2 postcode group (6 stops total)
4. Can expand/collapse ME2 section independently
5. Reviews specific addresses and their completion status
6. Identifies which stops are pending and need attention

### Scenario 3: Tracking Special Deliveries

1. User needs to verify all Pre-12 deliveries are on schedule
2. Opens Shipment Details modal
3. Immediately sees "Pre-12" badge on postcode groups (appears first)
4. Can see which individual stops have Pre-12 requirement
5. Checks completion status of each Pre-12 stop
6. Verifies all ASR and DSR special requirements are noted

### Scenario 4: Monitoring Completion Progress

1. Route currently at 60% completion (16 of 27 stops done)
2. User opens Shipment Details to see which stops remain
3. Modal shows:
   - Green checkmarks (✓) for completed stops
   - Pending circles (○) for outstanding stops
4. User can identify pending stops by postcode area
5. Assists driver with prioritization or re-routing if needed

## UI/UX Design Features

### Visual Hierarchy
- Large modal (modal-xl) for comprehensive viewing
- Scrollable content for manageable cognitive load
- Color-coded badges for quick scanning:
  - Green for deliveries and completion
  - Blue for pickups and ASR
  - Orange for Pre-12 alerts
  - Red for DSR special requirements
  - Gray for pending and PM indicators

### Interactions
- Smooth expand/collapse transitions (0.3s ease)
- Hover effects on rows for better clarity
- Clear visual feedback on clickable elements
- Responsive grid layout for different screen sizes

### Accessibility
- Semantic HTML (buttons for collapsible sections)
- ARIA labels and roles on modal
- Color not the only differentiator (uses icons + text)
- Sufficient contrast ratios for readability

## CSS Classes & Styling

### Layout Classes
- `.shipment-summary-card` - Summary metrics container
- `.summary-row` - Row of summary cells
- `.summary-cell` - Individual metric cell
- `.shipment-stops-list` - Container for all stops
- `.postcode-group` - Collapsible postcode area
- `.postcode-group-header` - Clickable header with arrow
- `.stops-container` - Container that expands/collapses
- `.postcode-section` - Section for single postcode
- `.stops-table` - Table display of stops
- `.stop-row` - Individual stop row

### Component Classes
- `.postcode-badge` - Postcode area identifier
- `.completion-badge` - Percentage badge
- `.type-badge` - DEL/PU type indicator
- `.status-indicator` - Pending/completed status circle
- `.status-badge` - Pre-12/ASR/DSR/PM indicator

### Responsive Grid
- Summary rows: Auto-fit grid with 200px minimum columns
- Stop rows: 5-column grid layout (32px | 70px | 1fr | 40px | 150px)
  - Columns: Number | Type | Info | Status | Indicators

## Context Preservation

The modal maintains Route Balance context by:
1. **Modal Isolation**: Uses React Portal to render modal in document.body
2. **Non-Destructive**: Closing modal returns to Route Balance
3. **State Preservation**: Route Balance state unchanged while modal open
4. **Navigation**: User can open/close modal multiple times without data loss

## Technical Implementation

### Component Integration
- Located in RouteBalance.tsx component
- Uses `shipmentModalRouteId` state to track open modal
- `setShipmentModalRouteId()` to open/close
- `useModalBehavior()` hook for Escape-to-close and backdrop click

### Data Grouping
- Uses existing `groupBySubpostcode()` helper function
- Automatically handles Post-12 sorting (groups with Pre-12 appear first)
- Calculates completion percentages per group

### Modal Rendering
- React Portal for modal isolation
- createPortal() to render in document.body
- Modal backdrop for context focus
- Smooth fade animations (sp-modal-anim)

## Performance Considerations

- Efficient grouping: O(n) single pass through stops
- Collapse/expand uses CSS animations (hardware accelerated)
- Grid layout calculated at render time
- Minimal re-renders via React state management

## Future Enhancements

1. **Export Capability**
   - Export stops to CSV/PDF
   - Print-friendly view of shipment details

2. **Filtering Options**
   - Filter by stop type (DEL only, PU only)
   - Filter by status (pending, completed)
   - Filter by special indicators (Pre-12 only, etc.)

3. **Search & Navigation**
   - Search by address/customer name
   - Jump to specific postcode section
   - Keyboard shortcuts for expand/collapse

4. **Real-Time Updates**
   - Live completion status updates
   - Driver location on map
   - Estimated time of arrival (ETA)

5. **Comparison View**
   - Compare multiple routes side-by-side
   - Visualize route progress over time

## Testing Checklist

- [ ] Modal opens when "See Shipment Details" button clicked
- [ ] Modal displays correct route ID and driver info
- [ ] Summary card shows accurate metrics (counts, percentages)
- [ ] Postcode groups are sorted with Pre-12 groups first
- [ ] Expand/collapse arrows rotate correctly
- [ ] Individual stops display all required information
- [ ] Status indicators show pending (○) and completed (✓)
- [ ] Special indicators show Pre-12, ASR, DSR, PM correctly
- [ ] Color coding matches design (green, blue, orange, red)
- [ ] Modal closes when X button or backdrop clicked
- [ ] Scrolling works for large route lists
- [ ] Text truncation works for long addresses
- [ ] Hover effects appear on rows
- [ ] Modal content doesn't interfere with Route Balance

## Browser Compatibility

- Modern browsers with CSS Grid support (Chrome 60+, Firefox 60+, Safari 12+)
- Flexbox for fallback layouts
- CSS transitions for smooth animations
- Standard Modal/Backdrop HTML5 semantics

## Conclusion

The Shipment Details modal provides comprehensive, organized visibility into route shipments with:

✅ Detailed information for each delivery  
✅ Organized grouping by postcode area  
✅ Quick scanning with color-coded indicators  
✅ Expand/collapse for focused navigation  
✅ Context preservation with Route Balance  
✅ Professional presentation with smooth interactions  

This feature enables route managers and dispatchers to quickly assess route status, identify special requirements, and make informed decisions about route optimization and problem-solving.
