# Shipment Breakdown Integration - RouteBalance Enhancement

## Overview

Enhanced the Shipment Details modal to include comprehensive shipment metrics breakdown by type (COY, COY-S1, COY-S2, FLY, NCY, PAL1). This provides route managers with detailed visibility into shipment composition, physical weight distribution, and shipment type analysis.

## Feature Integration

### 1. Enhanced Summary Card

The summary card now displays additional metrics:

**New Physical Metrics**:
- **Total Pieces**: Total number of pieces across all shipments in the route
- **Soma Phys (kg)**: Total physical weight (in kilograms) of all shipments
- **Total Shipments**: Count of all shipments/stops in the route

These metrics appear alongside existing route information:
- Route ID, Driver, Vehicle
- Total Stops, Deliveries/Pickups, Completion %
- Special Indicators (Pre-12, ASR, DSR)

### 2. Shipment Breakdown Table

New dedicated section showing detailed breakdown by shipment type:

**Columns**:
- **Type**: Shipment type badge (COY, COY-S1, COY-S2, FLY, NCY, PAL1)
- **Pieces**: Total pieces for this shipment type
- **Shipments**: Count of shipments of this type
- **Soma Phys (kg)**: Total physical weight for this type
- **% Total**: Percentage of total weight

**Features**:
- Color-coded type badges (blue background for easy scanning)
- Monospace font for numerical values (ensures alignment)
- Hover effects for better interactivity
- Total row aggregating all metrics
- Responsive table with horizontal scroll for small screens

### 3. Data Structure

#### Stop-Level Data

Each stop/shipment now includes:
```typescript
{
  // ... existing fields ...
  shipmentType: ShipmentType;      // 'COY' | 'COY-S1' | 'COY-S2' | 'FLY' | 'NCY' | 'PAL1'
  pieces: number;                  // Number of pieces in shipment
  physicalWeight: number;          // Weight in kg
}
```

#### Route-Level Aggregation

Each route now includes:
```typescript
{
  // ... existing fields ...
  totalPieces: number;             // Sum of all pieces
  totalPhysicalWeight: number;     // Sum of all physical weight (kg)
  shipmentBreakdown: ShipmentMetrics[];  // Breakdown by type
}

interface ShipmentMetrics {
  type: ShipmentType;              // Shipment type
  pieces: number;                  // Total pieces of this type
  shipments: number;               // Count of shipments of this type
  physicalWeight: number;          // Total weight of this type (kg)
}
```

## Example Data

Based on the provided example, a typical route breakdown would look like:

```
SHIPMENT BREAKDOWN BY TYPE

Type        Pieces  Shipments  Soma Phys (kg)  % Total
────────────────────────────────────────────────────
COY           97       69         271.69         19.3%
COY-S1        89       81         357.35         25.4%
COY-S2        76       67         168.93         12.0%
FLY          108       94         353.77         25.2%
NCY           59       59          88.16          6.3%
PAL1         100       97         161.55          11.5%
────────────────────────────────────────────────────
Total        529      467       1,401.45        100%
```

## User Workflows

### Scenario 1: Quick Shipment Composition Review

1. Open Route Balance for route A-05
2. Click "📦 See Shipment Details"
3. Immediately see summary metrics:
   - Total Pieces: 271
   - Soma Phys: 1,401.45 kg
   - Total Shipments: 467
4. View breakdown table to understand distribution:
   - Which types dominate (FLY at 25.2%)
   - Physical weight per type
   - Shipment count per type

### Scenario 2: Verify Shipment Weight Distribution

1. Route manager needs to verify weight is balanced
2. Opens Shipment Details modal
3. Checks shipment breakdown table:
   - COY-S1: 357.35 kg (heaviest)
   - FLY: 353.77 kg (nearly equal)
   - Others: 588.33 kg distributed
4. Assesses if weight distribution is appropriate for route capacity

### Scenario 3: Analyze Shipment Type Efficiency

1. Operations analyst reviews shipment types used
2. Opens Shipment Details for several routes
3. Compares breakdown percentages:
   - Route A-01: COY dominant (40%)
   - Route A-05: Balanced across types
   - Route A-08: FLY heavy (35%)
4. Identifies patterns for optimization

## Technical Implementation

### Data Generation

Mock data generation enhanced to:
1. Assign random shipment type to each stop
2. Generate random piece count (1-15 per stop)
3. Generate physical weight (50-800 kg per stop)

```typescript
const SHIPMENT_TYPES: ShipmentType[] = ['COY', 'COY-S1', 'COY-S2', 'FLY', 'NCY', 'PAL1'];

// In stop generation:
stop.shipmentType = pick(SHIPMENT_TYPES);
stop.pieces = 1 + rand(15);
stop.physicalWeight = Math.round((50 + Math.random() * 750) * 100) / 100;
```

