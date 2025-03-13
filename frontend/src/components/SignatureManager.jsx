import React, { useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { 
  KeyIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  DocumentCheckIcon
} from '@heroicons/react/24/outline'
import axios from 'axios'

export default function SignatureManager({ onSelectCertificate }) {
  const [isOpen, setIsOpen] = useState(false)
  const [certificates, setCertificates] = useState([])
  const [selectedCertificate, setSelectedCertificate] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  useEffect(() => {
    loadCertificates()
  }, [])

  const loadCertificates = async () => {
    try {
      const response = await axios.get('/api/certificates')
      setCertificates(response.data.certificates)
    } catch (error) {
      setError('Failed to load certificates')
      console.error('Error loading certificates:', error)
    }
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setUploading(true)
    setError(null)
    setSuccess(null)

    try {
      const formData = new FormData()
      formData.append('certificate', file)
      formData.append('password', prompt('Enter certificate password:'))

      const response = await axios.post('/api/certificates', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      setSuccess('Certificate uploaded successfully')
      loadCertificates()
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to upload certificate')
      console.error('Error uploading certificate:', error)
    } finally {
      setUploading(false)
    }
  }

  const handleGenerateCertificate = async () => {
    setUploading(true)
    setError(null)
    setSuccess(null)

    try {
      const response = await axios.post('/api/certificates/generate', {
        commonName: prompt('Enter common name:'),
        organization: prompt('Enter organization:'),
        country: prompt('Enter country code (e.g., US):'),
        validityDays: parseInt(prompt('Enter validity period in days:', '365')),
        password: prompt('Enter certificate password:')
      })

      setSuccess('Certificate generated successfully')
      loadCertificates()
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to generate certificate')
      console.error('Error generating certificate:', error)
    } finally {
      setUploading(false)
    }
  }

  const handleSelectCertificate = (cert) => {
    setSelectedCertificate(cert)
    onSelectCertificate(cert)
    setIsOpen(false)
  }

  const handleVerifySignature = async (pdfBytes) => {
    try {
      const response = await axios.post('/api/certificates/verify', {
        pdf: pdfBytes
      })
      return response.data
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to verify signature')
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <KeyIcon className="h-5 w-5 mr-2" />
        Manage Signatures
      </button>

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-10"
          onClose={() => setIsOpen(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    Digital Signature Management
                  </Dialog.Title>

                  {error && (
                    <div className="mt-4 p-4 bg-red-50 rounded-md">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <XCircleIcon className="h-5 w-5 text-red-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">
                            {error}
                          </h3>
                        </div>
                      </div>
                    </div>
                  )}

                  {success && (
                    <div className="mt-4 p-4 bg-green-50 rounded-md">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <CheckCircleIcon className="h-5 w-5 text-green-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-green-800">
                            {success}
                          </h3>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-4">
                    <div className="flex justify-between mb-4">
                      <button
                        type="button"
                        onClick={handleGenerateCertificate}
                        disabled={uploading}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <KeyIcon className="h-5 w-5 mr-2" />
                        Generate Certificate
                      </button>

                      <label className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer">
                        <DocumentCheckIcon className="h-5 w-5 mr-2" />
                        Upload Certificate
                        <input
                          type="file"
                          className="hidden"
                          accept=".p12,.pfx"
                          onChange={handleFileUpload}
                          disabled={uploading}
                        />
                      </label>
                    </div>

                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">
                        Available Certificates
                      </h4>
                      <div className="space-y-2">
                        {certificates.map((cert) => (
                          <div
                            key={cert.name}
                            className={`p-3 rounded-md border ${
                              selectedCertificate?.name === cert.name
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {cert.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  Uploaded on{' '}
                                  {new Date(cert.uploadedAt).toLocaleDateString()}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleSelectCertificate(cert)}
                                className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                              >
                                Select
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="inline-flex justify-center rounded-md border border-transparent bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-900 hover:bg-indigo-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    >
                      Close
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  )
} 