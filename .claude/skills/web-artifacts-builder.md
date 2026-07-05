---
name: web-artifacts-builder
description: Build sophisticated interactive React artifacts for Claude.ai using React 18, TypeScript, and Tailwind CSS
---

# Web Artifacts Builder

## Overview

Create rich, interactive HTML artifacts for Claude.ai using modern frontend technologies. The system bundles everything—JavaScript, CSS, dependencies—into a single self-contained HTML file.

## Tech Stack

- **React 18** — Component framework
- **TypeScript** — Type-safe development
- **Vite** — Fast development server
- **Parcel** — Zero-config bundler
- **Tailwind CSS** — Utility-first styling
- **shadcn/ui** — 40+ pre-installed components
- **Radix UI** — Accessible component primitives

## Workflow (5 Steps)

### 1. Initialize Project

```bash
scripts/init-artifact.sh my-artifact
```

This scaffolds a new React project with:
- TypeScript configuration via Vite
- Tailwind CSS + shadcn/ui theming
- Path aliases (`@/components`, `@/lib`)
- 40+ shadcn/ui components pre-installed
- Radix UI dependencies
- Parcel bundling configuration

### 2. Develop

Modify files in the generated project:
- `src/App.tsx` — Main component
- `src/components/` — Reusable components
- `src/styles/` — Custom Tailwind styles
- `src/lib/` — Utilities and helpers

### 3. Bundle

```bash
scripts/bundle-artifact.sh
```

Produces a single `artifact.html` containing:
- All React components (compiled)
- All CSS (inlined)
- All JavaScript dependencies (bundled)
- No source maps (for distribution)
- Ready to share in Claude conversations

### 4. Deploy

Copy `artifact.html` and share it directly or embed in Claude responses.

### 5. Test (Optional)

Validate functionality if issues arise. Don't test by default—trust the bundler.

## Best Practices

### Avoid "AI Slop"

Common patterns to avoid:
- ❌ Excessive centered layouts
- ❌ Purple gradients
- ❌ Uniform rounded corners
- ❌ Inter font everywhere

Instead:
- ✅ Intentional layout choices
- ✅ Purposeful color palette
- ✅ Varied corner radii
- ✅ Typography hierarchy

### Component Strategy

1. **Use shadcn/ui components** as building blocks
2. **Extend with custom CSS** for distinctive styling
3. **Compose thoughtfully** — each component has a purpose
4. **Test interactions** — buttons, forms, navigation

### File Organization

```
src/
├── App.tsx           # Main component
├── components/
│   ├── Header.tsx
│   ├── Footer.tsx
│   └── ui/          # shadcn/ui components
├── lib/
│   ├── utils.ts     # Utilities
│   └── hooks.ts     # Custom React hooks
├── styles/
│   └── globals.css  # Global Tailwind styles
└── index.tsx        # React entry point
```

## Common Patterns

### Interactive Form

```tsx
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"

export default function Form() {
  const [value, setValue] = useState("")

  return (
    <div className="p-8">
      <Input 
        value={value} 
        onChange={(e) => setValue(e.target.value)}
        placeholder="Enter text..."
      />
      <Button onClick={() => alert(value)}>Submit</Button>
    </div>
  )
}
```

### Data Table with shadcn/ui

```tsx
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default function DataTable() {
  const data = [
    { id: 1, name: "Item 1", status: "Active" },
    { id: 2, name: "Item 2", status: "Inactive" }
  ]

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map(row => (
          <TableRow key={row.id}>
            <TableCell>{row.name}</TableCell>
            <TableCell>{row.status}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

### Modal/Dialog

```tsx
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export default function ModalExample() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>This action cannot be undone.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
```

## shadcn/ui Components Available

**40+ components** pre-installed, including:
- Form & Input: Button, Input, Select, Textarea, Checkbox, Radio, Switch
- Layout: Card, Container, Separator, Tabs
- Navigation: Breadcrumb, Pagination, Sidebar
- Disclosure: Dialog, Drawer, Accordion, Collapsible, Sheet
- Data: Table, Badge, Avatar, Progress, Tooltip
- Feedback: Alert, Toast, Skeleton
- Interactive: Carousel, Calendar, Combobox, Command, Context Menu

## Styling with Tailwind

### Color System

Use Tailwind's default palette or customize in `tailwind.config.ts`:
```ts
export default {
  theme: {
    extend: {
      colors: {
        primary: "#your-color",
        secondary: "#your-color"
      }
    }
  }
}
```

### Dark Mode

Automatically included. Components respect `dark:` prefix:
```tsx
<div className="bg-white dark:bg-slate-950">
  Content
</div>
```

### Responsive Design

Mobile-first approach:
```tsx
<div className="text-sm md:text-base lg:text-lg">
  Responsive text
</div>
```

## Performance Tips

1. **Code-split components** — Load only what's needed
2. **Lazy load heavy features** — Dynamic imports for large libs
3. **Optimize images** — Use WebP, compress PNGs
4. **Minimize CSS** — Parcel auto-minifies; avoid unused classes
5. **Bundle size matters** — Artifacts in Claude are single HTML files

## Debugging

### During Development

```bash
npm run dev
# Opens http://localhost:5173
```

### After Bundling

- Open `artifact.html` in a browser
- Check Console for errors
- Inspect Network tab for failed resources
- Verify all assets are inlined

### Common Issues

- **Styles not applying?** → Ensure Tailwind classes are in template
- **Components not rendering?** → Check React DevTools in browser
- **Bundle too large?** → Remove unused dependencies
- **Images not showing?** → Use data URIs or base64-encode small images

## Application to Code Destiny

**Use Web Artifacts Builder for:**

1. **Interactive Fortune Explorers** — Explore fortunes with filters, tabs, comparisons
2. **Customizable Dashboards** — User charts, readings, progress trackers
3. **Form-based Funnels** — Date input, question flows, result presentations
4. **Data Visualizations** — Charts, timelines, astrological wheels
5. **Configurators** — Let users customize themes, preferences, display options

**Example: Fortune Card Browser**
```tsx
import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function FortuneBrowser() {
  const [selectedCard, setSelectedCard] = useState("saju")

  return (
    <Tabs value={selectedCard} onValueChange={setSelectedCard}>
      <TabsList>
        <TabsTrigger value="saju">Saju</TabsTrigger>
        <TabsTrigger value="tarot">Tarot</TabsTrigger>
        <TabsTrigger value="astrology">Astrology</TabsTrigger>
      </TabsList>
      
      <TabsContent value={selectedCard}>
        <Card>
          <CardHeader>
            <CardTitle>Your {selectedCard} Reading</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Content here */}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
```

## Resources

- **Vite Docs**: https://vitejs.dev
- **React Docs**: https://react.dev
- **Tailwind Docs**: https://tailwindcss.com/docs
- **shadcn/ui**: https://ui.shadcn.com
- **Radix UI**: https://www.radix-ui.com

---

**Use this skill when building interactive React components for Claude.ai artifacts.**
