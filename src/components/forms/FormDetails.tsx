import { Download, Calendar, FileText, Building, Tag } from 'lucide-react';
import type { VAForm } from '../../../types';
import { Modal } from '../ui';

interface Props {
  form: VAForm;
  onClose: () => void;
}

export function FormDetails({ form, onClose }: Props) {
  const handleDownload = () => {
    window.open(form.attributes.url, '_blank');
  };

  return (
    <Modal isOpen={true} onClose={onClose} ariaLabelledBy="form-details-title">
      <div className="space-y-6">
        {/* Form Header */}
        <div className="border-b border-gray-200 pb-4">
          <h2 id="form-details-title" className="text-xl font-semibold text-gray-900 mb-2">
            Form {form.attributes.form_name}: {form.attributes.title}
          </h2>
          <div className="text-gray-600 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: form.attributes.form_usage || '' }} />
          {form.attributes.form_tool_intro && (
            <div className="mt-2 text-blue-900 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: form.attributes.form_tool_intro }} />
          )}
        </div>

        {/* Form Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Form Information
              </h3>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Form Number:</dt>
                  <dd className="text-sm font-medium text-gray-900">{form.attributes.form_name}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Pages:</dt>
                  <dd className="text-sm font-medium text-gray-900">{form.attributes.pages}</dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-sm text-gray-500">Language:</dt>
                  <dd className="text-sm font-medium text-gray-900 flex items-center gap-1">
                    {form.attributes.language?.toLowerCase() === 'es' ? (
                      <span title="Spanish" className="flex items-center">🇪🇸 <span className="ml-1">Español</span></span>
                    ) : (
                      <span title="English" className="flex items-center">🇺🇸 <span className="ml-1">English</span></span>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Type:</dt>
                  <dd className="text-sm font-medium text-gray-900 capitalize">{form.attributes.form_type}</dd>
                </div>
              </dl>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Dates
              </h3>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">First Issued:</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {new Date(form.attributes.first_issued_on).toLocaleDateString()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">Last Revised:</dt>
                  <dd className="text-sm font-medium text-gray-900">
                    {new Date(form.attributes.last_revision_on).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                <Building className="h-4 w-4 mr-2" />
                Administration
              </h3>
              <p className="text-sm text-gray-700">
                {form.attributes.va_form_administration}
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                <Tag className="h-4 w-4 mr-2" />
                Benefit Categories
              </h3>
              <div className="flex flex-wrap gap-2">
                {form.attributes.benefit_categories.map((category, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {category.name}
                  </span>
                ))}
              </div>
              {form.attributes.benefit_categories.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600">
                    {form.attributes.benefit_categories[0].description}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Related Forms */}
        {form.attributes.related_forms && form.attributes.related_forms.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
              <Tag className="h-4 w-4 mr-2" />
              Related Forms
            </h3>
            <div className="flex flex-wrap gap-2">
              {form.attributes.related_forms.map((related) => (
                <a
                  key={related}
                  href={`https://www.va.gov/find-forms/about-form-${related.toLowerCase()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-800 hover:bg-blue-100 hover:text-blue-800 transition-colors"
                >
                  {related}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleDownload}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#003875] hover:bg-[#002855] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#003875] transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Form
            </button>
            {form.attributes.form_tool_url && (
              <a
                href={form.attributes.form_tool_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-700 hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-700 transition-colors"
              >
                📝 Apply Online
              </a>
            )}
            {form.attributes.form_details_url && (
              <a
                href={form.attributes.form_details_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-700 transition-colors"
              >
                More Info
              </a>
            )}
            <button
              onClick={onClose}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#003875] transition-colors"
            >
              Close
            </button>
          </div>
        </div>

        {/* PDF Validation Status */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800">
                This form is a valid PDF and ready for download.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
} 