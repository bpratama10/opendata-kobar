# UI Specification - Open Data Platform

## Design Philosophy

The Open Data Platform follows a **professional, data-focused design** with emphasis on:
- **Clarity**: Information hierarchy and typography
- **Efficiency**: Quick access to datasets and data entry
- **Trustworthiness**: Government/institutional aesthetic
- **Accessibility**: WCAG 2.1 AA compliance (future)

---

## Design System

### Color Palette

**Format:** HSL (Hue, Saturation, Lightness)

#### Light Mode
```css
/* Primary - Professional Blue */
--primary: 210 90% 48%;           /* #2D7DD2 */
--primary-foreground: 0 0% 100%;  /* White text */
--primary-glow: 210 90% 58%;      /* Lighter blue */
--primary-muted: 210 90% 48% / 0.1; /* 10% opacity */

/* Secondary - Teal Accent */
--secondary: 180 65% 45%;          /* #29A398 */
--secondary-foreground: 0 0% 100%; /* White text */
--secondary-muted: 180 65% 45% / 0.1;

/* Success - Data Quality Green */
--success: 150 60% 45%;
--success-foreground: 0 0% 100%;

/* Background & Foreground */
--background: 220 20% 97%;         /* Very light gray */
--foreground: 215 25% 15%;         /* Dark gray text */

/* Cards */
--card: 0 0% 100%;                 /* Pure white */
--card-foreground: 215 25% 15%;
--card-shadow: 215 25% 15% / 0.08;
--card-hover-shadow: 215 25% 15% / 0.15;

/* Neutral System */
--muted: 215 15% 92%;
--muted-foreground: 215 15% 45%;
--accent: 215 15% 94%;
--accent-foreground: 215 25% 20%;

/* Interactive Elements */
--border: 215 15% 88%;
--input: 215 15% 88%;
--ring: 210 90% 48%;               /* Focus ring */
--destructive: 0 75% 60%;
--destructive-foreground: 0 0% 100%;
```

#### Dark Mode
```css
--background: 215 25% 8%;
--foreground: 215 15% 92%;
--card: 215 25% 10%;
--primary: 210 90% 58%;            /* Lighter in dark mode */
--secondary: 180 65% 55%;
--border: 215 25% 18%;
```

---

### Typography

**Font Stack:**
```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, 
             'Segoe UI', Roboto, 'Helvetica Neue', Arial, 
             sans-serif;
```

**Scale:**
- **H1**: 2.25rem (36px) / 3rem (48px) on large screens
- **H2**: 1.875rem (30px)
- **H3**: 1.5rem (24px)
- **H4**: 1.25rem (20px)
- **Body**: 1rem (16px)
- **Small**: 0.875rem (14px)
- **XS**: 0.75rem (12px)

**Weights:**
- Regular: 400
- Medium: 500
- Semibold: 600
- Bold: 700

---

### Spacing

**Base Unit:** 4px (0.25rem)

**Scale:**
- 1: 4px
- 2: 8px
- 3: 12px
- 4: 16px
- 6: 24px
- 8: 32px
- 12: 48px
- 16: 64px
- 24: 96px
- 32: 128px

---

### Border Radius

**Standard:** 12px (0.75rem)

**Variants:**
- `rounded-sm`: 4px
- `rounded-md`: 8px
- `rounded-lg`: 12px (default)
- `rounded-xl`: 16px
- `rounded-2xl`: 24px
- `rounded-full`: 9999px

---

### Shadows

```css
/* Card Shadow */
--shadow-card: 0 2px 10px hsl(var(--card-shadow));

/* Card Hover Shadow */
--shadow-card-hover: 0 8px 30px hsl(var(--card-hover-shadow));

/* Hero Section Shadow */
--shadow-hero: 0 20px 60px hsl(210 90% 48% / 0.2);
```

---

### Animations

```css
/* Smooth Transition */
--transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

/* Bounce Transition */
--transition-bounce: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

---

## Component Library (shadcn/ui)

All UI components use **Radix UI primitives** with custom styling.

### Button

**Variants:**
- `default`: Primary blue background
- `secondary`: Secondary teal background
- `outline`: Border with transparent background
- `ghost`: No background, hover effect
- `destructive`: Red for dangerous actions
- `link`: Styled as text link

**Sizes:**
- `sm`: 32px height
- `default`: 40px height
- `lg`: 48px height
- `icon`: 40x40px square

**Usage:**
```tsx
<Button variant="default" size="lg">
  Download Dataset
</Button>
```

---

### Card

**Structure:**
- `Card`: Container
- `CardHeader`: Title section
- `CardTitle`: Main heading
- `CardDescription`: Subtitle
- `CardContent`: Body content
- `CardFooter`: Actions

**Style:**
- White background
- 12px border radius
- Subtle shadow
- Hover effect: lift + stronger shadow

**Usage:**
```tsx
<Card className="data-card">
  <CardHeader>
    <CardTitle>Population Data</CardTitle>
    <CardDescription>2023 Annual Statistics</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Content here...</p>
  </CardContent>
  <CardFooter>
    <Button>View Details</Button>
  </CardFooter>
