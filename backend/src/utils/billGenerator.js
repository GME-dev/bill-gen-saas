import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'
import { validateTemplate, getTemplatePath } from './templateValidator.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Company information (in a real app, this would come from a database or config)
const COMPANY_INFO = {
  name: 'Your Company Name',
  address: '123 Business Street, City, Country',
  phone: '+1 234 567 8900',
  email: 'billing@yourcompany.com',
  payment_terms: 'Net 30 - Payment is due within 30 days of the invoice date.'
}

export async function generateBill(bill) {
  try {
    const templatePath = getTemplatePath()
    
    // Validate template before processing
    validateTemplate(templatePath)
    
    // Load the template
    const content = fs.readFileSync(templatePath, 'binary')
    
    // Create a new document
    const zip = new PizZip(content)
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true
    })
    
    // Prepare the data
    const data = {
      ...COMPANY_INFO,
      bill_number: bill.id.toString().padStart(6, '0'),
      customer_name: bill.customer_name,
      customer_nic: bill.customer_nic,
      customer_address: bill.customer_address,
      bill_date: new Date(bill.bill_date).toLocaleDateString(),
      due_date: new Date(bill.due_date).toLocaleDateString(),
      items: bill.items.map(item => ({
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price.toFixed(2),
        total_price: item.total_price.toFixed(2)
      })),
      total_amount: bill.total_amount.toFixed(2),
      status: bill.status.toUpperCase(),
      payment_terms: COMPANY_INFO.payment_terms
    }
    
    // Render the document
    doc.render(data)
    
    // Generate the output
    const buf = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE'
    })
    
    return buf
  } catch (error) {
    throw new Error(`Failed to generate bill: ${error.message}`)
  }
} 