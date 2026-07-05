---
name: shadcn-ui-design
description: shadcn/ui component system for building consistent, accessible UI with Tailwind CSS and Radix UI
---

# shadcn/ui Design System

## Overview

shadcn/ui is a set of beautifully designed, accessible components built on **React**, **Tailwind CSS**, and **Radix UI**. Use this skill when building or modifying UI components for the Code Destiny project.

**Philosophy**: "This is not a component library. It is how you build your component library." Components are fully customizable and meant to be modified directly for your project's needs.

## Core Technologies

- **React 18+**: Component framework
- **Tailwind CSS 3.4+**: Utility-first styling (matches our project)
- **Radix UI + Base UI**: Accessible component primitives
- **TypeScript**: Full type safety
- **Open Code**: All component code is readable and modifiable

## Component Categories & Usage

### Form & Input Components
- `Button` - Primary action trigger
- `Input` - Text input field
- `Checkbox` - Multi-select option
- `Radio Group` - Single-select option
- `Select` - Dropdown selection
- `Textarea` - Multi-line text input
- `Label` - Form field labels
- `Switch` - Toggle control
- `Slider` - Range selection
- `Toggle` - Button toggle state
- `Input OTP` - One-time password input
- `Input Group` - Grouped inputs

### Layout Components
- `Card` - Container for grouped content
- `Container` - Responsive wrapper
- `Separator` - Visual divider
- `Aspect Ratio` - Fixed ratio container
- `Resizable` - Draggable resize panels
- `Scroll Area` - Custom scrollable container

### Navigation Components
- `Breadcrumb` - Navigation path
- `Menubar` - Horizontal menu bar
- `Navigation Menu` - Vertical navigation
- `Pagination` - Page navigation
- `Sidebar` - Side navigation panel
- `Tabs` - Tabbed content switching

### Disclosure Components (Show/Hide)
- `Accordion` - Expandable sections
- `Alert Dialog` - Confirmation dialogs
- `Collapsible` - Toggle-able section
- `Dialog` - Modal dialog
- `Drawer` - Side panel drawer
- `Popover` - Contextual popup
- `Sheet` - Bottom sheet or slide-out
- `Hover Card` - Hover-triggered info card

### Data Display
- `Alert` - Alert message box
- `Badge` - Status badge/tag
- `Avatar` - User profile picture
- `Table` - Data table
- `Data Table` - Advanced table with sorting/filtering
- `Skeleton` - Loading placeholder
- `Progress` - Progress bar
- `Tooltip` - Hover info text
- `Empty` - Empty state display

### Feedback Components
- `Toast` - Notification toast
- `Sonner` - Toast alternative
- `Spinner` - Loading indicator
- `Message Scroller` - Message feed

### Interactive Components
- `Carousel` - Image/content carousel
- `Calendar` - Date picker calendar
- `Date Picker` - Date selection
- `Combobox` - Searchable select
- `Command` - Command palette
- `Context Menu` - Right-click menu
- `Dropdown Menu` - Dropdown menu
- `Kbd` - Keyboard key display

## Installation Pattern

In Code Destiny (Next.js + Tailwind), components are typically installed via:

```bash
npx shadcn-ui@latest add [component-name]
```

For example:
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
```

## Usage Guidelines for Code Destiny

1. **Follow Project Standards**:
   - Place components in `components/` directory
   - Use existing Tailwind configuration (already aligned with shadcn)
   - Maintain TypeScript strict mode compliance

2. **Customization**:
   - All components are source code you can modify
   - Adjust Tailwind classes to match Code Destiny theme
   - Extend Radix UI props as needed

3. **Accessibility**:
   - shadcn/ui components include ARIA attributes
   - Test keyboard navigation
   - Ensure color contrast with dark mode

4. **Dark Mode**:
   - All components support `dark:` Tailwind prefix
   - Test both light and dark themes
   - Code Destiny uses dual theme (연이/네오)

5. **Mobile Responsiveness**:
   - Use Tailwind breakpoints: `sm:`, `md:`, `lg:`
   - Code Destiny prioritizes mobile-first design
   - Test at 390px viewport (mobile size)

## Integration with Code Destiny

- **Theme Variables**: Customize `components.json` to align with Code Destiny color palette
- **Size Variants**: Match button/input sizes to existing UI patterns
- **Animation**: Use Tailwind `transition-*` and `animate-*` classes (no external animations unless necessary)
- **Styling**: Never use inline styles; use Tailwind classes only
- **Icons**: Consider using existing icon library or add `lucide-react` if needed

## Best Practices

1. **Composition over Configuration**: Build complex UIs by combining simple components
2. **Direct Modification**: Don't hesitate to modify component code for your needs
3. **Semantic HTML**: Use appropriate semantic elements (button, input, etc.)
4. **Performance**: Components use React best practices; keep render logic efficient
5. **Testing**: Component behavior tested with accessibility tools and real user interactions

## Examples

### Simple Button
```jsx
import { Button } from "@/components/ui/button"

export default function App() {
  return <Button>Click me</Button>
}
```

### Form with Input & Label
```jsx
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function Form() {
  return (
    <div>
      <Label htmlFor="name">Name</Label>
      <Input id="name" placeholder="Enter your name" />
      <Button type="submit">Submit</Button>
    </div>
  )
}
```

### Card Layout
```jsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Dashboard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard</CardTitle>
        <CardDescription>Welcome to your dashboard</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Content here */}
      </CardContent>
    </Card>
  )
}
```

## Resources

- **Official Docs**: https://ui.shadcn.com/docs
- **GitHub**: https://github.com/shadcn-ui/ui
- **Components**: https://ui.shadcn.com/components
- **Customize**: https://ui.shadcn.com/docs/cli

## When to Use This Skill

- Building new UI components for Code Destiny
- Designing complex forms or data tables
- Creating responsive layouts
- Implementing accessible dialogs/modals
- Adding consistent interactive elements
- Matching design system guidelines
