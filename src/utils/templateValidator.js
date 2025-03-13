import PizZip from 'pizzip'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const REQUIRED_PLACEHOLDERS = [
  '{company_name}',
  '{company_address}',
  '{company_phone}',
  '{company_email}',
  '{bill_number}',
  '{bill_date}',
  '{due_date}',
  '{customer_name}',
  '{customer_nic}',
  '{customer_address}',
  '{items}',
  '{total_amount}',
  '{status}',
  '{payment_terms}'
]

export function validateTemplate(templatePath) {
  try {
    const content = fs.readFileSync(templatePath, 'binary')
    const zip = new PizZip(content)
    
    // Get all text content from the document
    const textContent = Object.values(zip.files)
      .filter(file => file.name.endsWith('.xml'))
      .map(file => file.asText())
      .join('')
    
    // Check for required placeholders
    const missingPlaceholders = REQUIRED_PLACEHOLDERS.filter(
      placeholder => !textContent.includes(placeholder)
    )
    
    if (missingPlaceholders.length > 0) {
      throw new Error(
        `Missing required placeholders in template: ${missingPlaceholders.join(', ')}`
      )
    }
    
    return true
  } catch (error) {
    throw new Error(`Template validation failed: ${error.message}`)
  }
}

export function getTemplatePath() {
  return join(__dirname, '../../templates/bill-template.docx')
} 