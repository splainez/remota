---
name: Luminous Utility
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#454655'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#767686'
  outline-variant: '#c6c5d7'
  surface-tint: '#3f4cda'
  primary: '#3d4ad8'
  on-primary: '#ffffff'
  primary-container: '#5865f2'
  on-primary-container: '#fffdff'
  inverse-primary: '#bec2ff'
  secondary: '#585f66'
  on-secondary: '#ffffff'
  secondary-container: '#dce3ec'
  on-secondary-container: '#5e656c'
  tertiary: '#954700'
  on-tertiary: '#ffffff'
  tertiary-container: '#bb5a00'
  on-tertiary-container: '#fffdff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e0e0ff'
  primary-fixed-dim: '#bec2ff'
  on-primary-fixed: '#000569'
  on-primary-fixed-variant: '#222fc2'
  secondary-fixed: '#dce3ec'
  secondary-fixed-dim: '#c0c7cf'
  on-secondary-fixed: '#151c22'
  on-secondary-fixed-variant: '#41484e'
  tertiary-fixed: '#ffdbc8'
  tertiary-fixed-dim: '#ffb689'
  on-tertiary-fixed: '#311300'
  on-tertiary-fixed-variant: '#743500'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 8px
  gutter: 16px
  margin-desktop: 24px
  margin-mobile: 16px
  container-max: 1440px
---

## Brand & Style

This design system is a light-mode evolution of a modern desktop utility aesthetic. It prioritizes clarity, precision, and efficiency for power users. The brand personality is professional and systematic, utilizing a **Minimalist** approach with a focus on high legibility and functional density.

The target audience consists of professionals and developers who require a low-fatigue environment for long-duration tasks. By pivoting to a light interface, the system emphasizes "white space as structure," using subtle tonal shifts instead of heavy borders to define hierarchy. The emotional response should be one of organized calm, reliability, and technical proficiency.

## Colors

The palette is anchored by a high-contrast foundation to ensure peak readability. 

- **Primary (#5865f2):** Retained for brand recognition and primary actions. It provides a vibrant focal point against the neutral background.
- **Surfaces:** A hierarchy of whites and light grays. `#ffffff` is reserved for the main content workspace, while `#f8f9fa` and `#e9ecef` are used for sidebars, toolbars, and recessed backgrounds.
- **Typography:** Deep grays and near-blacks (`#212529`) replace the previous light text to maintain a high contrast ratio (WCAG AA/AAA compliant) against the light surfaces.
- **State Colors:** Use subtle tints of the primary color for hover states (e.g., a 10% opacity overlay) to maintain the clean aesthetic.

## Typography

The design system utilizes **Inter** exclusively to leverage its technical, systematic character and exceptional legibility at small sizes. 

Typography is treated as a functional tool. Headlines use tighter letter-spacing and heavier weights to create visual anchors, while body text uses a generous line height for readability in data-heavy views. For mobile contexts, headline sizes are slightly reduced to ensure optimal line breaks on narrow viewports. Use "Secondary Text" colors for labels and captions to create a clear visual distinction from primary content.

## Layout & Spacing

The layout follows a **Fluid Grid** model based on an 8px spacing rhythm. This ensures all elements align to a predictable cadence, which is critical for utility-based interfaces.

- **Desktop:** A 12-column grid with 16px gutters and 24px outer margins. Content is typically housed in cards or zoned regions.
- **Tablet:** An 8-column grid with 16px margins.
- **Mobile:** A 4-column grid with 16px margins.
- **Reflow Rules:** Sidebars on desktop should collapse into bottom sheets or drawer menus on mobile. Data tables should transition to a list-card format on screens smaller than 768px.

## Elevation & Depth

In this light-mode system, depth is conveyed through **Tonal Layers** and **Low-contrast Outlines** rather than heavy shadows.

- **Z-Axis:** Level 0 is the background (`#f8f9fa`). Level 1 is the primary content card (`#ffffff`).
- **Borders:** Use 1px solid borders (`#e9ecef`) to define boundaries between adjacent elements of the same color. 
- **Shadows:** When necessary for floating elements (like dropdowns or modals), use a single, highly diffused "Ambient Shadow": `0 4px 20px rgba(0, 0, 0, 0.05)`. This keeps the UI feeling light and airy without the "muddy" look often found in dark-to-light conversions.

## Shapes

The design system employs a **Rounded** shape language with a base radius of 8px (0.5rem). 

- **Standard Elements:** Buttons, inputs, and small cards use the 8px base radius.
- **Large Containers:** Main content areas or large modals use `rounded-lg` (16px/1rem).
- **Specialty Elements:** Interactive chips or tags may use `rounded-xl` (24px/1.5rem) to differentiate them from functional inputs. 
This consistency in curvature softens the "utility" feel just enough to make the application approachable while maintaining a structured, professional appearance.

## Components

- **Buttons:** Primary buttons use the brand color (#5865f2) with white text. Secondary buttons use a light gray fill (#e9ecef) with dark gray text (#212529). All buttons feature the 8px corner radius.
- **Input Fields:** Use a white background with a 1px border (#e9ecef). On focus, the border transitions to the primary color with a subtle 2px outer glow.
- **Cards:** Defined by a white background and a subtle 1px border. No shadows should be used for static layout cards.
- **Chips/Tags:** Small, low-contrast pills using a light gray background and `label-sm` typography. 
- **Lists:** Use subtle dividers (#e9ecef) between items. Interactive list items should feature a light gray hover state (#f8f9fa).
- **Navigation:** Sidebars should use the recessed background color (#f8f9fa) to visually separate navigation from the primary workspace.
