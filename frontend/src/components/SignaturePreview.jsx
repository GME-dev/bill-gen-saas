import React, { useState, useEffect } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { 
  EyeIcon,
  XMarkIcon,
  AdjustmentsHorizontalIcon
} from '@heroicons/react/24/outline'

export default function SignaturePreview({ 
  isOpen, 
  onClose, 
  onSave,
  initialAppearance = null 
}) {
  const [appearance, setAppearance] = useState({
    text: 'Digitally signed by',
    fontSize: 12,
    color: { r: 0, g: 0, b: 0 },
    backgroundColor: { r: 0.95, g: 0.95, b: 0.95 },
    borderColor: { r: 0.5, g: 0.5, b: 0.5 },
    borderWidth: 1,
    borderRadius: 4,
    padding: 10,
    showDate: true,
    showLocation: true,
    showReason: true,
    customImage: null,
    ...initialAppearance
  })

  const [previewImage, setPreviewImage] = useState(null)

  useEffect(() => {
    if (initialAppearance) {
      setAppearance(initialAppearance)
    }
  }, [initialAppearance])

  const handleColorChange = (type, value) => {
    setAppearance(prev => ({
      ...prev,
      [type]: value
    }))
  }

  const handleImageUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setAppearance(prev => ({
          ...prev,
          customImage: e.target.result
        }))
        setPreviewImage(e.target.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = () => {
    onSave(appearance)
    onClose()
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-10"
        onClose={onClose}
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    Signature Appearance Preview
                  </Dialog.Title>
                  <button
                    type="button"
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Preview Section */}
                  <div className="border rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Preview
                    </h4>
                    <div
                      className="border rounded-lg p-4"
                      style={{
                        backgroundColor: `rgb(${appearance.backgroundColor.r * 255}, ${appearance.backgroundColor.g * 255}, ${appearance.backgroundColor.b * 255})`,
                        borderColor: `rgb(${appearance.borderColor.r * 255}, ${appearance.borderColor.g * 255}, ${appearance.borderColor.b * 255})`,
                        borderWidth: appearance.borderWidth,
                        borderRadius: appearance.borderRadius,
                        padding: appearance.padding
                      }}
                    >
                      {previewImage && (
                        <img
                          src={previewImage}
                          alt="Signature"
                          className="max-h-20 mb-2"
                        />
                      )}
                      <p
                        style={{
                          fontSize: appearance.fontSize,
                          color: `rgb(${appearance.color.r * 255}, ${appearance.color.g * 255}, ${appearance.color.b * 255})`
                        }}
                      >
                        {appearance.text}
                      </p>
                      {appearance.showDate && (
                        <p className="text-xs text-gray-500 mt-1">
                          Date: {new Date().toLocaleDateString()}
                        </p>
                      )}
                      {appearance.showLocation && (
                        <p className="text-xs text-gray-500">
                          Location: Unknown
                        </p>
                      )}
                      {appearance.showReason && (
                        <p className="text-xs text-gray-500">
                          Reason: Document signing
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Settings Section */}
                  <div className="border rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Settings
                    </h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Signature Text
                        </label>
                        <input
                          type="text"
                          value={appearance.text}
                          onChange={(e) => setAppearance(prev => ({ ...prev, text: e.target.value }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Font Size
                        </label>
                        <input
                          type="number"
                          value={appearance.fontSize}
                          onChange={(e) => setAppearance(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Custom Image
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Display Options
                        </label>
                        <div className="mt-2 space-y-2">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={appearance.showDate}
                              onChange={(e) => setAppearance(prev => ({ ...prev, showDate: e.target.checked }))}
                              className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Show Date</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={appearance.showLocation}
                              onChange={(e) => setAppearance(prev => ({ ...prev, showLocation: e.target.checked }))}
                              className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Show Location</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={appearance.showReason}
                              onChange={(e) => setAppearance(prev => ({ ...prev, showReason: e.target.checked }))}
                              className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            />
                            <span className="ml-2 text-sm text-gray-700">Show Reason</span>
                          </label>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Border Radius
                        </label>
                        <input
                          type="number"
                          value={appearance.borderRadius}
                          onChange={(e) => setAppearance(prev => ({ ...prev, borderRadius: parseInt(e.target.value) }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Padding
                        </label>
                        <input
                          type="number"
                          value={appearance.padding}
                          onChange={(e) => setAppearance(prev => ({ ...prev, padding: parseInt(e.target.value) }))}
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                  >
                    Save Appearance
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
} 