</Card>
```

---

### Input

**Variants:**
- Text input
- Number input
- Email input
- Password input
- Search input

**Style:**
- 40px height
- Light gray border
- Blue focus ring
- Rounded corners

**Usage:**
```tsx
<Input 
  type="text" 
  placeholder="Search datasets..." 
  className="w-full"
/>
```

---

### Select

**Style:**
- Dropdown with chevron icon
- Radix UI portal for dropdown
- Smooth open/close animation

**Usage:**
```tsx
<Select onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select theme" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="health">Health</SelectItem>
    <SelectItem value="education">Education</SelectItem>
  </SelectContent>
</Select>
```

---

### Badge

**Variants:**
- `default`: Primary blue
- `secondary`: Light gray
- `outline`: Border only
- `destructive`: Red

**Usage:**
```tsx
<Badge variant="secondary">CSV</Badge>
<Badge variant="outline">Public</Badge>
```

---

### Table

**Style:**
- Bordered rows
- Hover effect on rows
- Sticky header (optional)
- Zebra striping (optional)

**Usage:**
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Title</TableHead>
      <TableHead>Updated</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Population Data</TableCell>
      <TableCell>2024-01-15</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

---

### Dialog

**Style:**
- Overlay backdrop (semi-transparent black)
- Centered modal
- Close button (X)
- Smooth fade-in animation

**Usage:**
```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Dataset</DialogTitle>
      <DialogDescription>
        Make changes to your dataset here.
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-4">
      {/* Form fields */}
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleSave}>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

### Tabs

**Style:**
- Underline indicator for active tab
- Smooth transition
- Equal-width or auto-width tabs

**Usage:**
```tsx
<Tabs defaultValue="description">
  <TabsList>
    <TabsTrigger value="description">Description</TabsTrigger>
    <TabsTrigger value="metadata">Metadata</TabsTrigger>
  </TabsList>
  <TabsContent value="description">
    <p>Dataset description...</p>
  </TabsContent>
  <TabsContent value="metadata">
    <p>Metadata details...</p>
  </TabsContent>
</Tabs>
```

---

### Toast

**Style:**
- Bottom-right corner
- Auto-dismiss after 5 seconds
- Variants: default, success, error, warning

**Usage:**
```tsx
import { useToast } from '@/hooks/use-toast';

const { toast } = useToast();

toast({
  title: 'Success',
  description: 'Dataset saved successfully',
});

toast({
  title: 'Error',
  description: 'Failed to save dataset',
  variant: 'destructive',
});
```

---

## Page Layouts

### Public Layout (Home, Dataset Detail)

**Structure:**
```
┌──────────────────────────────────────┐
│          Header (Navigation)          │
├──────────────────────────────────────┤
│                                      │
│           Hero Section               │
│      (Search, Stats, CTA)            │
│                                      │
├──────────────────────────────────────┤
│                                      │
│         Content Sections             │
│    (Categories, Featured, Recent)    │
│                                      │
└──────────────────────────────────────┘
```

**Header:**
- Logo/brand name (left)
- Navigation links (center)
- User menu or Login button (right)
- Sticky on scroll

---

### Admin Layout

**Structure:**
```
┌────────┬─────────────────────────────┐
│        │                             │
│ Side   │      Content Area           │
│ bar    │                             │
│        │  ┌─────────────────────┐    │
│ Nav    │  │  Page Header        │    │
│ Links  │  ├─────────────────────┤    │
│        │  │                     │    │
│        │  │  Main Content       │    │
│        │  │  (Tables, Forms)    │    │
│        │  │                     │    │
│        │  └─────────────────────┘    │
│        │                             │
└────────┴─────────────────────────────┘
```

**Sidebar:**
- 240px width (collapsed: 64px)
- Icon + label navigation
- Active state indicator
- Hover expand (when collapsed)

**Content Area:**
- Page title + breadcrumbs
- Action buttons (Add, Export, etc.)
- Content cards/tables
- Pagination (if needed)

---

## Key Pages

### 1. Home Page (/)

**Sections:**

#### Hero Section
- Full-width background image with gradient overlay
- Large heading: "Discover Open Data for Everyone"
- Search bar (prominent)
- Quick stats: Dataset count, Download count, Update frequency
- Background: Primary/Secondary gradient

#### Categories Section
- Grid of category buttons
- Badge with dataset count per category
- Click to filter datasets

#### Featured Datasets (if no search)
- Popular Datasets: 3-column grid
- Recent Datasets: 3-column grid
- DataCard component for each dataset

#### Search Results (if searching)
- Result count
- Filtered dataset grid
- Empty state if no results

---

### 2. Dataset Detail Page (/dataset/:slug)

**Layout:**

#### Header Section
- Back button
- Badges: Category, Format, Classification
- Dataset title (H1)
- Source organization
- Tags (pill badges)
- Actions: Download, Bookmark, Share (right side)

#### Tabs Section
- **Description**: Long-form text
- **Metadata**: Structured information
  - Informasi Dasar (Basic Info)
  - Informasi Publikasi (Publication Info)
  - Cakupan & Akses (Coverage & Access)
  - Informasi Teknis (Technical Info)