### Aggregation

Route-level metrics calculated from stops:
```typescript
const totalPieces = stops.reduce((sum, s) => sum + s.pieces, 0);
const totalPhysicalWeight = Math.round(stops.reduce((sum, s) => sum + s.physicalWeight, 0) * 100) / 100;

const shipmentBreakdown: ShipmentMetrics[] = SHIPMENT_TYPES.map((type) => {
  const typeStops = stops.filter((s) => s.shipmentType === type);
  return {
    type,
    pieces: typeStops.reduce((sum, s) => sum + s.pieces, 0),
    shipments: typeStops.length,
    physicalWeight: Math.round(typeStops.reduce((sum, s) => sum + s.physicalWeight, 0) * 100) / 100,
  };
}).filter((m) => m.shipments > 0);  // Only include types with shipments
```

### Modal Integration

Breakdown table displays:
1. Shipment type badge (color-coded)
2. Total pieces for that type
3. Count of shipments of that type
4. Physical weight for that type
5. Percentage of total weight
6. Total row with aggregates

## CSS Styling

New styles added:

```css
.shipment-breakdown-section { }    /* Container for breakdown */
.breakdown-header { }               /* "Shipment Breakdown by Type" title */
.breakdown-table-wrapper { }        /* Scrollable container */
.breakdown-table { }                /* Main table styling */
.breakdown-table th { }             /* Table header cells */
.breakdown-table td { }             /* Table data cells */
.breakdown-table tbody tr:hover { } /* Row hover effect */
.type-badge-small { }               /* Small type badges in table */
.breakdown-total { }                /* Total row styling */
```

Features:
- Responsive table with horizontal scroll
- Color-coded type badges (blue)
- Monospace font for numbers
- Hover effects for better UX
- Professional styling matching Route Balance theme
- Clear visual separation of total row

## Visual Design

**Color Scheme**:
- Type badges: Blue (rgba(13, 110, 253, 0.1))
- Background: Light gray (--surface-2)
- Text: Dark gray/black (--ink)
- Borders: Light gray (--hairline)

**Typography**:
- Labels: 10px, uppercase, light gray
- Data: 13px, monospace, dark gray
- Total row: Bold, 13px, dark gray

**Spacing**:
- Row padding: 0.6rem vertical, 0.75rem horizontal
- Border: 1px solid light gray
- Hover background: Blue tint (4% opacity)

## Performance Considerations

- **O(n) aggregation**: Single pass through stops to calculate metrics
- **Filtering**: Only include shipment types with at least one shipment
- **Rounding**: Fixed to 2 decimal places (cents for weight)
- **Percentages**: Calculated only for display, not stored

## Future Enhancements

1. **Interactive Filtering**
   - Click type badge to filter stops by shipment type
   - Show only COY shipments in the route view

2. **Historical Tracking**
   - Compare breakdown across multiple days
   - Track trends in shipment type usage

3. **Weight Distribution Alerts**
   - Flag if weight exceeds vehicle capacity
   - Warn if unbalanced (one type over 60%)

4. **Export Capability**
   - Export breakdown table to CSV
   - Include in route reports

5. **Advanced Analytics**
   - Weight per piece metrics
   - Shipment type efficiency scoring
   - Cost analysis per type

## Testing Checklist

- [ ] Modal opens and displays summary card
- [ ] Total Pieces calculated correctly
- [ ] Soma Phys (Total Weight) calculated correctly
- [ ] Breakdown table appears with all shipment types
- [ ] Pieces count per type is accurate
- [ ] Shipments count per type is accurate
- [ ] Physical weight per type is accurate
- [ ] Percentage calculations correct (sum = 100%)
- [ ] Type badges display correctly with blue color
- [ ] Monospace font applied to numerical values
- [ ] Hover effects work on table rows
- [ ] Total row shows correct aggregates
- [ ] Table scrolls horizontally on small screens
- [ ] Data updates when route changes
- [ ] No TypeScript errors in build

## Browser Compatibility

- Modern browsers with CSS Grid/Flexbox (Chrome 60+, Firefox 60+, Safari 12+)
- Table responsive layout
- Hover effects (CSS :hover)
- Standard HTML5 table semantics

## Conclusion

The Shipment Breakdown integration adds critical visibility into route composition:

✅ **Physical Metrics**: Total pieces and weight aggregation  
✅ **Type Distribution**: Clear breakdown by shipment type  
✅ **Weight Analysis**: Per-type weight and percentage  
✅ **Professional Display**: Color-coded badges and typography  
✅ **Performance**: O(n) aggregation with efficient filtering  
✅ **User-Friendly**: Interactive table with hover effects  

This enables operations teams to:
- Monitor shipment composition per route
- Analyze weight distribution
- Optimize shipment type usage
- Make data-driven routing decisions
