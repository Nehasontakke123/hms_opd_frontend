# Prescription Design Improvements

## Overview
This document outlines the improvements made to the prescription template to create a clean, print-ready A4 design with professional typography and consistent branding.

## Key Improvements

### 1. Background & Layout
- **Crisp White Background**: Removed all gradients, noise, and off-white tints
- **Print-Safe Margins**: Minimum 12mm (0.47in) margins for safe printing
- **A4 Format**: Optimized for standard A4 paper (210mm × 297mm)
- **High Resolution**: Configured for 300 DPI equivalent output

### 2. Header Design
- **Hospital Name**: Centered, teal color (#14B8A6), bold, uppercase, 22pt
- **Prescription Title**: "DOCTOR PRESCRIPTION" in bold, dark gray, 14pt
- **Teal Accent Line**: Subtle teal rule (0.8mm) under header across page width

### 3. Typography Improvements
- **Font Family**: Professional sans-serif (Helvetica Neue, Arial)
- **Consistent Font Sizes**:
  - Section Headings: 11pt, bold
  - Body Text: 10pt, normal
  - Hospital Name: 22pt, bold
  - Prescription Title: 14pt, bold
- **Increased Line Height**: 1.6-1.8 for better readability
- **Color Scheme**:
  - Headings: #1F2937 (dark gray)
  - Body Text: #444444 (medium gray)
  - Accent: #14B8A6 (teal)

### 4. Column Alignment & Spacing
- **Two-Column Layout**: Equal width columns (48% each) with 4% gap
- **Aligned Baseline**: Labels and values sit on single lines
- **Consistent Spacing**: 6.5mm between lines for readability
- **Email Alignment**: "Email / Website:" label and value properly aligned on one line

### 5. Doctor Block Formatting
- **Format**: "Dr. Monu" with proper capitalization
- **Consistent Capitalization**: 
  - Doctor Name: "Dr. [Name]" format
  - Qualification: Uppercase (e.g., "MD")
  - Registration No.: Uppercase with consistent prefix (e.g., "REG-12345")
- **Proper Spacing**: Consistent spacing between label and value

### 6. Prescription Section
- **Clear Medicine List**: Numbered entries with bold medicine names
- **Improved Readability**: Increased line spacing (7mm between entries)
- **Proper Indentation**: 5mm left indent for medicine details

### 7. Stamp & Signature
- **Teal Dashed Border**: Professional stamp with teal (#14B8A6) dashed border
- **Crisp White Background**: No tint, pure white inside stamp
- **Readable Text**: Clear hierarchy with hospital name, authorization text, and registration number
- **Signature Area**: Adequate white space for actual signature

## Files Created/Updated

### Updated Files
- `hms_opd_frontend/src/utils/generateTraditionalPrescriptionPDF.js`
  - Complete redesign with all improvements
  - High-resolution output (300 DPI equivalent)
  - Clean white background
  - Professional typography
  - Proper alignment and spacing

### New Files
- `hms_opd_frontend/public/prescription-template.html`
  - HTML reference template showing the design
  - Print-ready CSS
  - Can be used as a standalone reference

- `hms_opd_frontend/public/prescription-styles.css`
  - Standalone CSS snippet
  - Can be integrated into existing HTML
  - Print media queries included

## Design Specifications

### Colors
- **Teal Accent**: #14B8A6 (used for header, accent line, stamp border)
- **Dark Text**: #1F2937 (headings)
- **Body Text**: #444444 (main content)
- **Medium Gray**: #4B5563 (secondary text)
- **Light Border**: #E5E7EB (dividers)
- **Background**: #FFFFFF (pure white)

### Typography Scale
- Hospital Name: 22pt
- Prescription Title: 14pt
- Section Headings: 11pt
- Body Text: 10pt
- Signature Name: 9pt
- Stamp Text: 6-8pt

### Spacing
- Top Margin: 15mm
- Side Margins: 15mm
- Section Spacing: 10mm
- Line Height: 6.5mm
- Medicine Entry Spacing: 7mm

## Usage

### Generating PDF
The updated `generateTraditionalPrescriptionPDF` function automatically applies all improvements when generating prescriptions.

### HTML Template
Open `prescription-template.html` in a browser to view the design reference. Use "Print to PDF" for a PDF version.

### CSS Integration
Include `prescription-styles.css` in your HTML and use the provided class names to match the design.

## Print Settings
- **Paper Size**: A4 (210mm × 297mm)
- **Margins**: 15mm all sides
- **Resolution**: 300 DPI (for PDF generation)
- **Background**: White (ensure "Background graphics" is enabled in print settings)

## Notes
- All text is sanitized to remove emojis and special characters
- Doctor name automatically formatted with "Dr." prefix if missing
- Email addresses are properly aligned and readable
- Stamp uses teal dashed border matching the brand color
- Signature area provides adequate space for manual signatures

