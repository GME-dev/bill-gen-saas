import { DocumentArrowDownIcon } from '@heroicons/react/24/outline'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import axios from 'axios'

const BillDownload = ({ billId }) => {
  const handleDownload = async (format) => {
    try {
      const endpoint = format === 'pdf' 
        ? `/api/bills/${billId}/generate-pdf`
        : `/api/bills/${billId}/generate`
      
      const response = await axios.get(endpoint, {
        responseType: 'blob'
      })
      
      // Create a blob from the response data
      const blob = new Blob([response.data], {
        type: format === 'pdf' 
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      })
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(blob)
      
      // Create a temporary link element
      const link = document.createElement('a')
      link.href = url
      link.download = `bill-${billId}.${format}`
      
      // Append to body, click, and remove
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up the URL
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download failed:', error)
      // You might want to show an error toast here
    }
  }

  return (
    <Menu as="div" className="relative inline-block text-left">
      <Menu.Button className="btn btn-primary inline-flex items-center">
        <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
        Download Bill
      </Menu.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="px-1 py-1">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={() => handleDownload('docx')}
                  className={`${
                    active ? 'bg-primary-100 text-primary-900' : 'text-gray-900'
                  } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                >
                  Download as DOCX
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={() => handleDownload('pdf')}
                  className={`${
                    active ? 'bg-primary-100 text-primary-900' : 'text-gray-900'
                  } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                >
                  Download as PDF
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  )
}

export default BillDownload 