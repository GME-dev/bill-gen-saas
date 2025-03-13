import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SignatureManager from '../components/SignatureManager'
import axios from 'axios'

// Mock axios
jest.mock('axios')

describe('SignatureManager', () => {
  const mockCertificates = [
    {
      id: '1',
      name: 'Test Certificate 1',
      issuer: 'Test Issuer',
      validFrom: '2024-01-01',
      validTo: '2024-12-31'
    },
    {
      id: '2',
      name: 'Test Certificate 2',
      issuer: 'Test Issuer',
      validFrom: '2024-01-01',
      validTo: '2024-12-31'
    }
  ]

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
  })

  it('renders the signature manager button', () => {
    render(<SignatureManager />)
    expect(screen.getByText('Manage Signatures')).toBeInTheDocument()
  })

  it('opens the modal when the button is clicked', async () => {
    render(<SignatureManager />)
    
    const button = screen.getByText('Manage Signatures')
    await userEvent.click(button)

    expect(screen.getByText('Signature Management')).toBeInTheDocument()
  })

  it('loads certificates when the modal is opened', async () => {
    // Mock axios get request
    axios.get.mockResolvedValueOnce({ data: mockCertificates })

    render(<SignatureManager />)
    
    const button = screen.getByText('Manage Signatures')
    await userEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Test Certificate 1')).toBeInTheDocument()
      expect(screen.getByText('Test Certificate 2')).toBeInTheDocument()
    })
  })

  it('handles certificate loading errors', async () => {
    // Mock axios get request to throw error
    axios.get.mockRejectedValueOnce(new Error('Failed to load certificates'))

    render(<SignatureManager />)
    
    const button = screen.getByText('Manage Signatures')
    await userEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Failed to load certificates')).toBeInTheDocument()
    })
  })

  it('handles certificate file upload', async () => {
    const file = new File(['test'], 'cert.p12', { type: 'application/x-pkcs12' })
    const password = 'test123'

    // Mock axios post request
    axios.post.mockResolvedValueOnce({ data: { ...mockCertificates[0] } })

    render(<SignatureManager />)
    
    const button = screen.getByText('Manage Signatures')
    await userEvent.click(button)

    const fileInput = screen.getByLabelText('Certificate File')
    const passwordInput = screen.getByLabelText('Password')
    const uploadButton = screen.getByText('Upload')

    await userEvent.upload(fileInput, file)
    await userEvent.type(passwordInput, password)
    await userEvent.click(uploadButton)

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        '/api/certificates',
        expect.any(FormData)
      )
    })
  })

  it('handles certificate generation', async () => {
    const certificateDetails = {
      commonName: 'Test Certificate',
      organization: 'Test Org',
      country: 'US',
      validityDays: 365,
      password: 'test123'
    }

    // Mock axios post request
    axios.post.mockResolvedValueOnce({ data: { ...mockCertificates[0] } })

    render(<SignatureManager />)
    
    const button = screen.getByText('Manage Signatures')
    await userEvent.click(button)

    const generateButton = screen.getByText('Generate New Certificate')
    await userEvent.click(generateButton)

    // Fill in the form
    await userEvent.type(screen.getByLabelText('Common Name'), certificateDetails.commonName)
    await userEvent.type(screen.getByLabelText('Organization'), certificateDetails.organization)
    await userEvent.type(screen.getByLabelText('Country'), certificateDetails.country)
    await userEvent.type(screen.getByLabelText('Validity (days)'), certificateDetails.validityDays.toString())
    await userEvent.type(screen.getByLabelText('Password'), certificateDetails.password)

    const submitButton = screen.getByText('Generate')
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        '/api/certificates/generate',
        certificateDetails
      )
    })
  })

  it('handles certificate selection', async () => {
    // Mock axios get request
    axios.get.mockResolvedValueOnce({ data: mockCertificates })

    render(<SignatureManager />)
    
    const button = screen.getByText('Manage Signatures')
    await userEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Test Certificate 1')).toBeInTheDocument()
    })

    const selectButton = screen.getAllByText('Select')[0]
    await userEvent.click(selectButton)

    expect(screen.getByText('Certificate selected successfully')).toBeInTheDocument()
  })

  it('handles certificate deletion', async () => {
    // Mock axios requests
    axios.get.mockResolvedValueOnce({ data: mockCertificates })
    axios.delete.mockResolvedValueOnce({})

    render(<SignatureManager />)
    
    const button = screen.getByText('Manage Signatures')
    await userEvent.click(button)

    await waitFor(() => {
      expect(screen.getByText('Test Certificate 1')).toBeInTheDocument()
    })

    const deleteButton = screen.getAllByText('Delete')[0]
    await userEvent.click(deleteButton)

    // Confirm deletion
    const confirmButton = screen.getByText('Confirm')
    await userEvent.click(confirmButton)

    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith('/api/certificates/1')
      expect(screen.getByText('Certificate deleted successfully')).toBeInTheDocument()
    })
  })

  it('handles signature verification', async () => {
    const mockPdfData = new Uint8Array([1, 2, 3])
    const mockVerificationResult = {
      isValid: true,
      details: {
        reason: 'Test reason',
        location: 'Test location',
        date: '2024-03-20'
      }
    }

    // Mock axios post request
    axios.post.mockResolvedValueOnce({ data: mockVerificationResult })

    render(<SignatureManager />)
    
    const button = screen.getByText('Manage Signatures')
    await userEvent.click(button)

    const verifyButton = screen.getByText('Verify Signature')
    await userEvent.click(verifyButton)

    // Mock file input
    const fileInput = screen.getByLabelText('PDF File')
    await userEvent.upload(fileInput, new File([mockPdfData], 'test.pdf', { type: 'application/pdf' }))

    const submitButton = screen.getByText('Verify')
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        '/api/certificates/verify',
        expect.any(FormData)
      )
      expect(screen.getByText('Signature is valid')).toBeInTheDocument()
    })
  })

  it('handles signature verification errors', async () => {
    const mockPdfData = new Uint8Array([1, 2, 3])

    // Mock axios post request to throw error
    axios.post.mockRejectedValueOnce(new Error('Verification failed'))

    render(<SignatureManager />)
    
    const button = screen.getByText('Manage Signatures')
    await userEvent.click(button)

    const verifyButton = screen.getByText('Verify Signature')
    await userEvent.click(verifyButton)

    // Mock file input
    const fileInput = screen.getByLabelText('PDF File')
    await userEvent.upload(fileInput, new File([mockPdfData], 'test.pdf', { type: 'application/pdf' }))

    const submitButton = screen.getByText('Verify')
    await userEvent.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('Failed to verify signature')).toBeInTheDocument()
    })
  })
}) 