- **Information**: Usage guidelines, license info

#### Data Preview Section
- Table/chart visualization
- Download button
- Export options

---

### 3. Admin Dataset List (/admin/datasets)

**Layout:**
- Page header with "Add Dataset" button
- Filter/search bar
- Table with columns:
  - Title
  - Status (badge)
  - Updated date
  - Organization
  - Actions (Edit, Delete icons)
- Pagination

---

### 4. Admin Dataset Add/Edit

**Layout:**
- Page header with "Save" and "Cancel" buttons
- Form sections (cards):
  - **Informasi Dasar**: Title, Slug, Description
  - **Publikasi**: Publisher, Contact, Maintainers
  - **Klasifikasi**: Classification, Language, License
  - **Temporal**: Start/End dates, Update frequency
  - **Kategori**: Tags (multi-select), Themes (multi-select)
  - **Custom Fields**: Dynamic JSON fields

**Validation:**
- Required fields marked with asterisk
- Inline error messages
- Toast on save success/error

---

### 5. Admin Data Tables (/admin/datasets/:id/tables)

**Layout:**
- Page header with dataset title
- Tabs:
  - **Indicators (Rows)**: List of indicators with Add/Edit/Delete
  - **Periods (Columns)**: List of periods with Add/Edit/Delete
  - **Data Entry**: Editable grid
    - Row headers: Indicators
    - Column headers: Periods
    - Cells: Numeric input
    - Auto-save on blur
    - Visual feedback on save

---

## Responsive Design

### Breakpoints
- **Mobile**: < 640px
- **Tablet**: 640px - 1023px
- **Desktop**: 1024px+

### Mobile Adaptations
- Sidebar collapses to hamburger menu
- 3-column grid → 1-column on mobile
- Card stack vertically
- Search bar full-width
- Actions move to dropdown menu
- Table becomes horizontally scrollable

### Example:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* 1 col mobile, 2 col tablet, 3 col desktop */}
</div>
```

---

## Icon System

**Library:** Lucide React

**Common Icons:**
- `Database`: Dataset/data
- `Download`: Download action
- `Upload`: Upload action
- `Search`: Search functionality
- `Plus`: Add new
- `Edit`: Edit action
- `Trash2`: Delete action
- `Eye`: View/visibility
- `EyeOff`: Hidden
- `Calendar`: Date/time
- `FileText`: Document/file
- `BarChart3`: Analytics
- `Users`: User management
- `Building`: Organization
- `Tag`: Tags/labels
- `Shield`: Security/classification
- `Globe`: Public/international
- `CheckCircle`: Success
- `AlertCircle`: Warning/info
- `XCircle`: Error

**Size Convention:**
- Small: 16px (w-4 h-4)
- Medium: 20px (w-5 h-5)
- Large: 24px (w-6 h-6)

---

## States & Feedback

### Loading States
- **Skeleton**: Shimmer effect for loading content
- **Spinner**: Circular loader for async actions
- **Progressive**: Show partial content while loading more

```tsx
{loading ? (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="w-8 h-8 animate-spin" />
  </div>
) : (
  <Content />
)}
```

---

### Empty States
- Icon (large, muted)
- Heading: "No datasets found"
- Description: Helpful text
- Action button (if applicable)

```tsx
<div className="text-center py-12">
  <Database className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
  <h3 className="text-xl font-medium mb-2">No datasets found</h3>
  <p className="text-muted-foreground mb-4">
    Try adjusting your search terms
  </p>
  <Button variant="outline" onClick={clearSearch}>
    Clear Search
  </Button>
</div>
```

---

### Error States
- Alert component (red)
- Error icon
- Error message
- Retry button (if applicable)

```tsx
{error && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Error</AlertTitle>
    <AlertDescription>{error}</AlertDescription>
  </Alert>
)}
```

---

### Success Feedback
- Toast notification (green)
- Check icon
- Success message
- Auto-dismiss after 5 seconds

---

## Accessibility

### Focus Management
- Visible focus ring (blue outline)
- Logical tab order
- Skip to main content link (future)

### ARIA Labels
- Buttons have aria-label when icon-only
- Forms have proper labels
- Tables have proper headers

### Keyboard Navigation
- Tab/Shift+Tab: Navigate
- Enter/Space: Activate buttons
- Escape: Close dialogs
- Arrow keys: Navigate lists

---

## Performance Optimizations

### Image Optimization
- Use WebP format
- Lazy loading with `loading="lazy"`
- Responsive images with srcset (future)

### Code Splitting
- React.lazy() for route-based splitting (future)
- Dynamic imports for heavy components

### Perceived Performance
- Optimistic updates
- Skeleton loaders
- Instant page transitions (React Router)

---

## Future Enhancements

- Dark mode toggle
- User preferences (compact view, list vs grid)
- Advanced filtering UI
- Data visualization components (charts)
- Drag-and-drop file upload
- Real-time collaboration indicators
- Keyboard shortcuts panel
