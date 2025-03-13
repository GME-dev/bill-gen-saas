# Bill Template Instructions

This document provides instructions for creating the bill template in Microsoft Word. The template should be saved as `bill-template.docx` in this directory.

## Template Structure

### 1. Header Section
- Company Logo (optional)
- Company Name: {company_name}
- Company Address: {company_address}
- Phone: {company_phone}
- Email: {company_email}

### 2. Bill Information
- Bill Number: {bill_number}
- Bill Date: {bill_date}
- Due Date: {due_date}
- Status: {status}

### 3. Customer Information
- Customer Name: {customer_name}
- NIC Number: {customer_nic}
- Address: {customer_address}

### 4. Bill Items Table
Create a table with the following columns:
- Product Name
- Quantity
- Unit Price
- Total Price

Use the following placeholder for the items loop:
```
{#items}
{product_name}    {quantity}    {unit_price}    {total_price}
{/items}
```

### 5. Totals Section
- Total Amount: {total_amount}

### 6. Payment Terms
{payment_terms}

## Formatting Guidelines

1. Use professional fonts (e.g., Arial, Calibri)
2. Set appropriate margins (1 inch recommended)
3. Use consistent spacing
4. Include your company's branding colors
5. Make the bill number and total amount stand out
6. Use clear section headings

## Important Notes

1. All placeholders must be in curly braces: {placeholder}
2. The items table must use the loop syntax: {#items}...{/items}
3. Save the file as `bill-template.docx`
4. Ensure all required placeholders are present
5. Test the template with sample data before using in production

## Required Placeholders

The following placeholders must be included in the template:
- {company_name}
- {company_address}
- {company_phone}
- {company_email}
- {bill_number}
- {bill_date}
- {due_date}
- {customer_name}
- {customer_nic}
- {customer_address}
- {items} (with loop)
- {total_amount}
- {status}
- {payment_terms} 