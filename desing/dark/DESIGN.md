---
name: Modern Desktop Utility
colors:
  surface: '#0d141b'
  surface-dim: '#0d141b'
  surface-bright: '#333a41'
  surface-container-lowest: '#080f15'
  surface-container-low: '#151c23'
  surface-container: '#192027'
  surface-container-high: '#242b32'
  surface-container-highest: '#2e353d'
  on-surface: '#dce3ed'
  on-surface-variant: '#c6c5d7'
  inverse-surface: '#dce3ed'
  inverse-on-surface: '#2a3138'
  outline: '#8f8fa0'
  outline-variant: '#454655'
  surface-tint: '#bec2ff'
  primary: '#bec2ff'
  on-primary: '#000da4'
  primary-container: '#5865f2'
  on-primary-container: '#fffdff'
  inverse-primary: '#3f4cda'
  secondary: '#c6c6cb'
  on-secondary: '#2e3034'
  secondary-container: '#47494d'
  on-secondary-container: '#b7b8bd'
  tertiary: '#c5c6cc'
  on-tertiary: '#2e3035'
  tertiary-container: '#73757b'
  on-tertiary-container: '#fffdff'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e0e0ff'
  primary-fixed-dim: '#bec2ff'
  on-primary-fixed: '#000569'
  on-primary-fixed-variant: '#222fc2'
  secondary-fixed: '#e2e2e7'
  secondary-fixed-dim: '#c6c6cb'
  on-secondary-fixed: '#1a1c1f'
  on-secondary-fixed-variant: '#45474b'
  tertiary-fixed: '#e2e2e8'
  tertiary-fixed-dim: '#c5c6cc'
  on-tertiary-fixed: '#191c20'
  on-tertiary-fixed-variant: '#45474c'
  background: '#0d141b'
  on-background: '#dce3ed'
  surface-variant: '#2e353d'
typography:
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  mono-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  sidebar-width: 240px
  header-height: 48px
  footer-height: 32px
  gutter: 1rem
  margin-sm: 0.5rem
  margin-md: 1rem
  margin-lg: 1.5rem
---

## Brand & Style
This design system is built for precision, speed, and technical reliability, borrowing the approachable aesthetics of modern communication platforms to humanize the often-sterile environment of file transfer protocols. The brand personality is **Professional, Focused, and Efficient**, catering to developers, system administrators, and digital creators who require a workspace that feels like a modern tool rather than a legacy utility.

The design style is **Corporate / Modern** with a heavy emphasis on **Dark Mode ergonomics**. It utilizes a sophisticated "Tonal Layering" approach where depth is communicated through slight shifts in charcoal and slate values rather than aggressive shadows. This ensures a low-strain environment for long sessions of file management while maintaining the vibrant energy of a high-growth startup environment through strategic use of "Blurple" accents.

## Colors
The palette is optimized for high-density information display in a dark environment. 

- **Primary:** The "Blurple" (#5865F2) is reserved for the most critical actions: primary buttons, active states, and successful connection indicators.
- **Background Tiers:** 
    - **Level 0 (#1E1F22):** Deepest shade, used for the sidebar and window frame.
    - **Level 1 (#2B2D31):** The main application background.
    - **Level 2 (#313338):** Surface containers like file cards, headers, and input fields.
- **Accents:** Functional colors (success, warning, danger) follow the standard modern syntax to ensure immediate recognition during file transfers and error logging.
- **Text:** White (#FFFFFF) is used only for high-emphasis headlines. Standard text uses light greys (#DBDEE1) to reduce eye fatigue.

## Typography
The system uses **Inter** for all UI elements to ensure maximum legibility at small sizes, which is critical for long file paths and metadata. 

- **File Listings:** Use `body-sm` (13px) to balance information density with readability.
- **Headers:** Pane titles and section headers use `headline-md` with semi-bold weights to create a clear visual hierarchy between the navigation and the content.
- **Metadata:** For timestamps, file sizes, and permissions, use `label-sm` or `mono-sm`.
- **System Logs:** Terminal outputs and transfer logs must use a monospaced font (JetBrains Mono) for character alignment.

## Layout & Spacing
The layout follows a **Fixed-Fluid-Fixed** model tailored for desktop utility:

1.  **Sidebar (Fixed):** A 240px navigation area for server bookmarks and local drives.
2.  **Main View (Fluid):** A flexible area for file exploration and dual-pane transfers.
3.  **Transfer Panel (Fixed/Collapsible):** A bottom-anchored panel for active queue monitoring.

The spacing rhythm is based on an **8px grid**. Standard list items (file rows) have a height of 32px or 40px to ensure touch-friendly targets while maintaining a high density. Gutters are kept at 16px to maximize the "internal" real estate for file names.

## Elevation & Depth
Depth is communicated through **Tonal Layers** and **Subtle Outlines** rather than traditional drop shadows.

- **Backgrounds:** Surfaces further "back" (like the sidebar) are darker. Surfaces closer to the user (like the file list) are lighter.
- **Borders:** A subtle 1px border (#3F4147 or #FFFFFF with 5% opacity) defines the separation between panes, mimicking the clean, structured look of a code editor.
- **Overlays:** Context menus and tooltips use a semi-transparent background (70-80% opacity) with a `backdrop-filter: blur(12px)` to provide a modern "Glassmorphism" feel without sacrificing readability.
- **Interaction:** Hover states on rows use a subtle background highlight (#3F4147) rather than a shadow to keep the UI feeling "flat" and fast.

## Shapes
The shape language is **Rounded**, providing a soft, modern contrast to the technical nature of FTP.

- **Primary UI Elements:** Buttons, input fields, and chips use a 0.5rem (8px) radius.
- **Containers:** Main content panes and the transfer panel use a 0.75rem (12px) radius on their outer corners when not touching the window edge.
- **File Icons:** Folder and file icons should follow a consistent 4px corner radius to match the overall UI softness.

## Components
- **File Tree Rows:** Height of 32px. Use a horizontal hover state that spans the full width of the pane. Include a "selected" state with a 2px vertical Blurple bar on the left edge.
- **Breadcrumb Navigation:** Minimalist text-based breadcrumbs at the top of the file pane. Use a chevron separator and highlight the current directory in white.
- **Action Icons:** 20px glyphs with 2px stroke weights. Icons should be monochrome (#B5BAC1) by default and turn Blurple or White on hover.
- **Transfer Progress Panel:** Positioned at the bottom. Use a 4px tall progress bar with a Blurple fill for active transfers and a Green fill for completed tasks.
- **Input Fields:** Dark background (#1E1F22), subtle 1px border, and 8px rounded corners. The focus state should feature a 2px Blurple glow/outline.
- **Status Chips:** Small, pill-shaped indicators for "Connected," "Disconnected," or "Transferring" with low-opacity background tints and high-opacity text colors.