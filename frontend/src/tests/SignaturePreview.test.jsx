import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SignaturePreview from '../components/SignaturePreview'

describe('SignaturePreview', () => {
  const mockOnClose = jest.fn()
  const mockOnSave = jest.fn()
  const mockInitialAppearance = {
    text: 'Test Signature',
    fontSize: 12,
    color: '#000000',
    showDate: true,
    showLocation: true,
    showReason: true,
    customImage: null
  }

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks()
  })

  it('renders the signature preview modal', () => {
    render(
      <SignaturePreview
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    expect(screen.getByText('Signature Preview')).toBeInTheDocument()
    expect(screen.getByText('Settings')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
    expect(screen.getByText('Save')).toBeInTheDocument()
  })

  it('initializes with provided appearance settings', () => {
    render(
      <SignaturePreview
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        initialAppearance={mockInitialAppearance}
      />
    )

    expect(screen.getByDisplayValue('Test Signature')).toBeInTheDocument()
    expect(screen.getByDisplayValue('12')).toBeInTheDocument()
    expect(screen.getByDisplayValue('#000000')).toBeInTheDocument()
    expect(screen.getByLabelText('Show Date')).toBeChecked()
    expect(screen.getByLabelText('Show Location')).toBeChecked()
    expect(screen.getByLabelText('Show Reason')).toBeChecked()
  })

  it('handles text input changes', async () => {
    render(
      <SignaturePreview
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    const textInput = screen.getByLabelText('Signature Text')
    await userEvent.type(textInput, 'New Signature')

    expect(textInput.value).toBe('New Signature')
  })

  it('handles font size changes', async () => {
    render(
      <SignaturePreview
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    const fontSizeInput = screen.getByLabelText('Font Size')
    await userEvent.clear(fontSizeInput)
    await userEvent.type(fontSizeInput, '16')

    expect(fontSizeInput.value).toBe('16')
  })

  it('handles color changes', async () => {
    render(
      <SignaturePreview
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    const colorInput = screen.getByLabelText('Color')
    await userEvent.clear(colorInput)
    await userEvent.type(colorInput, '#FF0000')

    expect(colorInput.value).toBe('#FF0000')
  })

  it('handles custom image upload', async () => {
    render(
      <SignaturePreview
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    const file = new File(['test'], 'signature.png', { type: 'image/png' })
    const imageInput = screen.getByLabelText('Custom Image')
    await userEvent.upload(imageInput, file)

    expect(imageInput.files[0]).toBe(file)
  })

  it('handles display option toggles', async () => {
    render(
      <SignaturePreview
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    const showDateCheckbox = screen.getByLabelText('Show Date')
    const showLocationCheckbox = screen.getByLabelText('Show Location')
    const showReasonCheckbox = screen.getByLabelText('Show Reason')

    await userEvent.click(showDateCheckbox)
    await userEvent.click(showLocationCheckbox)
    await userEvent.click(showReasonCheckbox)

    expect(showDateCheckbox).not.toBeChecked()
    expect(showLocationCheckbox).not.toBeChecked()
    expect(showReasonCheckbox).not.toBeChecked()
  })

  it('calls onClose when cancel button is clicked', async () => {
    render(
      <SignaturePreview
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    const cancelButton = screen.getByText('Cancel')
    await userEvent.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('calls onSave with current appearance settings when save button is clicked', async () => {
    render(
      <SignaturePreview
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    // Update some settings
    const textInput = screen.getByLabelText('Signature Text')
    await userEvent.type(textInput, 'New Signature')

    const saveButton = screen.getByText('Save')
    await userEvent.click(saveButton)

    expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
      text: 'New Signature',
      fontSize: 12,
      color: '#000000',
      showDate: true,
      showLocation: true,
      showReason: true,
      customImage: null
    }))
  })

  it('validates font size input', async () => {
    render(
      <SignaturePreview
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    const fontSizeInput = screen.getByLabelText('Font Size')
    await userEvent.clear(fontSizeInput)
    await userEvent.type(fontSizeInput, '0')

    const saveButton = screen.getByText('Save')
    await userEvent.click(saveButton)

    expect(screen.getByText('Font size must be between 8 and 72')).toBeInTheDocument()
    expect(mockOnSave).not.toHaveBeenCalled()
  })

  it('validates color input', async () => {
    render(
      <SignaturePreview
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    )

    const colorInput = screen.getByLabelText('Color')
    await userEvent.clear(colorInput)
    await userEvent.type(colorInput, 'invalid-color')

    const saveButton = screen.getByText('Save')
    await userEvent.click(saveButton)

    expect(screen.getByText('Please enter a valid hex color code')).toBeInTheDocument()
    expect(mockOnSave).not.toHaveBeenCalled()
  })
}) 