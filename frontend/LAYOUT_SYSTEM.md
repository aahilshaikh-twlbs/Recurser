# Layout System

Brand layout system built around multiples of 4px.

## Grid System

12-column grid that scales responsively:
- **Desktop**: 12 columns
- **Tablet (≤768px)**: 6 columns  
- **Mobile (≤640px)**: 4 columns
- **Small mobile (≤480px)**: 2 columns

### Usage

```jsx
<div className="grid-12 gutter-8p">
  <div className="section-1-1">Full width</div>
  <div className="section-1-2">Half width</div>
  <div className="section-1-3">Third width</div>
  <div className="section-1-4">Quarter width</div>
  <div className="section-1-6">Sixth width</div>
</div>
```

## Spacing

Brand spacers (multiples of 4px):
- `spacer-xs`: 20px (5 × 4px)
- `spacer-sm`: 40px (10 × 4px)
- `spacer-md`: 64px (16 × 4px)
- `spacer-lg`: 96px (24 × 4px)

### Usage

```jsx
<div className="spacer-lg">Large spacing below</div>
<div className="spacer-md">Medium spacing below</div>
<div className="spacer-sm">Small spacing below</div>
<div className="spacer-xs">Extra small spacing below</div>
```

## Margins & Gutters

- **Margins**: 4% of shortest side
- **Gutter**: 8% (2× margin)

### Usage

```jsx
<div className="container-brand">
  <div className="layout-lines gutter-8p">
    {/* Content with 8% gutter */}
  </div>
</div>
```

## Layout Types

### Lines Informed Layout
Type-based layout for large amounts of written content.

```jsx
<div className="layout-lines">
  {/* Typography-focused content */}
</div>
```

### Cards Informed Layout
Card-based layout with half gutter between cards.

```jsx
<div className="layout-cards">
  {/* Card components */}
</div>
```

### Lines with Hero Imagery
Headlines combined with imagery.

```jsx
<div className="layout-hero">
  {/* Hero image + headline */}
</div>
```

### Lines with Fullbleed Imagery
Full-width imagery with headlines.

```jsx
<div className="layout-fullbleed">
  {/* Fullbleed image + headline */}
</div>
```

## Section Divisions

Use section division utilities for equal-sized sections:

- `.div-1-1` - Full width (12 columns)
- `.div-1-2` - Half width (6 columns)
- `.div-1-3` - Third width (4 columns)
- `.div-1-4` - Quarter width (3 columns)
- `.div-1-6` - Sixth width (2 columns)

### Usage

```jsx
<div className="grid-12">
  <div className="div-1-2">Left half</div>
  <div className="div-1-2">Right half</div>
</div>
```

## Border Radius

30% of shortest side (use `.rounded-brand` for elements).

```jsx
<div className="rounded-brand">
  {/* Rounded element */}
</div>
```

## Responsive Behavior

For smaller formats (mobile), use only 1/1 or 1/2 block arrangements as per brand guidelines.

